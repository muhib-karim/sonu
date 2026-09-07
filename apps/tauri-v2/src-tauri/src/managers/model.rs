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

/// Engine type. Serializes as PascalCase (the shape the frontend expects);
/// the catalog file writes it lowercase, handled by the manual
/// `Deserialize` impl below (specta's `Type` derive cannot parse serde's
/// `rename_all(deserialize = ...)` form).
#[derive(Debug, Clone, Copy, Serialize, Type)]
pub enum EngineType {
    Whisper,
    Parakeet,
    Moonshine,
}

impl<'de> serde::Deserialize<'de> for EngineType {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;
        match value.to_lowercase().as_str() {
            "whisper" => Ok(EngineType::Whisper),
            "parakeet" => Ok(EngineType::Parakeet),
            "moonshine" => Ok(EngineType::Moonshine),
            other => Err(serde::de::Error::unknown_variant(
                other,
                &["whisper", "parakeet", "moonshine"],
            )),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub filename: String,
    pub url: Option<String>,
    pub size_mb: u64,
    #[serde(default)]
    pub is_downloaded: bool,
    #[serde(default)]
    pub is_downloading: bool,
    #[serde(default)]
    pub partial_size: u64,
    #[serde(default)]
    pub is_directory: bool,
    pub engine_type: EngineType,
    /// Whether this model should be highlighted/auto-selected first.
    #[serde(default)]
    pub recommended: bool,
    /// Languages supported by the model. Uses ISO codes for single-language
    /// models (e.g. ["en"]) and the sentinel "multilingual" for models that
    /// support many languages.
    #[serde(default)]
    pub languages: Vec<String>,
    #[serde(default)]
    pub accuracy_score: f32, // 0.0 to 1.0, higher is more accurate
    #[serde(default)]
    pub speed_score: f32, // 0.0 to 1.0, higher is faster
}

/// Top-level shape of `resources/models.json`.
#[derive(Debug, Deserialize)]
struct ModelCatalog {
    models: Vec<ModelInfo>,
}

/// Parse a model catalog from JSON text (the `resources/models.json` format).
fn parse_catalog(json: &str) -> Result<Vec<ModelInfo>> {
    Ok(serde_json::from_str::<ModelCatalog>(json)?.models)
}

/// Embedded fallback catalog, used when `resources/models.json` cannot be
/// resolved, read, or parsed.
const FALLBACK_CATALOG_JSON: &str = include_str!("../../resources/models.json");

/// Embedded fallback catalog (kept as parsed models so it can be reused).
fn fallback_catalog() -> Vec<ModelInfo> {
    // The constant above is compile-time and tested to be valid; if parsing
    // somehow failed we degrade to an empty registry rather than panic.
    parse_catalog(FALLBACK_CATALOG_JSON).unwrap_or_default()
}

/// Explicit preference order for auto-selecting among recommended (downloaded)
/// models: Parakeet V3 first (multilingual with automatic language detection,
/// so it works for everyone), then Parakeet V2 (best for English speakers).
/// Ids missing from the catalog are skipped gracefully.
const RECOMMENDED_AUTO_SELECT_ORDER: [&str; 2] = ["parakeet-tdt-0.6b-v3", "parakeet-tdt-0.6b-v2"];

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct DownloadProgress {
    pub model_id: String,
    pub downloaded: u64,
    pub total: u64,
    pub percentage: f64,
}

pub struct ModelManager {
    app_handle: AppHandle,
    models_dir: PathBuf,
    available_models: Mutex<HashMap<String, ModelInfo>>,
    /// Model ids in catalog order, used for deterministic auto-selection.
    catalog_order: Vec<String>,
}

impl ModelManager {
    pub fn new(app_handle: &AppHandle) -> Result<Self> {
        // Create models directory in app data
        let models_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| anyhow::anyhow!("Failed to get app data dir: {}", e))?
            .join("models");

        if !models_dir.exists() {
            fs::create_dir_all(&models_dir)?;
        }

        // Load the model catalog (Handy-style registry) from the bundled
        // resources/models.json, with an embedded fallback.
        let catalog = Self::load_catalog(app_handle);
        let mut catalog_order: Vec<String> = Vec::with_capacity(catalog.len());
        let mut available_models: HashMap<String, ModelInfo> = HashMap::new();
        for model in catalog {
            if available_models.contains_key(&model.id) {
                warn!(
                    "Duplicate model id in catalog, keeping first occurrence: {}",
                    model.id
                );
                continue;
            }
            catalog_order.push(model.id.clone());
            available_models.insert(model.id.clone(), model);
        }

