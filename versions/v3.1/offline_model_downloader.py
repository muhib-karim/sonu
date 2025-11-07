#!/usr/bin/env python3
"""
OfflineModelDownloader - Robust, resumable model downloader for Whisper models
Uses only Python standard libraries: requests, hashlib, os, pathlib, json, time
"""

import sys
import os
import json
import time
import hashlib
from pathlib import Path
from typing import Optional, Dict, List, Callable

try:
    import requests
except ImportError:
    print(json.dumps({
        "error": "requests library not installed",
        "message": "Install with: pip install requests"
    }))
    sys.exit(1)


class OfflineModelDownloader:
    """
    Robust, resumable model downloader with mirror fallback support.
    Handles HTTP range requests, partial downloads, and integrity verification.
    """
    
    # Model definitions with GGUF filenames
    MODEL_DEFINITIONS = {
        "tiny": {
            "filename": "ggml-tiny-q5_0.gguf",
            "size_mb": 75,
            "sha256": None,  # Will verify from size if SHA not available
            "description": "Fastest, lowest accuracy - best for real-time dictation",
            "recommended_for": "≤4 cores / <8 GB RAM"
        },
        "base": {
            "filename": "ggml-base-q5_0.gguf",
            "size_mb": 145,
            "sha256": None,
            "description": "Balanced speed & accuracy - recommended for most users",
            "recommended_for": "4–8 cores / 8–16 GB RAM"
        },
        "small": {
            "filename": "ggml-small-q5_0.gguf",
            "size_mb": 480,
            "sha256": None,
            "description": "Slower but more accurate - good for high-quality transcription",
            "recommended_for": "8–12 cores / ≥16 GB RAM"
        },
        "medium": {
            "filename": "ggml-medium-q5_0.gguf",
            "size_mb": 1536,  # 1.5 GB
            "sha256": None,
            "description": "Best accuracy for CPU use - requires powerful system",
            "recommended_for": ">12 cores / ≥32 GB RAM"
        }
    }
    
    # Mirror configuration
    MIRRORS = [
        {
            "name": "Hugging Face (Primary)",
            "base_url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/"
        },
        {
            "name": "Hugging Face (Alternative)",
            "base_url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/",
            "params": {"download": "true"}
        },
        {
            "name": "Hugging Face (Raw)",
            "base_url": "https://huggingface.co/ggerganov/whisper.cpp/raw/main/"
        },
        {
            "name": "GitHub Releases",
            "base_url": "https://github.com/ggerganov/whisper.cpp/releases/download/v1.8.2/"
        }
    ]
    
    # Manual download URLs for user display
    MANUAL_DOWNLOAD_URLS = {
        "tiny": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny-q5_0.gguf",
        "base": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_0.gguf",
        "small": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_0.gguf",
        "medium": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium-q5_0.gguf"
    }
    
    def __init__(self, download_dir: Optional[str] = None):
        """
        Initialize the downloader.
        
        Args:
            download_dir: Directory to save models. If None, uses default.
        """
        self.download_dir = Path(download_dir) if download_dir else self._get_default_download_dir()
        self.download_dir.mkdir(parents=True, exist_ok=True)
        self.chunk_size = 8 * 1024 * 1024  # 8 MB chunks
        self.timeout = 30  # 30 seconds timeout
        self.max_retries = 3
        self.retry_delays = [1, 3, 7]  # Backoff delays in seconds
        
    def _get_default_download_dir(self) -> Path:
        """Get default download directory based on OS."""
        if sys.platform == "win32":
            appdata = os.environ.get("APPDATA", os.path.expanduser("~"))
            return Path(appdata) / "Sonu" / "models"
        elif sys.platform == "darwin":
            return Path.home() / "Library" / "Application Support" / "Sonu" / "models"
        else:  # Linux
            return Path.home() / ".local" / "share" / "Sonu" / "models"
    
    def get_model_info(self, model_name: str) -> Optional[Dict]:
        """Get information about a model."""
        return self.MODEL_DEFINITIONS.get(model_name)
    
    def get_manual_download_urls(self) -> Dict:
        """Get manual download URLs for all models."""
        urls = {}
        for model_name, model_def in self.MODEL_DEFINITIONS.items():
            urls[model_name] = {
                "name": model_name,
                "filename": model_def["filename"],
                "size_mb": model_def["size_mb"],
                "description": model_def["description"],
                "recommended_for": model_def["recommended_for"],
                "url": self.MANUAL_DOWNLOAD_URLS.get(model_name, "")
            }
        return urls
    
    def _calculate_sha256(self, file_path: Path) -> str:
        """Calculate SHA256 hash of a file."""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                sha256_hash.update(chunk)
        return sha256_hash.hexdigest()
    
    def _verify_file(self, file_path: Path, expected_size_mb: float, expected_sha256: Optional[str] = None) -> bool:
        """
        Verify downloaded file integrity.
        
        Args:
            file_path: Path to the file
            expected_size_mb: Expected size in MB
            expected_sha256: Expected SHA256 hash (optional)
        
        Returns:
            True if file is valid, False otherwise
        """
        if not file_path.exists():
            return False
        
        # Check file size (within 2% tolerance)
        file_size = file_path.stat().st_size
        expected_size_bytes = expected_size_mb * 1024 * 1024
        size_tolerance = expected_size_bytes * 0.02  # 2% tolerance
        
        if abs(file_size - expected_size_bytes) > size_tolerance:
            return False
        
        # Verify SHA256 if provided
        if expected_sha256:
            actual_sha256 = self._calculate_sha256(file_path)
            if actual_sha256.lower() != expected_sha256.lower():
                return False
        
        return True
    
    def _download_from_url(
        self,
        url: str,
        target_path: Path,
        on_progress: Optional[Callable] = None,
        source_name: str = ""
    ) -> bool:
        """
        Download a file from a URL with resume support.
        
        Args:
            url: URL to download from
            target_path: Path to save the file
            on_progress: Optional progress callback
            source_name: Name of the source (for progress messages)
        
        Returns:
            True if download succeeded, False otherwise
        """
        part_path = target_path.with_suffix(target_path.suffix + ".part")
        start_byte = 0
        
        # Check for existing partial download
        if part_path.exists():
            start_byte = part_path.stat().st_size
        
        headers = {
            "User-Agent": "Sonu/1.0",
            "Accept": "application/octet-stream"
        }
        
        if start_byte > 0:
            headers["Range"] = f"bytes={start_byte}-"
        
        last_progress_time = time.time()
        last_progress_bytes = start_byte
        start_time = time.time()
        
        try:
            response = requests.get(
                url,
                headers=headers,
                stream=True,
                timeout=self.timeout,
                allow_redirects=True
            )
            
            # Handle redirects (requests handles these automatically, but check anyway)
            if response.status_code in [301, 302, 303, 307, 308]:
                redirect_url = response.headers.get("Location")
                if redirect_url:
                    # Handle relative redirects
                    if not redirect_url.startswith('http'):
                        from urllib.parse import urljoin
                        redirect_url = urljoin(url, redirect_url)
                    return self._download_from_url(redirect_url, target_path, on_progress, source_name)
                return False
            
            # Handle errors
            if response.status_code not in [200, 206]:
                if on_progress:
                    on_progress({
                        "percent": 0,
                        "bytesDownloaded": 0,
                        "bytesTotal": 0,
                        "speedKB": 0,
                        "message": f"HTTP {response.status_code}: {response.reason}"
                    })
                return False
            
            # Get total size
            content_length = response.headers.get("Content-Length")
            if content_length:
                total_size = int(content_length)
                if response.status_code == 206:  # Partial content
                    total_size = start_byte + total_size
            else:
                total_size = 0
            
            # Open file for writing (append if resuming)
            mode = "ab" if start_byte > 0 else "wb"
            with open(part_path, mode) as f:
                for chunk in response.iter_content(chunk_size=self.chunk_size):
                    if chunk:
                        f.write(chunk)
                        start_byte += len(chunk)
                        
                        # Progress reporting (every 0.5 seconds)
                        now = time.time()
                        if now - last_progress_time >= 0.5:
                            time_diff = now - last_progress_time
                            bytes_diff = start_byte - last_progress_bytes
                            speed_kb = bytes_diff / time_diff / 1024 if time_diff > 0 else 0
                            
                            percent = int((start_byte / total_size * 100)) if total_size > 0 else 0
                            elapsed = now - start_time
                            remaining = ((total_size - start_byte) / 1024) / speed_kb if speed_kb > 0 and total_size > 0 else 0
                            
                            if on_progress:
                                on_progress({
                                    "percent": percent,
                                    "bytesDownloaded": start_byte,
                                    "bytesTotal": total_size,
                                    "speedKB": round(speed_kb, 1),
                                    "message": f"Downloading from {source_name}... {percent}%" if source_name else f"Downloading... {percent}%",
                                    "elapsed": int(elapsed),
                                    "remaining": int(remaining)
                                })
                            
                            last_progress_time = now
                            last_progress_bytes = start_byte
            
            # Final progress update
            if on_progress:
                on_progress({
                    "percent": 100,
                    "bytesDownloaded": start_byte,
                    "bytesTotal": total_size,
                    "speedKB": 0,
                    "message": "Download complete"
                })
            
            return True
            
        except requests.exceptions.RequestException as e:
            if on_progress:
                on_progress({
                    "percent": 0,
                    "bytesDownloaded": 0,
                    "bytesTotal": 0,
                    "speedKB": 0,
                    "message": f"Network error: {str(e)}"
                })
            return False
        except Exception as e:
            if on_progress:
                on_progress({
                    "percent": 0,
                    "bytesDownloaded": 0,
                    "bytesTotal": 0,
                    "speedKB": 0,
                    "message": f"Error: {str(e)}"
                })
            return False
    
    def download_model(
        self,
        model_name: str,
        on_progress: Optional[Callable] = None
    ) -> Dict:
        """
        Download a model with mirror fallback and resume support.
        
        Args:
            model_name: Name of the model (tiny, base, small, medium)
            on_progress: Optional progress callback
        
        Returns:
            Dictionary with download result
        """
        model_info = self.get_model_info(model_name)
        if not model_info:
            return {
                "success": False,
                "error": "Unknown model",
                "message": f"Unknown model: {model_name}"
            }
        
        target_path = self.download_dir / model_info["filename"]
        
        # Check if model already exists and is valid
        if target_path.exists():
            if self._verify_file(target_path, model_info["size_mb"], model_info.get("sha256")):
                return {
                    "success": True,
                    "model": model_name,
                    "path": str(target_path),
                    "status": "cached",
                    "cached": True,
                    "size_mb": model_info["size_mb"]
                }
            else:
                # Invalid file, remove it
                target_path.unlink()
        
        # Try each mirror
        last_error = None
        for mirror in self.MIRRORS:
            mirror_name = mirror["name"]
            base_url = mirror["base_url"]
            params = mirror.get("params", {})
            
            # Build URL
            url = base_url + model_info["filename"]
            if params:
                url += "?" + "&".join([f"{k}={v}" for k, v in params.items()])
            
            # Try with retries
            for attempt in range(self.max_retries):
                if attempt > 0:
                    delay = self.retry_delays[min(attempt - 1, len(self.retry_delays) - 1)]
                    time.sleep(delay)
                
                if on_progress:
                    on_progress({
                        "percent": 0,
                        "bytesDownloaded": 0,
                        "bytesTotal": 0,
                        "speedKB": 0,
                        "message": f"Trying {mirror_name} (attempt {attempt + 1}/{self.max_retries})..."
                    })
                
                success = self._download_from_url(url, target_path, on_progress, mirror_name)
                
                if success:
                    # Verify downloaded file
                    part_path = target_path.with_suffix(target_path.suffix + ".part")
                    if part_path.exists() and self._verify_file(part_path, model_info["size_mb"], model_info.get("sha256")):
                        # Rename .part to final file
                        if target_path.exists():
                            target_path.unlink()  # Remove old file if exists
                        part_path.rename(target_path)
                        
                        return {
                            "success": True,
                            "model": model_name,
                            "path": str(target_path),
                            "status": "downloaded",
                            "cached": False,
                            "size_mb": model_info["size_mb"],
                            "source": mirror_name
                        }
                    else:
                        # File verification failed
                        if part_path.exists():
                            part_path.unlink()
                        last_error = f"File verification failed for {mirror_name}"
                else:
                    last_error = f"Download failed from {mirror_name}"
        
        # All mirrors failed - return error with manual download info
        return {
            "success": False,
            "error": "All mirrors failed",
            "message": f"Failed to download {model_name} from all mirrors. Please download manually.",
            "manual_download_url": self.MANUAL_DOWNLOAD_URLS.get(model_name, ""),
            "manual_download_info": {
                "filename": model_info["filename"],
                "size_mb": model_info["size_mb"],
                "description": model_info["description"]
            }
        }


def main():
    """Command-line interface for the downloader."""
    if len(sys.argv) < 3:
        print(json.dumps({
            "error": "Invalid arguments",
            "usage": "python offline_model_downloader.py <command> <model_name> [download_dir]"
        }))
        sys.exit(1)
    
    command = sys.argv[1].lower()
    model_name = sys.argv[2].lower()
    download_dir = sys.argv[3] if len(sys.argv) > 3 else None
    
    downloader = OfflineModelDownloader(download_dir)
    
    if command == "download":
        def progress_callback(progress):
            print(json.dumps({"type": "progress", **progress}), flush=True)
        
        result = downloader.download_model(model_name, progress_callback)
        print(json.dumps({"type": "result", **result}), flush=True)
        
    elif command == "info":
        info = downloader.get_model_info(model_name)
        if info:
            print(json.dumps({"success": True, **info}), flush=True)
        else:
            print(json.dumps({"success": False, "error": "Unknown model"}), flush=True)
            
    elif command == "manual-urls":
        urls = downloader.get_manual_download_urls()
        print(json.dumps({"success": True, "urls": urls}), flush=True)
        
    else:
        print(json.dumps({"error": f"Unknown command: {command}"}), flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()

