#!/usr/bin/env python3
"""
Model downloader for Whisper models using faster-whisper.
This script downloads and verifies Whisper models.
"""

import sys
import os
from pathlib import Path

try:
    from faster_whisper import WhisperModel
except ImportError:
    sys.stderr.write("Error: faster-whisper is not installed.\n")
    sys.stderr.write("Install it with: pip install faster-whisper\n")
    sys.stderr.flush()
    sys.exit(1)


def get_model_cache_path(model_size):
    """Get the cache path where faster-whisper stores models."""
    try:
        # Try to get the cache directory from faster-whisper
        # faster-whisper uses Hugging Face cache by default
        cache_dir = os.path.join(
            os.path.expanduser("~"),
            ".cache",
            "huggingface",
            "hub"
        )
        
        # Alternative location on Windows
        if sys.platform == "win32":
            local_appdata = os.environ.get("LOCALAPPDATA", "")
            if local_appdata:
                cache_dir = os.path.join(local_appdata, ".cache", "huggingface", "hub")
        
        # Model directory pattern: models--openai--whisper-{size}
        model_dir = f"models--openai--whisper-{model_size}"
        full_path = os.path.join(cache_dir, model_dir)
        
        return full_path
    except Exception as e:
        return None


def check_model_exists(model_size):
    """Check if a model is already downloaded."""
    cache_path = get_model_cache_path(model_size)
    if cache_path and os.path.exists(cache_path):
        # Check if it has the necessary files
        snapshots_dir = os.path.join(cache_path, "snapshots")
        if os.path.exists(snapshots_dir):
            # List snapshots
            snapshots = [d for d in os.listdir(snapshots_dir) if os.path.isdir(os.path.join(snapshots_dir, d))]
            if snapshots:
                snapshot_path = os.path.join(snapshots_dir, snapshots[0])
                # Check for model files
                model_files = ["config.json", "model.safetensors", "tokenizer.json"]
                has_files = all(os.path.exists(os.path.join(snapshot_path, f)) for f in model_files)
                if has_files:
                    return True, snapshot_path
    return False, None


def download_model(model_size):
    """Download a Whisper model using faster-whisper."""
    try:
        # Check if model already exists
        exists, path = check_model_exists(model_size)
        if exists:
            return {
                "success": True,
                "model": model_size,
                "cached": True,
                "path": path,
                "message": f"Model '{model_size}' already exists in cache"
            }
        
        # Download the model by loading it
        # This will trigger the download if it doesn't exist
        print(f"Downloading model '{model_size}'...", file=sys.stderr)
        sys.stderr.flush()
        
        model = WhisperModel(model_size, device="cpu", download_root=None)
        
        # Verify it was downloaded
        exists, path = check_model_exists(model_size)
        if exists:
            return {
                "success": True,
                "model": model_size,
                "cached": False,
                "path": path,
                "message": f"Model '{model_size}' downloaded successfully"
            }
        else:
            return {
                "success": True,
                "model": model_size,
                "cached": False,
                "path": None,
                "message": f"Model '{model_size}' loaded (may be in different cache location)"
            }
    except Exception as e:
        return {
            "success": False,
            "model": model_size,
            "error": str(e),
            "message": f"Failed to download model '{model_size}': {str(e)}"
        }


def get_model_info(model_size):
    """Get information about a model (size, location, etc.)."""
    exists, path = check_model_exists(model_size)
    cache_path = get_model_cache_path(model_size)
    
    info = {
        "model": model_size,
        "exists": exists,
        "cache_path": cache_path,
        "model_path": path
    }
    
    if exists and path:
        # Calculate size
        try:
            total_size = 0
            for root, dirs, files in os.walk(path):
                for file in files:
                    file_path = os.path.join(root, file)
                    if os.path.exists(file_path):
                        total_size += os.path.getsize(file_path)
            info["size_mb"] = round(total_size / (1024 * 1024), 2)
        except Exception:
            info["size_mb"] = None
    
    return info


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python model_downloader.py <command> [model_size]")
        print("Commands: download, check, info")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == "download":
        if len(sys.argv) < 3:
            print("Error: Model size required for download")
            sys.exit(1)
        model_size = sys.argv[2]
        result = download_model(model_size)
        import json
        print(json.dumps(result, indent=2))
    elif command == "check":
        if len(sys.argv) < 3:
            print("Error: Model size required for check")
            sys.exit(1)
        model_size = sys.argv[2]
        exists, path = check_model_exists(model_size)
        result = {
            "exists": exists,
            "path": path,
            "cache_path": get_model_cache_path(model_size)
        }
        import json
        print(json.dumps(result, indent=2))
    elif command == "info":
        if len(sys.argv) < 3:
            print("Error: Model size required for info")
            sys.exit(1)
        model_size = sys.argv[2]
        info = get_model_info(model_size)
        import json
        print(json.dumps(info, indent=2))
    else:
        print(f"Error: Unknown command '{command}'")
        sys.exit(1)