        let manager = Self {
            app_handle: app_handle.clone(),
            models_dir,
            available_models: Mutex::new(available_models),
            catalog_order,
        };

        // Migrate any bundled models to user directory
        manager.migrate_bundled_models()?;

        // Check which models are already downloaded
        manager.update_download_status()?;

        // Auto-select a model if none is currently selected
        manager.auto_select_model_if_needed()?;

        Ok(manager)
    }

    /// Loads the model catalog from the bundled `resources/models.json`
    /// resource, falling back to the embedded catalog when the resource
    /// cannot be resolved, read, or parsed.
    fn load_catalog(app_handle: &AppHandle) -> Vec<ModelInfo> {
        app_handle
            .path()
            .resolve(
                "resources/models.json",
                tauri::path::BaseDirectory::Resource,
            )
            .ok()
            .and_then(|path| fs::read_to_string(path).ok())
            .and_then(|content| parse_catalog(&content).ok())
            .filter(|models| !models.is_empty())
            .unwrap_or_else(fallback_catalog)
    }

    pub fn get_available_models(&self) -> Vec<ModelInfo> {
        let models = self.available_models.lock().unwrap();
        models.values().cloned().collect()
    }

    pub fn get_model_info(&self, model_id: &str) -> Option<ModelInfo> {
        let models = self.available_models.lock().unwrap();
        models.get(model_id).cloned()
    }

    fn migrate_bundled_models(&self) -> Result<()> {
        // Check for bundled models and copy them to user directory
        let bundled_models = ["ggml-small.bin"]; // Add other bundled models here if any

        for filename in &bundled_models {
            let bundled_path = self.app_handle.path().resolve(
                &format!("resources/models/{}", filename),
                tauri::path::BaseDirectory::Resource,
            );

            if let Ok(bundled_path) = bundled_path {
                if bundled_path.exists() {
                    let user_path = self.models_dir.join(filename);

                    // Only copy if user doesn't already have the model
                    if !user_path.exists() {
                        info!("Migrating bundled model {} to user directory", filename);
                        fs::copy(&bundled_path, &user_path)?;
                        info!("Successfully migrated {}", filename);
                    }
                }
            }
        }

        Ok(())
    }

