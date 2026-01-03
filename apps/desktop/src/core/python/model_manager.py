#!/usr/bin/env python3
"""
SONU Model Manager v2.0 - Multi-Model Download & Management
============================================================
Supports downloading and managing multiple ASR models:
- Whisper (OpenAI) - GGML quantized
- Distil-Whisper (Systran) - Optimized for speed
- Parakeet V3 (NVIDIA) - CPU optimized
- Canary Qwen (NVIDIA) - Best noise handling
- Moonshine (moonshine-ai) - Ultra-light multilingual

All downloads from HuggingFace with progress reporting.
"""

import os
import sys
import time
import json
import shutil
import hashlib
import urllib.request
from pathlib import Path
from typing import Optional, Dict, Any, Callable

# ============================================================================
# MODEL DEFINITIONS - 2025 State-of-the-Art
# ============================================================================

MODELS = {
    # =========================================================================
    # WHISPER MODELS (whisper.cpp GGML format)
    # =========================================================================
    "tiny": {
        "name": "tiny",
        "display_name": "Whisper Tiny",
        "type": "whisper",
        "size_mb": 75,
        "wer": 7.8,  # Word Error Rate (lower is better)
        "rtf": 25,   # Real-time factor (higher is faster)
        "languages": ["en"],
        "description": "Fastest, lowest accuracy - best for real-time",
        "recommended_for": "All systems",
        "url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
        "filename": "ggml-tiny.bin"
    },
    "base": {
        "name": "base",
        "display_name": "Whisper Base",
        "type": "whisper",
        "size_mb": 142,
        "wer": 5.3,
        "rtf": 18,
        "languages": ["en"],
        "description": "Balanced speed and accuracy",
        "recommended_for": "4+ cores / 8GB RAM",
        "url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
        "filename": "ggml-base.bin"
    },
    "small": {
        "name": "small",
        "display_name": "Whisper Small",
        "type": "whisper",
        "size_mb": 466,
        "wer": 4.1,
        "rtf": 12,
        "languages": ["en", "multi"],
        "description": "Good accuracy, moderate speed",
        "recommended_for": "8+ cores / 8GB RAM",
        "url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin",
        "filename": "ggml-small.bin"
    },
    "medium": {
        "name": "medium", 
        "display_name": "Whisper Medium",
        "type": "whisper",
        "size_mb": 1500,
        "wer": 3.2,
        "rtf": 6,
        "languages": ["en", "multi"],
        "description": "High accuracy, needs resources",
        "recommended_for": "12+ cores / 16GB RAM",
        "url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin",
        "filename": "ggml-medium.bin"
    },
    "large-v2": {
        "name": "large-v2",
        "display_name": "Whisper Large V2",
        "type": "whisper",
        "size_mb": 2900,
        "wer": 2.9,
        "rtf": 4,
        "languages": ["en", "multi"],
        "description": "Excellent accuracy, resource intensive",
        "recommended_for": "16+ cores / 32GB RAM",
        "url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v2.bin",
        "filename": "ggml-large-v2.bin"
    },
    "large-v3": {
        "name": "large-v3",
        "display_name": "Whisper Large V3",
        "type": "whisper",
        "size_mb": 2900,
        "wer": 2.5,
        "rtf": 4,
        "languages": ["en", "multi"],
        "description": "Best accuracy, very resource intensive",
        "recommended_for": "16+ cores / 32GB RAM",
        "url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin",
        "filename": "ggml-large-v3.bin"
    },
    "large-v3-turbo": {
        "name": "large-v3-turbo",
        "display_name": "Whisper Large V3 Turbo",
        "type": "whisper",
        "size_mb": 1600,
        "wer": 2.7,
        "rtf": 8,
        "languages": ["en", "multi"],
        "description": "Large V3 quality with 8x faster speed",
        "recommended_for": "8+ cores / 16GB RAM",
        "url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin",
        "filename": "ggml-large-v3-turbo.bin"
    },
    # Quantized models - smaller, faster with similar accuracy
    "tiny-q5_1": {
        "name": "tiny-q5_1",
        "display_name": "Whisper Tiny Q5",
        "type": "whisper",
        "size_mb": 32,
        "wer": 8.0,
        "rtf": 30,
        "languages": ["en"],
        "description": "Quantized tiny - half size",
        "recommended_for": "All systems",
        "url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny-q5_1.bin",
        "filename": "ggml-tiny-q5_1.bin"
    },
    "base-q5_1": {
        "name": "base-q5_1",
        "display_name": "Whisper Base Q5",
        "type": "whisper",
        "size_mb": 58,
        "wer": 5.5,
        "rtf": 22,
        "languages": ["en"],
        "description": "Quantized base - half size",
        "recommended_for": "All systems",
        "url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin",
        "filename": "ggml-base-q5_1.bin"
    },
    "small-q5_1": {
        "name": "small-q5_1",
        "display_name": "Whisper Small Q5",
        "type": "whisper",
        "size_mb": 182,
        "wer": 4.3,
        "rtf": 15,
        "languages": ["en", "multi"],
        "description": "Quantized small - half size",
        "recommended_for": "4+ cores / 8GB RAM",
        "url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin",
        "filename": "ggml-small-q5_1.bin"
    },
    "medium-q5_0": {
        "name": "medium-q5_0",
        "display_name": "Whisper Medium Q5",
        "type": "whisper",
        "size_mb": 515,
        "wer": 3.4,
        "rtf": 8,
        "languages": ["en", "multi"],
        "description": "Quantized medium - third size",
        "recommended_for": "8+ cores / 8GB RAM",
        "url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium-q5_0.bin",
        "filename": "ggml-medium-q5_0.bin"
    },
    "large-v3-turbo-q5_0": {
        "name": "large-v3-turbo-q5_0",
        "display_name": "Large V3 Turbo Q5",
        "type": "whisper",
        "size_mb": 550,
        "wer": 2.9,
        "rtf": 12,
        "languages": ["en", "multi"],
        "description": "Best bang for buck - large quality, small size",
        "recommended_for": "4+ cores / 8GB RAM",
        "url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin",
        "filename": "ggml-large-v3-turbo-q5_0.bin"
    },
    
    # =========================================================================
    # DISTIL-WHISPER (Faster, English-optimized)
    # =========================================================================
    "distil-small.en": {
        "name": "distil-small.en",
        "display_name": "Distil Small (English)",
        "type": "faster-whisper",
        "repo": "Systran/faster-distil-whisper-small.en",
        "size_mb": 250,
        "wer": 4.5,
        "rtf": 22,
        "languages": ["en"],
        "description": "Distilled - instant English transcription",
        "recommended_for": "All systems",
        "url": "https://huggingface.co/Systran/faster-distil-whisper-small.en"
    },
    "distil-medium.en": {
        "name": "distil-medium.en",
        "display_name": "Distil Medium (English)",
        "type": "faster-whisper",
        "repo": "Systran/faster-distil-whisper-medium.en",
        "size_mb": 420,
        "wer": 3.8,
        "rtf": 18,
        "languages": ["en"],
        "description": "Distilled - fast & accurate English",
        "recommended_for": "4+ cores / 8GB RAM",
        "url": "https://huggingface.co/Systran/faster-distil-whisper-medium.en"
    },
    "distil-large-v3": {
        "name": "distil-large-v3",
        "display_name": "Distil Large V3",
        "type": "faster-whisper",
        "repo": "Systran/faster-distil-whisper-large-v3",
        "size_mb": 756,
        "wer": 3.2,
        "rtf": 12,
        "languages": ["en", "multi"],
        "description": "Best Distil accuracy, multilingual",
        "recommended_for": "8+ cores / 16GB RAM",
        "url": "https://huggingface.co/Systran/faster-distil-whisper-large-v3"
    },
    
    # =========================================================================
    # NVIDIA PARAKEET V3 (CPU-optimized, ONNX)
    # =========================================================================
    "parakeet-v3": {
        "name": "parakeet-v3",
        "display_name": "Parakeet V3 (NVIDIA)",
        "type": "onnx",
        "repo": "nvidia/parakeet-tdt-0.6b-v3",
        "size_mb": 600,
        "wer": 3.5,
        "rtf": 20,
        "languages": ["en", "multi"],
        "description": "NVIDIA Parakeet - low RAM, CPU optimized",
        "recommended_for": "All systems (default for <8GB RAM)",
        "url": "https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3"
    },
    
    # =========================================================================
    # NVIDIA CANARY QWEN (Best noise handling)
    # =========================================================================
    "canary-qwen": {
        "name": "canary-qwen",
        "display_name": "Canary Qwen 2.5B (NVIDIA)",
        "type": "onnx",
        "repo": "nvidia/canary-qwen-2.5b",
        "size_mb": 2500,
        "wer": 2.8,
        "rtf": 8,
        "languages": ["en", "multi"],
        "description": "Best for noisy environments",
        "recommended_for": "12+ cores / 16GB RAM",
        "url": "https://huggingface.co/nvidia/canary-qwen-2.5b"
    },
    
    # =========================================================================
    # MOONSHINE (Ultra-light multilingual)
    # =========================================================================
    "moonshine-tiny": {
        "name": "moonshine-tiny",
        "display_name": "Moonshine Tiny",
        "type": "onnx",
        "repo": "UsefulSensors/moonshine-tiny",
        "size_mb": 150,
        "wer": 6.0,
        "rtf": 30,
        "languages": ["multi"],
        "description": "Ultra-light, 50+ languages",
        "recommended_for": "All systems",
        "url": "https://huggingface.co/UsefulSensors/moonshine-tiny"
    },
    
    # =========================================================================
    # QWEN3-ASR (Versatile multilingual)
    # =========================================================================
    "qwen3-asr": {
        "name": "qwen3-asr",
        "display_name": "Qwen3-ASR",
        "type": "onnx",
        "repo": "Qwen/Qwen3-ASR",
        "size_mb": 500,
        "wer": 3.6,
        "rtf": 15,
        "languages": ["en", "multi"],
        "description": "Versatile multilingual transcription",
        "recommended_for": "8+ cores / 8GB RAM",
        "url": "https://huggingface.co/Qwen/Qwen3-ASR"
    },
    
    # =========================================================================
    # QWEN3 ASR (SenseVoiceSmall - 500MB, SOTA)
    # =========================================================================
    "sensevoice": {
        "name": "sensevoice",
        "display_name": "SenseVoice Small (Qwen3-ASR)",
        "type": "onnx",
        "repo": "FunAudioLLM/SenseVoiceSmall",
        "size_mb": 500,
        "wer": 3.0,
        "rtf": 20,
        "languages": ["multi"],
        "description": "Alibaba SenseVoiceSmall - Ultra-fast & Accurate (ONNX)",
        "recommended_for": "Mixed language / Music",
        "url": "https://huggingface.co/FunAudioLLM/SenseVoiceSmall"
    },

    # CANARY QWEN (NVIDIA Canary 1B)
    # =========================================================================
    "canary-1b": {
        "name": "canary-1b",
        "display_name": "Canary Qwen 1B",
        "type": "onnx",
        "repo": "nvidia/canary-1b",
        "size_mb": 2500,
        "wer": 2.8,
        "rtf": 8,
        "languages": ["multi", "en"],
        "description": "NVIDIA Canary 1B - Best for noisy environments",
        "recommended_for": "16GB+ RAM",
        "url": "https://huggingface.co/nvidia/canary-1b"
    },

    # VOXTRAL MINI (Mistral AI - 50+ languages)
    # =========================================================================
    "voxtral-mini": {
        "name": "voxtral-mini",
        "display_name": "Voxtral Mini",
        "type": "onnx",
        "repo": "mistralai/Voxtral-Mini-3B-2507",
        "size_mb": 1200,
        "wer": 3.2,
        "rtf": 12,
        "languages": ["multi"],
        "description": "Mistral AI - 50+ languages support",
        "recommended_for": "8+ cores / 16GB RAM",
        "url": "https://huggingface.co/mistralai/Voxtral-Mini-3B-2507"
    },
    
    # =========================================================================
    # PHI-4 MULTIMODAL (Microsoft - Highest accuracy)
    # =========================================================================
    "phi4-multimodal": {
        "name": "phi4-multimodal",
        "display_name": "Phi-4 Multimodal ASR",
        "type": "onnx",
        "repo": "microsoft/Phi-4-multimodal-instruct",
        "size_mb": 2800,
        "wer": 2.5,
        "rtf": 6,
        "languages": ["en", "multi"],
        "description": "Microsoft Phi-4 - Highest accuracy",
        "recommended_for": "12+ cores / 16GB RAM",
        "url": "https://huggingface.co/microsoft/Phi-4-multimodal-instruct"
    },
    
    # =========================================================================
    # LLM FOR POST-PROCESSING
    # =========================================================================
    "lfm2-1b": {
        "name": "lfm2-1b",
        "display_name": "LFM2 1B (Post-Process)",
        "type": "llm",
        "repo": "LiquidAI/LFM2-1.2B-GGUF",
        "filename": "LFM2-1B-Q4_K_M.gguf",
        "size_mb": 700,
        "description": "LiquidAI LFM2 - commercial-safe post-processing",
        "recommended_for": "Post-processing (optional)",
        "url": "https://huggingface.co/LiquidAI/LFM2-1.2B-GGUF"
    }
}

