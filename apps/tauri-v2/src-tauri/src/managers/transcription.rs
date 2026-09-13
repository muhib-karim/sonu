use crate::audio_toolkit::apply_custom_words;
use crate::managers::model::{EngineType, ModelManager};
use crate::settings::{get_settings, ModelUnloadTimeout};
use anyhow::Result;
use log::{debug, error, info, warn};
use serde::Serialize;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Condvar, Mutex, PoisonError};
use std::thread;
use std::time::{Duration, SystemTime};
use tauri::{AppHandle, Emitter};
use transcribe_rs::{
    engines::parakeet::{
        ParakeetEngine, ParakeetInferenceParams, ParakeetModelParams, TimestampGranularity,
    },
    TranscriptionEngine,
};

#[cfg(feature = "moonshine")]
use transcribe_rs::engines::moonshine::{
    ModelVariant, MoonshineEngine, MoonshineInferenceParams, MoonshineModelParams,
};
#[cfg(feature = "whisper")]
use transcribe_rs::engines::whisper::{WhisperEngine, WhisperInferenceParams, WhisperModelParams};

/// Errors that can occur in transcription operations
#[derive(Debug, thiserror::Error)]
pub enum TranscriptionError {
    #[error("Mutex lock poisoned: {0}")]
    LockPoisoned(String),
}

impl<T> From<PoisonError<T>> for TranscriptionError {
    fn from(err: PoisonError<T>) -> Self {
        TranscriptionError::LockPoisoned(err.to_string())
    }
}

/// Result type for transcription operations
pub type TranscriptionResult<T> = Result<T, TranscriptionError>;

#[derive(Clone, Debug, Serialize)]
pub struct ModelStateEvent {
    pub event_type: String,
    pub model_id: Option<String>,
    pub model_name: Option<String>,
    pub error: Option<String>,
}

// The engine variants differ a lot in size, but this enum is constructed once
// at model-load time and stored in a single `Option` — never in a collection —
// so the largest variant's footprint is paid exactly once. Boxing would add a
// heap indirection to every transcription call for no measurable benefit.
#[allow(clippy::large_enum_variant)]
enum LoadedEngine {
    #[cfg(feature = "parakeet")]
    Parakeet(ParakeetEngine),
    /// Whisper loads a single GGML .bin model file.
    #[cfg(feature = "whisper")]
    Whisper(WhisperEngine),
    /// Moonshine loads a model directory (encoder/decoder ONNX + tokenizer).
    #[cfg(feature = "moonshine")]
    Moonshine(MoonshineEngine),
}

/// Maps user settings onto Whisper inference parameters.
///
/// `selected_language` of "auto" (or empty) maps to `None`, which makes
/// Whisper auto-detect the spoken language; `translate_to_english` maps to
/// Whisper's translate option (multilingual models only).
#[cfg(feature = "whisper")]
fn whisper_inference_params(
    selected_language: &str,
    translate_to_english: bool,
) -> WhisperInferenceParams {
    WhisperInferenceParams {
        language: match selected_language {
            "" | "auto" => None,
            lang => Some(lang.to_string()),
        },
        translate: translate_to_english,
        ..Default::default()
    }
}

#[derive(Clone)]
pub struct TranscriptionManager {
    engine: Arc<Mutex<Option<LoadedEngine>>>,
    model_manager: Arc<ModelManager>,
    app_handle: AppHandle,
    current_model_id: Arc<Mutex<Option<String>>>,
    last_activity: Arc<AtomicU64>,
    shutdown_signal: Arc<AtomicBool>,
    watcher_handle: Arc<Mutex<Option<thread::JoinHandle<()>>>>,
    is_loading: Arc<Mutex<bool>>,
    loading_condvar: Arc<Condvar>,
}

