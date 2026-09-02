use crate::audio_toolkit::{list_input_devices, vad::SmoothedVad, AudioRecorder, SileroVad};
use crate::helpers::clamshell;
use crate::settings::{get_settings, AppSettings};
use crate::utils;
use log::{debug, error, info, warn};
use std::sync::{Arc, Mutex, PoisonError};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager};

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
}

impl<T> From<PoisonError<T>> for AudioError {
    fn from(err: PoisonError<T>) -> Self {
        AudioError::LockPoisoned(err.to_string())
    }
}

/// Result type for audio operations
pub type AudioResult<T> = Result<T, AudioError>;

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
        let _ = Command::new("amixer")
            .args(["set", "Master", amixer_state])
            .output();
    }

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let script = format!(
            "set volume output muted {}",
            if mute { "true" } else { "false" }
        );
        let _ = Command::new("osascript").args(["-e", &script]).output();
    }
}

const WHISPER_SAMPLE_RATE: usize = 16000;

/* ──────────────────────────────────────────────────────────────── */

#[derive(Clone, Debug)]
pub enum RecordingState {
    Idle,
    Recording { binding_id: String },
}

#[derive(Clone, Debug)]
pub enum MicrophoneMode {
    AlwaysOn,
    OnDemand,
}

/* ──────────────────────────────────────────────────────────────── */

fn create_audio_recorder(
    vad_path: &str,
    app_handle: &tauri::AppHandle,
) -> Result<AudioRecorder, anyhow::Error> {
    let silero = SileroVad::new(vad_path, 0.3)
        .map_err(|e| anyhow::anyhow!("Failed to create SileroVad: {}", e))?;
    let smoothed_vad = SmoothedVad::new(Box::new(silero), 15, 15, 2);

    // Recorder with VAD plus a spectrum-level callback that forwards updates to
    // the frontend.
    let recorder = AudioRecorder::new()
        .map_err(|e| anyhow::anyhow!("Failed to create AudioRecorder: {}", e))?
        .with_vad(Box::new(smoothed_vad))
        .with_level_callback({
            let app_handle = app_handle.clone();
            move |levels| {
                utils::emit_levels(&app_handle, &levels);
            }
        });

    Ok(recorder)
}

/* ──────────────────────────────────────────────────────────────── */

/// Byte length of the longest common prefix of two strings, snapped back to
/// a UTF-8 character boundary. (UTF-8 byte prefixes correspond to character
/// prefixes, so comparing bytes is safe.)
fn common_prefix_len(previous: &str, current: &str) -> usize {
    let max = previous.len().min(current.len());
    let (pb, cb) = (previous.as_bytes(), current.as_bytes());
    let mut byte = 0;
    while byte < max && pb[byte] == cb[byte] {
        byte += 1;
    }
    while byte > 0 && (!previous.is_char_boundary(byte) || !current.is_char_boundary(byte)) {
        byte -= 1;
    }
    byte
}

/// Streaming stabilization for the live preview: given the previous and the
/// current full transcription, split the current text into a stable prefix
/// (confirmed across ticks; rendered solid) and a volatile suffix (still
/// likely to change; rendered translucent).
///
/// The stable part is the common prefix trimmed back to a whole-word
/// boundary so partial words never solidify mid-word. Special cases:
/// - nothing in common → everything is volatile;
/// - the whole current text is common → fully stable;
/// - a previous that is fully shared (e.g. a single growing word with no
///   whitespace yet) stays stable.
///
/// The 30s peek window slides once audio exceeds it, which can drop the
/// common prefix and re-flow the text; that is acceptable for a live
/// preview — the final transcription is authoritative.
fn stabilize_preview(previous: &str, current: &str) -> (String, String) {
    let byte = common_prefix_len(previous, current);
    if byte == 0 {
        return (String::new(), current.to_string());
    }
    if byte == current.len() {
        return (current.to_string(), String::new());
    }
    // Trim back to just after the last whitespace inside the common prefix
    // so the stable region never ends mid-word.
    let head = &current[..byte];
    let trimmed = head
        .char_indices()
        .rev()
        .find(|(_, c)| c.is_whitespace())
        .map(|(i, c)| i + c.len_utf8())
        .unwrap_or(0);
    if trimmed > 0 {
        (head[..trimmed].to_string(), current[trimmed..].to_string())
    } else if byte == previous.len() {
        // The previous text is fully shared: keep it stable.
        (head.to_string(), current[byte..].to_string())
    } else {
        (String::new(), current.to_string())
    }
}

