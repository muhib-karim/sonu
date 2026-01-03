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
import json
import hashlib
import shutil
import urllib.request
import threading
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
        "recommended_for": "All systems"
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
        "recommended_for": "4+ cores / 8GB RAM"
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
        "recommended_for": "8+ cores / 16GB RAM"
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
        "recommended_for": "All systems (default for <8GB RAM)"
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
        "recommended_for": "12+ cores / 16GB RAM"
    },
    
    # =========================================================================
    # MOONSHINE (Ultra-light multilingual)
    # =========================================================================
    "moonshine-tiny": {
        "name": "moonshine-tiny",
        "display_name": "Moonshine Tiny",
        "type": "onnx",
        "repo": "moonshine-ai/moonshine-tiny",
        "size_mb": 150,
        "wer": 6.0,
        "rtf": 30,
        "languages": ["multi"],
        "description": "Ultra-light, 50+ languages",
        "recommended_for": "All systems"
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
        "recommended_for": "Post-processing (optional)"
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

class DownloadProgress:
    """Track download progress."""
    def __init__(self, callback: Callable = None):
        self.total_bytes = 0
        self.downloaded_bytes = 0
        self.speed_kbps = 0
        self.callback = callback
        self._last_time = 0
        self._last_bytes = 0
    
    def update(self, downloaded: int, total: int):
        """Update progress."""
        self.downloaded_bytes = downloaded
        self.total_bytes = total
        
        import time
        current_time = time.time()
        if self._last_time > 0:
            dt = current_time - self._last_time
            if dt > 0.5:  # Update speed every 0.5s
                bytes_delta = downloaded - self._last_bytes
                self.speed_kbps = (bytes_delta / 1024) / dt
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
                    "message": f"Downloading... ({p.percent:.1f}%)"
                }) + "\n")
                sys.stdout.flush()
            
            if download_file(model_info["url"], dest_path, report_progress):
                result["success"] = True
                result["path"] = str(dest_path)
            else:
                result["error"] = "Download failed"
        
        elif model_info["type"] == "faster-whisper" and "repo" in model_info:
            # Use faster-whisper's built-in downloader
            try:
                from faster_whisper import WhisperModel
                
                sys.stdout.write(json.dumps({
                    "type": "progress",
                    "percent": 10,
                    "message": f"Downloading {model_info['display_name']} from HuggingFace..."
                }) + "\n")
                sys.stdout.flush()
                
                # This will download the model
                _ = WhisperModel(model_info["repo"], device="cpu", download_root=None)
                
                result["success"] = True
                result["path"] = model_info["repo"]
                
            except Exception as e:
                result["error"] = str(e)
        
        elif model_info["type"] in ("onnx", "llm"):
            # HuggingFace Hub download
            try:
                from huggingface_hub import hf_hub_download, snapshot_download
                
                sys.stdout.write(json.dumps({
                    "type": "progress",
                    "percent": 10,
                    "message": f"Downloading {model_info['display_name']} from HuggingFace..."
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
            import shutil
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
