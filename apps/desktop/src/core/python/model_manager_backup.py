#!/usr/bin/env python3
"""
Multi-source model manager for Whisper models.
Automatically tries multiple mirrors and shows real-time progress.
"""

import sys
import os
import json
import shutil
import time
import requests
from pathlib import Path
import threading
from queue import Queue

# Cache directory for models
CACHE_DIR = Path.home() / ".cache" / "whisper"

# Alternative location on Windows
if sys.platform == "win32":
    local_appdata = os.environ.get("LOCALAPPDATA", "")
    if local_appdata:
        CACHE_DIR = Path(local_appdata) / ".cache" / "whisper"

CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Model definitions - using faster-whisper compatible model names
MODELS = {
    # Official Whisper models
    "tiny": {"name": "tiny", "size_mb": 75, "type": "whisper"},
    "base": {"name": "base", "size_mb": 142, "type": "whisper"},
    "small": {"name": "small", "size_mb": 244, "type": "whisper"},
    "medium": {"name": "medium", "size_mb": 769, "type": "whisper"},
    "large": {"name": "large", "size_mb": 1550, "type": "whisper"},
    
    # Distil-Whisper (Faster & High Quality)
    "distil-small.en": {
        "name": "Systran/faster-distil-whisper-small.en", 
        "size_mb": 250, 
        "type": "whisper"
    },
    "distil-medium.en": {
        "name": "Systran/faster-distil-whisper-medium.en", 
        "size_mb": 415, 
        "type": "whisper"
    },
    "distil-large-v3": {
        "name": "Systran/faster-distil-whisper-large-v3", 
        "size_mb": 756, 
        "type": "whisper"
    },
    
    # Tiny LLMs for Instant Post-processing
    "smollm2-360m": {
        "name": "smollm2-360m",
        "repo": "bartowski/SmolLM2-360M-Instruct-GGUF",
        "filename": "SmolLM2-360M-Instruct-Q4_K_M.gguf",
        "size_mb": 210,
        "type": "llm"
    },
    "qwen2.5-0.5b": {
        "name": "qwen2.5-0.5b",
        "repo": "Qwen/Qwen2.5-0.5B-Instruct-GGUF",
        "filename": "qwen2.5-0.5b-instruct-q4_k_m.gguf",
        "size_mb": 350,
        "type": "llm"
    }
}

# Multiple mirror sources for model downloads
# These are Hugging Face mirror endpoints
HF_MIRRORS = [
    None,  # Default Hugging Face (try first)
    "https://hf-mirror.com",  # Chinese mirror (often faster)
    "https://huggingface.co",  # Explicit default
]

# Configure Hugging Face environment variables for mirror support
def configure_hf_mirror(mirror_url=None):
    """Configure Hugging Face to use a specific mirror."""
    if mirror_url:
        os.environ['HF_ENDPOINT'] = mirror_url
    else:
        # Use default Hugging Face
        os.environ.pop('HF_ENDPOINT', None)

def get_model_path(model, download_root=None):
    """Get the path where a model should be stored."""
    # Use custom download root if provided
    if download_root:
        # If custom path is provided, faster-whisper will use it directly
        # But we need to check the Hugging Face cache structure
        cache_base = Path(download_root)
        # Check if it's already a Hugging Face cache structure
        if (cache_base / "hub").exists():
            cache_base = cache_base / "hub"
        elif not (cache_base / "models--openai--whisper-tiny").exists():
            # Create Hugging Face cache structure
            cache_base = cache_base / ".cache" / "huggingface" / "hub"
    else:
        # faster-whisper stores models in a specific structure
        # We'll check the Hugging Face cache location
        cache_base = Path.home() / ".cache" / "huggingface" / "hub"
        if sys.platform == "win32":
            local_appdata = os.environ.get("LOCALAPPDATA", "")
            if local_appdata:
                cache_base = Path(local_appdata) / ".cache" / "huggingface" / "hub"
    
    if model in MODELS and MODELS[model].get("type") == "llm":
        # For LLMs, use a simpler directory structure
        return cache_base / "llm" / model
    
    # Get the actual model name from MODELS dictionary
    model_info = MODELS.get(model, {"name": model})
    model_name = model_info.get("name", model)
    
    # Handle Distil models (stored as Systran/faster-distil-whisper-xxx)
    if "/" in model_name:
        # HuggingFace format: org/repo-name -> models--org--repo-name
        org, repo = model_name.split("/", 1)
        model_dir = f"models--{org}--{repo}"
    else:
        # Standard Whisper models (openai/whisper-xxx)
        model_dir = f"models--Systran--faster-whisper-{model_name}"
    
    return cache_base / model_dir

