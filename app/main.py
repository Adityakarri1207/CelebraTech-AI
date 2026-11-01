"""
FastAPI application entry point for CelebraTech AI Event Planner.
Integrates enterprise middleware, GZip compression, domain exception handlers,
API routers, static assets, and health checks.
"""

import mimetypes
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from app.config import settings
from app.api.middleware import SecurityHeadersMiddleware, RateLimiterMiddleware
from app.api.routes_events import router as events_router
from app.api.routes_ai import router as ai_router
from app.exceptions import CelebraTechError

mimetypes.add_type("application/javascript", ".jsx")
mimetypes.add_type("application/javascript", ".js")

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description=(
        "Enterprise-grade celebration & event planning assistant. "
        "Provides GenAI recommendations, budget tracking, milestone timelines, "
        "vendor checklists, and interactive 3D idea cards for weddings, birthdays, and community events."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

# 1. Performance & Efficiency: GZip Compression for payloads > 500 bytes
app.add_middleware(GZipMiddleware, minimum_size=500)

# 2. Security: OWASP Hardened Headers, Rate Limiting & Payload Guards
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimiterMiddleware, max_requests=240, window_seconds=60)

# 3. CORS Controls
if settings.enable_cors:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# 4. Domain Exception Handlers for Clean API Error Responses
@app.exception_handler(CelebraTechError)
async def celebratech_exception_handler(request: Request, exc: CelebraTechError) -> JSONResponse:
    """Centralized exception handler translating domain errors into structured JSON."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.code,
            "message": exc.message,
            "details": exc.details,
        },
        headers={"X-Request-ID": request.headers.get("X-Request-ID", "")},
    )

# 5. Include API Routers
app.include_router(events_router)
app.include_router(ai_router)

# 6. Mount Static Assets
BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/", include_in_schema=False)
async def serve_index() -> FileResponse:
    """Serve the single-page application."""
    index_path = STATIC_DIR / "index.html"
    return FileResponse(str(index_path))


@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint for liveness and monitoring."""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.version,
        "genai_provider": "Gemini API" if settings.gemini_api_key else "Offline Curated Engine",
    }