/* ──────────────────────────────────────────────────────────────── */

#[derive(Clone)]
pub struct AudioRecordingManager {
    state: Arc<Mutex<RecordingState>>,
    mode: Arc<Mutex<MicrophoneMode>>,
    app_handle: tauri::AppHandle,

    recorder: Arc<Mutex<Option<AudioRecorder>>>,
    is_open: Arc<Mutex<bool>>,
    is_recording: Arc<Mutex<bool>>,
    did_mute: Arc<Mutex<bool>>,
    /// Bumped on every recording start. Preview tickers capture the value at
    /// spawn and exit when it changes, so stop/start cycles never leave
    /// zombie tickers from a previous session emitting stale text.
    generation: Arc<std::sync::atomic::AtomicU64>,
}

impl AudioRecordingManager {
    /* ---------- construction ------------------------------------------------ */

    pub fn new(app: &tauri::AppHandle) -> Result<Self, anyhow::Error> {
        let settings = get_settings(app);
        let mode = if settings.always_on_microphone {
            MicrophoneMode::AlwaysOn
        } else {
            MicrophoneMode::OnDemand
        };

        let manager = Self {
            state: Arc::new(Mutex::new(RecordingState::Idle)),
            mode: Arc::new(Mutex::new(mode.clone())),
            app_handle: app.clone(),

            recorder: Arc::new(Mutex::new(None)),
            is_open: Arc::new(Mutex::new(false)),
            is_recording: Arc::new(Mutex::new(false)),
            did_mute: Arc::new(Mutex::new(false)),
            generation: Arc::new(std::sync::atomic::AtomicU64::new(0)),
        };

        // Always-on?  Open immediately.
        if matches!(mode, MicrophoneMode::AlwaysOn) {
            manager.start_microphone_stream()?;
        }

        Ok(manager)
    }

    /* ---------- helper methods --------------------------------------------- */