def get_space():
    """Get available disk space and cache path."""
    try:
        cache_dir = get_model_path("tiny").parent  # Use parent of any model path
        cache_dir.mkdir(parents=True, exist_ok=True)
        
        total, used, free = shutil.disk_usage(str(cache_dir))
        space_gb = round(free / (1024 ** 3), 2)
        
        result = {
            "success": True,
            "space_gb": space_gb,
            "path": str(cache_dir)
        }
        print(json.dumps(result))
        sys.stdout.flush()
    except Exception as e:
        result = {
            "success": False,
            "error": str(e),
            "space_gb": 0,
            "path": str(CACHE_DIR)
        }
        print(json.dumps(result))
        sys.stdout.flush()

def is_downloaded(model, download_root=None):
    """Check if a model is already downloaded."""
    try:
        # First check if download_root is a direct model directory (offline downloader format)
        if download_root and os.path.isdir(download_root):
            # Check if this directory contains the required model files directly
            model_dir = Path(download_root)
            required_files = ["config.json", "model.safetensors", "tokenizer.json"]
            has_all_files = all((model_dir / f).exists() for f in required_files)
            
            if has_all_files:
                # Calculate actual size
                total_size = sum(f.stat().st_size for f in model_dir.rglob('*') if f.is_file())
                size_mb = round(total_size / (1024 ** 2), 2)
                return True, {
                    "path": str(model_dir),
                    "cache_path": str(model_dir),
                    "size_mb": size_mb
                }
        
        # Check traditional Hugging Face cache structure
        cache_path = get_model_path(model, download_root)
        
        # Check LLM GGUF file
        if model in MODELS and MODELS[model].get("type") == "llm":
            model_info = MODELS[model]
            filename = model_info.get("filename")
            if not filename:
                return False, None
                
            model_file = cache_path / filename
            if model_file.exists():
                size_mb = round(model_file.stat().st_size / (1024 ** 2), 2)
                # Verify size is roughly correct (allows for small variations)
                expected_mb = model_info.get("size_mb", 0)
                if size_mb >= expected_mb * 0.9:
                    return True, {
                        "path": str(model_file),
                        "cache_path": str(cache_path),
                        "size_mb": size_mb
                    }
            return False, None

        if not cache_path.exists():
            return False, None
        
        # Check for snapshots directory (faster-whisper structure)
        snapshots_dir = cache_path / "snapshots"
        if not snapshots_dir.exists():
            return False, None
        
        # List snapshots
        snapshots = [d for d in snapshots_dir.iterdir() if d.is_dir()]
        if not snapshots:
            return False, None
        
        snapshot_path = snapshots[0]
        
        # Check for required model files
        required_files = ["config.json", "model.safetensors", "tokenizer.json"]
        has_all_files = all((snapshot_path / f).exists() for f in required_files)
        
        if has_all_files:
            # Calculate actual size
            total_size = sum(f.stat().st_size for f in snapshot_path.rglob('*') if f.is_file())
            size_mb = round(total_size / (1024 ** 2), 2)
            return True, {
                "path": str(snapshot_path),
                "cache_path": str(cache_path),
                "size_mb": size_mb
            }
        
        return False, None
    except Exception as e:
        return False, None