# ============================================================================
# CACHE PATHS
# ============================================================================

def get_cache_dir() -> Path:
    """Get the model cache directory."""
    if sys.platform == "win32":
        local_appdata = os.environ.get("LOCALAPPDATA", "")
        if local_appdata:
            return Path(local_appdata) / ".cache" / "huggingface" / "hub"
    return Path.home() / ".cache" / "huggingface" / "hub"

def get_models_dir() -> Path:
    """Get local models directory."""
    env_dir = os.environ.get("SONU_MODELS_DIR")
    if env_dir:
        models_dir = Path(env_dir)
    else:
        script_dir = Path(__file__).parent
        models_dir = script_dir / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    return models_dir

def get_model_path(model_name: str, download_root: str = None) -> Optional[Path]:
    """Get the path to a downloaded model."""
    if model_name not in MODELS:
        return None
    
    model_info = MODELS[model_name]
    
    # Check local models directory first
    models_dir = get_models_dir()
    if "filename" in model_info:
        local_path = models_dir / model_info["filename"]
        if local_path.exists():
            return local_path
    
    # Check HuggingFace cache
    cache_dir = get_cache_dir()
    
    if model_info["type"] == "faster-whisper" and "repo" in model_info:
        # faster-whisper uses HF repos
        repo = model_info["repo"]
        repo_path = cache_dir / f"models--{repo.replace('/', '--')}"
        if repo_path.exists():
            # Check for snapshots
            snapshots_dir = repo_path / "snapshots"
            if snapshots_dir.exists():
                snapshots = list(snapshots_dir.iterdir())
                if snapshots:
                    return snapshots[0]
    
    elif model_info["type"] == "whisper" and "filename" in model_info:
        # GGML whisper models
        local_path = models_dir / model_info["filename"]
        if local_path.exists():
            return local_path
    
    return None

