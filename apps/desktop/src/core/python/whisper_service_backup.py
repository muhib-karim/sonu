import sys
import threading
import time
import wave
import os
import tempfile

import numpy as np
import keyboard

# Optional: pynput for typing (alternative to robotjs)
try:
    from pynput.keyboard import Controller as KeyboardController
    pynput_available = True
    keyboard_controller = KeyboardController()
except ImportError:
    pynput_available = False
    keyboard_controller = None

try:
    import pyaudio
except Exception as e:
    sys.stderr.write(f"PyAudio import error: {e}\n")
    sys.stderr.flush()
    raise

try:
    from faster_whisper import WhisperModel
except Exception as e:
    sys.stderr.write(f"faster-whisper import error: {e}\n")
    sys.stderr.flush()
    raise


CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000

recording_flag = False
frames = []
audio = pyaudio.PyAudio()
stream = None
lock = threading.Lock()
last_partial_text = ""

model_size = os.environ.get("WHISPER_MODEL", "base")

def get_repo_id(model_size):
    """Map model size to HF repo ID."""
    if model_size == "distil-small.en":
        return "Systran/faster-distil-whisper-small.en"
    elif model_size == "distil-medium.en":
        return "Systran/faster-distil-whisper-medium.en"
    elif model_size == "distil-large-v3":
        return "Systran/faster-distil-whisper-large-v3"
    return model_size

# Pre-load model immediately on startup for instant dictation (like Wispr Flow)
# This ensures zero delay on first hotkey press
try:
    sys.stderr.write(f"Loading Whisper model '{model_size}'...\n")
    sys.stderr.flush()
    repo_id = get_repo_id(model_size)
    model = WhisperModel(repo_id, device="cpu")
    sys.stderr.write(f"âœ“ Whisper model '{model_size}' loaded successfully\n")
    sys.stderr.flush()
    # Send READY event to Electron immediately after model loads
    sys.stdout.write("EVENT: READY\n")
    sys.stdout.flush()
except Exception as e:
    sys.stderr.write(f"âœ— Failed to load Whisper model: {e}\n")
    sys.stderr.write("Please ensure faster-whisper is installed: pip install faster-whisper\n")
    sys.stderr.flush()
    # Send ERROR event to Electron
    sys.stdout.write("EVENT: ERROR\n")
    sys.stdout.flush()
    raise

hold_mode = False
hold_keys_combo = "ctrl+shift+space"  # python keyboard combo string
combo_keys = ['ctrl', 'shift', 'space']

# Language settings
auto_detect_language = True
current_language = None  # None means auto-detect, or specific language code like 'en', 'es', etc.
detected_language = None
language_confidence = 0.0

# OPTIMIZED settings for INSTANT output (like Wispr Flow)
experimental_settings = {
    'vad_enabled': True,
    'beam_size': 1,       # FAST: Greedy decoding (Critical for Distil-Whisper)
    'best_of': 1,         # FAST: No sampling (Critical for Distil-Whisper)
    'temperature': 0,
    'min_silence_ms': 150  # EXTREME FAST: Very short silence detection
}

def parse_combo(combo: str):
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
        elif p == 'space':
            mapped.append('space')
        else:
            mapped.append(p)
    return mapped

def combo_pressed():
    try:
        with lock:
            local_combo_keys = list(combo_keys) if combo_keys else []
        # CRITICAL: If no keys configured yet (first use), return True to prevent false stops
        # This prevents interruptions during initialization
        if not local_combo_keys or len(local_combo_keys) == 0:
            return True  # Return True to prevent premature stopping during initialization
        # Check each key individually for better reliability
        for key in local_combo_keys:
            try:
                if not keyboard.is_pressed(key):
                    return False
            except Exception as e:
                # If a key check fails, assume it's not pressed
                return False
        return True
    except Exception as e:
        # On error, return True to prevent false stops (safer for first-time use)
        # This prevents interruptions if there's any initialization issue
        return True


def start_stream():
    global stream
    if stream is not None:
        return
    try:
        # Start stream immediately for instant recording (like Wispr Flow)
        stream = audio.open(format=FORMAT, channels=CHANNELS, rate=RATE, input=True, frames_per_buffer=CHUNK)
        stream.start_stream()
        # Stream is now ready for instant recording
    except Exception as e:
        sys.stderr.write(f"Failed to start audio stream: {e}\n")
        sys.stderr.flush()
        raise


def stop_stream():
    global stream
    if stream is not None:
        stream.stop_stream()
        stream.close()
        stream = None