impl TranscriptionManager {
    pub fn new(app_handle: &AppHandle, model_manager: Arc<ModelManager>) -> Result<Self> {
        let current_time_ms = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or_else(|e| {
                error!("System time is before Unix epoch: {}", e);
                0
            });

        let manager = Self {
            engine: Arc::new(Mutex::new(None)),
            model_manager,
            app_handle: app_handle.clone(),
            current_model_id: Arc::new(Mutex::new(None)),
            last_activity: Arc::new(AtomicU64::new(current_time_ms)),
            shutdown_signal: Arc::new(AtomicBool::new(false)),
            watcher_handle: Arc::new(Mutex::new(None)),
            is_loading: Arc::new(Mutex::new(false)),
            loading_condvar: Arc::new(Condvar::new()),
        };

        // Start the idle watcher
        {
            let app_handle_cloned = app_handle.clone();
            let manager_cloned = manager.clone();
            let shutdown_signal = manager.shutdown_signal.clone();
            let handle = thread::spawn(move || {
                while !shutdown_signal.load(Ordering::Relaxed) {
                    thread::sleep(Duration::from_secs(10)); // Check every 10 seconds

                    // Check shutdown signal again after sleep
                    if shutdown_signal.load(Ordering::Relaxed) {
                        break;
                    }

                    let settings = get_settings(&app_handle_cloned);
                    let timeout_seconds = settings.model_unload_timeout.to_seconds();

                    if let Some(limit_seconds) = timeout_seconds {
                        // Skip polling-based unloading for immediate timeout since it's handled directly in transcribe()
                        if settings.model_unload_timeout == ModelUnloadTimeout::Immediately {
                            continue;
                        }

                        let last = manager_cloned.last_activity.load(Ordering::Relaxed);
                        let now_ms = SystemTime::now()
                            .duration_since(SystemTime::UNIX_EPOCH)
                            .map(|d| d.as_millis() as u64)
                            .unwrap_or(0);

                        if now_ms.saturating_sub(last) > limit_seconds * 1000 {
                            // idle -> unload
                            if manager_cloned.is_model_loaded() {
                                let unload_start = std::time::Instant::now();
                                debug!("Starting to unload model due to inactivity");

                                if let Ok(()) = manager_cloned.unload_model() {
                                    let _ = app_handle_cloned.emit(
                                        "model-state-changed",
                                        ModelStateEvent {
                                            event_type: "unloaded".to_string(),
                                            model_id: None,
                                            model_name: None,
                                            error: None,
                                        },
                                    );
                                    let unload_duration = unload_start.elapsed();
                                    debug!(
                                        "Model unloaded due to inactivity (took {}ms)",
                                        unload_duration.as_millis()
                                    );
                                }
                            }
                        }
                    }
                }
                debug!("Idle watcher thread shutting down gracefully");
            });

            if let Ok(mut guard) = manager.watcher_handle.lock() {
                *guard = Some(handle);
            } else {
                error!("Failed to lock watcher_handle during initialization");
            }
        }

        Ok(manager)
    }

