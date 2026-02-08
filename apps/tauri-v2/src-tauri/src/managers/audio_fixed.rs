use crate::audio_toolkit::{list_input_devices, vad::SmoothedVad, AudioRecorder, SileroVad};
use crate::helpers::clamshell;
use crate::settings::{get_settings, AppSettings};
use crate::utils;
use log::{debug, error, info};
use std::sync::{Arc, Mutex, MutexGuard, PoisonError};
use std::time::Instant;
use tauri::Manager;

/// Errors that can occur in audio recording operations
#[derive(Debug, thiserror::Error)]
pub enum AudioError {
    #[error("Mutex lock poisoned: {0}")]
    LockPoisoned(String),
    #[error("Recorder not initialized")]
    RecorderNotInitialized,
    #[error("Failed to open microphone: {0}")]
    MicrophoneOpenFailed(String),
    #[error("Failed to start recording: {0}")]
    RecordingStartFailed(String),
    #[error("Failed to stop recording: {0}")]
    RecordingStopFailed(String),
    #[error("Invalid device selection")]
    InvalidDevice,
    #[error("Path contains invalid UTF-8")]
    InvalidPath,
    #[error("Recording already in progress")]
    AlreadyRecording,
    #[error("No active recording")]
    NoActiveRecording,
}

impl<T> From<PoisonError<T>> for AudioError {
    fn from(err: PoisonError<T>) -> Self {
        AudioError::LockPoisoned(err.to_string())
    }
}

/// Result type for audio operations
pub type AudioResult<T> = Result<T, AudioError>;

/// Trait for safe mutex locking
trait SafeLock<T> {
    fn safe_lock(&self) -> AudioResult<MutexGuard<T>>;
}

impl<T> SafeLock<T> for Mutex<T> {
    fn safe_lock(&self) -> AudioResult<MutexGuard<T>> {
        self.lock().map_err(|e| AudioError::LockPoisoned(e.to_string()))
    }
}

fn set_mute(mute: bool) {
    // Expected behavior:
    // - Windows: works on most systems using standard audio drivers.
    // - Linux: works on many systems (PipeWire, PulseAudio, ALSA),
    //   but some distros may lack the tools used.
    // - macOS: works on most standard setups via AppleScript.
    // If unsupported, fails silently.

    #[cfg(target_os = "windows")]
    {
        unsafe {
            use windows::Win32::{
                Media::Audio::{
                    eMultimedia, eRender, Endpoints::IAudioEndpointVolume, IMMDeviceEnumerator,
                    MMDeviceEnumerator,
                },
                System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED},
            };

            macro_rules! unwrap_or_return {
                ($expr:expr) => {
                    match $expr {
                        Ok(val) => val,
                        Err(_) => return,
                    }
                };
            }

            // Initialize the COM library for this thread.
            // If already initialized (e.g., by another library like Tauri), this does nothing.
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);

            let all_devices: IMMDeviceEnumerator =
                unwrap_or_return!(CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL));
            let default_device =
                unwrap_or_return!(all_devices.GetDefaultAudioEndpoint(eRender, eMultimedia));
            let volume_interface = unwrap_or_return!(
                default_device.Activate::<IAudioEndpointVolume>(CLSCTX_ALL, None)
            );

            let _ = volume_interface.SetMute(mute, std::ptr::null());
        }
    }

    #[cfg(target_os = "linux")]
    {
        use std::process::Command;

        let mute_val = if mute { "1" } else { "0" };
        let amixer_state = if mute { "mute" } else { "unmute" };

        // Try multiple backends to increase compatibility
        // 1. PipeWire (wpctl)
        if Command::new("wpctl")
            .args(["set-mute", "@DEFAULT_AUDIO_SINK@", mute_val])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
        {
            return;
        }

        // 2. PulseAudio (pactl)
        if Command::new("pactl")
            .args(["set-sink-mute", "@DEFAULT_SINK@", mute_val])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
        {
            return;
        }

        // 3. ALSA (amixer)
        // Try default first, then Master
        let _ = Command::new("amixer")
            .args(["set", "Master", amixer_state])
            .output();
    }

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;

        let script = if mute {
            "set volume with output muted"
        } else {
            "set volume without output muted"
        };

        let _ = Command::new("osascript")
            .args(["-e", script])
            .output();
    }
}