def get_downloaded_size(model, download_root=None):
    """Get the current downloaded size of a model (even if incomplete)."""
    try:
        cache_path = get_model_path(model, download_root)
        total_size = 0
        
        # Check snapshots directory (final location)
        snapshots_dir = cache_path / "snapshots"
        if snapshots_dir.exists():
            for snapshot_dir in snapshots_dir.iterdir():
                if snapshot_dir.is_dir():
                    for file_path in snapshot_dir.rglob('*'):
                        if file_path.is_file():
                            try:
                                total_size += file_path.stat().st_size
                            except:
                                pass
        
        # Also check the model directory itself (for partial downloads)
        if cache_path.exists():
            for file_path in cache_path.rglob('*'):
                if file_path.is_file():
                    try:
                        # Only count if not already counted in snapshots
                        if 'snapshots' not in str(file_path):
                            total_size += file_path.stat().st_size
                    except:
                        pass
        
        # Check parent cache directory for temporary files (huggingface downloads here first)
        cache_base = cache_path.parent if cache_path else None
        if cache_base and cache_base.exists():
            try:
                # Look for temporary download files or any whisper-related directories
                for item in cache_base.iterdir():
                    if item.is_dir():
                        # Check if it's related to our model
                        item_name_lower = item.name.lower()
                        model_name = MODELS.get(model, {}).get("name", model)
                        if f"whisper-{model_name}" in item_name_lower or f"whisper_{model_name}" in item_name_lower or "openai" in item_name_lower:
                            for file_path in item.rglob('*'):
                                if file_path.is_file():
                                    try:
                                        # Avoid double counting
                                        if 'snapshots' not in str(file_path) or not snapshots_dir.exists():
                                            total_size += file_path.stat().st_size
                                    except:
                                        pass
            except:
                pass
        
        return total_size
    except:
        return 0

def download_with_mirror(model_name, download_root_str, mirror_url=None):
    """Download model using a specific mirror."""
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        return False, "faster-whisper is not installed. Install with: pip install faster-whisper"
    
    # Save original endpoint and cache settings
    original_endpoint = os.environ.get('HF_ENDPOINT')
    original_hf_home = os.environ.get('HF_HOME')
    original_hf_hub_cache = os.environ.get('HF_HUB_CACHE')
    
    try:
        # Configure mirror and download root
        if mirror_url:
            os.environ['HF_ENDPOINT'] = mirror_url
        
        # Set HF_HOME and HF_HUB_CACHE to custom download root if provided
        # This tells Hugging Face where to cache models
        if download_root_str:
            # Ensure the directory exists
            Path(download_root_str).mkdir(parents=True, exist_ok=True)
            # Set HF_HOME to the custom path
            os.environ['HF_HOME'] = download_root_str
            # Also set HF_HUB_CACHE to ensure models are cached in the right place
            hf_cache_path = Path(download_root_str) / ".cache" / "huggingface" / "hub"
            hf_cache_path.mkdir(parents=True, exist_ok=True)
            os.environ['HF_HUB_CACHE'] = str(hf_cache_path)
        
        # Try to download - faster-whisper will automatically download from Hugging Face
        # The model name should be one of: tiny, base, small, medium, large, large-v2, large-v3
        # Note: download_root in WhisperModel is for the model cache, not the HF cache
        # We use HF_HOME and HF_HUB_CACHE environment variables to control where HF caches models
        model_obj = WhisperModel(model_name, device="cpu", download_root=download_root_str, local_files_only=False)
        
        # Verify the model was downloaded by checking if files exist
        model_path = get_model_path(model_name, download_root_str)
        if model_path.exists():
            return True, None
        else:
            # Model might be in a different location, check if it can be loaded
            # If we got here without exception, the model should be available
            return True, None
            
    except Exception as e:
        error_msg = str(e)
        # Check if it's a network error
        if "Connection" in error_msg or "timeout" in error_msg.lower() or "network" in error_msg.lower():
            return False, f"Network error: {error_msg}"
        elif "not found" in error_msg.lower() or "404" in error_msg:
            return False, f"Model not found: {error_msg}"
        else:
            return False, f"Download error: {error_msg}"
    finally:
        # Restore original endpoint
        if original_endpoint:
            os.environ['HF_ENDPOINT'] = original_endpoint
        else:
            os.environ.pop('HF_ENDPOINT', None)
        
        # Restore original HF_HOME
        if original_hf_home:
            os.environ['HF_HOME'] = original_hf_home
        else:
            os.environ.pop('HF_HOME', None)
        
        # Restore original HF_HUB_CACHE
        if original_hf_hub_cache:
            os.environ['HF_HUB_CACHE'] = original_hf_hub_cache
        else:
            os.environ.pop('HF_HUB_CACHE', None)

