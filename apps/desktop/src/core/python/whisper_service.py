#!/usr/bin/env python3
"""
SONU Whisper Service - Professional Offline Voice Typing
========================================================
Speech-to-text transcription with multi-language support.
Supports 40+ languages with automatic language detection.

Features:
- Multi-language transcription (40+ languages)
- Automatic language detection
- Real-time partial results
- Silero VAD for instant silence detection
- Faster-Whisper CPU-optimized engine

Supported Languages:
English, Spanish, French, German, Chinese, Japanese, Korean, Portuguese,
Russian, Italian, Dutch, Swedish, Danish, Norwegian, Finnish, Polish,
Turkish, Arabic, Hebrew, Hindi, Thai, Vietnamese, Indonesian, Malay,
Czech, Slovak, Hungarian, Romanian, Bulgarian, Croatian, Serbian,
Ukrainian, Greek, Catalan, Basque, Galician, Irish, Welsh, and more
"""

import sys
import threading
import time
import os
import tempfile
import wave
import json
from pathlib import Path
from typing import Optional, Dict, List, Tuple

import numpy as np

# Keyboard monitoring for hold-to-record
PYNPUT_AVAILABLE = False
keyboard_listener = None
try:
    from pynput import keyboard as pynput_keyboard

    PYNPUT_AVAILABLE = True
except ImportError:
    PYNPUT_AVAILABLE = False
    sys.stderr.write("Warning: pynput not available - hold-to-record may not work\n")

# Audio capture
PYAUDIO_AVAILABLE = False
audio = None

try:
    import pyaudio

    PYAUDIO_AVAILABLE = True
except ImportError:
    PYAUDIO_AVAILABLE = False
    sys.stderr.write("Warning: PyAudio not available\n")

# PyTorch for Silero VAD
TORCH_AVAILABLE = False
try:
    import torch

    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

# Faster-Whisper for transcription
FASTER_WHISPER_AVAILABLE = False
try:
    from faster_whisper import WhisperModel

    FASTER_WHISPER_AVAILABLE = True
except ImportError:
    FASTER_WHISPER_AVAILABLE = False
    sys.stderr.write("Warning: faster-whisper not available\n")

# ONNX Runtime for NVIDIA models (Parakeet, Canary)
ONNX_AVAILABLE = False
try:
    import onnxruntime as ort

    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False
    sys.stderr.write("Warning: onnxruntime not available\n")

# Moonshine for ultra-light multilingual (UsefulSensors)
MOONSHINE_AVAILABLE = False
moonshine_transcribe = None
Moonshine = None

try:
    from moonshine import transcribe as moonshine_transcribe
    from moonshine.model import Moonshine

    MOONSHINE_AVAILABLE = True
except ImportError:
    MOONSHINE_AVAILABLE = False
except Exception:
    MOONSHINE_AVAILABLE = False

# ============================================================================
# CONFIGURATION
# ============================================================================

CHUNK = 1024
CHANNELS = 1
RATE = 16000

# Initialize pyaudio if available
if PYAUDIO_AVAILABLE:
    try:
        audio = pyaudio.PyAudio()
    except Exception as e:
        sys.stderr.write(f"PyAudio initialization error: {e}\n")
        PYAUDIO_AVAILABLE = False
        audio = None

# Thread-safe state
recording_flag = False
frames = []
stream = None
lock = threading.Lock()
last_partial_text = ""

# Microphone idle management - release mic after idle timeout
last_recording_time = 0.0
MIC_IDLE_TIMEOUT = 30.0  # Seconds of idle before releasing microphone
mic_idle_timer = None

# Continuous dictation state
continuous_mode = False
continuous_thread = None
continuous_stop_event = None
last_transcription = ""
silence_start_time = None
SILENCE_THRESHOLD_MS = 800  # Pause detection threshold

# Model configuration from environment
model_name = os.environ.get("WHISPER_MODEL", "base")
models_dir = os.environ.get("SONU_MODELS_DIR", str(Path(__file__).parent / "models"))

# ============================================================================
# MULTI-LANGUAGE SUPPORT - 40+ Languages
# ============================================================================

# Whisper language codes and their full names
LANGUAGE_NAMES = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "pt": "Portuguese",
    "ru": "Russian",
    "it": "Italian",
    "nl": "Dutch",
    "sv": "Swedish",
    "da": "Danish",
    "no": "Norwegian",
    "fi": "Finnish",
    "pl": "Polish",
    "tr": "Turkish",
    "ar": "Arabic",
    "he": "Hebrew",
    "hi": "Hindi",
    "th": "Thai",
    "vi": "Vietnamese",
    "id": "Indonesian",
    "ms": "Malay",
    "cs": "Czech",
    "sk": "Slovak",
    "hu": "Hungarian",
    "ro": "Romanian",
    "bg": "Bulgarian",
    "hr": "Croatian",
    "sr": "Serbian",
    "uk": "Ukrainian",
    "el": "Greek",
    "ca": "Catalan",
    "eu": "Basque",
    "ga": "Irish",
    "cy": "Welsh",
    "gl": "Galician",
    "fa": "Persian",
    "ur": "Urdu",
    "af": "Afrikaans",
    "sw": "Swahili",
    "bn": "Bengali",
    "ta": "Tamil",
    "te": "Telugu",
    "ml": "Malayalam",
    "kn": "Kannada",
    "gu": "Gujarati",
    "mr": "Marathi",
    "pa": "Punjabi",
    "ne": "Nepali",
    "si": "Sinhala",
    "km": "Khmer",
    "lo": "Lao",
}