    fn update_download_status(&self) -> Result<()> {
        let mut models = self.available_models.lock().unwrap();

        for model in models.values_mut() {
            if model.is_directory {
                // For directory-based models, check if the directory exists
                let model_path = self.models_dir.join(&model.filename);
                let partial_path = self.models_dir.join(format!("{}.partial", &model.filename));
                let extracting_path = self
                    .models_dir
                    .join(format!("{}.extracting", &model.filename));

                // Clean up any leftover .extracting directories from interrupted extractions
                if extracting_path.exists() {
                    warn!("Cleaning up interrupted extraction for model: {}", model.id);
                    let _ = fs::remove_dir_all(&extracting_path);
                }

                model.is_downloaded = model_path.exists() && model_path.is_dir();
                model.is_downloading = false;

                // Get partial file size if it exists (for the .tar.gz being downloaded)
                if partial_path.exists() {
                    model.partial_size = partial_path.metadata().map(|m| m.len()).unwrap_or(0);
                } else {
                    model.partial_size = 0;
                }
            } else {
                // For file-based models (existing logic)
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
        }

        Ok(())
    }

    fn auto_select_model_if_needed(&self) -> Result<()> {
        // Check if we have a selected model in settings
        let settings = get_settings(&self.app_handle);

        // If no model is selected or selected model is empty
        if settings.selected_model.is_empty() {
            let models = self.available_models.lock().unwrap();

            // Prefer recommended models in explicit preference order (Parakeet
            // V3 first: multilingual with automatic language detection, then
            // Parakeet V2), falling back to any other downloaded model in
            // catalog order.
            let candidate = RECOMMENDED_AUTO_SELECT_ORDER
                .iter()
                .filter_map(|id| models.get(*id))
                .find(|model| model.is_downloaded && model.recommended)
                .or_else(|| {
                    self.catalog_order
                        .iter()
                        .filter_map(|id| models.get(id))
                        .find(|model| model.is_downloaded)
                });

            if let Some(available_model) = candidate {
                info!(
                    "Auto-selecting model: {} ({})",
                    available_model.id, available_model.name
                );

                // Update settings with the selected model
                let mut updated_settings = settings;
                updated_settings.selected_model = available_model.id.clone();
                write_settings(&self.app_handle, updated_settings);

                info!("Successfully auto-selected model: {}", available_model.id);
            }
        }

        Ok(())
    }

    pub async fn download_model(&self, model_id: &str) -> Result<()> {
        let model_info = {
            let models = self.available_models.lock().unwrap();
            models.get(model_id).cloned()
        };

        let model_info =
            model_info.ok_or_else(|| anyhow::anyhow!("Model not found: {}", model_id))?;

        let url = model_info
            .url
            .ok_or_else(|| anyhow::anyhow!("No download URL for model"))?;
        let model_path = self.models_dir.join(&model_info.filename);
        let partial_path = self
            .models_dir
            .join(format!("{}.partial", &model_info.filename));

        // Don't download if complete version already exists
        if model_path.exists() {
            // Clean up any partial file that might exist
            if partial_path.exists() {
                let _ = fs::remove_file(&partial_path);
            }
            self.update_download_status()?;
            return Ok(());
        }

        // Check if we have a partial download to resume
        let mut resume_from = if partial_path.exists() {
            let size = partial_path.metadata()?.len();
            info!("Resuming download of model {} from byte {}", model_id, size);
            size
        } else {
            info!("Starting fresh download of model {} from {}", model_id, url);
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

        // If we tried to resume but server returned 200 (not 206 Partial Content),
        // the server doesn't support range requests. Delete partial file and restart
        // fresh to avoid file corruption (appending full file to partial).
        if resume_from > 0 && response.status() == reqwest::StatusCode::OK {
            warn!(
                "Server doesn't support range requests for model {}, restarting download",
                model_id
            );
            drop(response);
            let _ = fs::remove_file(&partial_path);

            // Reset resume_from since we're starting fresh
            resume_from = 0;

            // Restart download without range header
            response = client.get(&url).send().await?;
        }

        // Check for success or partial content status
        if !response.status().is_success()
            && response.status() != reqwest::StatusCode::PARTIAL_CONTENT
        {
            // Mark as not downloading on error
            {
                let mut models = self.available_models.lock().unwrap();
                if let Some(model) = models.get_mut(model_id) {
                    model.is_downloading = false;
                }
            }
            return Err(anyhow::anyhow!(
                "Failed to download model: HTTP {}",
                response.status()
            ));
        }

        let total_size = if resume_from > 0 {
            // For resumed downloads, add the resume point to content length
            resume_from + response.content_length().unwrap_or(0)
        } else {
            response.content_length().unwrap_or(0)
        };

        let mut downloaded = resume_from;
        let mut stream = response.bytes_stream();

        // Open file for appending if resuming, or create new if starting fresh
        let mut file = if resume_from > 0 {
            std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(&partial_path)?
        } else {
            std::fs::File::create(&partial_path)?
        };

        // Emit initial progress
        let initial_progress = DownloadProgress {
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
            .emit("model-download-progress", &initial_progress);

        // Download with progress
        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| {
                // Mark as not downloading on error
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

            // Emit progress event
            let progress = DownloadProgress {
                model_id: model_id.to_string(),
                downloaded,
                total: total_size,
                percentage,
            };

            let _ = self.app_handle.emit("model-download-progress", &progress);
        }

        file.flush()?;
        drop(file); // Ensure file is closed before moving

        // Verify downloaded file size matches expected size
        if total_size > 0 {
            let actual_size = partial_path.metadata()?.len();
            if actual_size != total_size {
                // Download is incomplete/corrupted - delete partial and return error
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

        // Handle directory-based models (extract tar.gz) vs file-based models
        if model_info.is_directory {
            // Emit extraction started event
            let _ = self.app_handle.emit("model-extraction-started", model_id);
            info!("Extracting archive for directory-based model: {}", model_id);

            // Use a temporary extraction directory to ensure atomic operations
            let temp_extract_dir = self
                .models_dir
                .join(format!("{}.extracting", &model_info.filename));
            let final_model_dir = self.models_dir.join(&model_info.filename);

            // Clean up any previous incomplete extraction
            if temp_extract_dir.exists() {
                let _ = fs::remove_dir_all(&temp_extract_dir);
            }

            // Create temporary extraction directory
            fs::create_dir_all(&temp_extract_dir)?;

            // Open the downloaded tar.gz file
            let tar_gz = File::open(&partial_path)?;
            let tar = GzDecoder::new(tar_gz);
            let mut archive = Archive::new(tar);

            // Extract to the temporary directory first
            archive.unpack(&temp_extract_dir).map_err(|e| {
                let error_msg = format!("Failed to extract archive: {}", e);
                // Clean up failed extraction
                let _ = fs::remove_dir_all(&temp_extract_dir);
                let _ = self.app_handle.emit(
                    "model-extraction-failed",
                    &serde_json::json!({
                        "model_id": model_id,
                        "error": error_msg
                    }),
                );
                anyhow::anyhow!(error_msg)
            })?;

            // Find the actual extracted directory (archive might have a nested structure)
            let extracted_dirs: Vec<_> = fs::read_dir(&temp_extract_dir)?
                .filter_map(|entry| entry.ok())
                .filter(|entry| entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false))
                .collect();

            if extracted_dirs.len() == 1 {
                // Single directory extracted, move it to the final location
                let source_dir = extracted_dirs[0].path();
                if final_model_dir.exists() {
                    fs::remove_dir_all(&final_model_dir)?;
                }
                fs::rename(&source_dir, &final_model_dir)?;
                // Clean up temp directory
                let _ = fs::remove_dir_all(&temp_extract_dir);
            } else {
                // Multiple items or no directories, rename the temp directory itself
                if final_model_dir.exists() {
                    fs::remove_dir_all(&final_model_dir)?;
                }
                fs::rename(&temp_extract_dir, &final_model_dir)?;
            }

            info!("Successfully extracted archive for model: {}", model_id);
            // Emit extraction completed event
            let _ = self.app_handle.emit("model-extraction-completed", model_id);

            // Remove the downloaded tar.gz file
            let _ = fs::remove_file(&partial_path);
        } else {
            // Move partial file to final location for file-based models
            fs::rename(&partial_path, &model_path)?;
        }

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
        let _ = self.app_handle.emit("model-download-complete", model_id);

        info!(
            "Successfully downloaded model {} to {:?}",
            model_id, model_path
        );

        Ok(())
    }

    pub fn delete_model(&self, model_id: &str) -> Result<()> {
        debug!("ModelManager: delete_model called for: {}", model_id);

        let model_info = {
            let models = self.available_models.lock().unwrap();
            models.get(model_id).cloned()
        };

        let model_info =
            model_info.ok_or_else(|| anyhow::anyhow!("Model not found: {}", model_id))?;

        debug!("ModelManager: Found model info: {:?}", model_info);

        let model_path = self.models_dir.join(&model_info.filename);
        let partial_path = self
            .models_dir
            .join(format!("{}.partial", &model_info.filename));
        debug!("ModelManager: Model path: {:?}", model_path);
        debug!("ModelManager: Partial path: {:?}", partial_path);

        let mut deleted_something = false;

        if model_info.is_directory {
            // Delete complete model directory if it exists
            if model_path.exists() && model_path.is_dir() {
                info!("Deleting model directory at: {:?}", model_path);
                fs::remove_dir_all(&model_path)?;
                info!("Model directory deleted successfully");
                deleted_something = true;
            }
        } else {
            // Delete complete model file if it exists
            if model_path.exists() {
                info!("Deleting model file at: {:?}", model_path);
                fs::remove_file(&model_path)?;
                info!("Model file deleted successfully");
                deleted_something = true;
            }
        }

        // Delete partial file if it exists (same for both types)
        if partial_path.exists() {
            info!("Deleting partial file at: {:?}", partial_path);
            fs::remove_file(&partial_path)?;
            info!("Partial file deleted successfully");
            deleted_something = true;
        }

        if !deleted_something {
            return Err(anyhow::anyhow!("No model files found to delete"));
        }

        // Update download status
        self.update_download_status()?;
        debug!("ModelManager: download status updated");

        Ok(())
    }

    pub fn get_model_path(&self, model_id: &str) -> Result<PathBuf> {
        let model_info = self
            .get_model_info(model_id)
            .ok_or_else(|| anyhow::anyhow!("Model not found: {}", model_id))?;

        if !model_info.is_downloaded {
            return Err(anyhow::anyhow!("Model not available: {}", model_id));
        }

        // Ensure we don't return partial files/directories
        if model_info.is_downloading {
            return Err(anyhow::anyhow!(
                "Model is currently downloading: {}",
                model_id
            ));
        }

        let model_path = self.models_dir.join(&model_info.filename);
        let partial_path = self
            .models_dir
            .join(format!("{}.partial", &model_info.filename));

        if model_info.is_directory {
            // For directory-based models, ensure the directory exists and is complete
            if model_path.exists() && model_path.is_dir() && !partial_path.exists() {
                Ok(model_path)
            } else {
                Err(anyhow::anyhow!(
                    "Complete model directory not found: {}",
                    model_id
                ))
            }
        } else {
            // For file-based models (existing logic)
            if model_path.exists() && !partial_path.exists() {
                Ok(model_path)
            } else {
                Err(anyhow::anyhow!(
                    "Complete model file not found: {}",
                    model_id
                ))
            }
        }
    }

    pub fn cancel_download(&self, model_id: &str) -> Result<()> {
        debug!("ModelManager: cancel_download called for: {}", model_id);

        let _model_info = {
            let models = self.available_models.lock().unwrap();
            models.get(model_id).cloned()
        };

        let _model_info =
            _model_info.ok_or_else(|| anyhow::anyhow!("Model not found: {}", model_id))?;

        // Mark as not downloading
        {
            let mut models = self.available_models.lock().unwrap();
            if let Some(model) = models.get_mut(model_id) {
                model.is_downloading = false;
            }
        }

        // Note: The actual download cancellation would need to be handled
        // by the download task itself. This just updates the state.
        // The partial file is kept so the download can be resumed later.

        // Update download status to reflect current state
        self.update_download_status()?;

        info!("Download cancelled for: {}", model_id);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    const EXPECTED_MODEL_COUNT: usize = 9;

    fn catalog_ids(models: &[ModelInfo]) -> Vec<String> {
        let mut ids: Vec<String> = models.iter().map(|m| m.id.clone()).collect();
        ids.sort();
        ids
    }

    /// The bundled resources/models.json must parse and match the embedded
    /// fallback catalog (which must always mirror it).
    #[test]
    fn test_resources_catalog_json_parses_and_matches_fallback() {
        let manifest_dir = env!("CARGO_MANIFEST_DIR");
        let catalog_path = std::path::Path::new(manifest_dir).join("resources/models.json");
        let content = fs::read_to_string(&catalog_path)
            .expect("resources/models.json should exist next to Cargo.toml");

        let models = parse_catalog(&content).expect("models.json should parse");
        assert_eq!(
            models.len(),
            EXPECTED_MODEL_COUNT,
            "models.json should contain {} models",
            EXPECTED_MODEL_COUNT
        );

        let fallback = fallback_catalog();
        assert_eq!(
            catalog_ids(&models),
            catalog_ids(&fallback),
            "models.json and the embedded fallback catalog must list the same model ids"
        );
    }

    /// Every catalog entry must have all required fields populated and be
    /// internally consistent (engine type vs. directory layout, scores, urls).
    #[test]
    fn test_catalog_entries_have_required_fields() {
        for model in fallback_catalog() {
            assert!(!model.id.is_empty(), "id must not be empty");
            assert!(
                !model.name.is_empty(),
                "{}: name must not be empty",
                model.id
            );
            assert!(
                !model.description.is_empty(),
                "{}: description must not be empty",
                model.id
            );
            assert!(
                !model.filename.is_empty(),
                "{}: filename must not be empty",
                model.id
            );
            assert!(model.size_mb > 0, "{}: size_mb must be positive", model.id);

            let url = model
                .url
                .as_ref()
                .unwrap_or_else(|| panic!("{}: url must be set", model.id));
            assert!(
                url.starts_with("https://"),
                "{}: url must be https, got {}",
                model.id,
                url
            );

            assert!(
                (0.0..=1.0).contains(&model.accuracy_score),
                "{}: accuracy_score out of range",
                model.id
            );
            assert!(
                (0.0..=1.0).contains(&model.speed_score),
                "{}: speed_score out of range",
                model.id
            );

            // Whisper models are single .bin files; Parakeet and Moonshine
            // models are directories. This is what engine dispatch relies on.
            match model.engine_type {
                EngineType::Whisper => {
                    assert!(
                        !model.is_directory,
                        "{}: whisper models must be file-based",
                        model.id
                    );
                }
                EngineType::Parakeet | EngineType::Moonshine => {
                    assert!(
                        model.is_directory,
                        "{}: parakeet/moonshine models must be directory-based",
                        model.id
                    );
                }
            }
        }
    }

    /// Model ids must be unique and the expected Handy catalog must be present.
    #[test]
    fn test_catalog_ids_unique_and_expected() {
        let models = fallback_catalog();
        let unique: HashSet<&str> = models.iter().map(|m| m.id.as_str()).collect();
        assert_eq!(unique.len(), models.len(), "model ids must be unique");

        let ids = unique;
        for expected in [
            "tiny",
            "base",
            "small",
            "medium",
            "turbo",
            "large",
            "parakeet-tdt-0.6b-v2",
            "parakeet-tdt-0.6b-v3",
            "moonshine-base",
        ] {
            assert!(ids.contains(expected), "catalog must contain {}", expected);
        }
    }

    /// Recommended flags: both Parakeet entries are recommended (V3 first in
    /// auto-select order), everything else is not.
    #[test]
    fn test_recommended_flags() {
        let models = fallback_catalog();
        let recommended: Vec<&str> = models
            .iter()
            .filter(|m| m.recommended)
            .map(|m| m.id.as_str())
            .collect();
        assert_eq!(
            recommended.len(),
            2,
            "exactly the two parakeet models should be recommended"
        );
        for id in recommended {
            assert!(
                id.starts_with("parakeet-"),
                "recommended flag must exist on parakeet entries, got {}",
                id
            );
        }

        // Auto-select preference must reference real, recommended model ids.
        for id in RECOMMENDED_AUTO_SELECT_ORDER {
            let model = models
                .iter()
                .find(|m| m.id == id)
                .unwrap_or_else(|| panic!("auto-select order references unknown id {}", id));
            assert!(model.recommended, "{} must be recommended", id);
        }
        // Parakeet V3 is preferred over V2 in the auto-select order.
        assert_eq!(RECOMMENDED_AUTO_SELECT_ORDER[0], "parakeet-tdt-0.6b-v3");
        assert_eq!(RECOMMENDED_AUTO_SELECT_ORDER[1], "parakeet-tdt-0.6b-v2");
    }

    /// Languages convention: ISO codes for single-language models, the
    /// "multilingual" sentinel for multilingual ones.
    #[test]
    fn test_languages_convention() {
        for model in fallback_catalog() {
            assert!(
                !model.languages.is_empty(),
                "{}: languages must not be empty",
                model.id
            );
            match model.engine_type {
                EngineType::Whisper => {
                    assert!(
                        model.languages.contains(&"multilingual".to_string()),
                        "{}: whisper models are multilingual",
                        model.id
                    );
                }
                EngineType::Parakeet => {
                    if model.id == "parakeet-tdt-0.6b-v2" {
                        assert_eq!(model.languages, vec!["en".to_string()]);
                    } else {
                        assert!(model.languages.contains(&"multilingual".to_string()));
                    }
                }
                EngineType::Moonshine => {
                    assert_eq!(
                        model.languages,
                        vec!["en".to_string()],
                        "{}: moonshine base is English only",
                        model.id
                    );
                }
            }
        }
    }

    /// The new ModelInfo fields must be part of the serialized shape the
    /// frontend receives.
    #[test]
    fn test_model_info_serializes_new_fields() {
        let model = ModelInfo {
            id: "test".to_string(),
            name: "Test".to_string(),
            description: "A test model".to_string(),
            filename: "test.bin".to_string(),
            url: Some("https://example.com/test.bin".to_string()),
            size_mb: 10,
            is_downloaded: false,
            is_downloading: false,
            partial_size: 0,
            is_directory: false,
            engine_type: EngineType::Whisper,
            recommended: true,
            languages: vec!["multilingual".to_string()],
            accuracy_score: 0.5,
            speed_score: 0.5,
        };

        let json = serde_json::to_value(&model).expect("ModelInfo must serialize");
        assert_eq!(json["recommended"], serde_json::Value::Bool(true));
        assert_eq!(json["languages"][0], "multilingual");
    }

    /// Catalog parsing must reject malformed input (used by the fallback path).
    #[test]
    fn test_parse_catalog_rejects_invalid_input() {
        assert!(parse_catalog("not json").is_err());
        assert!(parse_catalog(r#"{"models": []}"#).is_ok()); // empty is parseable
        assert!(parse_catalog(r#"{"models": [{"id": "x"}]}"#).is_err()); // missing fields
        assert!(parse_catalog(
            r#"{"models": [{"id": "x", "name": "X", "description": "d", "filename": "x.bin", "url": null, "size_mb": 1, "engine_type": "gpt"}]}"#
        )
        .is_err()); // unknown engine type
    }
}