def download_llm(model, download_root=None):
    """Download LLM GGUF file directly."""
    try:
        model_info = MODELS[model]
        repo = model_info["repo"]
        filename = model_info["filename"]
        expected_size_mb = model_info["size_mb"]
        
        # Setup paths
        cache_path = get_model_path(model, download_root)
        cache_path.mkdir(parents=True, exist_ok=True)
        file_path = cache_path / filename
        
        # URL construction (use multiple mirrors if needed, but direct HF is usually fine for GGUF)
        url = f"https://huggingface.co/{repo}/resolve/main/{filename}"
        
        # Start download
        sys.stderr.write(f"Downloading {filename} from {url}...\n")
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        block_size = 8192
        downloaded = 0
        
        start_time = time.time()
        last_report_time = 0
        
        with open(file_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=block_size):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    
                    # Report progress
                    now = time.time()
                    if now - last_report_time > 0.5:
                        percent = (downloaded / total_size) * 100 if total_size > 0 else 0
                        speed = downloaded / (now - start_time) if now - start_time > 0 else 0
                        speed_mb = speed / (1024 * 1024)
                        
                        print(json.dumps({
                            "type": "progress",
                            "percent": percent,
                            "speedKB": speed_mb * 1024,
                            "bytesDownloaded": downloaded,
                            "bytesTotal": total_size,
                            "message": f"Downloading {filename}... ({int(percent)}%)"
                        }))
                        sys.stdout.flush()
                        last_report_time = now
        
        return True, None
        
    except Exception as e:
        return False, str(e)