# Auto-detect language settings
auto_detect_language = True
current_language = "en"

# ============================================================================
# SILERO VAD - Instant Silence Detection
# ============================================================================

silero_vad = None
vad_model = None


def init_silero_vad() -> bool:
    """Initialize Silero VAD for instant silence detection."""
    global silero_vad, vad_model

    if not TORCH_AVAILABLE:
        sys.stderr.write("Silero VAD: PyTorch not available\n")
        return False

    try:
        hub_result = torch.hub.load(
            repo_or_dir="snakers4/silero-vad",
            model="silero_vad",
            force_reload=False,
            onnx=True,
        )

        if isinstance(hub_result, (list, tuple)):
            vad_model = hub_result[0]
            utils = hub_result[1]
        else:
            vad_model = hub_result
            utils = None

        silero_vad = {
            "model": vad_model,
            "get_speech_timestamps": utils[0] if utils and len(utils) > 0 else None,
            "read_audio": utils[2] if utils and len(utils) > 2 else None,
            "threshold": 0.5,
            "min_silence_ms": 300,
            "speech_pad_ms": 30,
            "window_size_samples": 512,
            "sample_rate": 16000,
        }

        sys.stderr.write("Silero VAD initialized\n")
        return True

    except Exception as e:
        sys.stderr.write(f"Silero VAD init failed: {e}\n")
        return False


def detect_voice_activity(audio_data: np.ndarray) -> bool:
    """Check if audio contains speech using Silero VAD."""
    global silero_vad

    if silero_vad is None:
        return True

    try:
        if audio_data.dtype == np.int16:
            audio_float = audio_data.astype(np.float32) / 32768.0
        else:
            audio_float = audio_data.astype(np.float32)

        audio_tensor = torch.from_numpy(audio_float)
        speech_prob = silero_vad["model"](
            audio_tensor, silero_vad["sample_rate"]
        ).item()
        return speech_prob > silero_vad["threshold"]

    except Exception as e:
        sys.stderr.write(f"VAD detection error: {e}\n")
        return True


def filter_silence_vad(audio_data: np.ndarray) -> np.ndarray:
    """Remove silence using Silero VAD timestamps."""
    global silero_vad

    if silero_vad is None or len(audio_data) == 0:
        return audio_data

    if silero_vad["get_speech_timestamps"] is None:
        return audio_data

    try:
        if audio_data.dtype == np.int16:
            audio_float = audio_data.astype(np.float32) / 32768.0
        else:
            audio_float = audio_data.astype(np.float32)

        audio_tensor = torch.from_numpy(audio_float)

        speech_timestamps = silero_vad["get_speech_timestamps"](
            audio_tensor,
            silero_vad["model"],
            sampling_rate=silero_vad["sample_rate"],
            threshold=silero_vad["threshold"],
            min_silence_duration_ms=silero_vad["min_silence_ms"],
            speech_pad_ms=silero_vad["speech_pad_ms"],
        )

        if not speech_timestamps:
            return audio_data

        speech_audio = []
        for ts in speech_timestamps:
            start = ts["start"]
            end = ts["end"]
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

whisper_model = None
moonshine_model = None
onnx_session = None
model_type = None

# Model type detection based on model name
MODEL_TYPE_MAP = {
    # Moonshine models
    "moonshine-tiny": "moonshine",
    "moonshine-base": "moonshine",
    # ONNX/NVIDIA models (not yet fully implemented)
    "parakeet-v3": "onnx",
    "canary-qwen": "onnx",
    # All other models use faster-whisper
}


