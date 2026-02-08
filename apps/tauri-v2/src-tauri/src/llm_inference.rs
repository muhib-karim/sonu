use crate::managers::offline_llm::OfflineLLMManager;
use crate::settings::{get_settings, write_settings};
use anyhow::Result;
use log::{debug, error, info, warn};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};

// llama.cpp integration
// This uses the llama-cpp-rs crate for Rust bindings to llama.cpp
use llama_cpp::model::Model;
use llama_cpp::session::Session;
use llama_cpp::standard_sampler::StandardSampler;

/// Manages the loaded LLM model for efficient reuse
pub struct LLMInferenceEngine {
    /// Currently loaded model
    loaded_model: Option<Model>,
    /// Path to the currently loaded model
    loaded_model_path: Option<PathBuf>,
    /// Context length for the model
    context_length: usize,
}

impl LLMInferenceEngine {
    pub fn new() -> Self {
        Self {
            loaded_model: None,
            loaded_model_path: None,
            context_length: 2048,
        }
    }

    /// Load a model if not already loaded
    pub fn load_model(&mut self, model_path: &PathBuf) -> Result<&Model> {
        // Check if we already have this model loaded
        if let Some(ref path) = self.loaded_model_path {
            if path == model_path && self.loaded_model.is_some() {
                debug!("Model already loaded: {:?}", model_path);
                return Ok(self.loaded_model.as_ref().unwrap());
            }
        }

        info!("Loading LLM model: {:?}", model_path);

        // Load the model
        let model = Model::load_from_file(model_path, 4096)
            .map_err(|e| anyhow::anyhow!("Failed to load model: {}", e))?;

        self.loaded_model = Some(model);
        self.loaded_model_path = Some(model_path.clone());

        info!("Model loaded successfully");
        Ok(self.loaded_model.as_ref().unwrap())
    }

    /// Run inference with the loaded model
    pub fn run_inference(
        &self,
        prompt: &str,
        max_tokens: usize,
        temperature: f32,
    ) -> Result<String> {
        let model = self
            .loaded_model
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("No model loaded"))?;

        debug!("Creating session for inference");
        let mut session = model
            .create_session()
            .map_err(|e| anyhow::anyhow!("Failed to create session: {}", e))?;

        debug!("Adding prompt to session");
        session
            .add_prompt(prompt)
            .map_err(|e| anyhow::anyhow!("Failed to add prompt: {}", e))?;

        debug!("Starting token generation");
        let mut output = String::new();
        let sampler = StandardSampler::default();

        for i in 0..max_tokens {
            match session.sample_token(&sampler) {
                Ok(token) => {
                    if token == model.eos_token() {
                        debug!("Reached EOS token at position {}", i);
                        break;
                    }

                    let text = model.token_to_piece(token);
                    output.push_str(&text);

                    // Check for common stop sequences
                    if output.ends_with("</s>") || output.ends_with("<|endoftext|>") {
                        output = output
                            .trim_end_matches("</s>")
                            .trim_end_matches("<|endoftext|>")
                            .to_string();
                        break;
                    }
                }
                Err(e) => {
                    error!("Token sampling error: {}", e);
                    break;
                }
            }
        }

        debug!("Inference complete, generated {} characters", output.len());
        Ok(output.trim().to_string())
    }

    /// Unload the current model to free memory
    pub fn unload_model(&mut self) {
        if self.loaded_model.is_some() {
            info!("Unloading LLM model");
            self.loaded_model = None;
            self.loaded_model_path = None;
        }
    }

    /// Check if a model is currently loaded
    pub fn is_model_loaded(&self) -> bool {
        self.loaded_model.is_some()
    }

    /// Get the path of the loaded model
    pub fn get_loaded_model_path(&self) -> Option<&PathBuf> {
        self.loaded_model_path.as_ref()
    }
}

impl Default for LLMInferenceEngine {
    fn default() -> Self {
        Self::new()
    }
}

/// Global inference engine (singleton pattern)
use lazy_static::lazy_static;
use std::sync::RwLock;

lazy_static! {
    static ref INFERENCE_ENGINE: RwLock<LLMInferenceEngine> =
        RwLock::new(LLMInferenceEngine::new());
}

/// Get the global inference engine
pub fn get_inference_engine() -> Result<std::sync::RwLockReadGuard<'static, LLMInferenceEngine>> {
    INFERENCE_ENGINE
        .read()
        .map_err(|e| anyhow::anyhow!("Failed to acquire read lock: {}", e))
}

/// Get mutable access to the global inference engine
pub fn get_inference_engine_mut() -> Result<std::sync::RwLockWriteGuard<'static, LLMInferenceEngine>>
{
    INFERENCE_ENGINE
        .write()
        .map_err(|e| anyhow::anyhow!("Failed to acquire write lock: {}", e))
}

