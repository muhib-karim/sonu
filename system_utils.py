#!/usr/bin/env python3
"""
System utilities for SONU - Collects system information
"""
import platform
import json
import sys
import os

try:
    import psutil
except ImportError:
    psutil = None
    sys.stderr.write("psutil not available. Install with: pip install psutil\n")
    sys.stderr.flush()

try:
    import GPUtil
except ImportError:
    GPUtil = None


def get_system_info():
    """Collect system information"""
    info = {
        "Device": platform.node() or "Unknown",
        "OS": f"{platform.system()} {platform.release()}" or "Unknown",
        "Arch": platform.machine() or "Unknown",
        "App Version": "SONU v3.0.0-dev"
    }
    
    # CPU Information - improved for Windows
    try:
        cpu_info = platform.processor()
        if cpu_info and cpu_info.strip():
            info["CPU"] = cpu_info.strip()
        else:
            # Fallback for Windows
            import subprocess
            try:
                if platform.system() == "Windows":
                    result = subprocess.run(['wmic', 'cpu', 'get', 'name'], 
                                          capture_output=True, text=True, timeout=2)
                    if result.returncode == 0:
                        lines = result.stdout.strip().split('\n')
                        if len(lines) > 1:
                            cpu_name = lines[1].strip()
                            if cpu_name:
                                info["CPU"] = cpu_name
                            else:
                                info["CPU"] = "Unknown"
                        else:
                            info["CPU"] = "Unknown"
                    else:
                        info["CPU"] = "Unknown"
                else:
                    info["CPU"] = "Unknown"
            except:
                info["CPU"] = "Unknown"
    except:
        info["CPU"] = "Unknown"
    
    if psutil:
        try:
            info["Cores"] = psutil.cpu_count(logical=False) or "N/A"
            info["Threads"] = psutil.cpu_count(logical=True) or "N/A"
        except:
            info["Cores"] = "N/A"
            info["Threads"] = "N/A"
        
        try:
            ram_gb = round(psutil.virtual_memory().total / (1024**3), 1)
            info["RAM"] = f"{ram_gb} GB"
        except:
            info["RAM"] = "N/A"
    else:
        info["Cores"] = "N/A (psutil not installed)"
        info["Threads"] = "N/A (psutil not installed)"
        info["RAM"] = "N/A (psutil not installed)"
    
    # GPU Information
    if GPUtil and GPUtil.getGPUs():
        try:
            gpu = GPUtil.getGPUs()[0]
            info["GPU"] = gpu.name
        except:
            info["GPU"] = "N/A"
    else:
        info["GPU"] = "N/A"
    
    return info


def detect_gpu():
    """Detect if GPU is available"""
    try:
        import torch
        return torch.cuda.is_available()
    except ImportError:
        try:
            import subprocess
            result = subprocess.run(["nvidia-smi"], capture_output=True, timeout=2)
            return result.returncode == 0
        except Exception:
            return False


def get_system_profile():
    """Get detailed system profile with model recommendations"""
    cpu_count = os.cpu_count() or 0
    ram_gb = 0
    gpu = False
    
    if psutil:
        try:
            ram_gb = round(psutil.virtual_memory().total / (1024**3), 1)
        except:
            ram_gb = 0
    
    gpu = detect_gpu()
    os_name = platform.system()
    
    # Decision logic for model recommendation
    # Optimized for best UX - recommends one level lower for faster, smoother performance
    if ram_gb < 4 or cpu_count <= 2:
        rec = {"family": "Whisper (faster-whisper)", "model": "tiny", "reason": "Optimized for low-spec systems - fast and responsive"}
    elif ram_gb < 16 or cpu_count <= 6:
        rec = {"family": "Whisper (faster-whisper)", "model": "tiny", "reason": "Optimized for speed - instant response with good accuracy"}
    elif ram_gb < 32:
        rec = {"family": "Whisper (faster-whisper)", "model": "small", "reason": "Balanced performance - fast response with excellent accuracy"}
    else:
        rec = {"family": "Whisper (faster-whisper)", "model": "medium", "reason": "High-performance - great accuracy with fast processing"}
    
    if gpu:
        rec["note"] = "GPU detected - performance boosted"
    else:
        rec["note"] = "CPU-only mode"
    
    data = {
        "os": os_name,
        "cpu_cores": cpu_count,
        "ram_gb": ram_gb,
        "gpu": gpu,
        "recommended": rec
    }
    
    return data


def suggest_model():
    """Suggest Whisper model based on system RAM (backward compatibility)"""
    if not psutil:
        return "base"  # Default fallback
    
    try:
        ram_gb = psutil.virtual_memory().total / (1024**3)
        
        if ram_gb < 4:
            return "tiny"
        elif ram_gb < 8:
            return "base"
        elif ram_gb < 16:
            return "small"
        else:
            return "medium"
    except:
        return "base"  # Default fallback


def list_microphones():
    """List available microphone devices"""
    try:
        import pyaudio
        audio = pyaudio.PyAudio()
        devices = []
        
        for i in range(audio.get_device_count()):
            info = audio.get_device_info_by_index(i)
            if info['maxInputChannels'] > 0:
                devices.append({
                    'id': i,
                    'name': info['name'],
                    'channels': info['maxInputChannels'],
                    'sample_rate': int(info['defaultSampleRate'])
                })
        
        audio.terminate()
        return devices if devices else [{'id': 'default', 'name': 'Auto-detect (Audio)', 'channels': 1, 'sample_rate': 16000}]
    except Exception as e:
        return [{'id': 'default', 'name': 'Auto-detect (Audio)', 'channels': 1, 'sample_rate': 16000}]


if __name__ == "__main__":
    # When run directly, output JSON
    if len(sys.argv) > 1 and sys.argv[1] == "info":
        info = get_system_info()
        print(json.dumps(info, indent=2))
    elif len(sys.argv) > 1 and sys.argv[1] == "suggest-model":
        model = suggest_model()
        print(model)
    elif len(sys.argv) > 1 and sys.argv[1] == "profile":
        profile = get_system_profile()
        print(json.dumps(profile, indent=2))
    elif len(sys.argv) > 1 and sys.argv[1] == "list-microphones":
        devices = list_microphones()
        print(json.dumps(devices, indent=2))
    else:
        info = get_system_info()
        print(json.dumps(info, indent=2))

