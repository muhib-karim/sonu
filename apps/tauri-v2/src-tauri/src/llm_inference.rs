// llm_inference.rs - Offline LLM inference module
// NOTE: The llama_cpp crate integration is not yet available.
// This module provides stub implementations that return errors.
// Once llama_cpp is added to Cargo.toml, the full implementation can be restored.

use anyhow::Result;
use log::info;
use std::path::PathBuf;
use std::sync::RwLock;
use tauri::{AppHandle, Emitter, Manager};

use crate::settings::get_settings;

/// Manages the loaded LLM model for efficient reuse (stub)
pub struct LLMInferenceEngine {
    loaded_model_path: Option<PathBuf>,
}

impl LLMInferenceEngine {
    pub fn new() -> Self {
        Self {
            loaded_model_path: None,
        }
    }

    pub fn load_model(&mut self, model_path: &PathBuf) -> Result<()> {
        Err(anyhow::anyhow!(
            "Offline LLM inference is not yet available (llama_cpp crate not linked). Model: {:?}",
            model_path
        ))
    }

    pub fn run_inference(
        &self,
        _prompt: &str,
        _max_tokens: usize,
        _temperature: f32,
    ) -> Result<String> {
        Err(anyhow::anyhow!(
            "Offline LLM inference is not yet available"
        ))
    }

    pub fn unload_model(&mut self) {
        self.loaded_model_path = None;
    }

    pub fn is_model_loaded(&self) -> bool {
        false
    }

    pub fn get_loaded_model_path(&self) -> Option<&PathBuf> {
        self.loaded_model_path.as_ref()
    }
}

impl Default for LLMInferenceEngine {
    fn default() -> Self {
        Self::new()
    }
}

/// Global inference engine (singleton)
static INFERENCE_ENGINE: once_cell::sync::Lazy<RwLock<LLMInferenceEngine>> =
    once_cell::sync::Lazy::new(|| RwLock::new(LLMInferenceEngine::new()));

pub fn get_inference_engine() -> Result<std::sync::RwLockReadGuard<'static, LLMInferenceEngine>> {
    INFERENCE_ENGINE
        .read()
        .map_err(|e| anyhow::anyhow!("Failed to acquire read lock: {}", e))
}

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

    let full_prompt = format_prompt(prompt_template, text);
    let mut engine = get_inference_engine_mut()?;

    engine.load_model(&model_path)?;

    let max_tokens: usize = 512;
    let temperature: f32 = 0.7;

    let result = engine.run_inference(&full_prompt, max_tokens, temperature)?;

    app_handle
        .emit("offline-llm-processing-complete", &result)
        .ok();

    Ok(result)
}

fn format_prompt(template: &str, text: &str) -> String {
    if template.contains("${text}") {
        template.replace("${text}", text)
    } else if template.contains("{{input}}") {
        template.replace("{{input}}", text)
    } else {
        format!("{}\n\n{}", template, text)
    }
}

pub fn get_available_templates() -> Vec<(String, String, String)> {
    vec![
        ("cleanup".to_string(), "Clean Up Text".to_string(),
         "Fix any grammar, spelling, and punctuation errors in the following text. Keep the meaning the same:\n\n${text}".to_string()),
        ("formal".to_string(), "Make Formal".to_string(),
         "Rewrite the following text in a formal, professional tone:\n\n${text}".to_string()),
        ("casual".to_string(), "Make Casual".to_string(),
         "Rewrite the following text in a casual, conversational tone:\n\n${text}".to_string()),
        ("concise".to_string(), "Make Concise".to_string(),
         "Make the following text more concise while keeping the key points:\n\n${text}".to_string()),
        ("expand".to_string(), "Expand".to_string(),
         "Expand on the following text with more detail and explanation:\n\n${text}".to_string()),
        ("bullet".to_string(), "Convert to Bullets".to_string(),
         "Convert the following text into bullet points:\n\n${text}".to_string()),
    ]
}

pub fn unload_llm_model() -> Result<()> {
    let mut engine = get_inference_engine_mut()?;
    engine.unload_model();
    info!("LLM model unloaded");
    Ok(())
}

pub fn is_llm_model_loaded() -> Result<bool> {
    let engine = get_inference_engine()?;
    Ok(engine.is_model_loaded())
}

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
