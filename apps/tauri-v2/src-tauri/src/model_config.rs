use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

/// Model configuration loaded from models.json
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    pub models: ModelsConfig,
    pub vad: HashMap<String, VadConfig>,
    #[serde(rename = "default_settings")]
    pub defaults: DefaultSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelsConfig {
    pub whisper: HashMap<String, WhisperModelConfig>,
    pub parakeet: HashMap<String, ParakeetModelConfig>,
    #[serde(rename = "offline_llm")]
    pub offline_llm: HashMap<String, OfflineLlmModelConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WhisperModelConfig {
    pub name: String,
    pub size: String,
    pub description: String,
    pub url: String,
    pub multilingual: bool,
    pub languages: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParakeetModelConfig {
    pub name: String,
    pub size: String,
    pub description: String,
    pub repo: String,
    pub multilingual: bool,
    pub languages: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OfflineLlmModelConfig {
    pub name: String,
    pub size: String,
    pub description: String,
    pub repo: String,
    pub quantization: String,
    #[serde(rename = "context_length")]
    pub context_length: usize,
    #[serde(rename = "recommended_for")]
    pub recommended_for: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VadConfig {
    pub name: String,
    pub url: String,
    pub size: String,
    pub required: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DefaultSettings {
    #[serde(rename = "whisper_model")]
    pub whisper_model: String,
    #[serde(rename = "offline_llm_model")]
    pub offline_llm_model: String,
    #[serde(rename = "use_offline_llm")]
    pub use_offline_llm: bool,
    #[serde(rename = "cpu_threads")]
    pub cpu_threads: i32,
    #[serde(rename = "beam_size")]
    pub beam_size: i32,
    pub temperature: f32,
    #[serde(rename = "compression_ratio_threshold")]
    pub compression_ratio_threshold: f32,
    #[serde(rename = "vad_enabled")]
    pub vad_enabled: bool,
    #[serde(rename = "vad_threshold")]
    pub vad_threshold: f32,
    #[serde(rename = "vad_min_silence_duration")]
    pub vad_min_silence_duration: u64,
}

impl ModelConfig {
    /// Load model configuration from the JSON file
    pub fn load() -> Result<Self> {
        // Try to load from resources directory
        let config_path = Path::new("resources/models.json");

        if !config_path.exists() {
            // Fallback: try current directory
            let fallback_path = Path::new("src-tauri/resources/models.json");
            if fallback_path.exists() {
                let content = fs::read_to_string(fallback_path)?;
                return Ok(serde_json::from_str(&content)?);
            }

            // Return default config if file not found
            return Ok(Self::default());
        }

        let content = fs::read_to_string(config_path)?;
        Ok(serde_json::from_str(&content)?)
    }

    /// Load from a specific path
    pub fn load_from_path(path: &Path) -> Result<Self> {
        let content = fs::read_to_string(path)?;
        Ok(serde_json::from_str(&content)?)
    }

    /// Get Whisper model configuration
    pub fn get_whisper_model(&self, model_id: &str) -> Option<&WhisperModelConfig> {
        self.models.whisper.get(model_id)
    }

    /// Get all Whisper models
    pub fn get_all_whisper_models(&self) -> &HashMap<String, WhisperModelConfig> {
        &self.models.whisper
    }

    /// Get offline LLM model configuration
    pub fn get_offline_llm_model(&self, model_id: &str) -> Option<&OfflineLlmModelConfig> {
        self.models.offline_llm.get(model_id)
    }

    /// Get all offline LLM models
    pub fn get_all_offline_llm_models(&self) -> &HashMap<String, OfflineLlmModelConfig> {
        &self.models.offline_llm
    }

    /// Get VAD configuration
    pub fn get_vad_config(&self, vad_id: &str) -> Option<&VadConfig> {
        self.vad.get(vad_id)
    }

    /// Get default settings
    pub fn get_defaults(&self) -> &DefaultSettings {
        &self.defaults
    }
}

impl Default for ModelConfig {
    fn default() -> Self {
        Self {
            models: ModelsConfig {
                whisper: HashMap::new(),
                parakeet: HashMap::new(),
                offline_llm: HashMap::new(),
            },
            vad: HashMap::new(),
            defaults: DefaultSettings {
                whisper_model: "small".to_string(),
                offline_llm_model: "qwen2.5-1.5b-instruct".to_string(),
                use_offline_llm: true,
                cpu_threads: 4,
                beam_size: 5,
                temperature: 0.0,
                compression_ratio_threshold: 2.4,
                vad_enabled: true,
                vad_threshold: 0.5,
                vad_min_silence_duration: 500,
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_load_default_config() {
        // This will use the bundled config or defaults
        let config = ModelConfig::load().expect("Failed to load config");

        // Verify we have at least some whisper models
        assert!(
            !config.models.whisper.is_empty(),
            "Should have whisper models"
        );

        // Verify default settings exist
        assert_eq!(config.defaults.cpu_threads, 4);
    }

    #[test]
    fn test_get_whisper_model() {
        let config = ModelConfig::load().expect("Failed to load config");

        // Test getting a model that should exist
        if let Some(model) = config.get_whisper_model("small") {
            assert_eq!(model.name, "small");
            assert!(model.multilingual);
        }
    }

    #[test]
    fn test_get_nonexistent_model() {
        let config = ModelConfig::load().expect("Failed to load config");

        let model = config.get_whisper_model("nonexistent");
        assert!(model.is_none());
    }
}
