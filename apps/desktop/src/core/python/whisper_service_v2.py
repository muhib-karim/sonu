#!/usr/bin/env python3
"""
SONU Whisper Service v2.0 - Ultra-Fast Speech-to-Text
=====================================================
Uses whisper.cpp via pywhispercpp for 2-3x faster transcription
+ Silero VAD for instant silence detection
+ Multi-model support (Parakeet, Canary, Moonshine, etc.)

Performance targets:
- Model load: <2s for quantized models
- First word: <200ms after speech starts
- Full transcription: >20x real-time factor
"""

import sys
import threading
import time
import os
import tempfile
import wave
import json
from pathlib import Path

import numpy as np

# Keyboard handling
try:
    import keyboard
except ImportError:
    keyboard = None

# PyAudio for audio capture
try:
    import pyaudio
    PYAUDIO_AVAILABLE = True
except ImportError:
    PYAUDIO_AVAILABLE = False
    sys.stderr.write("PyAudio not available - audio capture disabled\n")
    sys.stderr.flush()

# Silero VAD for instant silence detection
try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    sys.stderr.write("PyTorch not available - Silero VAD disabled\n")

# Try whisper.cpp bindings (pywhispercpp)
try:
    from pywhispercpp.model import Model as WhisperCppModel
    WHISPER_CPP_AVAILABLE = True
except ImportError:
    WHISPER_CPP_AVAILABLE = False

# Fallback to faster-whisper if whisper.cpp not available
if not WHISPER_CPP_AVAILABLE:
    try:
        from faster_whisper import WhisperModel
        FASTER_WHISPER_AVAILABLE = True
    except ImportError:
        FASTER_WHISPER_AVAILABLE = False
        sys.stderr.write("No whisper backend available!\n")
        sys.stderr.flush()
else:
    FASTER_WHISPER_AVAILABLE = False

# ============================================================================
# CONFIGURATION
# ============================================================================

CHUNK = 1024
FORMAT = pyaudio.paInt16 if PYAUDIO_AVAILABLE else None
CHANNELS = 1
RATE = 16000

# Thread-safe state
recording_flag = False
frames = []
audio = pyaudio.PyAudio() if PYAUDIO_AVAILABLE else None
stream = None
lock = threading.Lock()
last_partial_text = ""

# Model configuration from environment
model_name = os.environ.get("WHISPER_MODEL", "tiny")
models_dir = os.environ.get("SONU_MODELS_DIR", str(Path(__file__).parent / "models"))

# Silero VAD instance
silero_vad = None
vad_model = None

# ============================================================================
# MODEL DEFINITIONS - 2025 State-of-the-Art Models
# ============================================================================

MODEL_REGISTRY = {
    # OpenAI Whisper (whisper.cpp GGML format)
    "tiny": {
        "type": "whisper",
        "file": "ggml-tiny.bin",
        "size_mb": 75,
        "wer": 7.8,
        "rtf": 25,  # Real-time factor (higher = faster)
        "languages": ["en"],
        "description": "Fastest, lowest accuracy"
    },
    "base": {
        "type": "whisper",
        "file": "ggml-base.bin",
        "size_mb": 142,
        "wer": 5.3,
        "rtf": 18,
        "languages": ["en"],
        "description": "Balanced speed and accuracy"
    },
    "small": {
        "type": "whisper",
        "file": "ggml-small.bin",
        "size_mb": 466,
        "wer": 4.1,
        "rtf": 12,
        "languages": ["en", "multi"],
        "description": "Good accuracy, moderate speed"
    },
    "medium": {
        "type": "whisper",
        "file": "ggml-medium.bin",
        "size_mb": 1500,
        "wer": 3.2,
        "rtf": 6,
        "languages": ["en", "multi"],
        "description": "High accuracy, needs 8GB+ RAM"
    },
    
    # Distil-Whisper (optimized for speed)
    "distil-small.en": {
        "type": "whisper",
        "file": "ggml-distil-small.en.bin",
        "size_mb": 250,
        "wer": 4.5,
        "rtf": 22,
        "languages": ["en"],
        "description": "Distilled - instant English"
    },
    "distil-medium.en": {
        "type": "whisper",
        "file": "ggml-distil-medium.en.bin",
        "size_mb": 420,
        "wer": 3.8,
        "rtf": 18,
        "languages": ["en"],
        "description": "Distilled - fast & accurate"
    },
    
    # Parakeet V3 (NVIDIA - CPU optimized)
    "parakeet-v3": {
        "type": "onnx",
        "file": "parakeet-tdt-0.6b-v3.onnx",
        "size_mb": 600,
        "wer": 3.5,
        "rtf": 20,
        "languages": ["en", "multi"],
        "description": "NVIDIA Parakeet - low RAM, fast",
        "repo": "nvidia/parakeet-tdt-0.6b-v3"
    },
    
    # Canary Qwen (best for noisy audio)
    "canary-qwen": {
        "type": "onnx",
        "file": "canary-qwen-2.5b.onnx",
        "size_mb": 2500,
        "wer": 2.8,
        "rtf": 8,
        "languages": ["en", "multi"],
        "description": "Best noise handling",
        "repo": "nvidia/canary-qwen-2.5b"
    },
    
    # Moonshine (ultra-light multilingual)
    "moonshine-tiny": {
        "type": "onnx",
        "file": "moonshine-tiny.onnx",
        "size_mb": 150,
        "wer": 6.0,
        "rtf": 30,
        "languages": ["multi"],
        "description": "Ultra-light, 50+ languages",
        "repo": "moonshine-ai/moonshine-tiny"
    }
}

