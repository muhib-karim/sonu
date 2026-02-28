"""
SONU Cloud Transcription Server

A self-hosted, OpenAI Whisper-compatible transcription API powered by faster-whisper.
Provides a free, private alternative to cloud transcription services.
"""

import io
import os
import time
import logging
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path

import numpy as np
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel
from pydantic_settings import BaseSettings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("sonu-server")


class Settings(BaseSettings):
    """Server configuration from environment variables."""

    whisper_model: str = "large-v3"
    device: str = "auto"
    compute_type: str = "auto"
    host: str = "0.0.0.0"
    port: int = 8000
    api_key: str = ""  # Empty = no auth required

    class Config:
        env_prefix = ""
        case_sensitive = False


settings = Settings()

# Global model reference
_model = None
_model_info = {"model": settings.whisper_model, "device": "unknown"}


def get_model():
    """Get or initialize the faster-whisper model (lazy loading)."""
    global _model, _model_info

    if _model is None:
        from faster_whisper import WhisperModel

        logger.info(
            f"Loading Whisper model '{settings.whisper_model}' "
            f"(device={settings.device}, compute_type={settings.compute_type})"
        )
        start = time.time()

        # Determine device and compute type
        device = settings.device
        compute_type = settings.compute_type

        if device == "auto":
            try:
                import torch

                device = "cuda" if torch.cuda.is_available() else "cpu"
            except ImportError:
                device = "cpu"

        if compute_type == "auto":
            compute_type = "float16" if device == "cuda" else "int8"

        _model = WhisperModel(
            settings.whisper_model,
            device=device,
            compute_type=compute_type,
        )

        elapsed = time.time() - start
        _model_info = {"model": settings.whisper_model, "device": device}
        logger.info(
            f"Model loaded in {elapsed:.1f}s on {device} ({compute_type})"
        )

    return _model


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - preload model on startup."""
    logger.info("Starting SONU Cloud Transcription Server")
    logger.info(f"Model: {settings.whisper_model}")
    logger.info(f"Device: {settings.device}")
    logger.info(f"Auth: {'enabled' if settings.api_key else 'disabled'}")

    # Preload the model
    get_model()

    yield

    logger.info("Shutting down server")


app = FastAPI(
    title="SONU Cloud Transcription Server",
    description="OpenAI Whisper-compatible transcription API powered by faster-whisper",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TranscriptionResponse(BaseModel):
    """OpenAI Whisper-compatible response format."""

    text: str


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    model: str
    device: str


def verify_api_key(authorization: str | None = None):
    """Verify API key if configured."""
    if not settings.api_key:
        return  # No auth required

    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    # Support both "Bearer <key>" and plain key
    token = authorization
    if token.startswith("Bearer "):
        token = token[7:]

    if token != settings.api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="ok",
        model=_model_info["model"],
        device=_model_info["device"],
    )


@app.post("/v1/audio/transcriptions", response_model=TranscriptionResponse)
async def transcribe_audio(
    file: UploadFile = File(...),
    model: str = Form(default="whisper-large-v3"),
    language: str | None = Form(default=None),
    response_format: str = Form(default="json"),
    task: str = Form(default="transcribe"),
    authorization: str | None = Header(default=None),
):
    """
    OpenAI Whisper-compatible transcription endpoint.

    Accepts audio files and returns transcribed text.
    Supports the same parameters as OpenAI's /v1/audio/transcriptions API.
    """
    # Verify auth
    verify_api_key(authorization)

    # Validate task
    if task not in ("transcribe", "translate"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid task '{task}'. Must be 'transcribe' or 'translate'.",
        )

    # Read audio file
    start = time.time()
    try:
        audio_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read audio file: {e}")

    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file")

    logger.info(
        f"Received audio: {file.filename or 'unknown'} "
        f"({len(audio_bytes)} bytes, language={language}, task={task})"
    )

    # Write to temp file (faster-whisper needs a file path or numpy array)
    suffix = Path(file.filename or "audio.wav").suffix or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        # Transcribe
        whisper_model = get_model()

        transcribe_kwargs = {
            "task": task,
            "beam_size": 5,
            "vad_filter": True,
            "vad_parameters": {"min_silence_duration_ms": 500},
        }

        if language and language != "auto":
            transcribe_kwargs["language"] = language

        segments, info = whisper_model.transcribe(tmp_path, **transcribe_kwargs)

        # Collect all segments
        text_parts = []
        for segment in segments:
            text_parts.append(segment.text.strip())

        full_text = " ".join(text_parts)

        elapsed = time.time() - start
        logger.info(
            f"Transcription completed in {elapsed:.2f}s "
            f"(detected_language={info.language}, "
            f"language_probability={info.language_probability:.2f}, "
            f"duration={info.duration:.1f}s, "
            f"output_length={len(full_text)} chars)"
        )

    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(
            status_code=500, detail=f"Transcription failed: {str(e)}"
        )
    finally:
        # Clean up temp file
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    # Return response based on format
    if response_format == "text":
        return PlainTextResponse(content=full_text)

    return TranscriptionResponse(text=full_text)


@app.get("/")
async def root():
    """Root endpoint with server info."""
    return {
        "name": "SONU Cloud Transcription Server",
        "version": "1.0.0",
        "api": "/v1/audio/transcriptions",
        "health": "/health",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        log_level="info",
    )
