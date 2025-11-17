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

# Pre-load model immediately on startup for instant dictation (like Wispr Flow)
# This ensures zero delay on first hotkey press
try:
    sys.stderr.write(f"Loading Whisper model '{model_size}'...\n")
    sys.stderr.flush()
    model = WhisperModel(model_size, device="cpu")
    sys.stderr.write(f"✓ Whisper model '{model_size}' loaded successfully\n")
    sys.stderr.flush()
    # Send READY event to Electron immediately after model loads
    sys.stdout.write("EVENT: READY\n")
    sys.stdout.flush()
except Exception as e:
    sys.stderr.write(f"✗ Failed to load Whisper model: {e}\n")
    sys.stderr.write("Please ensure faster-whisper is installed: pip install faster-whisper\n")
    sys.stderr.flush()
    # Send ERROR event to Electron
    sys.stdout.write("EVENT: ERROR\n")
    sys.stdout.flush()
    raise

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
    global frames
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

        # Use optimal transcription parameters for maximum accuracy
        # beam_size=5: Balance between speed and accuracy (higher = more accurate but slower)
        # temperature=0: Deterministic results (no randomness)
        # best_of=5: Generate 5 candidates and pick best (better quality)
        # vad_filter=True: Voice Activity Detection removes silence for better accuracy
        segments, _ = model.transcribe(
            tmp_path,
            beam_size=5,
            temperature=0,
            best_of=5,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500)
        )
        text = "".join([seg.text for seg in segments]).strip()
        return text
    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass

def transcribe_recent_seconds(local_frames, seconds=3):
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
        # Use same optimal parameters for partials as final transcription
        # This ensures consistency and accuracy
        segments, _ = model.transcribe(
            tmp_path,
            beam_size=5,
            temperature=0,
            best_of=5,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500)
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

    def live_transcribe_loop():
        while True:
            time.sleep(1.2)
            try:
                with lock:
                    active = recording_flag
                    hm = hold_mode
                    local_frames = list(frames)
                    prev = last_partial_text
                # CRITICAL: Generate partials for BOTH hold and toggle modes for consistency
                # Use more audio (5 seconds instead of 3) for better accuracy
                if active and len(local_frames) > 20:  # Need at least 20 chunks (~1.3 seconds)
                    # For hold mode, use recent seconds for live preview
                    # For toggle mode, also generate partials for live preview
                    text = transcribe_recent_seconds(local_frames, seconds=5)  # Increased from 3 to 5 for better accuracy
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
            
            # Transcribe final text in background (may take a moment)
            # This happens after partial is sent for instant output
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
                # Send final transcription to Electron (may be same as partial, that's fine)
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
                # Confirm keys are set (for debugging)
                sys.stderr.write(f"✓ Hold keys configured: {keys_val}\n")
                sys.stderr.flush()
            except Exception as e:
                sys.stderr.write(f"✗ Failed to set hold keys: {e}\n")
                sys.stderr.flush()
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