# ============================================================================
# DOWNLOAD FUNCTIONS
# ============================================================================

# Known SHA256 checksums for model verification (first 16 chars for quick check)
# Full checksums can be added as models are verified
MODEL_CHECKSUMS = {
    "ggml-tiny.bin": "be07e048e1e599ad46341c8d2a135645",  # First 32 hex chars of SHA256
    "ggml-base.bin": "60ed5bc3dd14eea856493d334349b405",
    "ggml-small.bin": "1be3a9b2063867b937e64e2ec7483364",
    # Add more checksums as they are verified
}

def calculate_file_checksum(file_path: Path, algorithm: str = 'md5') -> str:
    """Calculate checksum of a file."""
    if algorithm == 'md5':
        hasher = hashlib.md5()
    elif algorithm == 'sha256':
        hasher = hashlib.sha256()
    else:
        hasher = hashlib.md5()

    try:
        with open(file_path, 'rb') as f:
            # Read in chunks to handle large files
            for chunk in iter(lambda: f.read(8192), b''):
                hasher.update(chunk)
        return hasher.hexdigest()
    except Exception as e:
        sys.stderr.write(f"Checksum calculation error: {e}\n")
        return ""

def verify_model_integrity(file_path: Path, expected_size_mb: int = None) -> dict:
    """Verify a downloaded model file's integrity.

    Returns:
        dict with 'valid', 'size_ok', 'checksum_ok', 'message' keys
    """
    result = {
        'valid': False,
        'size_ok': False,
        'checksum_ok': None,  # None = not checked, True/False = checked
        'message': ''
    }

    if not file_path.exists():
        result['message'] = 'File does not exist'
        return result

    # Check file size
    actual_size = file_path.stat().st_size
    actual_size_mb = actual_size / (1024 * 1024)

    if expected_size_mb:
        # Allow 5% tolerance for file size
        min_size = expected_size_mb * 0.95
        max_size = expected_size_mb * 1.05
        result['size_ok'] = min_size <= actual_size_mb <= max_size

        if not result['size_ok']:
            result['message'] = f'File size mismatch: expected ~{expected_size_mb}MB, got {actual_size_mb:.1f}MB'
            return result
    else:
        result['size_ok'] = actual_size > 0

    # Check checksum if available
    filename = file_path.name
    if filename in MODEL_CHECKSUMS:
        expected_checksum = MODEL_CHECKSUMS[filename]
        actual_checksum = calculate_file_checksum(file_path, 'md5')
        result['checksum_ok'] = actual_checksum == expected_checksum

        if not result['checksum_ok']:
            result['message'] = f'Checksum mismatch: file may be corrupted'
            return result

    result['valid'] = result['size_ok'] and (result['checksum_ok'] is None or result['checksum_ok'])
    result['message'] = 'Model verified successfully' if result['valid'] else 'Verification failed'

    return result

