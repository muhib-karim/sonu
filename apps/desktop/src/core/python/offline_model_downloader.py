#!/usr/bin/env python3
"""
SONU Offline Model Downloader
Handles robust model downloading with progress reporting.
"""
import sys
import json
import os
import time
from pathlib import Path

# Add src/core/python to path to reuse model_manager logic
sys.path.append(os.path.dirname(__file__))

# Try to import from model_manager - this is the authoritative source
MODELS = None
download_model = None
get_models_dir = None

try:
    from model_manager import MODELS, download_model, get_models_dir
except ImportError as e:
    print(json.dumps({"type": "error", "message": f"Failed to import model_manager: {e}"}), file=sys.stderr)
    # Fallback definitions if model_manager import fails
    MODELS = {
        "tiny": {"type": "whisper", "size_mb": 75, "url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin", "filename": "ggml-tiny.bin", "display_name": "Whisper Tiny"},
        "base": {"type": "whisper", "size_mb": 142, "url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin", "filename": "ggml-base.bin", "display_name": "Whisper Base"},
        "small": {"type": "whisper", "size_mb": 466, "url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin", "filename": "ggml-small.bin", "display_name": "Whisper Small"},
        "medium": {"type": "whisper", "size_mb": 1500, "url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin", "filename": "ggml-medium.bin", "display_name": "Whisper Medium"},
        "large-v3": {"type": "whisper", "size_mb": 2900, "url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin", "filename": "ggml-large-v3.bin", "display_name": "Whisper Large V3"},
        "distil-small.en": {"type": "faster-whisper", "repo": "Systran/faster-distil-whisper-small.en", "size_mb": 250, "display_name": "Distil Small (English)"},
        "distil-medium.en": {"type": "faster-whisper", "repo": "Systran/faster-distil-whisper-medium.en", "size_mb": 420, "display_name": "Distil Medium (English)"},
        "moonshine-tiny": {"type": "onnx", "repo": "UsefulSensors/moonshine-tiny", "size_mb": 150, "display_name": "Moonshine Tiny"},
        "moonshine-base": {"type": "onnx", "repo": "UsefulSensors/moonshine-base", "size_mb": 250, "display_name": "Moonshine Base"},
    }

def main():
    if len(sys.argv) < 4 or sys.argv[1] != "download":
        print(json.dumps({"type": "result", "success": False, "error": "Invalid arguments. Usage: python offline_model_downloader.py download <model_name> <download_path>"}))
        sys.stdout.flush()
        return

    model_name = sys.argv[2]
    download_path = sys.argv[3]

    # Set environment variable for model_manager
    os.environ["SONU_MODELS_DIR"] = download_path

    # Check if model exists
    if MODELS is None:
        print(json.dumps({"type": "result", "success": False, "error": "Model definitions not loaded"}))
        sys.stdout.flush()
        return

    if model_name not in MODELS:
        available = list(MODELS.keys())
        print(json.dumps({
            "type": "result",
            "success": False,
            "error": f"Unknown model: {model_name}. Available models: {', '.join(available[:10])}..."
        }))
        sys.stdout.flush()
        return

    # Report starting
    model_info = MODELS[model_name]
    display_name = model_info.get("display_name", model_name)
    print(json.dumps({
        "type": "progress",
        "percent": 5,
        "message": f"Starting download of {display_name}..."
    }))
    sys.stdout.flush()

    # Use the download_model function from model_manager
    if download_model is not None:
        try:
            download_model(model_name)
            # download_model already prints the result JSON
        except Exception as e:
            print(json.dumps({
                "type": "result",
                "success": False,
                "error": f"Download failed: {str(e)}"
            }))
            sys.stdout.flush()
    else:
        # Fallback: basic download implementation
        try:
            from huggingface_hub import snapshot_download

            model_info = MODELS[model_name]
            repo = model_info.get("repo")

            if not repo:
                print(json.dumps({
                    "type": "result",
                    "success": False,
                    "error": f"Model {model_name} does not have a repository defined"
                }))
                sys.stdout.flush()
                return

            print(json.dumps({
                "type": "progress",
                "percent": 20,
                "message": f"Downloading from {repo}..."
            }))
            sys.stdout.flush()

            local_path = snapshot_download(
                repo_id=repo,
                local_dir=Path(download_path) / repo.replace("/", "--"),
                local_dir_use_symlinks=False
            )

            print(json.dumps({
                "type": "result",
                "success": True,
                "model": model_name,
                "path": local_path,
                "size_mb": model_info.get("size_mb", 0),
                "status": "downloaded"
            }))
            sys.stdout.flush()

        except Exception as e:
            print(json.dumps({
                "type": "result",
                "success": False,
                "error": str(e)
            }))
            sys.stdout.flush()

if __name__ == "__main__":
    main()