    /// Safely lock a mutex, converting poison errors to TranscriptionError
    fn safe_lock<'a, T>(
        &self,
        mutex: &'a Mutex<T>,
    ) -> TranscriptionResult<std::sync::MutexGuard<'a, T>> {
        mutex.lock().map_err(|_e| {
            error!("Mutex poison error");
            TranscriptionError::LockPoisoned("Mutex lock poisoned".to_string())
        })
    }

    pub fn is_model_loaded(&self) -> bool {
        match self.safe_lock(&self.engine) {
            Ok(engine) => engine.is_some(),
            Err(e) => {
                error!("Failed to lock engine in is_model_loaded: {}", e);
                false
            }
        }
    }

    pub fn unload_model(&self) -> Result<()> {
        let unload_start = std::time::Instant::now();
        debug!("Starting to unload model");

        {
            let mut engine = self
                .safe_lock(&self.engine)
                .map_err(|e| anyhow::anyhow!("Failed to lock engine: {}", e))?;
            if let Some(ref mut loaded_engine) = *engine {
                match loaded_engine {
                    #[cfg(feature = "parakeet")]
                    LoadedEngine::Parakeet(ref mut e) => e.unload_model(),
                    #[cfg(feature = "whisper")]
                    LoadedEngine::Whisper(ref mut e) => e.unload_model(),
                    #[cfg(feature = "moonshine")]
                    LoadedEngine::Moonshine(ref mut e) => e.unload_model(),
                }
            }
            *engine = None; // Drop the engine to free memory
        }
        {
            let mut current_model = self
                .safe_lock(&self.current_model_id)
                .map_err(|e| anyhow::anyhow!("Failed to lock current_model_id: {}", e))?;
            *current_model = None;
        }

        // Emit unloaded event
        let _ = self.app_handle.emit(
            "model-state-changed",
            ModelStateEvent {
                event_type: "unloaded".to_string(),
                model_id: None,
                model_name: None,
                error: None,
            },
        );

        let unload_duration = unload_start.elapsed();
        debug!(
            "Model unloaded manually (took {}ms)",
            unload_duration.as_millis()
        );
        Ok(())
    }

    /// Unloads the model immediately if the setting is enabled and the model is loaded
    pub fn maybe_unload_immediately(&self, context: &str) {
        let settings = get_settings(&self.app_handle);
        if settings.model_unload_timeout == ModelUnloadTimeout::Immediately
            && self.is_model_loaded()
        {
            info!("Immediately unloading model after {}", context);
            if let Err(e) = self.unload_model() {
                warn!("Failed to immediately unload model: {}", e);
            }
        }
    }

    /// Emits a `loading_failed` model state event and returns the matching
    /// error for propagation to the caller.
    fn emit_load_failure(
        &self,
        model_id: &str,
        model_name: &str,
        error_msg: &str,
    ) -> anyhow::Error {
        let _ = self.app_handle.emit(
            "model-state-changed",
            ModelStateEvent {
                event_type: "loading_failed".to_string(),
                model_id: Some(model_id.to_string()),
                model_name: Some(model_name.to_string()),
                error: Some(error_msg.to_string()),
            },
        );
        anyhow::anyhow!("{}", error_msg)
    }

    pub fn load_model(&self, model_id: &str) -> Result<()> {
        let load_start = std::time::Instant::now();
        debug!("Starting to load model: {}", model_id);

        // Emit loading started event
        let _ = self.app_handle.emit(
            "model-state-changed",
            ModelStateEvent {
                event_type: "loading_started".to_string(),
                model_id: Some(model_id.to_string()),
                model_name: None,
                error: None,
            },
        );

        let model_info = self
            .model_manager
            .get_model_info(model_id)
            .ok_or_else(|| anyhow::anyhow!("Model not found: {}", model_id))?;

        if !model_info.is_downloaded {
            let error_msg = "Model not downloaded";
            return Err(self.emit_load_failure(model_id, &model_info.name, error_msg));
        }

        let model_path = self.model_manager.get_model_path(model_id)?;

        // Create the appropriate engine based on the catalog's engine type.
        // Whisper takes the .bin file path, Parakeet and Moonshine take the
        // model directory path (guaranteed by the catalog's is_directory).
        let loaded_engine = match model_info.engine_type {
            EngineType::Parakeet => {
                #[cfg(feature = "parakeet")]
                {
                    let mut engine = ParakeetEngine::new();
                    if let Err(e) =
                        engine.load_model_with_params(&model_path, ParakeetModelParams::int8())
                    {
                        let error_msg =
                            format!("Failed to load parakeet model {}: {}", model_id, e);
                        return Err(self.emit_load_failure(model_id, &model_info.name, &error_msg));
                    }
                    LoadedEngine::Parakeet(engine)
                }
                #[cfg(not(feature = "parakeet"))]
                {
                    let error_msg =
                        format!("Parakeet engine is not compiled in for model {}", model_id);
                    return Err(self.emit_load_failure(model_id, &model_info.name, &error_msg));
                }
            }
            EngineType::Whisper => {
                #[cfg(feature = "whisper")]
                {
                    let mut engine = WhisperEngine::new();
                    if let Err(e) =
                        engine.load_model_with_params(&model_path, WhisperModelParams::default())
                    {
                        let error_msg = format!("Failed to load whisper model {}: {}", model_id, e);
                        return Err(self.emit_load_failure(model_id, &model_info.name, &error_msg));
                    }
                    LoadedEngine::Whisper(engine)
                }
                #[cfg(not(feature = "whisper"))]
                {
                    let error_msg =
                        format!("Whisper engine is not compiled in for model {}", model_id);
                    return Err(self.emit_load_failure(model_id, &model_info.name, &error_msg));
                }
            }
            EngineType::Moonshine => {
                #[cfg(feature = "moonshine")]
                {
                    let mut engine = MoonshineEngine::new();
                    let params = MoonshineModelParams {
                        variant: ModelVariant::Base,
                    };
                    if let Err(e) = engine.load_model_with_params(&model_path, params) {
                        let error_msg =
                            format!("Failed to load moonshine model {}: {}", model_id, e);
                        return Err(self.emit_load_failure(model_id, &model_info.name, &error_msg));
                    }
                    LoadedEngine::Moonshine(engine)
                }
                #[cfg(not(feature = "moonshine"))]
                {
                    let error_msg =
                        format!("Moonshine engine is not compiled in for model {}", model_id);
                    return Err(self.emit_load_failure(model_id, &model_info.name, &error_msg));
                }
            }
        };

        // Update the current engine and model ID
        {
            let mut engine = self
                .safe_lock(&self.engine)
                .map_err(|e| anyhow::anyhow!("Failed to lock engine: {}", e))?;
            *engine = Some(loaded_engine);
        }
        {
            let mut current_model = self
                .safe_lock(&self.current_model_id)
                .map_err(|e| anyhow::anyhow!("Failed to lock current_model_id: {}", e))?;
            *current_model = Some(model_id.to_string());
        }

        // Emit loading completed event
        let _ = self.app_handle.emit(
            "model-state-changed",
            ModelStateEvent {
                event_type: "loading_completed".to_string(),
                model_id: Some(model_id.to_string()),
                model_name: Some(model_info.name.clone()),
                error: None,
            },
        );

        let load_duration = load_start.elapsed();
        debug!(
            "Successfully loaded transcription model: {} (took {}ms)",
            model_id,
            load_duration.as_millis()
        );
        Ok(())
    }

    /// Kicks off the model loading in a background thread if it's not already loaded
    pub fn initiate_model_load(&self) {
        let mut is_loading = match self.safe_lock(&self.is_loading) {
            Ok(guard) => guard,
            Err(e) => {
                error!("Failed to lock is_loading in initiate_model_load: {}", e);
                return;
            }
        };

        if *is_loading || self.is_model_loaded() {
            return;
        }

        *is_loading = true;
        let self_clone = self.clone();
        thread::spawn(move || {
            let settings = get_settings(&self_clone.app_handle);
            if let Err(e) = self_clone.load_model(&settings.selected_model) {
                error!("Failed to load model: {}", e);
            }
            if let Ok(mut guard) = self_clone.safe_lock(&self_clone.is_loading) {
                *guard = false;
                self_clone.loading_condvar.notify_all();
            } else {
                error!("Failed to lock is_loading after model load attempt");
            }
        });
    }

    pub fn get_current_model(&self) -> Option<String> {
        match self.safe_lock(&self.current_model_id) {
            Ok(current_model) => current_model.clone(),
            Err(e) => {
                error!("Failed to lock current_model_id: {}", e);
                None
            }
        }
    }

    pub fn transcribe(&self, audio: Vec<f32>) -> Result<String> {
        self.transcribe_inner(audio, false)
    }

    /// Like [`Self::transcribe`], but never unloads the model afterwards.
    /// Used by the live preview ticker: unloading mid-recording would break
    /// the final transcription of the recording in progress.
    pub fn transcribe_preview(&self, audio: Vec<f32>) -> Result<String> {
        self.transcribe_inner(audio, true)
    }

    fn transcribe_inner(&self, audio: Vec<f32>, is_preview: bool) -> Result<String> {
        // Update last activity timestamp
        let current_time_ms = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or_else(|e| {
                error!("System time is before Unix epoch: {}", e);
                0
            });
        self.last_activity.store(current_time_ms, Ordering::Relaxed);

        let st = std::time::Instant::now();

        debug!("Audio vector length: {}", audio.len());

        if audio.is_empty() {
            debug!("Empty audio vector");
            if !is_preview {
                self.maybe_unload_immediately("empty audio");
            }
            return Ok(String::new());
        }

        // Check if model is loaded, if not try to load it
        {
            // If the model is loading, wait for it to complete.
            let mut is_loading = self
                .safe_lock(&self.is_loading)
                .map_err(|e| anyhow::anyhow!("Failed to lock is_loading: {}", e))?;

            while *is_loading {
                is_loading = self
                    .loading_condvar
                    .wait(is_loading)
                    .map_err(|e| anyhow::anyhow!("Condvar wait failed: {}", e))?;
            }

            let engine_guard = self
                .safe_lock(&self.engine)
                .map_err(|e| anyhow::anyhow!("Failed to lock engine: {}", e))?;

            if engine_guard.is_none() {
                return Err(anyhow::anyhow!("Model is not loaded for transcription."));
            }
        }

        // Get current settings for configuration
        let settings = get_settings(&self.app_handle);

        // Perform transcription with the appropriate engine
        let result = {
            let mut engine_guard = self
                .safe_lock(&self.engine)
                .map_err(|e| anyhow::anyhow!("Failed to lock engine: {}", e))?;
            let engine = engine_guard.as_mut().ok_or_else(|| {
                anyhow::anyhow!(
                    "Model failed to load after auto-load attempt. Please check your model settings."
                )
            })?;

            match engine {
                #[cfg(feature = "parakeet")]
                LoadedEngine::Parakeet(parakeet_engine) => {
                    let params = ParakeetInferenceParams {
                        timestamp_granularity: TimestampGranularity::Segment,
                    };
                    parakeet_engine
                        .transcribe_samples(audio, Some(params))
                        .map_err(|e| anyhow::anyhow!("Parakeet transcription failed: {}", e))?
                }
                #[cfg(feature = "whisper")]
                LoadedEngine::Whisper(whisper_engine) => {
                    let params = whisper_inference_params(
                        &settings.selected_language,
                        settings.translate_to_english,
                    );
                    whisper_engine
                        .transcribe_samples(audio, Some(params))
                        .map_err(|e| anyhow::anyhow!("Whisper transcription failed: {}", e))?
                }
                #[cfg(feature = "moonshine")]
                LoadedEngine::Moonshine(moonshine_engine) => {
                    // Moonshine has no language/translate options (English-only
                    // models); max_length is derived from audio duration.
                    moonshine_engine
                        .transcribe_samples(audio, Some(MoonshineInferenceParams::default()))
                        .map_err(|e| anyhow::anyhow!("Moonshine transcription failed: {}", e))?
                }
            }
        };

        // Apply word correction if custom words are configured
        let corrected_result = if !settings.custom_words.is_empty() {
            apply_custom_words(
                &result.text,
                &settings.custom_words,
                settings.word_correction_threshold,
            )
        } else {
            result.text
        };

        let et = std::time::Instant::now();
        let translation_note = if settings.translate_to_english {
            " (translated)"
        } else {
            ""
        };
        info!(
            "Transcription completed in {}ms{}",
            (et - st).as_millis(),
            translation_note
        );

        let final_result = corrected_result.trim().to_string();

        if final_result.is_empty() {
            info!("Transcription result is empty");
        } else {
            info!("Transcription result: {}", final_result);
        }

        if !is_preview {
            self.maybe_unload_immediately("transcription");
        }

        Ok(final_result)
    }
}