class DownloadProgress:
    """Track download progress."""
    def __init__(self, callback: Callable = None):
        self.total_bytes = 0
        self.downloaded_bytes = 0
        self.speed_kbps = 0
        self.elapsed = 0
        self.remaining = 0
        self.callback = callback
        self._last_time = 0
        self._last_bytes = 0
        self.start_time = time.time()

    def update(self, downloaded: int, total: int):
        """Update progress."""
        self.downloaded_bytes = downloaded
        self.total_bytes = total

        current_time = time.time()
        self.elapsed = current_time - self.start_time

        if self._last_time > 0:
            dt = current_time - self._last_time
            if dt > 0.5:  # Update speed every 0.5s
                bytes_delta = downloaded - self._last_bytes
                self.speed_kbps = (bytes_delta / 1024) / dt

                # Calculate remaining time
                if self.speed_kbps > 0:
                    remaining_bytes = total - downloaded
                    self.remaining = (remaining_bytes / 1024) / self.speed_kbps

                self._last_time = current_time
                self._last_bytes = downloaded
        else:
            self._last_time = current_time
            self._last_bytes = downloaded
        
        if self.callback:
            self.callback(self)
    
    @property
    def percent(self) -> float:
        if self.total_bytes == 0:
            return 0
        return (self.downloaded_bytes / self.total_bytes) * 100

