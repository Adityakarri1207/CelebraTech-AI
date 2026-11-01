"""
Runner script for CelebraTech AI Event Planner.
Starts Uvicorn ASGI server with automatic reload for development.
"""

import sys
import uvicorn
from app.config import settings

if __name__ == "__main__":
    # Ensure UTF-8 output encoding for console
    if sys.stdout.encoding != "utf-8":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except AttributeError:
            pass

    print("=" * 68)
    print("  CelebraTech AI - GenAI Celebration & Event Planner")
    print("=" * 68)
    print(f"  Server starting at: http://{settings.host}:{settings.port}")
    print(f"  Interactive Web UI: http://{settings.host}:{settings.port}")
    print(f"  API Documentation:  http://{settings.host}:{settings.port}/docs")
    print("=" * 68)

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        log_level="info",
    )
