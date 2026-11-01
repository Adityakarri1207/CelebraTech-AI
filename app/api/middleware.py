"""
Security and performance middleware for CelebraTech AI.
Implements OWASP Level 3 headers, in-memory rate limiting with standard RFC headers,
payload size defense guards, latency tracking, and HTTP caching controls.
"""

from typing import Callable, Dict, List
import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from app.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Applies comprehensive OWASP Level-3 security headers, Request Tracing,
    and HTTP Caching directives to every response.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.perf_counter()
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))

        # Payload Size Guard: Prevent Denial of Service via memory exhaustion (Max 2MB)
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > 2 * 1024 * 1024:
            return JSONResponse(
                status_code=413,
                content={
                    "error": "PAYLOAD_TOO_LARGE",
                    "detail": "Request payload exceeds maximum allowed size of 2 MB.",
                    "request_id": request_id,
                },
                headers={"X-Request-ID": request_id},
            )

        response = await call_next(request)
        process_time_ms = (time.perf_counter() - start_time) * 1000

        # Correlation & Performance Headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{process_time_ms:.2f}ms"

        # OWASP Security Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Cross-Origin-Resource-Policy"] = "same-origin"
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
        response.headers["Permissions-Policy"] = (
            "geolocation=(), camera=(), microphone=(), payment=(), usb=(), display-capture=()"
        )

        # Enterprise Content Security Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self' data: https:; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; "
            "style-src 'self' 'unsafe-inline' https:; "
            "font-src 'self' https: data:; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https:; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "object-src 'none';"
        )

        # HTTP Caching Strategy for Network Efficiency
        path = request.url.path
        if path.startswith("/static/"):
            # Static bundles & assets: aggressive caching
            response.headers["Cache-Control"] = "public, max-age=86400, stale-while-revalidate=3600"
        elif path.startswith("/api/"):
            # Dynamic API endpoints: no stale cache
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"

        return response


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """
    High-performance in-memory sliding-window rate limiter per client IP.
    Returns standard RFC rate limit headers (X-RateLimit-*).
    """

    def __init__(self, app, max_requests: int = 150, window_seconds: int = 60) -> None:
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.request_records: Dict[str, List[float]] = {}

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

        # Exempt static assets from rate limits
        if request.url.path.startswith("/static"):
            return await call_next(request)

        records = self.request_records.get(client_ip, [])
        valid_records = [t for t in records if now - t < self.window_seconds]

        remaining = max(0, self.max_requests - len(valid_records))
        reset_time = int(self.window_seconds - (now - valid_records[0])) if valid_records else self.window_seconds

        if len(valid_records) >= self.max_requests:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "TOO_MANY_REQUESTS",
                    "detail": f"Rate limit exceeded. Maximum {self.max_requests} requests per minute.",
                },
                headers={
                    "X-RateLimit-Limit": str(self.max_requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(max(1, reset_time)),
                    "Retry-After": str(max(1, reset_time)),
                },
            )

        valid_records.append(now)
        self.request_records[client_ip] = valid_records

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(max(0, remaining - 1))
        response.headers["X-RateLimit-Reset"] = str(max(1, reset_time))
        return response