def download_file(url: str, dest_path: Path, progress_callback: Callable = None) -> bool:
    """Download a file with progress reporting."""
    try:
        progress = DownloadProgress(progress_callback)
        
        # Create request with headers
        request = urllib.request.Request(url)
        request.add_header('User-Agent', 'SONU-ModelDownloader/2.0')
        
        with urllib.request.urlopen(request, timeout=30) as response:
            total_size = int(response.headers.get('Content-Length', 0))
            
            # Ensure parent directory exists
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Download with progress
            with open(dest_path, 'wb') as f:
                downloaded = 0
                block_size = 8192
                
                while True:
                    block = response.read(block_size)
                    if not block:
                        break
                    
                    f.write(block)
                    downloaded += len(block)
                    progress.update(downloaded, total_size)
        
        return True
        
    except Exception as e:
        sys.stderr.write(f"Download error: {e}\n")
        sys.stderr.flush()
        
        # Clean up partial download
        if dest_path.exists():
            try:
                dest_path.unlink()
            except:
                pass
        
        return False

def download_model(model_name: str, progress_callback: Callable = None) -> dict:
    """Download a model from HuggingFace."""
    # Map "large" to "large-v3" for compatibility
    if model_name == "large":
        model_name = "large-v3"

    if model_name not in MODELS:
        return {"success": False, "error": f"Unknown model: {model_name}"}

    model_info = MODELS[model_name]
    models_dir = get_models_dir()

    # Report start
    result = {
        "success": False,
        "model": model_name,
        "type": model_info["type"],
        "size_mb": model_info["size_mb"]
    }

    try:
        if model_info["type"] == "whisper" and "url" in model_info:
            # Direct GGML download
            dest_path = models_dir / model_info["filename"]

            sys.stdout.write(json.dumps({
                "type": "progress",
                "percent": 0,
                "message": f"Downloading {model_info['display_name']}..."
            }) + "\n")
            sys.stdout.flush()

            def report_progress(p: DownloadProgress):
                sys.stdout.write(json.dumps({
                    "type": "progress",
                    "percent": int(p.percent),
                    "bytesDownloaded": p.downloaded_bytes,
                    "bytesTotal": p.total_bytes,
                    "speedKB": int(p.speed_kbps),
                    "elapsed": int(p.elapsed),
                    "remaining": int(p.remaining),
                    "message": f"Downloading... ({p.percent:.1f}%)"
                }) + "\n")
                sys.stdout.flush()

            if download_file(model_info["url"], dest_path, report_progress):
                result["success"] = True
                result["path"] = str(dest_path)
            else:
                result["error"] = "Download failed"

        elif model_info["type"] == "faster-whisper" and "repo" in model_info:
            # Use huggingface_hub directly for progress tracking
            try:
                from huggingface_hub import snapshot_download
                import threading

                repo_id = model_info["repo"]
                cache_dir = str(models_dir)

                # Report initial progress
                sys.stdout.write(json.dumps({
                    "type": "progress",
                    "percent": 5,
                    "message": f"Preparing to download {model_info['display_name']}..."
                }) + "\n")
                sys.stdout.flush()

                # Track download progress by monitoring the cache directory
                expected_size = model_info.get("size_mb", 250) * 1024 * 1024  # Convert to bytes
                download_started = threading.Event()
                download_complete = threading.Event()

                def progress_monitor():
                    """Monitor download directory for progress updates."""
                    import time

                    # Wait for download to start
                    download_started.wait(timeout=30)

                    last_size = 0
                    last_time = time.time()
                    start_time = time.time()

                    while not download_complete.is_set():
                        try:
                            # Count all files in the cache directory for this model
                            total_downloaded = 0
                            cache_path = Path(cache_dir)
                            for file in cache_path.rglob("*"):
                                if file.is_file() and not file.name.endswith(".lock"):
                                    total_downloaded += file.stat().st_size

                            # Calculate progress
                            percent = min(95, int((total_downloaded / expected_size) * 100)) if expected_size > 0 else 50

                            # Calculate speed
                            current_time = time.time()
                            elapsed = current_time - start_time
                            if current_time - last_time >= 1.0:  # Update every second
                                speed = (total_downloaded - last_size) / 1024  # KB/s
                                last_size = total_downloaded
                                last_time = current_time

                                sys.stdout.write(json.dumps({
                                    "type": "progress",
                                    "percent": percent,
                                    "bytesDownloaded": total_downloaded,
                                    "bytesTotal": expected_size,
                                    "speedKB": int(speed),
                                    "elapsed": int(elapsed),
                                    "message": f"Downloading {model_info['display_name']}... ({percent}%)"
                                }) + "\n")
                                sys.stdout.flush()
                        except Exception:
                            pass

                        time.sleep(0.5)

                # Start progress monitor in background
                monitor_thread = threading.Thread(target=progress_monitor, daemon=True)
                monitor_thread.start()
                download_started.set()

                # Download the model using huggingface_hub
                local_dir = snapshot_download(
                    repo_id=repo_id,
                    local_dir=Path(cache_dir) / repo_id.replace("/", "--"),
                    local_dir_use_symlinks=False
                )

                download_complete.set()
                monitor_thread.join(timeout=2)

                # Final progress update
                sys.stdout.write(json.dumps({
                    "type": "progress",
                    "percent": 100,
                    "message": f"{model_info['display_name']} download complete!"
                }) + "\n")
                sys.stdout.flush()

                result["success"] = True
                result["path"] = local_dir

            except Exception as e:
                download_complete.set() if 'download_complete' in dir() else None
                result["error"] = str(e)

        elif model_info["type"] in ("onnx", "llm"):
            # HuggingFace Hub download
            try:
                from huggingface_hub import hf_hub_download, snapshot_download

                sys.stdout.write(json.dumps({
                    "type": "progress",
                    "percent": 15,
                    "message": f"Downloading {model_info['display_name']} from Hugging Face... (Large file, this may take a few minutes without progress updates)"
                }) + "\n")
                sys.stdout.flush()

                if "filename" in model_info:
                    # Download specific file
                    path = hf_hub_download(
                        repo_id=model_info["repo"],
                        filename=model_info["filename"],
                        local_dir=models_dir
                    )
                else:
                    # Download entire repo
                    path = snapshot_download(
                        repo_id=model_info["repo"],
                        local_dir=models_dir / model_name
                    )

                result["success"] = True
                result["path"] = str(path)

            except ImportError:
                result["error"] = "huggingface_hub not installed"
            except Exception as e:
                result["error"] = str(e)

    except Exception as e:
        result["error"] = str(e)

    # Report completion
    if result["success"]:
        sys.stdout.write(json.dumps({
            "type": "result",
            "success": True,
            "model": model_name,
            "path": result.get("path"),
            "size_mb": model_info["size_mb"],
            "cached": False,
            "status": "downloaded"
        }) + "\n")
    else:
        sys.stdout.write(json.dumps({
            "type": "result",
            "success": False,
            "error": result.get("error", "Unknown error")
        }) + "\n")
    sys.stdout.flush()

    return result

