use crate::settings::{get_settings, write_settings};
use anyhow::Result;
use flate2::read::GzDecoder;
use futures_util::StreamExt;
use log::{debug, info, warn};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;
use std::fs;
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use tar::Archive;
use tauri::{AppHandle, Emitter, Manager};

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct OfflineLLMModelInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub filename: String,
    pub url: Option<String>,
    pub size_mb: u64,
    pub is_downloaded: bool,
    pub is_downloading: bool,
    pub partial_size: u64,
    pub is_directory: bool,
    pub speed_score: f32,   // 0.0 to 1.0, higher is faster
    pub quality_score: f32, // 0.0 to 1.0, higher is better quality
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct OfflineLLMDownloadProgress {
    pub model_id: String,
    pub downloaded: u64,
    pub total: u64,
    pub percentage: f64,
}

pub struct OfflineLLMManager {
    app_handle: AppHandle,
    models_dir: PathBuf,
    available_models: Mutex<HashMap<String, OfflineLLMModelInfo>>,
}

impl OfflineLLMManager {
    pub fn new(app_handle: &AppHandle) -> Result<Self> {
        // Create LLM models directory in app data
        let models_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| anyhow::anyhow!("Failed to get app data dir: {}", e))?
            .join("llm_models");

        if !models_dir.exists() {
            fs::create_dir_all(&models_dir)?;
        }

        let mut available_models = HashMap::new();

        // SmolLM2 135M - Ultra fast, smallest model for basic text cleanup
        available_models.insert(
            "smollm2-135m".to_string(),
            OfflineLLMModelInfo {
                id: "smollm2-135m".to_string(),
                name: "SmolLM2 135M".to_string(),
                description: "Ultra fast. Best for simple corrections.".to_string(),
                filename: "smollm2-135m-instruct-q4_k_m.gguf".to_string(),
                url: Some("https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct-GGUF/resolve/main/smollm2-135m-instruct-q4_k_m.gguf".to_string()),
                size_mb: 104,
                is_downloaded: false,
                is_downloading: false,
                partial_size: 0,
                is_directory: false,
                speed_score: 0.95,
                quality_score: 0.50,
            },
        );

        // SmolLM2 360M - Fast, good balance for text improvement
        available_models.insert(
            "smollm2-360m".to_string(),
            OfflineLLMModelInfo {
                id: "smollm2-360m".to_string(),
                name: "SmolLM2 360M".to_string(),
                description: "Fast with better quality. Recommended.".to_string(),
                filename: "smollm2-360m-instruct-q4_k_m.gguf".to_string(),
                url: Some("https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct-GGUF/resolve/main/smollm2-360m-instruct-q4_k_m.gguf".to_string()),
                size_mb: 260,
                is_downloaded: false,
                is_downloading: false,
                partial_size: 0,
                is_directory: false,
                speed_score: 0.85,
                quality_score: 0.65,
            },
        );

        // SmolLM2 1.7B - Higher quality, still reasonable speed
        available_models.insert(
            "smollm2-1.7b".to_string(),
            OfflineLLMModelInfo {
                id: "smollm2-1.7b".to_string(),
                name: "SmolLM2 1.7B".to_string(),
                description: "High quality. Best results, slower.".to_string(),
                filename: "smollm2-1.7b-instruct-q4_k_m.gguf".to_string(),
                url: Some("https://huggingface.co/HuggingFaceTB/SmolLM2-1.7B-Instruct-GGUF/resolve/main/smollm2-1.7b-instruct-q4_k_m.gguf".to_string()),
                size_mb: 1050,
                is_downloaded: false,
                is_downloading: false,
                partial_size: 0,
                is_directory: false,
                speed_score: 0.60,
                quality_score: 0.80,
            },
        );

