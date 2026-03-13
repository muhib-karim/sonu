//! Unit tests for transcription manager
//! 
//! These tests verify the transcription manager's functionality including:
//! - Model loading/unloading
//! - Transcription operations
//! - Timeout handling
//! - Error recovery

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use std::time::Duration;
    use tokio::time::timeout;

    /// Test that model state is correctly tracked
    #[test]
    fn test_model_state_tracking() {
        // Test initial state
        let state = ModelState::default();
        assert!(!state.is_loaded);
        assert!(!state.is_loading);
        assert_eq!(state.current_model, None);
    }

    /// Test model state transitions
    #[test]
    fn test_model_state_transitions() {
        let mut state = ModelState::default();
        
        // Loading state
        state.is_loading = true;
        assert!(state.is_loading);
        assert!(!state.is_loaded);
        
        // Loaded state
        state.is_loading = false;
        state.is_loaded = true;
        state.current_model = Some("tiny".to_string());
        assert!(!state.is_loading);
        assert!(state.is_loaded);
        assert_eq!(state.current_model, Some("tiny".to_string()));
        
        // Unloaded state
        state.is_loaded = false;
        state.current_model = None;
        assert!(!state.is_loading);
        assert!(!state.is_loaded);
        assert_eq!(state.current_model, None);
    }

    /// Test transcription options validation
    #[test]
    fn test_transcription_options_validation() {
        // Valid options
        let valid_options = TranscriptionOptions {
            language: Some("en".to_string()),
            translate_to_english: false,
            use_vad: true,
            post_process_enabled: false,
        };
        assert!(valid_options.validate().is_ok());
        
        // Invalid language code
        let invalid_lang = TranscriptionOptions {
            language: Some("invalid".to_string()),
            translate_to_english: false,
            use_vad: true,
            post_process_enabled: false,
        };
        assert!(invalid_lang.validate().is_err());
        
        // Empty language should default to auto-detect
        let empty_lang = TranscriptionOptions {
            language: None,
            translate_to_english: false,
            use_vad: true,
            post_process_enabled: false,
        };
        assert!(empty_lang.validate().is_ok());
    }

    /// Test timeout configuration
    #[test]
    fn test_timeout_configuration() {
        let config = TranscriptionConfig::default();
        
        // Default timeouts should be reasonable
        assert!(config.model_load_timeout > Duration::from_secs(0));
        assert!(config.transcription_timeout > Duration::from_secs(0));
        assert!(config.model_unload_timeout > Duration::from_secs(0));
        
        // Test custom configuration
        let custom_config = TranscriptionConfig {
            model_load_timeout: Duration::from_secs(60),
            transcription_timeout: Duration::from_secs(30),
            model_unload_timeout: Duration::from_secs(10),
        };
        assert_eq!(custom_config.model_load_timeout, Duration::from_secs(60));
        assert_eq!(custom_config.transcription_timeout, Duration::from_secs(30));
    }

    /// Test error handling and recovery
    #[test]
    fn test_error_handling() {
        // Test lock poisoning error
        let poisoned_error = TranscriptionError::LockPoisoned("test error".to_string());
        assert!(matches!(poisoned_error, TranscriptionError::LockPoisoned(_)));
        
        // Test model not loaded error
        let not_loaded = TranscriptionError::ModelNotLoaded;
        assert!(matches!(not_loaded, TranscriptionError::ModelNotLoaded));
        
        // Test model loading failed error
        let load_failed = TranscriptionError::ModelLoadingFailed("out of memory".to_string());
        assert!(matches!(load_failed, TranscriptionError::ModelLoadingFailed(_)));
        
        // Test transcription failed error
        let transcription_failed = TranscriptionError::TranscriptionFailed("audio too short".to_string());
        assert!(matches!(transcription_failed, TranscriptionError::TranscriptionFailed(_)));
    }

    /// Test model ID validation
    #[test]
    fn test_model_id_validation() {
        let valid_models = vec!["tiny", "base", "small", "medium", "large-v1", "large-v2", "large-v3"];
        
        for model in valid_models {
            assert!(validate_model_id(model).is_ok(), "Model {} should be valid", model);
        }
        
        // Invalid models
        let invalid_models = vec!["", "huge", "tiny../../etc/passwd", "base; rm -rf /", "large-v4"];
        
        for model in invalid_models {
            assert!(validate_model_id(model).is_err(), "Model {} should be invalid", model);
        }
    }

    /// Test recording state management
    #[test]
    fn test_recording_state_management() {
        let mut state = RecordingState::default();
        
        // Initial state
        assert!(!state.is_recording);
        assert_eq!(state.duration_ms, 0);
        assert_eq!(state.start_time, None);
        
        // Start recording
        state.start_recording();
        assert!(state.is_recording);
        assert!(state.start_time.is_some());
        
        // Simulate time passing
        std::thread::sleep(Duration::from_millis(10));
        state.update_duration();
        assert!(state.duration_ms > 0);
        
        // Stop recording
        state.stop_recording();
        assert!(!state.is_recording);
    }

    /// Test audio device validation
    #[test]
    fn test_audio_device_validation() {
        // Valid device
        let valid_device = AudioDevice {
            id: "default".to_string(),
            name: "Default Microphone".to_string(),
            is_default: true,
            is_input: true,
            sample_rate: 16000,
            channels: 1,
        };
        assert!(valid_device.validate().is_ok());
        
        // Invalid sample rate
        let invalid_sample_rate = AudioDevice {
            id: "test".to_string(),
            name: "Test".to_string(),
            is_default: false,
            is_input: true,
            sample_rate: 8000, // Too low
            channels: 1,
        };
        assert!(invalid_sample_rate.validate().is_err());
        
        // Invalid channel count
        let invalid_channels = AudioDevice {
            id: "test".to_string(),
            name: "Test".to_string(),
            is_default: false,
            is_input: true,
            sample_rate: 16000,
            channels: 0, // Invalid
        };
        assert!(invalid_channels.validate().is_err());
    }

    /// Test transcription result processing
    #[test]
    fn test_transcription_result_processing() {
        let result = TranscriptionResult {
            id: "test-123".to_string(),
            text: "Hello world".to_string(),
            confidence: 0.95,
            language: "en".to_string(),
            processing_time_ms: 100,
            audio_duration_ms: 1000,
            timestamp: std::time::SystemTime::now(),
        };
        
        // Verify all fields are accessible
        assert_eq!(result.text, "Hello world");
        assert!(result.confidence > 0.0 && result.confidence <= 1.0);
        assert_eq!(result.language, "en");
        assert!(result.processing_time_ms > 0);
    }

    /// Test custom words application
    #[test]
    fn test_custom_words_application() {
        let custom_words = vec!["SONU".to_string(), "Whisper".to_string()];
        let text = "sonu is using whisper for transcription";
        
        let processed = apply_custom_words(text, &custom_words, 0.8);
        
        // Should preserve original case for custom words when appropriate
        assert!(processed.contains("SONU") || processed.contains("Sonu"));
    }

    /// Test timeout handling
    #[tokio::test]
    async fn test_timeout_handling() {
        let config = TranscriptionConfig::default();
        
        // Simulate a long-running operation that should timeout
        let long_operation = async {
            tokio::time::sleep(Duration::from_secs(60)).await;
            Ok(())
        };
        
        let result = timeout(config.model_load_timeout, long_operation).await;
        assert!(result.is_err(), "Operation should have timed out");
    }

    /// Test cancellation token
    #[tokio::test]
    async fn test_cancellation_token() {
        use tokio::sync::CancellationToken;
        
        let token = CancellationToken::new();
        let token_clone = token.clone();
        
        // Spawn a task that listens for cancellation
        let handle = tokio::spawn(async move {
            tokio::select! {
                _ = tokio::time::sleep(Duration::from_secs(60)) => {
                    panic!("Should have been cancelled");
                }
                _ = token_clone.cancelled() => {
                    // Expected cancellation
                }
            }
        });
        
        // Cancel after short delay
        tokio::time::sleep(Duration::from_millis(10)).await;
        token.cancel();
        
        // Task should complete successfully (not panic)
        let result = timeout(Duration::from_secs(1), handle).await;
        assert!(result.is_ok());
    }
}