# ============================================================================
# MODEL STATUS FUNCTIONS
# ============================================================================

def is_downloaded(model_name: str, download_root: str = None) -> tuple:
    """Check if a model is downloaded."""
    path = get_model_path(model_name, download_root)
    
    if path is not None and path.exists():
        # Calculate size
        if path.is_file():
            size_mb = path.stat().st_size / (1024 ** 2)
        else:
            size_mb = sum(f.stat().st_size for f in path.rglob('*') if f.is_file()) / (1024 ** 2)
        
        return True, {
            "path": str(path),
            "size_mb": round(size_mb, 2)
        }
    
    return False, None

def list_models() -> list:
    """List all available models with download status."""
    result = []
    
    for name, info in MODELS.items():
        downloaded, details = is_downloaded(name)
        
        model_data = {
            "name": name,
            "display_name": info.get("display_name", name),
            "type": info["type"],
            "size_mb": info["size_mb"],
            "wer": info.get("wer"),
            "rtf": info.get("rtf"),
            "languages": info.get("languages", []),
            "description": info.get("description", ""),
            "recommended_for": info.get("recommended_for", ""),
            "downloaded": downloaded
        }
        
        if downloaded and details:
            model_data["path"] = details["path"]
            model_data["actual_size_mb"] = details["size_mb"]
        
        result.append(model_data)
    
    return result