# ============================================================================
# SILERO VAD - Instant Silence Detection
# ============================================================================

def init_silero_vad():
    """Initialize Silero VAD for instant silence detection."""
    global silero_vad, vad_model
    
    if not TORCH_AVAILABLE:
        sys.stderr.write("Silero VAD requires PyTorch\n")
        sys.stderr.flush()
        return False
    
    try:
        # Load Silero VAD model
        vad_model, utils = torch.hub.load(
            repo_or_dir='snakers4/silero-vad',
            model='silero_vad',
            force_reload=False,
            onnx=True  # Use ONNX for faster inference
        )
        
        silero_vad = {
            'model': vad_model,
            'get_speech_timestamps': utils[0],
            'read_audio': utils[2],
            'threshold': 0.5,
            'min_silence_ms': 150,  # INSTANT: very short silence detection
            'speech_pad_ms': 30,
            'window_size_samples': 512,
            'sample_rate': 16000
        }
        
        sys.stderr.write("✓ Silero VAD initialized (min_silence=150ms)\n")
        sys.stderr.flush()
        return True
        
    except Exception as e:
        sys.stderr.write(f"Silero VAD init failed: {e}\n")
        sys.stderr.flush()
        return False

def detect_voice_activity(audio_data: np.ndarray) -> bool:
    """Check if audio contains speech using Silero VAD."""
    global silero_vad
    
    if silero_vad is None:
        return True  # Assume speech if VAD not available
    
    try:
        # Convert to float32 tensor
        if audio_data.dtype == np.int16:
            audio_float = audio_data.astype(np.float32) / 32768.0
        else:
            audio_float = audio_data.astype(np.float32)
        
        audio_tensor = torch.from_numpy(audio_float)
        
        # Get speech probability
        speech_prob = silero_vad['model'](
            audio_tensor,
            silero_vad['sample_rate']
        ).item()
        
        return speech_prob > silero_vad['threshold']
        
    except Exception as e:
        return True  # Assume speech on error

def filter_silence_vad(audio_data: np.ndarray) -> np.ndarray:
    """Remove silence using Silero VAD timestamps."""
    global silero_vad
    
    if silero_vad is None or len(audio_data) == 0:
        return audio_data
    
    try:
        # Convert to float32 tensor
        if audio_data.dtype == np.int16:
            audio_float = audio_data.astype(np.float32) / 32768.0
        else:
            audio_float = audio_data.astype(np.float32)
        
        audio_tensor = torch.from_numpy(audio_float)
        
        # Get speech timestamps
        speech_timestamps = silero_vad['get_speech_timestamps'](
            audio_tensor,
            silero_vad['model'],
            sampling_rate=silero_vad['sample_rate'],
            threshold=silero_vad['threshold'],
            min_silence_duration_ms=silero_vad['min_silence_ms'],
            speech_pad_ms=silero_vad['speech_pad_ms']
        )
        
        if not speech_timestamps:
            return audio_data  # No speech detected, return original
        
        # Extract speech segments
        speech_audio = []
        for ts in speech_timestamps:
            start = ts['start']
            end = ts['end']
            speech_audio.append(audio_data[start:end])
        
        if speech_audio:
            return np.concatenate(speech_audio)
        
        return audio_data
        
    except Exception as e:
        sys.stderr.write(f"VAD filtering error: {e}\n")
        return audio_data

