import sys
import threading
import time
import wave
import os
import tempfile

import numpy as np
import keyboard

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
model = None  # Initialize as None
model_ready = False

def load_model():
    """Load the Whisper model - this can take a few seconds on first load"""
    global model, model_ready
    try:
        sys.stderr.write(f"Loading Whisper model '{model_size}'...\n")
        sys.stderr.flush()
        
        # Check if model_size is a path to a local directory (from offline downloader)
        if os.path.isdir(model_size):
            # Load model from local directory path
            sys.stderr.write(f"Loading model from local directory: {model_size}\n")
            sys.stderr.flush()
            model = WhisperModel(model_size, device="cpu")
        else:
            # Load model using faster-whisper's built-in Hugging Face cache
            model = WhisperModel(model_size, device="cpu")
        
        model_ready = True
        sys.stderr.write(f"Whisper model loaded successfully\n")
        sys.stderr.flush()
        # Send ready signal to Electron
        print("EVENT: READY")
        sys.stdout.flush()
    except Exception as e:
        sys.stderr.write(f"Failed to load Whisper model: {e}\n")
        sys.stderr.write("Please ensure faster-whisper is installed: pip install faster-whisper\n")
        sys.stderr.flush()
        model_ready = False
        # Send error signal
        print("EVENT: ERROR")
        sys.stdout.flush()
        raise

# Start loading model in background thread to not block
model_load_thread = threading.Thread(target=load_model, daemon=True)
model_load_thread.start()

hold_mode = False
hold_keys_combo = "ctrl+shift+space"  # python keyboard combo string
combo_keys = ['ctrl', 'shift', 'space']

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
        if not combo_keys or len(combo_keys) == 0:
            return False
        # Check each key individually for better reliability
        for key in combo_keys:
            try:
                if not keyboard.is_pressed(key):
                    return False
            except Exception as e:
                # If a key check fails, assume it's not pressed
                sys.stderr.write(f"Key check error for '{key}': {e}\n")
                sys.stderr.flush()
                return False
        return True
    except Exception as e:
        sys.stderr.write(f"combo_pressed error: {e}\n")
        sys.stderr.flush()
        return False


def start_stream():
    global stream
    if stream is not None:
        return
    stream = audio.open(format=FORMAT, channels=CHANNELS, rate=RATE, input=True, frames_per_buffer=CHUNK)


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
                    time.sleep(0.05)
                    text = transcribe_frames()
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


def transcribe_frames():
    global frames, model_ready
    
    # CRITICAL: Don't wait here - just check readiness
    # Waiting here blocks the main thread and causes issues
    if not model_ready or model is None:
        sys.stderr.write("Model not ready yet, ignoring transcription request\n")
        sys.stderr.flush()
        # Send event to notify user to wait
        print("EVENT: MODEL_NOT_READY")
        sys.stdout.flush()
        return ""
    
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

        segments, _ = model.transcribe(tmp_path)
        text = "".join([seg.text for seg in segments]).strip()
        return text
    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass

def transcribe_recent_seconds(local_frames, seconds=3):
    global model_ready
    
    # Check if model is ready
    if not model_ready or model is None:
        return ""
    
    if not local_frames:
        return ""
    # number of chunks to use from tail
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
        segments, _ = model.transcribe(tmp_path)
        text = "".join([seg.text for seg in segments]).strip()
        return text
    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass


def main():
    try:
        start_stream()
        t = threading.Thread(target=audio_capture_loop, daemon=True)
        t.start()
    except Exception as e:
        sys.stderr.write(f"Failed to start audio stream: {e}\n")
        sys.stderr.flush()
        return

    def live_transcribe_loop():
        while True:
            time.sleep(0.8)  # Reduced from 1.2s to 0.8s for faster partial updates
            try:
                with lock:
                    active = recording_flag
                    hm = hold_mode
                    local_frames = list(frames)
                    prev = last_partial_text
                if hm and active and len(local_frames) > 10:
                    text = transcribe_recent_seconds(local_frames, seconds=3)
                    if text and text != prev:
                        with lock:
                            globals()['last_partial_text'] = text
                        sys.stdout.write("PARTIAL: " + text + "\n")
                        sys.stdout.flush()
            except Exception:
                pass

    threading.Thread(target=live_transcribe_loop, daemon=True).start()

    for line in sys.stdin:
        cmd = line.strip().upper()
        if cmd == "START":
            # CRITICAL: Check if model is ready before starting recording
            if not model_ready or model is None:
                sys.stderr.write("Cannot start recording: Model not ready yet\n")
                sys.stderr.flush()
                # Send event to Electron to show "Please wait" message
                print("EVENT: MODEL_NOT_READY")
                sys.stdout.flush()
                continue
            
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
            # Transcribe
            text = transcribe_frames()
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
                # Send to Electron
                sys.stdout.write(text + "\n")
                sys.stdout.flush()
            continue
        if cmd.startswith("SET_MODE"):
            # e.g., SET_MODE HOLD or SET_MODE TOGGLE
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
            except Exception:
                pass
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