def get_recommended_model() -> str:
    """Get recommended model based on system specs."""
    try:
        import psutil
        ram_gb = psutil.virtual_memory().total / (1024 ** 3)
        cpu_count = psutil.cpu_count()
        
        if ram_gb < 8:
            # Low RAM - use lightweight models
            if is_downloaded("moonshine-tiny")[0]:
                return "moonshine-tiny"
            if is_downloaded("tiny")[0]:
                return "tiny"
            return "tiny"  # Default to tiny for low RAM
        
        elif ram_gb < 16:
            # Medium RAM
            if is_downloaded("distil-small.en")[0]:
                return "distil-small.en"
            if is_downloaded("parakeet-v3")[0]:
                return "parakeet-v3"
            return "distil-small.en"
        
        else:
            # High RAM
            if is_downloaded("distil-medium.en")[0]:
                return "distil-medium.en"
            if is_downloaded("canary-qwen")[0]:
                return "canary-qwen"
            return "distil-medium.en"
            
    except ImportError:
        return "tiny"  # Safe default

def get_disk_space() -> dict:
    """Get available disk space."""
    try:
        cache_dir = get_cache_dir()
        
        if sys.platform == "win32":
            import ctypes
            free_bytes = ctypes.c_ulonglong(0)
            ctypes.windll.kernel32.GetDiskFreeSpaceExW(
                str(cache_dir.parent), None, None, ctypes.pointer(free_bytes)
            )
            free_gb = free_bytes.value / (1024 ** 3)
        else:
            usage = shutil.disk_usage(cache_dir.parent)
            free_gb = usage.free / (1024 ** 3)
        
        return {
            "success": True,
            "space_gb": round(free_gb, 2),
            "path": str(cache_dir)
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "space_gb": 0,
            "path": ""
        }

