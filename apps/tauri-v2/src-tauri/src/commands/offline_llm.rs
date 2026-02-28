use crate::managers::offline_llm::{OfflineLLMManager, OfflineLLMModelInfo};
use crate::settings::{get_settings, write_settings};
use log::debug;
use std::sync::Arc;
use tauri::{AppHandle, State};

#[tauri::command]
#[specta::specta]
pub async fn get_available_offline_llm_models(
    manager: State<'_, Arc<OfflineLLMManager>>,
) -> Result<Vec<OfflineLLMModelInfo>, String> {
    Ok(manager.get_available_models())
}

#[tauri::command]
#[specta::specta]
pub async fn get_offline_llm_model_info(
    model_id: String,
    manager: State<'_, Arc<OfflineLLMManager>>,
) -> Result<Option<OfflineLLMModelInfo>, String> {
    Ok(manager.get_model_info(&model_id))
}

#[tauri::command]
#[specta::specta]
pub async fn download_offline_llm_model(
    model_id: String,
    manager: State<'_, Arc<OfflineLLMManager>>,
) -> Result<(), String> {
    debug!("Downloading offline LLM model: {}", model_id);
    manager
        .download_model(&model_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_offline_llm_model(
    model_id: String,
    manager: State<'_, Arc<OfflineLLMManager>>,
) -> Result<(), String> {
    debug!("Deleting offline LLM model: {}", model_id);
    manager.delete_model(&model_id).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn cancel_offline_llm_download(
    model_id: String,
    manager: State<'_, Arc<OfflineLLMManager>>,
) -> Result<(), String> {
    debug!("Cancelling offline LLM download: {}", model_id);
    manager
        .cancel_download(&model_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_active_offline_llm_model(
    model_id: String,
    app: AppHandle,
    manager: State<'_, Arc<OfflineLLMManager>>,
) -> Result<(), String> {
    debug!("Setting active offline LLM model: {}", model_id);

    // Verify model exists and is downloaded
    let model_info = manager
        .get_model_info(&model_id)
        .ok_or_else(|| format!("Model not found: {}", model_id))?;

    if !model_info.is_downloaded {
        return Err(format!("Model {} is not downloaded", model_id));
    }

    // Update settings
    let mut settings = get_settings(&app);
    settings.offline_llm_model = model_id;
    write_settings(&app, settings);

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_current_offline_llm_model(app: AppHandle) -> Result<String, String> {
    let settings = get_settings(&app);
    Ok(settings.offline_llm_model)
}

#[tauri::command]
#[specta::specta]
pub async fn set_offline_post_process_enabled(enabled: bool, app: AppHandle) -> Result<(), String> {
    debug!("Setting offline post-processing enabled: {}", enabled);
    let mut settings = get_settings(&app);
    settings.offline_post_process_enabled = enabled;
    write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_offline_post_process_enabled(app: AppHandle) -> Result<bool, String> {
    let settings = get_settings(&app);
    Ok(settings.offline_post_process_enabled)
}

#[tauri::command]
#[specta::specta]
pub async fn has_any_offline_llm_models(
    manager: State<'_, Arc<OfflineLLMManager>>,
) -> Result<bool, String> {
    let models = manager.get_available_models();
    Ok(models.iter().any(|m| m.is_downloaded))
}