    /// Safely lock a mutex, converting poison errors to AudioError
    fn safe_lock<'a, T>(&self, mutex: &'a Mutex<T>) -> AudioResult<std::sync::MutexGuard<'a, T>> {
        mutex.lock().map_err(|e| {
            // Log at warn level since we recover from poisoned locks
            warn!("Mutex poison error: {}", e);
            AudioError::LockPoisoned("Mutex lock poisoned".to_string())
        })
    }

    fn get_effective_microphone_device(&self, settings: &AppSettings) -> Option<cpal::Device> {
        // Check if we're in clamshell mode and have a clamshell microphone configured
        let use_clamshell_mic = if let Ok(is_clamshell) = clamshell::is_clamshell() {
            is_clamshell && settings.clamshell_microphone.is_some()
        } else {
            false
        };

        let device_name = if use_clamshell_mic {
            settings.clamshell_microphone.as_ref()? // Safe: checked is_some() above
        } else {
            settings.selected_microphone.as_ref()?
        };

        // Find the device by name
        match list_input_devices() {
            Ok(devices) => devices
                .into_iter()
                .find(|d| d.name == *device_name)
                .map(|d| d.device),
            Err(e) => {
                debug!("Failed to list devices, using default: {}", e);
                None
            }
        }
    }

    /* ---------- microphone life-cycle -------------------------------------- */

    /// Applies mute if mute_while_recording is enabled and stream is open
    pub fn apply_mute(&self) -> AudioResult<()> {
        let settings = get_settings(&self.app_handle);
        let mut did_mute_guard = self.safe_lock(&self.did_mute)?;
        let is_open = *self.safe_lock(&self.is_open)?;

        if settings.mute_while_recording && is_open {
            set_mute(true);
            *did_mute_guard = true;
            debug!("Mute applied");
        }
        Ok(())
    }

    /// Removes mute if it was applied
    pub fn remove_mute(&self) -> AudioResult<()> {
        let mut did_mute_guard = self.safe_lock(&self.did_mute)?;
        if *did_mute_guard {
            set_mute(false);
            *did_mute_guard = false;
            debug!("Mute removed");
        }
        Ok(())
    }

    pub fn start_microphone_stream(&self) -> Result<(), anyhow::Error> {
        let mut open_flag = self
            .safe_lock(&self.is_open)
            .map_err(|e| anyhow::anyhow!("Failed to lock is_open: {}", e))?;
        if *open_flag {
            debug!("Microphone stream already active");
            return Ok(());
        }

        let start_time = Instant::now();

        // Don't mute immediately - caller will handle muting after audio feedback
        let mut did_mute_guard = self
            .safe_lock(&self.did_mute)
            .map_err(|e| anyhow::anyhow!("Failed to lock did_mute: {}", e))?;
        *did_mute_guard = false;

        let vad_path = self
            .app_handle
            .path()
            .resolve(
                "resources/models/silero_vad_v4.onnx",
                tauri::path::BaseDirectory::Resource,
            )
            .map_err(|e| anyhow::anyhow!("Failed to resolve VAD path: {}", e))?;
        let mut recorder_opt = self
            .safe_lock(&self.recorder)
            .map_err(|e| anyhow::anyhow!("Failed to lock recorder: {}", e))?;

        if recorder_opt.is_none() {
            let vad_path_str = vad_path
                .to_str()
                .ok_or_else(|| anyhow::anyhow!("VAD path contains invalid UTF-8"))?;
            *recorder_opt = Some(create_audio_recorder(vad_path_str, &self.app_handle)?);
        }

        // Get the selected device from settings, considering clamshell mode
        let settings = get_settings(&self.app_handle);
        let selected_device = self.get_effective_microphone_device(&settings);

        if let Some(rec) = recorder_opt.as_mut() {
            rec.open(selected_device)
                .map_err(|e| anyhow::anyhow!("Failed to open recorder: {}", e))?;
        }

        *open_flag = true;
        info!(
            "Microphone stream initialized in {:?}",
            start_time.elapsed()
        );
        Ok(())
    }

    pub fn stop_microphone_stream(&self) {
        // Use safe_lock with fallback to avoid panics
        let mut open_flag = match self.safe_lock(&self.is_open) {
            Ok(guard) => guard,
            Err(e) => {
                error!("Failed to lock is_open in stop_microphone_stream: {}", e);
                return;
            }
        };

        if !*open_flag {
            return;
        }

        let mut did_mute_guard = match self.safe_lock(&self.did_mute) {
            Ok(guard) => guard,
            Err(e) => {
                error!("Failed to lock did_mute in stop_microphone_stream: {}", e);
                return;
            }
        };

        if *did_mute_guard {
            set_mute(false);
        }
        *did_mute_guard = false;

        let mut recorder_guard = match self.safe_lock(&self.recorder) {
            Ok(guard) => guard,
            Err(e) => {
                error!("Failed to lock recorder in stop_microphone_stream: {}", e);
                *open_flag = false;
                return;
            }
        };

        if let Some(rec) = recorder_guard.as_mut() {
            // If still recording, stop first.
            let is_recording = match self.safe_lock(&self.is_recording) {
                Ok(guard) => *guard,
                Err(e) => {
                    error!("Failed to lock is_recording: {}", e);
                    false
                }
            };

            if is_recording {
                let _ = rec.stop();
                if let Ok(mut guard) = self.safe_lock(&self.is_recording) {
                    *guard = false;
                }
            }
            let _ = rec.close();
        }

        *open_flag = false;
        debug!("Microphone stream stopped");
    }

    /* ---------- mode switching --------------------------------------------- */

    pub fn update_mode(&self, new_mode: MicrophoneMode) -> Result<(), anyhow::Error> {
        let mode_guard = self
            .safe_lock(&self.mode)
            .map_err(|e| anyhow::anyhow!("Failed to lock mode: {}", e))?;
        let cur_mode = mode_guard.clone();

        match (cur_mode, &new_mode) {
            (MicrophoneMode::AlwaysOn, MicrophoneMode::OnDemand) => {
                let is_idle = match self.safe_lock(&self.state) {
                    Ok(guard) => matches!(*guard, RecordingState::Idle),
                    Err(e) => {
                        error!("Failed to lock state: {}", e);
                        false
                    }
                };
                if is_idle {
                    drop(mode_guard);
                    self.stop_microphone_stream();
                }
            }
            (MicrophoneMode::OnDemand, MicrophoneMode::AlwaysOn) => {
                drop(mode_guard);
                self.start_microphone_stream()?;
            }
            _ => {}
        }

        if let Ok(mut guard) = self.safe_lock(&self.mode) {
            *guard = new_mode;
        } else {
            return Err(anyhow::anyhow!("Failed to lock mode for update"));
        }
        Ok(())
    }

    /* ---------- recording --------------------------------------------------- */

    pub fn try_start_recording(&self, binding_id: &str) -> bool {
        let mut state = match self.safe_lock(&self.state) {
            Ok(guard) => guard,
            Err(e) => {
                error!("Failed to lock state in try_start_recording: {}", e);
                return false;
            }
        };

        if let RecordingState::Idle = *state {
            // Ensure microphone is open in on-demand mode
            let is_on_demand = match self.safe_lock(&self.mode) {
                Ok(guard) => matches!(*guard, MicrophoneMode::OnDemand),
                Err(e) => {
                    error!("Failed to lock mode: {}", e);
                    false
                }
            };

            if is_on_demand {
                if let Err(e) = self.start_microphone_stream() {
                    error!("Failed to open microphone stream: {e}");
                    return false;
                }
            }

            let recorder_available = match self.safe_lock(&self.recorder) {
                Ok(guard) => guard
                    .as_ref()
                    .map(|rec| rec.start().is_ok())
                    .unwrap_or(false),
                Err(e) => {
                    error!("Failed to lock recorder: {}", e);
                    false
                }
            };

            if recorder_available {
                if let Ok(mut guard) = self.safe_lock(&self.is_recording) {
                    *guard = true;
                }
                *state = RecordingState::Recording {
                    binding_id: binding_id.to_string(),
                };
                debug!("Recording started for binding {binding_id}");
                drop(state);
                self.generation
                    .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                self.spawn_preview_ticker();
                return true;
            }
            error!("Recorder not available");
            false
        } else {
            false
        }
    }

    pub fn update_selected_device(&self) -> Result<(), anyhow::Error> {
        // If currently open, restart the microphone stream to use the new device
        let is_open = match self.safe_lock(&self.is_open) {
            Ok(guard) => *guard,
            Err(e) => {
                error!("Failed to lock is_open: {}", e);
                return Ok(());
            }
        };

        if is_open {
            self.stop_microphone_stream();
            self.start_microphone_stream()?;
        }
        Ok(())
    }

    pub fn stop_recording(&self, binding_id: &str) -> Option<Vec<f32>> {
        let mut state = match self.safe_lock(&self.state) {
            Ok(guard) => guard,
            Err(e) => {
                error!("Failed to lock state in stop_recording: {}", e);
                return None;
            }
        };

        match *state {
            RecordingState::Recording {
                binding_id: ref active,
            } if active == binding_id => {
                *state = RecordingState::Idle;
                drop(state);

                let samples = match self.safe_lock(&self.recorder) {
                    Ok(guard) => {
                        if let Some(rec) = guard.as_ref() {
                            match rec.stop() {
                                Ok(buf) => buf,
                                Err(e) => {
                                    error!("stop() failed: {e}");
                                    Vec::new()
                                }
                            }
                        } else {
                            error!("Recorder not available");
                            Vec::new()
                        }
                    }
                    Err(e) => {
                        error!("Failed to lock recorder: {}", e);
                        Vec::new()
                    }
                };

                if let Ok(mut guard) = self.safe_lock(&self.is_recording) {
                    *guard = false;
                }

                // In on-demand mode turn the mic off again
                let is_on_demand = match self.safe_lock(&self.mode) {
                    Ok(guard) => matches!(*guard, MicrophoneMode::OnDemand),
                    Err(e) => {
                        error!("Failed to lock mode: {}", e);
                        false
                    }
                };

                if is_on_demand {
                    self.stop_microphone_stream();
                }

                // Pad if very short
                let s_len = samples.len();
                if s_len < WHISPER_SAMPLE_RATE && s_len > 0 {
                    let mut padded = samples;
                    padded.resize(WHISPER_SAMPLE_RATE * 5 / 4, 0.0);
                    Some(padded)
                } else {
                    Some(samples)
                }
            }
            _ => None,
        }
    }

    pub fn is_recording(&self) -> bool {
        match self.safe_lock(&self.state) {
            Ok(guard) => matches!(*guard, RecordingState::Recording { .. }),
            Err(e) => {
                error!("Failed to lock state in is_recording: {}", e);
                false
            }
        }
    }

    fn generation(&self) -> u64 {
        self.generation.load(std::sync::atomic::Ordering::Relaxed)
    }

    /// Returns a clone of the last `max_seconds` of samples buffered since
    /// recording started. `None` when not recording.
    pub fn peek_samples(&self, max_seconds: u32) -> Option<Vec<f32>> {
        if !self.is_recording() {
            return None;
        }
        let max_len = WHISPER_SAMPLE_RATE * max_seconds.max(1) as usize;
        let guard = self.safe_lock(&self.recorder).ok()?;
        let rec = guard.as_ref()?;
        let buf = rec.peek(max_len).ok()?;
        if buf.len() > max_len {
            Some(buf[buf.len() - max_len..].to_vec())
        } else {
            Some(buf)
        }
    }

    /// Background loop that periodically transcribes the in-flight buffer and
    /// emits `preview-text` so the overlay can show a live transcription while
    /// the user is still speaking. Exits automatically when recording stops.
    fn spawn_preview_ticker(&self) {
        let manager = self.clone();
        let my_generation = manager.generation();

        thread::spawn(move || {
            const TICK_INTERVAL: Duration = Duration::from_millis(1200);
            const PREVIEW_WINDOW_SECONDS: u32 = 30;
            const MIN_SAMPLES: usize = WHISPER_SAMPLE_RATE / 2; // 0.5s of audio

            let mut last_full_text = String::new();
            let mut last_stable_len = 0usize;
            let mut emitted_text = false;

            loop {
                thread::sleep(TICK_INTERVAL);

                if manager.generation() != my_generation || !manager.is_recording() {
                    break;
                }

                let settings = get_settings(&manager.app_handle);
                if !settings.show_live_preview || settings.cloud_transcription.enabled {
                    continue;
                }

                let Some(samples) = manager.peek_samples(PREVIEW_WINDOW_SECONDS) else {
                    break;
                };
                if samples.len() < MIN_SAMPLES {
                    continue;
                }

                let tm = manager
                    .app_handle
                    .try_state::<std::sync::Arc<crate::managers::transcription::TranscriptionManager>>();
                let Some(tm) = tm else { break };

                // transcribe_preview never unloads the model: doing so
                // mid-recording would break the final transcription.
                match tm.transcribe_preview(samples) {
                    Ok(text) => {
                        let (stable, partial) = stabilize_preview(&last_full_text, &text);
                        // Never let the confirmed region shrink while the text
                        // still shares its prefix (avoids flicker back to
                        // volatile); a slid window resets it via `common`.
                        let common = common_prefix_len(&last_full_text, &text);
                        let mut stable_len = stable.len();
                        if common >= last_stable_len && stable_len < last_stable_len {
                            stable_len = last_stable_len;
                        }
                        last_stable_len = stable_len;
                        last_full_text = text;

                        if manager.generation() != my_generation || !manager.is_recording() {
                            break;
                        }

                        let stable_text = &last_full_text[..stable_len];
                        let partial_text = &last_full_text[stable_len..];
                        if !stable_text.is_empty() || !partial_text.is_empty() {
                            emitted_text = true;
                            if let Err(e) = manager.app_handle.emit(
                                "preview-text",
                                serde_json::json!({
                                    "stable": stable_text,
                                    "partial": partial_text,
                                }),
                            ) {
                                error!("Failed to emit preview-text: {}", e);
                            }
                        } else if emitted_text {
                            // The result emptied out; clear the overlay once.
                            emitted_text = false;
                            if let Err(e) = manager.app_handle.emit(
                                "preview-text",
                                serde_json::json!({ "stable": "", "partial": "" }),
                            ) {
                                error!("Failed to emit preview-text: {}", e);
                            }
                        }
                    }
                    Err(e) => {
                        // Model not loaded yet or transient failure: stay quiet.
                        debug!("Preview transcription skipped: {}", e);
                    }
                }
            }
            debug!("Preview ticker exited");
        });
    }

    /// Cancel any ongoing recording without returning audio samples
    pub fn cancel_recording(&self) {
        let mut state = match self.safe_lock(&self.state) {
            Ok(guard) => guard,
            Err(e) => {
                error!("Failed to lock state in cancel_recording: {}", e);
                return;
            }
        };

        if let RecordingState::Recording { .. } = *state {
            *state = RecordingState::Idle;
            drop(state);

            if let Ok(guard) = self.safe_lock(&self.recorder) {
                if let Some(rec) = guard.as_ref() {
                    let _ = rec.stop(); // Discard the result
                }
            }

            if let Ok(mut guard) = self.safe_lock(&self.is_recording) {
                *guard = false;
            }

            // In on-demand mode turn the mic off again
            let is_on_demand = match self.safe_lock(&self.mode) {
                Ok(guard) => matches!(*guard, MicrophoneMode::OnDemand),
                Err(e) => {
                    error!("Failed to lock mode: {}", e);
                    false
                }
            };

            if is_on_demand {
                self.stop_microphone_stream();
            }
        }
    }
}