/// Process text using offline LLM with the specified template
pub fn process_text_with_llm(
    app_handle: &AppHandle,
    text: &str,
    prompt_template: &str,
) -> Result<String> {
    let settings = get_settings(app_handle);
    let model_id = &settings.offline_llm_model;

    if model_id.is_empty() {
        return Err(anyhow::anyhow!("No offline LLM model selected"));
    }

    info!("Processing text with offline LLM model: {}", model_id);

    // Get model path
    let models_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| anyhow::anyhow!("Failed to get app data dir: {}", e))?
        .join("llm_models");

    let model_filename = match model_id.as_str() {
        "smollm2-135m" => "smollm2-135m-instruct-q4_k_m.gguf",
        "smollm2-360m" => "smollm2-360m-instruct-q4_k_m.gguf",
        "smollm2-1.7b" => "smollm2-1.7b-instruct-q4_k_m.gguf",
        "qwen2.5-0.5b" => "qwen2.5-0.5b-instruct-q4_k_m.gguf",
        "qwen2.5-1.5b" => "qwen2.5-1.5b-instruct-q4_k_m.gguf",
        "qwen2.5-3b" => "qwen2.5-3b-instruct-q4_k_m.gguf",
        _ => return Err(anyhow::anyhow!("Unknown model: {}", model_id)),
    };

    let model_path = models_dir.join(model_filename);

    if !model_path.exists() {
        return Err(anyhow::anyhow!(
            "Model file not found: {:?}. Please download the model first.",
            model_path
        ));
    }

    // Prepare the prompt
    let full_prompt = format_prompt(prompt_template, text);

    // Get mutable access to engine and run inference
    let mut engine = get_inference_engine_mut()?;

    // Load model if needed
    engine.load_model(&model_path)?;

    // Run inference
    let max_tokens = settings.offline_llm_max_tokens.unwrap_or(512).min(2048) as usize;
    let temperature = settings.offline_llm_temperature.unwrap_or(0.7);

    let result = engine.run_inference(&full_prompt, max_tokens, temperature)?;

    // Emit event for UI update
    app_handle
        .emit("offline-llm-processing-complete", &result)
        .ok();

    Ok(result)
}

/// Format a prompt template with the given text
fn format_prompt(template: &str, text: &str) -> String {
    // Common instruction templates for different models
    if template.contains("${text}") {
        template.replace("${text}", text)
    } else if template.contains("{{input}}") {
        template.replace("{{input}}", text)
    } else {
        // Default format: template followed by text
        format!("{}\n\n{}", template, text)
    }
}

/// Available prompt templates for text processing
pub fn get_available_templates() -> Vec<(String, String, String)> {
    vec![
        (
            "cleanup".to_string(),
            "Clean Up Text".to_string(),
            "Fix any grammar, spelling, and punctuation errors in the following text. Keep the meaning the same:\n\n${text}".to_string(),
        ),
        (
            "formal".to_string(),
            "Make Formal".to_string(),
            "Rewrite the following text in a formal, professional tone:\n\n${text}".to_string(),
        ),
        (
            "casual".to_string(),
            "Make Casual".to_string(),
            "Rewrite the following text in a casual, conversational tone:\n\n${text}".to_string(),
        ),
        (
            "concise".to_string(),
            "Make Concise".to_string(),
            "Make the following text more concise while keeping the key points:\n\n${text}".to_string(),
        ),
        (
            "expand".to_string(),
            "Expand".to_string(),
            "Expand on the following text with more detail and explanation:\n\n${text}".to_string(),
        ),
        (
            "bullet".to_string(),
            "Convert to Bullets".to_string(),
            "Convert the following text into bullet points:\n\n${text}".to_string(),
        ),
    ]
}

/// Unload the LLM model to free memory
pub fn unload_llm_model() -> Result<()> {
    let mut engine = get_inference_engine_mut()?;
    engine.unload_model();
    info!("LLM model unloaded");
    Ok(())
}

/// Check if an LLM model is currently loaded
pub fn is_llm_model_loaded() -> Result<bool> {
    let engine = get_inference_engine()?;
    Ok(engine.is_model_loaded())
}

/// Get info about the currently loaded model
pub fn get_loaded_model_info() -> Result<Option<(String, PathBuf)>> {
    let engine = get_inference_engine()?;
    if let Some(path) = engine.get_loaded_model_path() {
        let filename = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();
        Ok(Some((filename, path.clone())))
    } else {
        Ok(None)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_prompt() {
        let template = "Fix this text: ${text}";
        let text = "Hello world";
        let result = format_prompt(template, text);
        assert_eq!(result, "Fix this text: Hello world");
    }

    #[test]
    fn test_format_prompt_alt_syntax() {
        let template = "Process: {{input}}";
        let text = "Test";
        let result = format_prompt(template, text);
        assert_eq!(result, "Process: Test");
    }

    #[test]
    fn test_format_prompt_default() {
        let template = "Instruction";
        let text = "Content";
        let result = format_prompt(template, text);
        assert_eq!(result, "Instruction\n\nContent");
    }

    #[test]
    fn test_get_available_templates() {
        let templates = get_available_templates();
        assert!(!templates.is_empty());
        assert!(templates.iter().any(|(id, _, _)| id == "cleanup"));
        assert!(templates.iter().any(|(id, _, _)| id == "formal"));
    }
}