        // Qwen2.5 0.5B - Alternative small model with good instruction following
        available_models.insert(
            "qwen2.5-0.5b".to_string(),
            OfflineLLMModelInfo {
                id: "qwen2.5-0.5b".to_string(),
                name: "Qwen2.5 0.5B".to_string(),
                description: "Fast alternative. Good instruction following.".to_string(),
                filename: "qwen2.5-0.5b-instruct-q4_k_m.gguf".to_string(),
                url: Some("https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf".to_string()),
                size_mb: 386,
                is_downloaded: false,
                is_downloading: false,
                partial_size: 0,
                is_directory: false,
                speed_score: 0.80,
                quality_score: 0.70,
            },
        );

        let manager = Self {
            app_handle: app_handle.clone(),
            models_dir,
            available_models: Mutex::new(available_models),
        };

        // Check which models are already downloaded
        manager.update_download_status()?;

        // Auto-select a model if none is currently selected
        manager.auto_select_model_if_needed()?;

        Ok(manager)
    }

    pub fn get_available_models(&self) -> Vec<OfflineLLMModelInfo> {
        let models = self.available_models.lock().unwrap();
        models.values().cloned().collect()
    }

    pub fn get_model_info(&self, model_id: &str) -> Option<OfflineLLMModelInfo> {
        let models = self.available_models.lock().unwrap();
        models.get(model_id).cloned()
    }

    fn update_download_status(&self) -> Result<()> {
        let mut models = self.available_models.lock().unwrap();

        for model in models.values_mut() {
            let model_path = self.models_dir.join(&model.filename);
            let partial_path = self.models_dir.join(format!("{}.partial", &model.filename));

            model.is_downloaded = model_path.exists();
            model.is_downloading = false;

            // Get partial file size if it exists
            if partial_path.exists() {
                model.partial_size = partial_path.metadata().map(|m| m.len()).unwrap_or(0);
            } else {
                model.partial_size = 0;
            }
        }

        Ok(())
    }

    fn auto_select_model_if_needed(&self) -> Result<()> {
        let settings = get_settings(&self.app_handle);

        // If no offline LLM model is selected or selected model is empty
        if settings.offline_llm_model.is_empty() {
            let models = self.available_models.lock().unwrap();
            if let Some(available_model) = models.values().find(|model| model.is_downloaded) {
                info!(
                    "Auto-selecting offline LLM model: {} ({})",
                    available_model.id, available_model.name
                );

                let mut updated_settings = settings;
                updated_settings.offline_llm_model = available_model.id.clone();
                write_settings(&self.app_handle, updated_settings);

                info!(
                    "Successfully auto-selected offline LLM model: {}",
                    available_model.id
                );
            }
        }

        Ok(())
    }

    pub async fn download_model(&self, model_id: &str) -> Result<()> {
        let model_info = {
            let models = self.available_models.lock().unwrap();
            models.get(model_id).cloned()
        };

        let model_info = model_info
            .ok_or_else(|| anyhow::anyhow!("Offline LLM model not found: {}", model_id))?;

        let url = model_info
            .url
            .ok_or_else(|| anyhow::anyhow!("No download URL for offline LLM model"))?;
        let model_path = self.models_dir.join(&model_info.filename);
        let partial_path = self
            .models_dir
            .join(format!("{}.partial", &model_info.filename));

        // Don't download if complete version already exists
        if model_path.exists() {
            if partial_path.exists() {
                let _ = fs::remove_file(&partial_path);
            }
            self.update_download_status()?;
            return Ok(());
        }

        // Check if we have a partial download to resume
        let mut resume_from = if partial_path.exists() {
            let size = partial_path.metadata()?.len();
            info!(
                "Resuming download of offline LLM model {} from byte {}",
                model_id, size
            );
            size
        } else {
            info!(
                "Starting fresh download of offline LLM model {} from {}",
                model_id, url
            );
            0
        };

        // Mark as downloading
        {
            let mut models = self.available_models.lock().unwrap();
            if let Some(model) = models.get_mut(model_id) {
                model.is_downloading = true;
            }
        }

        // Create HTTP client with range request for resuming
        let client = reqwest::Client::new();
        let mut request = client.get(&url);

        if resume_from > 0 {
            request = request.header("Range", format!("bytes={}-", resume_from));
        }

        let mut response = request.send().await?;

        // If we tried to resume but server returned 200, restart fresh
        if resume_from > 0 && response.status() == reqwest::StatusCode::OK {
            warn!(
                "Server doesn't support range requests for offline LLM model {}, restarting download",
                model_id
            );
            drop(response);
            let _ = fs::remove_file(&partial_path);
            resume_from = 0;
            response = client.get(&url).send().await?;
        }

        if !response.status().is_success()
            && response.status() != reqwest::StatusCode::PARTIAL_CONTENT
        {
            {
                let mut models = self.available_models.lock().unwrap();
                if let Some(model) = models.get_mut(model_id) {
                    model.is_downloading = false;
                }
            }
            return Err(anyhow::anyhow!(
                "Failed to download offline LLM model: HTTP {}",
                response.status()
            ));
        }

        let total_size = if resume_from > 0 {
            resume_from + response.content_length().unwrap_or(0)
        } else {
            response.content_length().unwrap_or(0)
        };

        let mut downloaded = resume_from;
        let mut stream = response.bytes_stream();

        let mut file = if resume_from > 0 {
            std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(&partial_path)?
        } else {
            std::fs::File::create(&partial_path)?
        };

        // Emit initial progress
        let initial_progress = OfflineLLMDownloadProgress {
            model_id: model_id.to_string(),
            downloaded,
            total: total_size,
            percentage: if total_size > 0 {
                (downloaded as f64 / total_size as f64) * 100.0
            } else {
                0.0
            },
        };
        let _ = self
            .app_handle
            .emit("offline-llm-download-progress", &initial_progress);

        // Download with progress
        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| {
                {
                    let mut models = self.available_models.lock().unwrap();
                    if let Some(model) = models.get_mut(model_id) {
                        model.is_downloading = false;
                    }
                }
                e
            })?;

            file.write_all(&chunk)?;
            downloaded += chunk.len() as u64;

            let percentage = if total_size > 0 {
                (downloaded as f64 / total_size as f64) * 100.0
            } else {
                0.0
            };

            let progress = OfflineLLMDownloadProgress {
                model_id: model_id.to_string(),
                downloaded,
                total: total_size,
                percentage,
            };

            let _ = self
                .app_handle
                .emit("offline-llm-download-progress", &progress);
        }

        file.flush()?;
        drop(file);

        // Verify downloaded file size
        if total_size > 0 {
            let actual_size = partial_path.metadata()?.len();
            if actual_size != total_size {
                let _ = fs::remove_file(&partial_path);
                {
                    let mut models = self.available_models.lock().unwrap();
                    if let Some(model) = models.get_mut(model_id) {
                        model.is_downloading = false;
                    }
                }
                return Err(anyhow::anyhow!(
                    "Download incomplete: expected {} bytes, got {} bytes",
                    total_size,
                    actual_size
                ));
            }
        }

        // Move partial file to final location
        fs::rename(&partial_path, &model_path)?;

        // Update download status
        {
            let mut models = self.available_models.lock().unwrap();
            if let Some(model) = models.get_mut(model_id) {
                model.is_downloading = false;
                model.is_downloaded = true;
                model.partial_size = 0;
            }
        }

        // Emit completion event
        let _ = self
            .app_handle
            .emit("offline-llm-download-complete", model_id);

        info!(
            "Successfully downloaded offline LLM model {} to {:?}",
            model_id, model_path
        );

        Ok(())
    }

    pub fn delete_model(&self, model_id: &str) -> Result<()> {
        debug!("OfflineLLMManager: delete_model called for: {}", model_id);

        let model_info = {
            let models = self.available_models.lock().unwrap();
            models.get(model_id).cloned()
        };

        let model_info = model_info
            .ok_or_else(|| anyhow::anyhow!("Offline LLM model not found: {}", model_id))?;

        let model_path = self.models_dir.join(&model_info.filename);
        let partial_path = self
            .models_dir
            .join(format!("{}.partial", &model_info.filename));

        let mut deleted_something = false;

        if model_path.exists() {
            info!("Deleting offline LLM model file at: {:?}", model_path);
            fs::remove_file(&model_path)?;
            info!("Offline LLM model file deleted successfully");
            deleted_something = true;
        }

        if partial_path.exists() {
            info!("Deleting partial file at: {:?}", partial_path);
            fs::remove_file(&partial_path)?;
            info!("Partial file deleted successfully");
            deleted_something = true;
        }

        if !deleted_something {
            return Err(anyhow::anyhow!(
                "No offline LLM model files found to delete"
            ));
        }

        self.update_download_status()?;

        Ok(())
    }

    pub fn get_model_path(&self, model_id: &str) -> Result<PathBuf> {
        let model_info = self
            .get_model_info(model_id)
            .ok_or_else(|| anyhow::anyhow!("Offline LLM model not found: {}", model_id))?;

        if !model_info.is_downloaded {
            return Err(anyhow::anyhow!(
                "Offline LLM model not available: {}",
                model_id
            ));
        }

        if model_info.is_downloading {
            return Err(anyhow::anyhow!(
                "Offline LLM model is currently downloading: {}",
                model_id
            ));
        }

        let model_path = self.models_dir.join(&model_info.filename);
        let partial_path = self
            .models_dir
            .join(format!("{}.partial", &model_info.filename));

        if model_path.exists() && !partial_path.exists() {
            Ok(model_path)
        } else {
            Err(anyhow::anyhow!(
                "Complete offline LLM model file not found: {}",
                model_id
            ))
        }
    }

    pub fn cancel_download(&self, model_id: &str) -> Result<()> {
        debug!(
            "OfflineLLMManager: cancel_download called for: {}",
            model_id
        );

        let _model_info = {
            let models = self.available_models.lock().unwrap();
            models.get(model_id).cloned()
        };

        let _model_info = _model_info
            .ok_or_else(|| anyhow::anyhow!("Offline LLM model not found: {}", model_id))?;

        {
            let mut models = self.available_models.lock().unwrap();
            if let Some(model) = models.get_mut(model_id) {
                model.is_downloading = false;
            }
        }

        self.update_download_status()?;

        info!("Download cancelled for offline LLM model: {}", model_id);
        Ok(())
    }

    /// Process text using the selected offline LLM model
    pub fn process_text(&self, text: &str, prompt_template: &str) -> Result<String> {
        let settings = get_settings(&self.app_handle);
        let model_id = &settings.offline_llm_model;

        if model_id.is_empty() {
            return Err(anyhow::anyhow!("No offline LLM model selected"));
        }

        let model_path = self.get_model_path(model_id)?;

        // Replace ${output} with the actual text in the prompt
        let full_prompt = prompt_template.replace("${output}", text);

        // Use llama.cpp for inference
        // For now, we'll use a simple approach - in production you'd want to keep the model loaded
        self.run_inference(&model_path, &full_prompt)
    }

    fn run_inference(&self, model_path: &PathBuf, prompt: &str) -> Result<String> {
        // This is a placeholder for the actual llama.cpp integration
        // In a real implementation, you would:
        // 1. Load the model (or use a cached loaded model)
        // 2. Run inference with the prompt
        // 3. Return the generated text

        // For now, we'll use llama-cpp-rs or similar bindings
        // This requires adding the llama-cpp crate to Cargo.toml

        debug!("Running offline LLM inference with model: {:?}", model_path);
        debug!("Prompt length: {} chars", prompt.len());

        // Placeholder: Return the original text for now
        // This will be replaced with actual llama.cpp inference
        Err(anyhow::anyhow!(
            "Offline LLM inference not yet implemented - requires llama-cpp integration"
        ))
    }
}