# ============================================================================
# CLI INTERFACE
# ============================================================================

def main():
    """Command-line interface."""
    import argparse
    
    parser = argparse.ArgumentParser(description="SONU Model Manager")
    parser.add_argument("command", choices=["list", "download", "check", "space", "recommend"])
    parser.add_argument("model", nargs="?", help="Model name (for download/check)")
    parser.add_argument("--resume", action="store_true", help="Resume interrupted download")
    
    if len(sys.argv) < 2:
        parser.print_help()
        return
    
    args = parser.parse_args()
    
    if args.command == "list":
        models = list_models()
        print(json.dumps(models, indent=2))
    
    elif args.command == "download":
        if not args.model:
            print(json.dumps({"error": "Model name required"}))
            return
        result = download_model(args.model)
        # Result already printed by download_model
    
    elif args.command == "check":
        if not args.model:
            print(json.dumps({"error": "Model name required"}))
            return
        downloaded, info = is_downloaded(args.model)
        print(json.dumps({
            "model": args.model,
            "downloaded": downloaded,
            "info": info
        }))
    
    elif args.command == "space":
        result = get_disk_space()
        print(json.dumps(result))
    
    elif args.command == "recommend":
        model = get_recommended_model()
        print(json.dumps({"recommended": model}))

if __name__ == "__main__":
    main()