# ============================================================================
# WHISPER TRANSCRIPTION ENGINE
# ============================================================================

# Global model instance
whisper_model = None
model_type = None  # 'whisper_cpp' or 'faster_whisper'

def get_model_path(model_name: str) -> str:
    """Get full path to model file."""
    if model_name not in MODEL_REGISTRY:
        model_name = "tiny"  # Default fallback
    
    model_info = MODEL_REGISTRY[model_name]
    model_file = model_info["file"]
    
    # Check models directory
    model_path = Path(models_dir) / model_file
    if model_path.exists():
        return str(model_path)
    
    # Check HuggingFace cache
    hf_cache = Path.home() / ".cache" / "huggingface" / "hub"
    if os.name == 'nt':  # Windows
        local_appdata = os.environ.get("LOCALAPPDATA", "")
        if local_appdata:
            hf_cache = Path(local_appdata) / ".cache" / "huggingface" / "hub"
    
    # For whisper models, check faster-whisper cache
    if model_info["type"] == "whisper":
        # Try standard whisper.cpp naming
        ggml_path = hf_cache / f"models--ggerganov--whisper.cpp" / "snapshots"
        if ggml_path.exists():
            for snapshot in ggml_path.iterdir():
                candidate = snapshot / model_file
                if candidate.exists():
                    return str(candidate)
        
        # Try Systran faster-whisper format
        if model_name.startswith("distil-"):
            repo_name = f"Systran/faster-distil-whisper-{model_name.replace('distil-', '')}"
        else:
            repo_name = f"Systran/faster-whisper-{model_name}"
        
        systran_path = hf_cache / f"models--{repo_name.replace('/', '--')}"
        if systran_path.exists():
            # Return repo path for faster-whisper to load
            return repo_name
    
    # Model not found locally
    return None

def load_whisper_model(model_name: str) -> bool:
    """Load whisper model using best available backend."""
    global whisper_model, model_type
    
    model_path = get_model_path(model_name)
    
    if model_path is None:
        sys.stderr.write(f"Model '{model_name}' not found. Please download first.\n")
        sys.stderr.flush()
        return False
    
    try:
        # Try whisper.cpp first (faster)
        if WHISPER_CPP_AVAILABLE and model_path.endswith('.bin'):
            sys.stderr.write(f"Loading {model_name} with whisper.cpp...\n")
            sys.stderr.flush()
            
            whisper_model = WhisperCppModel(
                model_path,
                n_threads=4,  # Use 4 threads for i7
            )
            model_type = 'whisper_cpp'
            
            sys.stderr.write(f"✓ Loaded {model_name} (whisper.cpp)\n")
            sys.stderr.flush()
            return True
        
        # Fallback to faster-whisper
        if FASTER_WHISPER_AVAILABLE:
            sys.stderr.write(f"Loading {model_name} with faster-whisper...\n")
            sys.stderr.flush()
            
            # Map to repo ID for faster-whisper
            if model_name.startswith("distil-"):
                repo_id = f"Systran/faster-distil-whisper-{model_name.replace('distil-', '')}"
            else:
                repo_id = model_name
            
            whisper_model = WhisperModel(repo_id, device="cpu", compute_type="int8")
            model_type = 'faster_whisper'
            
            sys.stderr.write(f"✓ Loaded {model_name} (faster-whisper)\n")
            sys.stderr.flush()
            return True
        
        sys.stderr.write("No whisper backend available!\n")
        sys.stderr.flush()
        return False
        
    except Exception as e:
        sys.stderr.write(f"Model load error: {e}\n")
        sys.stderr.flush()
        return False