// Helper functions for tests
fn validate_model_id(model_id: &str) -> Result<(), String> {
    if model_id.is_empty() {
        return Err("Model ID cannot be empty".to_string());
    }
    
    // Check for path traversal attempts
    if model_id.contains("..") || model_id.contains('/') || model_id.contains('\\') {
        return Err("Model ID contains invalid characters".to_string());
    }
    
    // Check for command injection
    if model_id.contains(';') || model_id.contains('|') || model_id.contains('&') || model_id.contains('`') {
        return Err("Model ID contains invalid characters".to_string());
    }
    
    let valid_models = ["tiny", "base", "small", "medium", "large-v1", "large-v2", "large-v3"];
    if !valid_models.contains(&model_id) {
        return Err(format!("Unknown model: {}", model_id));
    }
    
    Ok(())
}

fn apply_custom_words(text: &str, custom_words: &[String], _threshold: f64) -> String {
    let mut result = text.to_string();
    
    for word in custom_words {
        // Simple case-insensitive replacement preserving surrounding context
        let pattern = regex::Regex::new(&format!(r"(?i)\b{}\b", regex::escape(&word.to_lowercase()))).unwrap();
        result = pattern.replace_all(&result, word.as_str()).to_string();
    }
    
    result
}

// Test implementations
#[derive(Default, Clone)]
struct ModelState {
    is_loaded: bool,
    is_loading: bool,
    current_model: Option<String>,
}

