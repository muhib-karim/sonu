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
try:
    model = WhisperModel(model_size, device="cpu")
    sys.stderr.write(f"Whisper model '{model_size}' loaded successfully\n")
    sys.stderr.flush()
except Exception as e:
    sys.stderr.write(f"Failed to load Whisper model: {e}\n")
    sys.stderr.write("Please ensure faster-whisper is installed: pip install faster-whisper\n")
    sys.stderr.flush()
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
        if not combo_keys:
            return False
        return all(keyboard.is_pressed(k) for k in combo_keys)
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
            time.sleep(0.005)  # Reduced sleep for faster response
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
                    # Release detected -> stop and transcribe
                    with lock:
                        globals()['recording_flag'] = False
                    # Notify Electron immediately so UI can hide on release
                    try:
                        sys.stdout.write("EVENT: RELEASE\n")
                        sys.stdout.flush()
                    except Exception:
                        pass
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

        segments, _ = model.transcribe(tmp_path)
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
            time.sleep(1.2)
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
