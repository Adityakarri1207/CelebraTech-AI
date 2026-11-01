"""
Configuration and settings for CelebraTech AI Event Planner.
Handles environment variables, security flags, and GenAI settings.
"""

from typing import List
import os
from pydantic import BaseModel, Field


class Settings(BaseModel):
    """Application settings with environment variable integration."""

    app_name: str = "CelebraTech AI - Celebration & Event Planner"
    version: str = "1.0.0"
    debug: bool = False
    host: str = "127.0.0.1"
    port: int = 8000

    # GenAI Settings
    gemini_api_key: str = Field(default_factory=lambda: os.getenv("GEMINI_API_KEY", ""))
    gemini_model: str = "gemini-2.5-flash"
    ai_max_tokens: int = 2048
    ai_temperature: float = 0.7

    # Security settings
    allowed_hosts: List[str] = ["*"]
    rate_limit_per_minute: int = 60
    enable_cors: bool = True
    cors_origins: List[str] = [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
    ]

    # Currency formatting
    supported_currencies: List[str] = ["USD", "EUR", "GBP", "INR", "CAD", "AUD"]
    default_currency: str = "USD"


settings = Settings()