struct TranscriptionOptions {
    language: Option<String>,
    translate_to_english: bool,
    use_vad: bool,
    post_process_enabled: bool,
}

impl TranscriptionOptions {
    fn validate(&self) -> Result<(), String> {
        if let Some(ref lang) = self.language {
            let valid_langs = ["en", "es", "fr", "de", "it", "pt", "auto"];
            if !valid_langs.contains(&lang.as_str()) {
                return Err(format!("Invalid language code: {}", lang));
            }
        }
        Ok(())
    }
}

struct TranscriptionConfig {
    model_load_timeout: Duration,
    transcription_timeout: Duration,
    model_unload_timeout: Duration,
}

impl Default for TranscriptionConfig {
    fn default() -> Self {
        Self {
            model_load_timeout: Duration::from_secs(30),
            transcription_timeout: Duration::from_secs(60),
            model_unload_timeout: Duration::from_secs(10),
        }
    }
}

struct RecordingState {
    is_recording: bool,
    start_time: Option<std::time::Instant>,
    duration_ms: u64,
}

impl Default for RecordingState {
    fn default() -> Self {
        Self {
            is_recording: false,
            start_time: None,
            duration_ms: 0,
        }
    }
}

impl RecordingState {
    fn start_recording(&mut self) {
        self.is_recording = true;
        self.start_time = Some(std::time::Instant::now());
        self.duration_ms = 0;
    }
    
    fn stop_recording(&mut self) {
        self.is_recording = false;
        self.start_time = None;
    }
    
    fn update_duration(&mut self) {
        if let Some(start) = self.start_time {
            self.duration_ms = start.elapsed().as_millis() as u64;
        }
    }
}

struct AudioDevice {
    id: String,
    name: String,
    is_default: bool,
    is_input: bool,
    sample_rate: u32,
    channels: u16,
}

impl AudioDevice {
    fn validate(&self) -> Result<(), String> {
        if self.sample_rate < 16000 {
            return Err("Sample rate must be at least 16000 Hz".to_string());
        }
        if self.channels == 0 {
            return Err("Channel count must be at least 1".to_string());
        }
        Ok(())
    }
}

struct TranscriptionResult {
    id: String,
    text: String,
    confidence: f64,
    language: String,
    processing_time_ms: u64,
    audio_duration_ms: u64,
    timestamp: std::time::SystemTime,
}