impl Drop for TranscriptionManager {
    fn drop(&mut self) {
        debug!("Shutting down TranscriptionManager");

        // Signal the watcher thread to shutdown
        self.shutdown_signal.store(true, Ordering::Relaxed);

        // Wait for the thread to finish gracefully
        match self.safe_lock(&self.watcher_handle) {
            Ok(mut guard) => {
                if let Some(handle) = guard.take() {
                    if let Err(e) = handle.join() {
                        warn!("Failed to join idle watcher thread: {:?}", e);
                    } else {
                        debug!("Idle watcher thread joined successfully");
                    }
                }
            }
            Err(e) => {
                warn!("Failed to lock watcher_handle during drop: {}", e);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::managers::model::EngineType;
    // `whisper_inference_params` lives in the parent module and is itself gated on
    // the `whisper` feature, so the import has to carry the same gate. Without it
    // this module only failed to compile in builds that enable `whisper` — which
    // is exactly the configuration a machine without libclang can never build, so
    // the breakage was invisible locally and only showed up in CI.
    #[cfg(feature = "whisper")]
    use super::whisper_inference_params;

    /// Whether a given engine type can be dispatched in the current build
    /// (i.e. its cargo feature is compiled in and `LoadedEngine` has the
    /// corresponding variant plus load/transcribe arms).
    fn engine_type_supported(engine_type: &EngineType) -> bool {
        match engine_type {
            EngineType::Parakeet => cfg!(feature = "parakeet"),
            EngineType::Whisper => cfg!(feature = "whisper"),
            EngineType::Moonshine => cfg!(feature = "moonshine"),
        }
    }

    /// Parakeet is SONU's baseline engine and must always be compiled in.
    #[test]
    fn test_parakeet_always_supported() {
        assert!(engine_type_supported(&EngineType::Parakeet));
    }

    /// Whisper and Moonshine support must exactly track their cargo features,
    /// so the load-time dispatch never hits an "engine not compiled in" error
    /// for a model whose engine is enabled.
    #[test]
    fn test_engine_support_tracks_features() {
        assert_eq!(
            engine_type_supported(&EngineType::Whisper),
            cfg!(feature = "whisper")
        );
        assert_eq!(
            engine_type_supported(&EngineType::Moonshine),
            cfg!(feature = "moonshine")
        );
    }

    /// In the full build (parakeet + whisper + moonshine) every catalog
    /// engine type must be dispatchable.
    #[test]
    #[cfg(all(feature = "whisper", feature = "moonshine"))]
    fn test_all_engines_dispatchable_in_full_build() {
        for engine_type in [
            EngineType::Parakeet,
            EngineType::Whisper,
            EngineType::Moonshine,
        ] {
            assert!(
                engine_type_supported(&engine_type),
                "{:?} must be dispatchable in the full build",
                engine_type
            );
        }
    }

    /// Whisper parameter mapping: "auto"/empty language means auto-detect
    /// (None) and the translate setting is forwarded as-is.
    #[test]
    #[cfg(feature = "whisper")]
    fn test_whisper_inference_params_mapping() {
        // "auto" => None (Whisper auto-detects the language)
        let params = whisper_inference_params("auto", false);
        assert_eq!(params.language, None);
        assert!(!params.translate);
        assert!(!params.print_timestamps);

        // Explicit language is forwarded
        let params = whisper_inference_params("en", false);
        assert_eq!(params.language, Some("en".to_string()));

        // Empty language behaves like auto
        let params = whisper_inference_params("", false);
        assert_eq!(params.language, None);

        // Translate-to-English setting maps to Whisper's translate flag
        let params = whisper_inference_params("de", true);
        assert_eq!(params.language, Some("de".to_string()));
        assert!(params.translate);
    }
}