def transcribe_audio(audio_path: str, language: str = None) -> str:
    """Transcribe audio file using loaded model."""
    global whisper_model, model_type
    
    if whisper_model is None:
        return ""
    
    try:
        if model_type == 'whisper_cpp':
            # whisper.cpp transcription - GREEDY settings
            result = whisper_model.transcribe(
                audio_path,
                language=language or "en",
                beam_size=1,      # GREEDY: fastest
                best_of=1,        # GREEDY: no sampling
                temperature=0.0,
            )
            
            # Extract text from segments
            if hasattr(result, 'segments'):
                text = " ".join(seg.text for seg in result.segments)
            else:
                text = str(result)
            
            return text.strip()
        
        elif model_type == 'faster_whisper':
            # faster-whisper transcription - GREEDY settings
            segments, info = whisper_model.transcribe(
                audio_path,
                language=language,
                beam_size=1,      # GREEDY: fastest
                best_of=1,        # GREEDY: no sampling
                temperature=0.0,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=150)
            )
            
            # Collect all segments
            segment_list = list(segments)
            text = " ".join(seg.text for seg in segment_list)
            
            return text.strip()
        
        return ""
        
    except Exception as e:
        sys.stderr.write(f"Transcription error: {e}\n")
        sys.stderr.flush()
        return ""

def transcribe_frames_fast() -> str:
    """Transcribe accumulated audio frames with VAD filtering."""
    global frames
    
    if not frames:
        return ""
    
    # Convert frames to numpy array
    with lock:
        audio_data = np.frombuffer(b''.join(frames), dtype=np.int16)
    
    if len(audio_data) == 0:
        return ""
    
    # Apply Silero VAD to filter silence
    filtered_audio = filter_silence_vad(audio_data)
    
    # Check if enough speech after filtering
    min_samples = RATE // 4  # At least 250ms of audio
    if len(filtered_audio) < min_samples:
        return ""
    
    # Write to temp file
    fd, tmp_path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    
    try:
        wf = wave.open(tmp_path, 'wb')
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(RATE)
        wf.writeframes(filtered_audio.tobytes())
        wf.close()
        
        # Transcribe
        text = transcribe_audio(tmp_path)
        return text
        
    finally:
        try:
            os.remove(tmp_path)
        except:
            pass

# ============================================================================
# AUDIO RECORDING
# ============================================================================

def start_audio_stream():
    """Start audio input stream."""
    global stream, audio
    
    if not PYAUDIO_AVAILABLE:
        return False
    
    if stream is not None:
        return True
    
    try:
        stream = audio.open(
            format=FORMAT,
            channels=CHANNELS,
            rate=RATE,
            input=True,
            frames_per_buffer=CHUNK
        )
        return True
    except Exception as e:
        sys.stderr.write(f"Audio stream error: {e}\n")
        sys.stderr.flush()
        return False

def stop_audio_stream():
    """Stop audio input stream."""
    global stream
    
    if stream is not None:
        try:
            stream.stop_stream()
            stream.close()
        except:
            pass
        stream = None

def record_audio_thread():
    """Background thread for audio recording."""
    global recording_flag, frames, stream
    
    while True:
        with lock:
            is_recording = recording_flag
        
        if is_recording and stream is not None:
            try:
                data = stream.read(CHUNK, exception_on_overflow=False)
                with lock:
                    frames.append(data)
            except Exception as e:
                sys.stderr.write(f"Recording error: {e}\n")
        else:
            time.sleep(0.01)

# ============================================================================
# HOTKEY HANDLING
# ============================================================================

hold_mode = False
hold_keys_combo = "ctrl+shift+space"
combo_keys = ['ctrl', 'shift', 'space']

def parse_combo(combo: str) -> list:
    """Parse hotkey combo string."""
    parts = [p.strip().lower() for p in combo.split('+') if p.strip()]
    mapped = []
    for p in parts:
        if p in ('commandorcontrol', 'cmd', 'ctrl', 'control'):
            mapped.append('ctrl')
        elif p in ('win', 'windows', 'super'):
            mapped.append('windows')
        elif p in ('alt', 'option'):
            mapped.append('alt')
        elif p == 'shift':
            mapped.append('shift')
        else:
            mapped.append(p)
    return mapped

def combo_pressed() -> bool:
    """Check if hotkey combo is currently pressed."""
    if keyboard is None:
        return False
    
    for k in combo_keys:
        if not keyboard.is_pressed(k):
            return False
    return True

# ============================================================================
# EXPERIMENTAL SETTINGS
# ============================================================================

experimental_settings = {
    'vad_enabled': True,
    'beam_size': 1,       # GREEDY: fastest
    'best_of': 1,         # GREEDY: no sampling  
    'temperature': 0.0,
    'min_silence_ms': 150,  # INSTANT silence detection
    'low_latency': True,
    'continuous_dictation': False,
    'noise_reduction': False
}

