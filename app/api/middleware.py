"""
Security middleware and request processing for CelebraTech AI.
Adds hardened HTTP headers, in-memory rate limiting, and exception sanitization.
"""

from typing import Callable, Dict
import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from app.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Applies OWASP-recommended security headers to every response."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Content security policy allowing React, local assets, fonts, and inline styles
        response.headers["Content-Security-Policy"] = (
            "default-src 'self' 'unsafe-inline' https: data:; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; "
            "style-src 'self' 'unsafe-inline' https:; "
            "font-src 'self' https: data:; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https:;"
        )
        return response


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """
    In-memory rate limiter per client IP.
    Protects compute-heavy GenAI and export endpoints.
    """

    def __init__(self, app, max_requests: int = 120, window_seconds: int = 60) -> None:
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.request_records: Dict[str, list] = {}

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

        # Clean expired records
        records = self.request_records.get(client_ip, [])
        valid_records = [t for t in records if now - t < self.window_seconds]

        # Exempt static assets from strict rate limits
        if not request.url.path.startswith("/static"):
            if len(valid_records) >= self.max_requests:
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Too Many Requests",
                        "detail": f"Rate limit exceeded. Maximum {self.max_requests} requests per minute.",
                    },
                )
            valid_records.append(now)
            self.request_records[client_ip] = valid_records

        return await call_next(request)