def load_faster_whisper_model(model_name: str) -> bool:
    """Load model using faster-whisper library with CPU optimization for older laptops."""
    global whisper_model, model_type

    if not FASTER_WHISPER_AVAILABLE:
        sys.stderr.write("Error: faster-whisper not available\n")
        return False

    try:
        # Map model names to faster-whisper HuggingFace repo format
        # Standard models: tiny, base, small, medium, large-v2, large-v3
        # Distil models: distil-small.en, distil-medium.en, distil-large-v3

        if model_name.startswith("distil-"):
            # Distil models: distil-small.en -> Systran/faster-distil-whisper-small.en
            repo_id = (
                f"Systran/faster-distil-whisper-{model_name.replace('distil-', '')}"
            )
        elif model_name.startswith("faster-"):
            # Already prefixed faster- models: faster-tiny -> Systran/faster-whisper-tiny
            repo_id = f"Systran/faster-whisper-{model_name.replace('faster-', '')}"
        elif model_name in [
            "tiny",
            "tiny.en",
            "base",
            "base.en",
            "small",
            "small.en",
            "medium",
            "medium.en",
            "large",
            "large-v2",
            "large-v3",
        ]:
            # Standard Whisper model names -> Systran repo
            repo_id = f"Systran/faster-whisper-{model_name}"
        elif "/" in model_name:
            # Already a full HuggingFace repo ID
            repo_id = model_name
        else:
            # Fallback: try as-is (might be a local path or custom model)
            repo_id = model_name

        # Check if download_root should be None (use HF cache) or local dir
        download_root = None
        if models_dir and Path(models_dir).exists():
            local_model_path = Path(models_dir) / f"{model_name}.bin"
            if local_model_path.exists():
                download_root = models_dir

        sys.stderr.write(f"Loading model: {repo_id}\n")

        # Detect CPU cores for optimal thread count
        try:
            import multiprocessing
            cpu_count = multiprocessing.cpu_count()
            # Use 2/3 of available cores, minimum 2, maximum 8
            optimal_threads = max(2, min(8, (cpu_count * 2) // 3))
        except:
            optimal_threads = 4

        sys.stderr.write(f"Using {optimal_threads} CPU threads for inference\n")

        # Optimized settings for older laptops (2018 era)
        whisper_model = WhisperModel(
            repo_id,
            device="cpu",
            compute_type="int8",  # Fastest for CPU, minimal quality loss
            cpu_threads=optimal_threads,
            download_root=download_root,
            num_workers=1,  # Single worker to reduce memory
        )
        model_type = "faster_whisper"

        sys.stderr.write(f"✓ Model '{model_name}' loaded successfully\n")
        return True

    except Exception as e:
        sys.stderr.write(f"Faster-whisper load error: {e}\n")
        return False


def load_moonshine_model(model_name: str) -> bool:
    """Load Moonshine ultra-light model."""
    global moonshine_model, model_type

    if not MOONSHINE_AVAILABLE or Moonshine is None:
        sys.stderr.write("Error: moonshine package not installed\n")
        sys.stderr.write("Install with: pip install moonshine\n")
        return False

    try:
        sys.stderr.write(f"Loading Moonshine model: {model_name}\n")

        # Moonshine uses model names like 'moonshine/tiny', 'moonshine/base'
        size = model_name.replace("moonshine-", "")  # 'tiny', 'base'
        moonshine_model = Moonshine(f"moonshine/{size}")
        model_type = "moonshine"

        sys.stderr.write(f"✓ Moonshine '{model_name}' loaded successfully\n")
        return True

    except Exception as e:
        sys.stderr.write(f"Moonshine load error: {e}\n")
        return False


def load_onnx_model(model_name: str) -> bool:
    """Load ONNX model (Parakeet, Canary, SenseVoice, Moonshine).

    For 2018-era laptops, ONNX Runtime provides efficient CPU inference.
    Falls back to faster-whisper for models without ONNX support.
    """
    global onnx_session, model_type, whisper_model

    if not ONNX_AVAILABLE:
        sys.stderr.write("Error: onnxruntime not available\n")
        sys.stderr.write("Install with: pip install onnxruntime\n")
        return False

    try:
        # Check for ONNX model files in models directory
        models_path = Path(models_dir)

        # Model-specific ONNX paths - updated for correct repos
        onnx_paths = {
            "parakeet-v3": [
                # Correct ONNX paths from istupakov/parakeet-tdt-0.6b-v3-onnx
                models_path / "parakeet-v3-onnx" / "encoder-model.onnx",  # Auto-downloaded path
                models_path / "parakeet-v3-onnx" / "encoder-model.int8.onnx",  # INT8 quantized
                models_path / "parakeet-v3" / "encoder-model.onnx",
                models_path / "istupakov--parakeet-tdt-0.6b-v3-onnx" / "encoder-model.onnx",
                # Legacy paths
                models_path / "parakeet-v3" / "encoder.onnx",
                models_path / "nvidia--parakeet-tdt-0.6b-v3" / "model.onnx",
            ],
            "canary-1b": [
                models_path / "canary-1b" / "model.onnx",
                models_path / "nvidia--canary-1b" / "model.onnx",
            ],
            "moonshine-tiny": [
                models_path / "moonshine-tiny" / "preprocess.onnx",
                models_path / "UsefulSensors--moonshine-tiny" / "preprocess.onnx",
            ],
            "sensevoice": [
                models_path / "sensevoice" / "model.onnx",
                models_path / "FunAudioLLM--SenseVoiceSmall" / "model.onnx",
            ],
        }

        model_paths = onnx_paths.get(model_name, [])
        onnx_file = None

        for p in model_paths:
            if p.exists():
                onnx_file = p
                break

        if onnx_file and onnx_file.exists():
            sys.stderr.write(f"Loading ONNX model from {onnx_file}\n")

            # Configure ONNX Runtime for CPU optimization
            sess_options = ort.SessionOptions()
            sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

            # Detect optimal thread count
            try:
                import multiprocessing
                cpu_count = multiprocessing.cpu_count()
                optimal_threads = max(2, min(8, (cpu_count * 2) // 3))
            except:
                optimal_threads = 4

            sess_options.intra_op_num_threads = optimal_threads
            sess_options.inter_op_num_threads = 2

            # Use CPU execution provider
            providers = ['CPUExecutionProvider']

            onnx_session = ort.InferenceSession(
                str(onnx_file),
                sess_options=sess_options,
                providers=providers
            )
            model_type = "onnx"
            sys.stderr.write(f"✓ ONNX model '{model_name}' loaded with {optimal_threads} threads\n")
            return True
        else:
            # ONNX file not found - try moonshine package for moonshine models
            if model_name.startswith("moonshine") and MOONSHINE_AVAILABLE:
                sys.stderr.write(f"ONNX file not found, trying moonshine package\n")
                return load_moonshine_model(model_name)

            # Try to auto-download Parakeet ONNX model if not found
            if model_name == "parakeet-v3":
                sys.stderr.write(f"Parakeet ONNX not found, attempting auto-download...\n")
                try:
                    from huggingface_hub import snapshot_download
                    repo_id = "istupakov/parakeet-tdt-0.6b-v3-onnx"
                    local_dir = models_path / "parakeet-v3-onnx"
                    
                    sys.stderr.write(f"Downloading {repo_id}...\n")
                    snapshot_download(
                        repo_id=repo_id,
                        local_dir=str(local_dir),
                        local_dir_use_symlinks=False
                    )
                    sys.stderr.write(f"✓ Parakeet ONNX downloaded to {local_dir}\n")
                    
                    # Check if encoder-model.onnx exists after download
                    # Try INT8 quantized first (smaller, faster), then full precision
                    encoder_path = local_dir / "encoder-model.int8.onnx"
                    if not encoder_path.exists():
                        encoder_path = local_dir / "encoder-model.onnx"
                    
                    if encoder_path.exists():
                        onnx_file = encoder_path
                        sess_options = ort.SessionOptions()
                        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
                        
                        try:
                            import multiprocessing
                            cpu_count = multiprocessing.cpu_count()
                            optimal_threads = max(2, min(8, (cpu_count * 2) // 3))
                        except:
                            optimal_threads = 4
                        
                        sess_options.intra_op_num_threads = optimal_threads
                        sess_options.inter_op_num_threads = 2
                        providers = ['CPUExecutionProvider']
                        
                        onnx_session = ort.InferenceSession(
                            str(onnx_file),
                            sess_options=sess_options,
                            providers=providers
                        )
                        model_type = "onnx"
                        sys.stderr.write(f"✓ Parakeet v3 ONNX loaded with {optimal_threads} threads\n")
                        return True
                except Exception as e:
                    sys.stderr.write(f"Failed to auto-download Parakeet ONNX: {e}\n")

            # Fall back to faster-whisper for best compatibility
            sys.stderr.write(f"ONNX model '{model_name}' not found locally\n")
            sys.stderr.write("Falling back to faster-whisper (distil-small.en) for best CPU performance\n")

            if FASTER_WHISPER_AVAILABLE:
                # Use distil-small.en as it's optimized for speed on older hardware
                return load_faster_whisper_model("distil-small.en")

            return False

    except Exception as e:
        sys.stderr.write(f"ONNX load error: {e}\n")

        # Fallback to faster-whisper
        if FASTER_WHISPER_AVAILABLE:
            sys.stderr.write("Falling back to faster-whisper\n")
            return load_faster_whisper_model("distil-small.en")

        return False


def load_whisper_model(model_name: str) -> bool:
    """Load model based on type - routes to appropriate engine."""
    global whisper_model, moonshine_model, onnx_session, model_type

    # Reset all models
    whisper_model = None
    moonshine_model = None
    onnx_session = None
    model_type = None

    # Determine engine type
    engine_type = MODEL_TYPE_MAP.get(model_name, "faster_whisper")

    if engine_type == "moonshine":
        return load_moonshine_model(model_name)
    elif engine_type == "onnx":
        return load_onnx_model(model_name)
    else:
        return load_faster_whisper_model(model_name)


def transcribe_audio(
    audio_path: str, language: Optional[str] = None
) -> Tuple[str, str]:
    """Transcribe audio file with language detection - supports multiple engines."""
    global whisper_model, moonshine_model, onnx_session, model_type, current_language

    try:
        # Determine language
        lang = language if language is not None else current_language
        if auto_detect_language:
            lang = None  # Let engine auto-detect

        if (
            model_type == "moonshine"
            and moonshine_model is not None
            and moonshine_transcribe is not None
        ):
            # Moonshine transcription
            try:
                text = moonshine_transcribe(audio_path)
                if isinstance(text, list):
                    text = " ".join(text)
                return text.strip(), lang if lang is not None else "en"
            except Exception as e:
                sys.stderr.write(f"Moonshine transcription error: {e}\n")
                return "", current_language

        elif model_type == "onnx" and onnx_session is not None:
            # ONNX transcription (for Parakeet, SenseVoice, etc.)
            try:
                import soundfile as sf
                import scipy.signal

                # Load and preprocess audio
                audio_data, sample_rate = sf.read(audio_path)

                # Resample to 16kHz if needed
                if sample_rate != 16000:
                    num_samples = int(len(audio_data) * 16000 / sample_rate)
                    audio_data = scipy.signal.resample(audio_data, num_samples)

                # Convert to float32 and normalize
                if audio_data.dtype != np.float32:
                    audio_data = audio_data.astype(np.float32)

                # Get input name from ONNX model
                input_name = onnx_session.get_inputs()[0].name
                input_shape = onnx_session.get_inputs()[0].shape

                # Prepare input (batch dimension if needed)
                if len(input_shape) == 2:
                    audio_input = audio_data.reshape(1, -1)
                else:
                    audio_input = audio_data

                # Run inference
                outputs = onnx_session.run(None, {input_name: audio_input})

                # Process output (model-specific)
                if outputs and len(outputs) > 0:
                    result = outputs[0]
                    if isinstance(result, np.ndarray):
                        # Decode output tokens if needed
                        text = str(result)
                    else:
                        text = str(result)
                else:
                    text = ""

                return text.strip(), lang if lang else "en"

            except Exception as e:
                sys.stderr.write(f"ONNX transcription error: {e}\n")
                # Fallback to faster-whisper if available
                if whisper_model is not None:
                    return transcribe_with_faster_whisper(audio_path, lang)
                return "", current_language

        elif model_type == "faster_whisper" and whisper_model is not None:
            return transcribe_with_faster_whisper(audio_path, lang)

        else:
            sys.stderr.write(f"No model loaded for transcription\n")
            return "", current_language

    except Exception as e:
        sys.stderr.write(f"Transcription error: {e}\n")
        return "", current_language


def transcribe_with_faster_whisper(audio_path: str, lang: Optional[str]) -> Tuple[str, str]:
    """Transcribe using faster-whisper engine with speed optimizations."""
    global whisper_model, current_language

    try:
        # Speed-optimized transcription settings
        # beam_size=1 is fastest (greedy decoding)
        # temperature=0 for deterministic output
        # vad_filter removes silence for faster processing
        segments, info = whisper_model.transcribe(
            audio_path,
            language=lang,
            beam_size=1,          # Greedy decoding - fastest
            best_of=1,            # No sampling
            temperature=0.0,      # Deterministic
            vad_filter=True,      # Skip silence for speed
            vad_parameters=dict(
                min_silence_duration_ms=200,  # Faster silence detection
                speech_pad_ms=100,            # Less padding
                threshold=0.4,                # More aggressive VAD
            ),
            no_speech_threshold=0.5,          # More lenient
            compression_ratio_threshold=2.4,  # Standard
            condition_on_previous_text=False, # Faster processing
            word_timestamps=False,            # Skip word-level timing
        )

        segment_list = list(segments)
        text = " ".join(seg.text.strip() for seg in segment_list)
        detected_lang = (
            info.language if hasattr(info, "language") else current_language
        )

        return text.strip(), detected_lang if detected_lang else current_language

    except Exception as e:
        sys.stderr.write(f"Faster-whisper transcription error: {e}\n")
        return "", current_language


def transcribe_frames_fast() -> Tuple[str, str]:
    """Transcribe accumulated audio frames."""
    global frames, current_language

    if not frames:
        return "", current_language

    # Convert frames to numpy array
    with lock:
        audio_data = np.frombuffer(b"".join(frames), dtype=np.int16)

    if len(audio_data) == 0:
        return "", current_language

    # Apply Silero VAD to filter silence
    filtered_audio = filter_silence_vad(audio_data)

    # Check if enough speech
    min_samples = RATE // 2  # At least 500ms
    if len(filtered_audio) < min_samples:
        return "", current_language

    # Write to temp file
    fd, tmp_path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)

    try:
        wf = wave.open(tmp_path, "wb")
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(2)
        wf.setframerate(RATE)
        wf.writeframes(filtered_audio.tobytes())
        wf.close()

        # Transcribe
        text, detected_lang = transcribe_audio(tmp_path, None)

        # Update current language if auto-detected
        if auto_detect_language and detected_lang:
            current_language = detected_lang

        return text, current_language

    finally:
        try:
            os.remove(tmp_path)
        except:
            pass


# ============================================================================
# CONTINUOUS DICTATION MODE
# ============================================================================


def continuous_dictation_worker():
    """Background thread for continuous dictation with VAD-based segmentation.

    Continuously monitors audio, detects speech segments using Silero VAD,
    and sends transcriptions in real-time. Pauses are detected to segment
    natural sentence boundaries.
    """
    global continuous_mode, frames, silence_start_time, last_transcription
    global continuous_stop_event

    WINDOW_SIZE = RATE * 2  # 2 seconds of audio for processing
    SPEECH_CHECK_INTERVAL = 0.3  # Check for speech every 300ms
    SEGMENT_BUFFER = []
    last_check_time = time.time()

    sys.stderr.write("Continuous dictation worker started\n")

    while continuous_mode and (
        continuous_stop_event is None or not continuous_stop_event.is_set()
    ):
        try:
            current_time = time.time()

            # Only process every SPEECH_CHECK_INTERVAL
            if current_time - last_check_time < SPEECH_CHECK_INTERVAL:
                time.sleep(0.05)
                continue

            last_check_time = current_time

            # Get current frames
            with lock:
                if not frames:
                    continue
                current_frames = frames.copy()

            # Convert to numpy
            audio_data = np.frombuffer(b"".join(current_frames), dtype=np.int16)

            if len(audio_data) < RATE // 4:  # Less than 250ms
                continue

            # Get last 2 seconds for VAD check
            window_samples = min(len(audio_data), WINDOW_SIZE)
            recent_audio = audio_data[-window_samples:]

            # Check for speech
            has_speech = detect_voice_activity(recent_audio)

            if has_speech:
                # Reset silence timer
                silence_start_time = None

                # If we have enough audio, generate partial transcription
                if len(audio_data) > RATE:  # More than 1 second
                    # Transcribe for partial
                    text, lang = transcribe_frames_fast()

                    if text and text.strip() and text != last_transcription:
                        last_transcription = text
                        sys.stdout.write(f"PARTIAL:{text}\n")
                        sys.stdout.flush()
            else:
                # No speech detected - track silence duration
                if silence_start_time is None:
                    silence_start_time = current_time
                else:
                    silence_duration_ms = (current_time - silence_start_time) * 1000

                    # If silence exceeds threshold, finalize segment
                    if silence_duration_ms >= SILENCE_THRESHOLD_MS:
                        if len(audio_data) > RATE // 2:  # At least 500ms of audio
                            # Transcribe final segment
                            text, lang = transcribe_frames_fast()

                            if text and text.strip():
                                sys.stdout.write(f"SEGMENT:{text}\n")
                                sys.stdout.write(f"LANG:{lang}\n")
                                sys.stdout.flush()
                                last_transcription = ""

                            # Clear frames for next segment
                            with lock:
                                frames = []

                        # Reset silence timer
                        silence_start_time = None

        except Exception as e:
            sys.stderr.write(f"Continuous dictation error: {e}\n")
            time.sleep(0.1)

    sys.stderr.write("Continuous dictation worker stopped\n")


def start_continuous_dictation():
    """Start continuous dictation mode."""
    global continuous_mode, continuous_thread, continuous_stop_event
    global frames, last_transcription, silence_start_time

    if continuous_mode:
        return  # Already running

    # Reset state
    with lock:
        frames = []
    last_transcription = ""
    silence_start_time = None

    # Start continuous mode
    continuous_mode = True
    continuous_stop_event = threading.Event()

    continuous_thread = threading.Thread(
        target=continuous_dictation_worker, daemon=True
    )
    continuous_thread.start()

    sys.stdout.write("EVENT: CONTINUOUS_STARTED\n")
    sys.stdout.flush()
    sys.stderr.write("Continuous dictation mode started\n")


def stop_continuous_dictation():
    """Stop continuous dictation mode."""
    global continuous_mode, continuous_thread, continuous_stop_event, frames

    if not continuous_mode:
        return

    continuous_mode = False

    if continuous_stop_event:
        continuous_stop_event.set()

    # Final transcription of any remaining audio
    text, lang = transcribe_frames_fast()
    if text and text.strip():
        sys.stdout.write(f"SEGMENT:{text}\n")
        sys.stdout.write(f"LANG:{lang}\n")
        sys.stdout.flush()

    # Wait for thread to finish
    if continuous_thread and continuous_thread.is_alive():
        continuous_thread.join(timeout=2.0)

    continuous_thread = None
    continuous_stop_event = None

    # Clear frames
    with lock:
        frames = []

    sys.stdout.write("EVENT: CONTINUOUS_STOPPED\n")
    sys.stdout.flush()
    sys.stderr.write("Continuous dictation mode stopped\n")


# ============================================================================
# AUDIO RECORDING
# ============================================================================


def start_audio_stream() -> bool:
    """Start audio input stream."""
    global stream, audio

    if not PYAUDIO_AVAILABLE:
        sys.stderr.write("Error: PyAudio not available\n")
        return False

    if stream is not None:
        return True

    if audio is None:
        sys.stderr.write("Error: PyAudio not initialized\n")
        return False

    try:
        stream = audio.open(
            format=pyaudio.paInt16,
            channels=CHANNELS,
            rate=RATE,
            input=True,
            frames_per_buffer=CHUNK,
        )
        return True
    except Exception as e:
        sys.stderr.write(f"Audio stream error: {e}\n")
        return False


def stop_audio_stream():
    """Stop audio input stream."""
    global stream

    if stream is not None:
        try:
            stream.stop_stream()
            stream.close()
            sys.stderr.write("Microphone released (idle timeout)\\n")
        except:
            pass
        stream = None


def schedule_mic_release():
    """Schedule microphone release after idle timeout."""
    global mic_idle_timer, last_recording_time

    # Cancel any existing timer
    if mic_idle_timer is not None:
        mic_idle_timer.cancel()

    # Schedule new timer
    def release_mic():
        global stream
        if not recording_flag and stream is not None:
            stop_audio_stream()

    mic_idle_timer = threading.Timer(MIC_IDLE_TIMEOUT, release_mic)
    mic_idle_timer.daemon = True
    mic_idle_timer.start()


def ensure_mic_ready():
    """Ensure microphone is ready for recording."""
    global mic_idle_timer

    # Cancel idle timer if running
    if mic_idle_timer is not None:
        mic_idle_timer.cancel()
        mic_idle_timer = None

    # Start audio stream if not running
    if stream is None:
        start_audio_stream()


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
# EXPERIMENTAL SETTINGS
# ============================================================================

experimental_settings = {
    "vad_enabled": True,
    "beam_size": 1,
    "best_of": 1,
    "temperature": 0.0,
    "min_silence_ms": 300,
    "low_latency": True,
    "continuous_dictation": False,
    "noise_reduction": False,
    "auto_detect_language": True,
    "language": "en",
}

# ============================================================================
# MAIN COMMAND LOOP
# ============================================================================

hold_mode = False
hold_keys_combo = "ctrl+shift+space"
combo_keys = ["ctrl", "shift", "space"]
keys_pressed = set()  # Track currently pressed keys
hold_key_monitor_active = False


def parse_combo(combo: str) -> List[str]:
    """Parse hotkey combo string."""
    parts = [p.strip().lower() for p in combo.split("+") if p.strip()]
    mapped = []
    for p in parts:
        if p in ("commandorcontrol", "cmd", "ctrl", "control"):
            mapped.append("ctrl")
        elif p in ("win", "windows", "super"):
            mapped.append("windows")
        elif p in ("alt", "option"):
            mapped.append("alt")
        elif p == "shift":
            mapped.append("shift")
        else:
            mapped.append(p)
    return mapped


# ============================================================================
# KEYBOARD MONITORING FOR HOLD-TO-RECORD
# ============================================================================


def get_key_name(key) -> Optional[str]:
    """Get normalized key name from pynput key."""
    if not PYNPUT_AVAILABLE:
        return None

    try:
        # Check for special keys
        if hasattr(key, "name"):
            name = key.name.lower()
            if name in ("ctrl_l", "ctrl_r", "ctrl"):
                return "ctrl"
            elif name in ("alt_l", "alt_r", "alt"):
                return "alt"
            elif name in ("shift_l", "shift_r", "shift"):
                return "shift"
            elif name in ("cmd", "cmd_l", "cmd_r"):
                return "ctrl"  # Map cmd to ctrl for cross-platform
            elif name == "space":
                return "space"
            return name
        # Regular character key
        elif hasattr(key, "char") and key.char:
            return key.char.lower()
    except:
        pass
    return None


def on_key_press(key):
    """Handle key press event."""
    global keys_pressed
    key_name = get_key_name(key)
    if key_name:
        keys_pressed.add(key_name)


def on_key_release(key):
    """Handle key release event - trigger STOP if hold keys released."""
    global keys_pressed, recording_flag, frames, hold_mode

    key_name = get_key_name(key)
    if key_name and key_name in keys_pressed:
        keys_pressed.discard(key_name)

    # Check if we're in hold mode and recording
    if hold_mode and recording_flag:
        # Check if any of the combo keys were released
        combo_still_held = all(k in keys_pressed for k in combo_keys)
        if not combo_still_held:
            # Key released! Stop recording and transcribe
            with lock:
                recording_flag = False

            # Transcribe
            text, lang = transcribe_frames_fast()

            with lock:
                frames = []

            # Output result
            if text:
                sys.stdout.write(f"LANG:{lang}\n")
                sys.stdout.write(f"PARTIAL:{text}\n")
                sys.stdout.flush()

            sys.stdout.write("EVENT: RELEASE\n")
            sys.stdout.flush()


def start_keyboard_monitor():
    """Start keyboard monitoring for hold-to-record."""
    global keyboard_listener

    if not PYNPUT_AVAILABLE:
        sys.stderr.write("Keyboard monitoring not available (pynput not installed)\n")
        return

    if keyboard_listener is not None:
        return  # Already running

    try:
        keyboard_listener = pynput_keyboard.Listener(
            on_press=on_key_press, on_release=on_key_release
        )
        keyboard_listener.start()
        sys.stderr.write("Keyboard monitoring started for hold-to-record\n")
    except Exception as e:
        sys.stderr.write(f"Failed to start keyboard monitoring: {e}\n")


def main():
    """Main service loop."""
    global recording_flag, frames, hold_mode, hold_keys_combo, combo_keys
    global experimental_settings, current_language, auto_detect_language

    sys.stderr.write("SONU Whisper Service starting...\n")

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

    # Start keyboard monitoring for hold-to-record
    start_keyboard_monitor()

    # Start recording thread
    rec_thread = threading.Thread(target=record_audio_thread, daemon=True)
    rec_thread.start()

    # Main command loop
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
                # Ensure microphone is ready (reopens if it was released)
                ensure_mic_ready()
                with lock:
                    recording_flag = True
                    frames = []
                sys.stdout.write("EVENT: RECORDING\n")
                sys.stdout.flush()

            elif cmd == "STOP":
                with lock:
                    recording_flag = False

                # Transcribe
                text, lang = transcribe_frames_fast()

                with lock:
                    frames = []

                # Output result with language info
                if text:
                    sys.stdout.write(f"LANG:{lang}\n")
                    sys.stdout.write(f"PARTIAL:{text}\n")
                    sys.stdout.flush()

                sys.stdout.write("EVENT: RELEASE\n")
                sys.stdout.flush()

                # Schedule microphone release after idle timeout
                schedule_mic_release()

            elif cmd.startswith("SET_MODE "):
                mode = cmd.split(" ", 1)[1].strip().upper()
                hold_mode = mode == "HOLD"
                sys.stderr.write(f"Mode set to: {mode}\n")

            elif cmd.startswith("SET_HOLD_KEYS "):
                parts = cmd.split(maxsplit=2)
                if len(parts) >= 2:
                    combo = parts[1].strip()
                    hold_keys_combo = combo
                    combo_keys = parse_combo(combo)
                    sys.stderr.write(f"Hold keys configured: {combo}\n")

            elif cmd.startswith("SET_LANGUAGE "):
                lang_code = cmd.split(" ", 1)[1].strip().lower()
                if lang_code in LANGUAGE_NAMES or lang_code == "auto":
                    current_language = lang_code if lang_code != "auto" else "en"
                    auto_detect_language = lang_code == "auto"
                    experimental_settings["language"] = current_language
                    experimental_settings["auto_detect_language"] = auto_detect_language
                    sys.stderr.write(
                        f"Language set to: {LANGUAGE_NAMES.get(current_language, current_language)}\n"
                    )
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

            elif cmd.startswith("SET_CONTINUOUS_DICTATION "):
                parts = cmd.split()
                if len(parts) >= 3:
                    value = parts[2].strip().lower()
                    experimental_settings["continuous_dictation"] = value == "true"
                    sys.stderr.write(
                        f"Continuous dictation: {experimental_settings['continuous_dictation']}\n"
                    )
                sys.stderr.flush()

            elif cmd.startswith("SET_LOW_LATENCY "):
                parts = cmd.split()
                if len(parts) >= 3:
                    value = parts[2].strip().lower()
                    experimental_settings["low_latency"] = value == "true"
                    if experimental_settings["low_latency"]:
                        experimental_settings["min_silence_ms"] = 200
                    sys.stderr.write(
                        f"Low latency: {experimental_settings['low_latency']}\n"
                    )
                sys.stderr.flush()

            elif cmd.startswith("SET_NOISE_REDUCTION "):
                parts = cmd.split()
                if len(parts) >= 3:
                    value = parts[2].strip().lower()
                    experimental_settings["noise_reduction"] = value == "true"
                    sys.stderr.write(
                        f"Noise reduction: {experimental_settings['noise_reduction']}\n"
                    )
                sys.stderr.flush()

            elif cmd == "START_CONTINUOUS":
                # Start continuous dictation mode with VAD-based segmentation
                start_continuous_dictation()
                with lock:
                    recording_flag = True

            elif cmd == "STOP_CONTINUOUS":
                # Stop continuous dictation mode
                with lock:
                    recording_flag = False
                stop_continuous_dictation()

            elif cmd == "QUIT" or cmd == "EXIT":
                break

            elif cmd == "GET_LANGUAGES":
                # Return supported languages
                lang_list = [{"code": k, "name": v} for k, v in LANGUAGE_NAMES.items()]
                sys.stdout.write(json.dumps({"languages": lang_list}) + "\n")
                sys.stdout.flush()

        except Exception as e:
            sys.stderr.write(f"Command error: {e}\n")
            sys.stderr.flush()

    # Cleanup
    stop_audio_stream()

    if audio is not None:
        audio.terminate()

    sys.stderr.write("SONU Whisper Service stopped\n")


if __name__ == "__main__":
    main()