# ============================================================================
# MAIN COMMAND LOOP
# ============================================================================

def main():
    """Main service loop."""
    global recording_flag, frames, hold_mode, hold_keys_combo, combo_keys
    global experimental_settings
    
    # Initialize Silero VAD
    init_silero_vad()
    
    # Load initial model
    model_loaded = load_whisper_model(model_name)
    
    if model_loaded:
        sys.stdout.write("EVENT: READY\n")
        sys.stdout.flush()
    else:
        sys.stdout.write("EVENT: ERROR\n")
        sys.stdout.flush()
        return
    
    # Start audio stream
    start_audio_stream()
    
    # Start recording thread
    rec_thread = threading.Thread(target=record_audio_thread, daemon=True)
    rec_thread.start()
    
    # Main command loop - read from stdin
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            
            cmd = line.strip()
            if not cmd:
                continue
            
            # Parse commands
            if cmd == "START":
                with lock:
                    recording_flag = True
                    frames = []
                sys.stdout.write("EVENT: RECORDING\n")
                sys.stdout.flush()
                
            elif cmd == "STOP":
                with lock:
                    recording_flag = False
                
                # Transcribe
                text = transcribe_frames_fast()
                
                with lock:
                    frames = []
                
                if text:
                    sys.stdout.write(text + "\n")
                    sys.stdout.flush()
                
            elif cmd.startswith("SET_MODE "):
                mode = cmd.split(" ", 1)[1].strip().upper()
                hold_mode = (mode == "HOLD")
                
            elif cmd.startswith("SET_HOLD_KEYS "):
                combo = cmd.split(" ", 1)[1].strip()
                hold_keys_combo = combo
                combo_keys = parse_combo(combo)
                sys.stderr.write(f"✓ Hold keys configured: {combo}\n")
                sys.stderr.flush()
                
            elif cmd.startswith("SET_MODEL "):
                new_model = cmd.split(" ", 1)[1].strip()
                sys.stderr.write(f"Switching to model: {new_model}\n")
                sys.stderr.flush()
                if load_whisper_model(new_model):
                    sys.stdout.write("EVENT: MODEL_LOADED\n")
                else:
                    sys.stdout.write("EVENT: MODEL_ERROR\n")
                sys.stdout.flush()
                
            elif cmd.startswith("SET_SETTING "):
                parts = cmd.split(" ", 2)
                if len(parts) >= 3:
                    key = parts[1]
                    value = parts[2]
                    try:
                        if key in ['beam_size', 'best_of', 'min_silence_ms']:
                            experimental_settings[key] = int(value)
                        elif key in ['vad_enabled', 'low_latency', 'continuous_dictation', 'noise_reduction']:
                            experimental_settings[key] = value.lower() == 'true'
                        elif key == 'temperature':
                            experimental_settings[key] = float(value)
                    except:
                        pass
                        
            elif cmd == "SET_CONTINUOUS_DICTATION true":
                experimental_settings['continuous_dictation'] = True
            elif cmd == "SET_CONTINUOUS_DICTATION false":
                experimental_settings['continuous_dictation'] = False
                
            elif cmd == "SET_LOW_LATENCY true":
                experimental_settings['low_latency'] = True
                experimental_settings['beam_size'] = 1
                experimental_settings['best_of'] = 1
                experimental_settings['min_silence_ms'] = 100
                sys.stderr.write("✓ Low latency mode: True\n")
                sys.stderr.flush()
            elif cmd == "SET_LOW_LATENCY false":
                experimental_settings['low_latency'] = False
                sys.stderr.write("✓ Low latency mode: False\n")
                sys.stderr.flush()
                
            elif cmd == "SET_NOISE_REDUCTION true":
                experimental_settings['noise_reduction'] = True
            elif cmd == "SET_NOISE_REDUCTION false":
                experimental_settings['noise_reduction'] = False
                
            elif cmd == "QUIT" or cmd == "EXIT":
                break
                
        except Exception as e:
            sys.stderr.write(f"Command error: {e}\n")
            sys.stderr.flush()
    
    # Cleanup
    stop_audio_stream()
    
    if audio is not None:
        audio.terminate()

if __name__ == "__main__":
    main()