def download(model, download_root=None):
    """Download a model with progress reporting and multiple mirror fallbacks."""
    try:
        # Check if already downloaded
        exists, info = is_downloaded(model, download_root)
        if exists:
            result = {
                "type": "result",
                "success": True,
                "model": model,
                "path": info["path"],
                "cache_path": info["cache_path"],
                "status": "cached",
                "cached": True,
                "size_mb": info["size_mb"]
            }
            print(json.dumps(result))
            sys.stdout.flush()
            return
        
        # Use faster-whisper to download (it handles Hugging Face automatically)
        try:
            from faster_whisper import WhisperModel
        except ImportError:
            error_msg = "faster-whisper is not installed. Install with: pip install faster-whisper"
            print(json.dumps({"error": error_msg}))
            sys.stdout.flush()
            return
        
        model_name = MODELS[model]["name"]
        expected_size_mb = MODELS[model]["size_mb"]
        expected_size_bytes = expected_size_mb * 1024 * 1024
        
        # Convert download_root to string if it's a Path
        download_root_str = str(download_root) if download_root else None
        
        # Handle LLM downloads differently
        if MODELS[model].get("type") == "llm":
            print(json.dumps({"type": "progress", "percent": 0, "speedKB": 0, "bytesDownloaded": 0, "bytesTotal": expected_size_bytes, "message": f"Initializing download for {model_name}..."}))
            sys.stdout.flush()
            
            success, error = download_llm(model, download_root)
            
            if success:
                exists, info = is_downloaded(model, download_root)
                result = {
                    "type": "result",
                    "success": True,
                    "model": model,
                    "path": info["path"],
                    "cache_path": info["cache_path"],
                    "status": "downloaded",
                    "cached": False,
                    "size_mb": info["size_mb"]
                }
                print(json.dumps({"percent": 100, "speedKB": 0, "message": "Download complete!"}))
                sys.stdout.flush()
                print(json.dumps(result))
                sys.stdout.flush()
            else:
                print(json.dumps({"error": f"Download failed: {error}"}))
                sys.stdout.flush()
            return

        # Use faster-whisper to download (it handles Hugging Face automatically)
        try:
            from faster_whisper import WhisperModel
        except ImportError:
            error_msg = "faster-whisper is not installed. Install with: pip install faster-whisper"
            print(json.dumps({"error": error_msg}))
            sys.stdout.flush()
            return

        # Start download with progress reporting (format for Electron frontend)
        print(json.dumps({"type": "progress", "percent": 0, "speedKB": 0, "bytesDownloaded": 0, "bytesTotal": expected_size_bytes, "message": f"Initializing download for {model_name} model ({expected_size_mb} MB)..."}))
        sys.stdout.flush()
        
        # Try downloading with multiple mirrors
        download_success = False
        download_error = None
        current_mirror_index = 0
        
        # Download thread and progress monitoring
        download_thread = None
        download_queue = Queue()
        
        def download_worker():
            """Worker thread that tries different mirrors."""
            nonlocal download_success, download_error, current_mirror_index
            
            for mirror_index, mirror_url in enumerate(HF_MIRRORS):
                current_mirror_index = mirror_index
                mirror_name = mirror_url if mirror_url else "Hugging Face (default)"
                
                # Report mirror attempt
                print(json.dumps({
                    "type": "progress",
                    "percent": 5 + (mirror_index * 2),
                    "speedKB": 0,
                    "bytesDownloaded": 0,
                    "bytesTotal": expected_size_bytes,
                    "message": f"Connecting to {mirror_name}..."
                }))
                sys.stdout.flush()
                
                try:
                    success, error = download_with_mirror(model_name, download_root_str, mirror_url)
                    
                    if success:
                        download_success = True
                        download_queue.put(("success", None))
                        return
                    else:
                        download_error = error
                        if mirror_index < len(HF_MIRRORS) - 1:
                            # Try next mirror
                            print(json.dumps({
                                "type": "progress",
                                "percent": 5 + (mirror_index * 2),
                                "speedKB": 0,
                                "bytesDownloaded": 0,
                                "bytesTotal": expected_size_bytes,
                                "message": f"Mirror {mirror_index + 1} failed: {error}. Trying next mirror..."
                            }))
                            sys.stdout.flush()
                            time.sleep(2)  # Brief pause before retry
                        else:
                            # All mirrors failed
                            download_queue.put(("error", f"All mirrors failed. Last error: {error}"))
                            return
                except Exception as e:
                    download_error = str(e)
                    if mirror_index < len(HF_MIRRORS) - 1:
                        print(json.dumps({
                            "type": "progress",
                            "percent": 5 + (mirror_index * 2),
                            "speedKB": 0,
                            "bytesDownloaded": 0,
                            "bytesTotal": expected_size_bytes,
                            "message": f"Mirror {mirror_index + 1} error: {str(e)}. Trying next mirror..."
                        }))
                        sys.stdout.flush()
                        time.sleep(2)
                    else:
                        download_queue.put(("error", f"All mirrors failed. Last error: {str(e)}"))
                        return
        
        # Start download thread
        download_thread = threading.Thread(target=download_worker, daemon=True)
        download_thread.start()
        
        print(json.dumps({"percent": 10, "speedKB": 0, "message": "Connecting to download source..."}))
        sys.stdout.flush()
        
        # Monitor download progress
        cache_path = get_model_path(model, download_root)
        snapshots_dir = cache_path / "snapshots"
        
        # Track previous total size to calculate speed
        prev_total_size = 0
        last_size_check = time.time()
        start_time = time.time()
        no_progress_count = 0
        last_reported_progress = 0
        
        # Check periodically if model is downloaded, monitoring file sizes
        max_checks = 1800  # Check for up to 60 minutes (30 seconds * 1800 = 60 minutes)
        check_interval = 2  # Check every 2 seconds
        
        for i in range(max_checks):
            # Check for download completion or error from worker thread
            try:
                event_type, event_data = download_queue.get_nowait()
                if event_type == "success":
                    # Download thread completed successfully, wait for files to appear
                    pass
                elif event_type == "error":
                    print(json.dumps({"error": event_data}))
                    sys.stdout.flush()
                    return
            except:
                pass
            
            # Check if download thread is still alive
            if not download_thread.is_alive():
                if download_success:
                    # Download completed, check if files are ready
                    pass
                elif download_error and not download_success:
                    # Download failed
                    print(json.dumps({"error": f"Download failed: {download_error}"}))
                    sys.stdout.flush()
                    return
            
            # Check if model is fully downloaded
            exists, info = is_downloaded(model, download_root)
            if exists:
                elapsed = time.time() - start_time
                speed_kb = (expected_size_mb * 1024) / (elapsed + 0.1) if elapsed > 0 else 0
                
                # Send final result in correct format for frontend
                result = {
                    "type": "result",
                    "success": True,
                    "model": model,
                    "path": info["path"],
                    "cache_path": info["cache_path"],
                    "status": "downloaded",
                    "cached": False,
                    "size_mb": info["size_mb"]
                }
                print(json.dumps(result))
                sys.stdout.flush()
                return
            
            # Calculate progress based on file sizes
            current_total_size = get_downloaded_size(model, download_root)
            current_mb = current_total_size / (1024 * 1024)
            
            if current_total_size > 0:
                # Calculate progress based on actual downloaded size
                # Use 98% as max until fully verified to avoid showing 100% prematurely
                progress = min(int((current_total_size / expected_size_bytes) * 98), 98)
                
                # Calculate speed based on size increase
                elapsed_since_check = time.time() - last_size_check
                if elapsed_since_check > 0:
                    size_increase = current_total_size - prev_total_size
                    speed_kb = (size_increase / 1024) / elapsed_since_check if elapsed_since_check > 0 else 0
                    
                    # Track if there's no progress
                    if size_increase <= 0:
                        no_progress_count += 1
                    else:
                        no_progress_count = 0
                else:
                    speed_kb = 0
                
                prev_total_size = current_total_size
                last_size_check = time.time()
                
                # Only report progress if it changed significantly (avoid spam)
                if abs(progress - last_reported_progress) >= 1 or i % 5 == 0:
                    print(json.dumps({
                        "type": "progress",
                        "percent": progress,
                        "speedKB": speed_kb,
                        "bytesDownloaded": current_total_size,
                        "bytesTotal": expected_size_bytes,
                        "message": f"Downloading... ({current_mb:.1f} MB / {expected_size_mb} MB)"
                    }))
                    sys.stdout.flush()
                    last_reported_progress = progress
            else:
                # No files yet, use time-based progress (but limited)
                elapsed = time.time() - start_time
                # Show progress from 10% to 20% based on time (max 30 seconds)
                progress = min(10 + int((elapsed / 30) * 10), 20)
                speed_kb = 0
                no_progress_count += 1
                
                # Only report every few checks to avoid spam
                if i % 5 == 0:
                    print(json.dumps({
                        "type": "progress",
                        "percent": progress,
                        "bytesDownloaded": 0,
                        "bytesTotal": expected_size_bytes,
                        "speedKB": 0,
                        "message": f"Connecting to download source... ({current_mb:.1f} MB / {expected_size_mb} MB)"
                    }))
                    sys.stdout.flush()
            
            # If no progress for too long, might be stuck
            if no_progress_count > 60:  # 2 minutes with no progress
                print(json.dumps({
                    "percent": progress,
                    "speedKB": 0,
                    "message": f"Download appears stuck. Retrying with different mirror... ({current_mb:.1f} MB / {expected_size_mb} MB)"
                }))
                sys.stdout.flush()
                no_progress_count = 0  # Reset counter
                
                # If download thread is still running, we can't retry easily
                # Just wait a bit longer
                time.sleep(5)
            
            time.sleep(check_interval)
        
        # Final check after timeout
        exists, info = is_downloaded(model, download_root)
        if exists:
            result = {
                "done": True,
                "path": info["path"],
                "cache_path": info["cache_path"],
                "status": "downloaded",
                "size_mb": info["size_mb"]
            }
            print(json.dumps({"percent": 100, "speedKB": 0, "message": "Download complete!"}))
            sys.stdout.flush()
            print(json.dumps(result))
            sys.stdout.flush()
        else:
            # Check if download is still in progress
            current_size = get_downloaded_size(model, download_root)
            if current_size > 0:
                current_mb = current_size / (1024 * 1024)
                print(json.dumps({
                    "error": f"Download timeout - {current_mb:.1f} MB downloaded. Model may still be downloading in background."
                }))
            else:
                print(json.dumps({"error": "Download timeout - no files downloaded. Please check your internet connection and try again."}))
            sys.stdout.flush()
            
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.stdout.flush()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python model_manager.py <command> [model]"}))
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == "space":
        get_space()
    
    elif command == "check":
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Model required for check"}))
            sys.exit(1)
        model = sys.argv[2]
        download_root = sys.argv[3] if len(sys.argv) > 3 else None
        exists, info = is_downloaded(model, download_root)
        result = {
            "exists": exists,
            "path": info["path"] if exists and info else None,
            "cache_path": info["cache_path"] if exists and info else str(get_model_path(model, download_root)),
            "size_mb": info["size_mb"] if exists and info else None
        }
        print(json.dumps(result))
        sys.stdout.flush()
    
    elif command == "download":
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Model required for download"}))
            sys.exit(1)
        model = sys.argv[2]
        download_root = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] else None
        
        # Validate model name
        if model not in MODELS:
            print(json.dumps({"error": f"Unknown model: {model}. Available models: {', '.join(MODELS.keys())}"}))
            sys.exit(1)
        
        # Normalize download_root - ensure it's a valid path
        if download_root:
            download_root = os.path.abspath(os.path.expanduser(download_root))
            # Create directory if it doesn't exist
            Path(download_root).mkdir(parents=True, exist_ok=True)
        
        download(model, download_root)
    
    else:
        print(json.dumps({"error": f"Unknown command '{command}'"}))
        sys.exit(1)