#[cfg(test)]
mod preview_tests {
    use super::*;

    #[test]
    fn stabilize_identical_text_is_fully_stable() {
        let (stable, partial) = stabilize_preview("hello world", "hello world");
        assert_eq!(stable, "hello world");
        assert_eq!(partial, "");
    }

    #[test]
    fn stabilize_empty_previous_is_all_volatile() {
        let (stable, partial) = stabilize_preview("", "hello world");
        assert_eq!(stable, "");
        assert_eq!(partial, "hello world");
    }

    #[test]
    fn stabilize_no_common_prefix_is_all_volatile() {
        let (stable, partial) = stabilize_preview("abc def", "xyz");
        assert_eq!(stable, "");
        assert_eq!(partial, "xyz");
    }

    #[test]
    fn stabilize_partial_word_stays_volatile() {
        let (stable, partial) = stabilize_preview("hello wor", "hello world");
        assert_eq!(stable, "hello ");
        assert_eq!(partial, "world");
    }

    #[test]
    fn stabilize_fully_consumed_previous_stays_stable() {
        let (stable, partial) = stabilize_preview("hello", "hello world");
        assert_eq!(stable, "hello");
        assert_eq!(partial, " world");
    }

    #[test]
    fn stabilize_shrinking_text_is_fully_stable() {
        // The current text is fully explained by the previous one, so there
        // is no uncertain tail to keep volatile.
        let (stable, partial) = stabilize_preview("hello world", "hello wor");
        assert_eq!(stable, "hello wor");
        assert_eq!(partial, "");
    }

    #[test]
    fn stabilize_first_growing_word_with_divergence_stays_volatile() {
        // Divergence mid-word with no whitespace yet: nothing can be trusted.
        let (stable, partial) = stabilize_preview("helo wor", "hello wor");
        assert_eq!(stable, "");
        assert_eq!(partial, "hello wor");
    }

    #[test]
    fn stabilize_utf8_never_splits_characters() {
        let (stable, partial) = stabilize_preview("héllo wörld", "héllo wörld!");
        assert!(stable.is_char_boundary(stable.len()));
        assert!(partial.is_char_boundary(partial.len()));
        assert_eq!(stable + &partial, "héllo wörld!");

        let (stable, partial) = stabilize_preview("hi 👋", "hi 👋!");
        assert!(stable.is_char_boundary(stable.len()));
        assert!(partial.is_char_boundary(partial.len()));
        assert_eq!(stable + &partial, "hi 👋!");
    }
}