def audio_capture_loop():
  global frames
  while True:
        with lock:
            active = recording_flag
        if not active:
            time.sleep(0.001)  # Minimal sleep for fastest response
            continue
        try:
            data = stream.read(CHUNK, exception_on_overflow=False)
        except Exception as e:
            sys.stderr.write(f"Audio read error: {e}\n")
            sys.stderr.flush()
            time.sleep(0.05)
            continue
        with lock:
            frames.append(data)

        # If in hold mode, stop when key combo is released
        try:
            with lock:
                hm = hold_mode
            if hm and active:
                if not combo_pressed():
                    # Release detected -> stop immediately
                    with lock:
                        globals()['recording_flag'] = False
                    # Notify Electron IMMEDIATELY so UI can hide instantly on release
                    # This must happen BEFORE any transcription delay
                    try:
                        sys.stdout.write("EVENT: RELEASE\n")
                        sys.stdout.flush()
                    except Exception:
                        pass
                    # Minimal delay to capture final audio chunk (reduced from 0.1s to 0.05s)
                    time.sleep(0.02)  # FAST: Even smaller delay
                    
                    # Check if Groq mode is enabled (skip local transcription)
                    groq_mode = os.environ.get('SONU_USE_GROQ', 'false').lower() == 'true'
                    if groq_mode:
                        # Skip local transcription - Groq will handle it
                        sys.stderr.write("Groq mode enabled - skipping local transcription\n")
                        sys.stderr.flush()
                        with lock:
                            frames = []
                            globals()['frames'] = frames
                            globals()['last_partial_text'] = ""
                        continue
                    
                    text = transcribe_frames_fast()  # Use FAST transcription
                    # Fallback to last partial if final transcription is empty
                    if not text:
                        try:
                            with lock:
                                text = last_partial_text
                        except Exception:
                            pass
                    with lock:
                        frames = []
                        globals()['frames'] = frames
                        globals()['last_partial_text'] = ""
                    if text:
                        sys.stdout.write(text + "\n")
                        sys.stdout.flush()
        except Exception as e:
            sys.stderr.write(f"Release detection error: {e}\n")
            sys.stderr.flush()


def transcribe_frames_fast():
    """FAST transcription for instant output - uses greedy decoding"""
    global frames, detected_language, language_confidence
    if not frames:
        return ""
    # Write to temp wav
    fd, tmp_path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    try:
        wf = wave.open(tmp_path, 'wb')
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(audio.get_sample_size(FORMAT))
        wf.setframerate(RATE)
        wf.writeframes(b''.join(frames))
        wf.close()

        # Determine language to use
        lang = None
        if not auto_detect_language and current_language:
            lang = current_language

        # FAST transcription settings - greedy decoding for instant response
        min_silence_ms = experimental_settings.get('min_silence_ms', 300)
        beam_size = experimental_settings.get('beam_size', 1)  # INSTANT: beam_size=1 for greedy
        best_of = experimental_settings.get('best_of', 1)      # INSTANT: best_of=1 for fastest
        
        segments, info = model.transcribe(
            tmp_path,
            language=lang,
            beam_size=beam_size,        # CRITICAL: Use 1 for instant response
            temperature=0,
            best_of=best_of,            # CRITICAL: Use 1 for fastest decoding
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=min_silence_ms)
        )
        
        # Collect segments
        segment_list = list(segments)
        text = "".join([seg.text for seg in segment_list]).strip()
        
        # Update detected language from info
        if hasattr(info, 'language') and info.language:
            detected_language = info.language
            language_confidence = getattr(info, 'language_probability', 0.0)
        
        return text
    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass


def transcribe_frames():
    """Standard transcription with quality settings"""
    global frames, detected_language, language_confidence
    if not frames:
        return ""
    # Write to temp wav
    fd, tmp_path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    try:
        wf = wave.open(tmp_path, 'wb')
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(audio.get_sample_size(FORMAT))
        wf.setframerate(RATE)
        wf.writeframes(b''.join(frames))
        wf.close()

        # Determine language to use
        lang = None
        if auto_detect_language:
            lang = None
        elif current_language:
            lang = current_language

        # Get transcription parameters from experimental settings
        beam_size = experimental_settings.get('beam_size', 1)
        best_of = experimental_settings.get('best_of', 1)
        temperature = experimental_settings.get('temperature', 0)
        vad_enabled = experimental_settings.get('vad_enabled', True)
        min_silence_ms = experimental_settings.get('min_silence_ms', 300)

        # Transcribe with language setting
        segments, info = model.transcribe(
            tmp_path,
            language=lang,
            beam_size=beam_size,
            temperature=temperature,
            best_of=best_of,
            vad_filter=vad_enabled,
            vad_parameters=dict(min_silence_duration_ms=min_silence_ms) if vad_enabled else None
        )
        
        # Collect segments
        segment_list = list(segments)
        text = "".join([seg.text for seg in segment_list]).strip()
        
        # Update detected language from info
        if hasattr(info, 'language') and info.language:
            detected_language = info.language
            language_confidence = getattr(info, 'language_probability', 0.0)
            # Notify Electron of detected language
            sys.stdout.write(f"LANG_DETECTED: {detected_language} {language_confidence:.2f}\n")
            sys.stdout.flush()
        
        return text
    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass


def transcribe_recent_seconds_fast(local_frames, seconds=2):
    """FAST partial transcription - uses less audio and greedy decoding"""
    if not local_frames:
        return ""
    # number of chunks to use from tail - REDUCED for speed
    chunks_per_sec = int(RATE / CHUNK)  # ~15
    use_chunks = max(1, min(len(local_frames), seconds * chunks_per_sec))
    tail = local_frames[-use_chunks:]
    fd, tmp_path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    try:
        wf = wave.open(tmp_path, 'wb')
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(audio.get_sample_size(FORMAT))
        wf.setframerate(RATE)
        wf.writeframes(b''.join(tail))
        wf.close()
        # FAST parameters for instant partials
        segments, _ = model.transcribe(
            tmp_path,
            beam_size=3,        # FAST: greedy decoding
            temperature=0,
            best_of=3,          # FAST: no sampling
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=300)
        )
        text = "".join([seg.text for seg in segments]).strip()
        return text
    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass


def main():
    try:
        # Pre-initialize audio stream on startup for instant dictation (like Wispr Flow)
        # This ensures zero delay when user presses hotkey
        start_stream()
        t = threading.Thread(target=audio_capture_loop, daemon=True)
        t.start()
    except Exception as e:
        sys.stderr.write(f"Failed to start audio stream: {e}\n")
        sys.stderr.flush()
        return

    import audioop
    import math

    def live_transcribe_loop():
        # Adaptive loop that triggers on silence or buffer growth
        silence_frames = 0
        while True:
            # Very short sleep to check triggers frequently
            time.sleep(0.05)
            try:
                with lock:
                    active = recording_flag
                    local_frames = list(frames)
                    prev = last_partial_text
                
                if not active or len(local_frames) < 5:
                    continue

                # VAD LOGIC: Check RMS of last few frames to detect silence
                # This allows us to "finalize" or "push" partials instantly when user pauses
                try:
                    # Check last 3 chunks (~200ms)
                    recent_audio = b''.join(local_frames[-3:])
                    rms = audioop.rms(recent_audio, 2)
                    # Threshold for silence (adjust based on mic)
                    # Standard mic noise floor is usually < 300, speech > 1000
                    is_silence = rms < 500 
                except:
                    is_silence = False

                should_transcribe = False
                
                # Trigger 1: Silence detected after speech (Natural pause)
                if is_silence:
                    silence_frames += 1
                    # If silence > 200ms (4 checks * 50ms), trigger update
                    if silence_frames == 4: 
                        should_transcribe = True
                else:
                    silence_frames = 0
                
                # Trigger 2: Buffer grew significantly since last check (Continuous speech)
                # But don't spam - limit to every ~400ms if speaking continuously
                if len(local_frames) % 4 == 0: # Every ~0.25s of audio (More aggressive for Instant feel)
                    should_transcribe = True
                
                if should_transcribe:
                    # FAST: Use only recent audio
                    text = transcribe_recent_seconds_fast(local_frames, seconds=4)
                    if text and text != prev:
                        with lock:
                            globals()['last_partial_text'] = text
                        sys.stdout.write("PARTIAL: " + text + "\n")
                        sys.stdout.flush()

                # Trigger 3: Detect silence to finalize and clear buffer
                # Simple energy check or VAD. Here we use a simple heuristic:
                # If buffer is long and we stopped speaking (detected by transcribe returning text but energy low?)
                # Actually, easier to just check if `hold_mode` is released OR specific silence timeout.
                # For now, let's keep it simple: relying on PARTIAL updates.
                # BUT to support "Smart Mode" (LLM), we need to know when a sentence ends.
                # Let's add a "Finalize" check if audio energy is low for > 500ms
                
                # (Simple energy-based silence detection could be added here if needed)

            except Exception:
                pass

    threading.Thread(target=live_transcribe_loop, daemon=True).start()

    for line in sys.stdin:
        cmd = line.strip().upper()
        if cmd == "START":
            # Ensure stream is started
            start_stream()
            with lock:
                frames = []
                globals()['frames'] = frames
                globals()['recording_flag'] = True
                globals()['last_partial_text'] = ""
            continue
        if cmd == "STOP":
            with lock:
                globals()['recording_flag'] = False
            # CRITICAL: For instant output (like Wispr Flow), send last partial IMMEDIATELY
            # This must happen before transcription to give instant feedback
            instant_partial = None
            try:
                with lock:
                    instant_partial = last_partial_text
                if instant_partial and instant_partial.strip():
                    # Send partial IMMEDIATELY for instant typing (before transcription)
                    sys.stdout.write(f"PARTIAL: {instant_partial}\n")
                    sys.stdout.flush()
            except Exception:
                pass
            
            # FAST transcription
            text = transcribe_frames_fast()
            # Fallback to last partial if final transcription is empty
            if not text:
                try:
                    with lock:
                        text = last_partial_text
                except Exception:
                    pass
            with lock:
                frames = []
                globals()['frames'] = frames
                globals()['last_partial_text'] = ""
            if text:
                # Send final transcription to Electron
                sys.stdout.write(text + "\n")
                sys.stdout.flush()
            continue
        if cmd.startswith("SET_MODE"):
            try:
                mode_val = line.strip().split(" ", 1)[1].strip().lower()
                with lock:
                    globals()['hold_mode'] = (mode_val == 'hold')
            except Exception:
                pass
            continue
        if cmd.startswith("SET_HOLD_KEYS"):
            try:
                keys_val = line.strip().split(" ", 1)[1].strip()
                with lock:
                    globals()['hold_keys_combo'] = keys_val
                    globals()['combo_keys'] = parse_combo(keys_val)
                # Confirm keys are set (for debugging)
                sys.stderr.write(f"âœ“ Hold keys configured: {keys_val}\n")
                sys.stderr.flush()
            except Exception as e:
                sys.stderr.write(f"âœ— Failed to set hold keys: {e}\n")
                sys.stderr.flush()
            continue
        
        # Language settings
        if cmd.startswith("SET_LANGUAGE"):
            try:
                lang_val = line.strip().split(" ", 1)[1].strip().lower()
                with lock:
                    if lang_val == "auto" or lang_val == "":
                        globals()['auto_detect_language'] = True
                        globals()['current_language'] = None
                    else:
                        globals()['auto_detect_language'] = False
                        globals()['current_language'] = lang_val
                sys.stderr.write(f"âœ“ Language set to: {lang_val if lang_val else 'auto'}\n")
                sys.stderr.flush()
            except Exception as e:
                sys.stderr.write(f"âœ— Failed to set language: {e}\n")
                sys.stderr.flush()
            continue
        
        if cmd == "GET_LANGUAGE":
            # Return current language settings
            with lock:
                lang = current_language if current_language else "auto"
                detected = detected_language if detected_language else "unknown"
                conf = language_confidence
            sys.stdout.write(f"LANGUAGE_INFO: {lang} {detected} {conf:.2f}\n")
            sys.stdout.flush()
            continue
        
        # Experimental settings
        if cmd.startswith("SET_EXPERIMENTAL"):
            try:
                # Format: SET_EXPERIMENTAL key=value
                param = line.strip().split(" ", 1)[1].strip()
                key, value = param.split("=", 1)
                key = key.strip().lower()
                value = value.strip()
                
                with lock:
                    if key in ['vad_enabled']:
                        experimental_settings[key] = value.lower() == 'true'
                    elif key in ['beam_size', 'best_of', 'min_silence_ms']:
                        experimental_settings[key] = int(value)
                    elif key in ['temperature']:
                        experimental_settings[key] = float(value)
                    else:
                        experimental_settings[key] = value
                
                sys.stderr.write(f"âœ“ Experimental setting {key}={value}\n")
                sys.stderr.flush()
            except Exception as e:
                sys.stderr.write(f"âœ— Failed to set experimental setting: {e}\n")
                sys.stderr.flush()
            continue
        
        # Low latency mode
        if cmd.startswith("SET_LOW_LATENCY"):
            try:
                val = line.strip().split(" ", 1)[1].strip().lower()
                low_latency = val == 'true'
                # Apply low latency settings
                with lock:
                    if low_latency:
                        experimental_settings['beam_size'] = 1
                        experimental_settings['best_of'] = 1
                        experimental_settings['min_silence_ms'] = 200
                    else:
                        experimental_settings['beam_size'] = 5
                        experimental_settings['best_of'] = 5
                        experimental_settings['min_silence_ms'] = 500
                sys.stderr.write(f"âœ“ Low latency mode: {low_latency}\n")
                sys.stderr.flush()
            except Exception:
                pass
            continue
        
        # Noise reduction (placeholder)
        if cmd.startswith("SET_NOISE_REDUCTION"):
            continue

    stop_stream()
    audio.terminate()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        stop_stream()
        audio.terminate()
    except Exception as e:
        sys.stderr.write(f"Fatal error: {e}\n")
        sys.stderr.flush()
