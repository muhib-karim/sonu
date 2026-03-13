use crate::managers::cloud_transcription::CloudTranscriptionManager;
use crate::settings::{get_settings, write_settings};
use log::{debug, info};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::sync::Arc;
use tauri::{AppHandle, State};

#[derive(Serialize, Deserialize, Type)]
pub struct CloudProviderInfo {
    pub id: String,
    pub label: String,
    pub api_endpoint: String,
    pub allow_endpoint_edit: bool,
    pub has_api_key: bool,
}

#[derive(Serialize, Deserialize, Type)]
pub struct CloudTranscriptionStatus {
    pub enabled: bool,
    pub provider_id: String,
    pub provider_label: String,
    pub has_api_key: bool,
}

/// Get the current cloud transcription status
#[tauri::command]
#[specta::specta]
pub fn get_cloud_transcription_status(app: AppHandle) -> Result<CloudTranscriptionStatus, String> {
    let settings = get_settings(&app);
    let cloud = &settings.cloud_transcription;

    let provider = cloud
        .providers
        .iter()
        .find(|p| p.id == cloud.provider_id)
        .map(|p| p.label.clone())
        .unwrap_or_else(|| "Unknown".to_string());

    let has_key = cloud
        .api_keys
        .get(&cloud.provider_id)
        .map(|k| !k.is_empty())
        .unwrap_or(false);

    Ok(CloudTranscriptionStatus {
        enabled: cloud.enabled,
        provider_id: cloud.provider_id.clone(),
        provider_label: provider,
        has_api_key: has_key,
    })
}

/// Get available cloud transcription providers
#[tauri::command]
#[specta::specta]
pub fn get_cloud_providers(app: AppHandle) -> Result<Vec<CloudProviderInfo>, String> {
    let settings = get_settings(&app);
    let cloud = &settings.cloud_transcription;

    let providers = cloud
        .providers
        .iter()
        .map(|p| {
            let has_key = cloud
                .api_keys
                .get(&p.id)
                .map(|k| !k.is_empty())
                .unwrap_or(false);
            CloudProviderInfo {
                id: p.id.clone(),
                label: p.label.clone(),
                api_endpoint: p.api_endpoint.clone(),
                allow_endpoint_edit: p.allow_endpoint_edit,
                has_api_key: has_key,
            }
        })
        .collect();

    Ok(providers)
}

/// Enable or disable cloud transcription
#[tauri::command]
#[specta::specta]
pub fn set_cloud_transcription_enabled(app: AppHandle, enabled: bool) -> Result<(), String> {
    let mut settings = get_settings(&app);
    settings.cloud_transcription.enabled = enabled;
    write_settings(&app, settings);
    info!("Cloud transcription enabled: {}", enabled);
    Ok(())
}

/// Set the active cloud transcription provider
#[tauri::command]
#[specta::specta]
pub fn set_cloud_provider(app: AppHandle, provider_id: String) -> Result<(), String> {
    let mut settings = get_settings(&app);

    // Validate provider exists
    if !settings
        .cloud_transcription
        .providers
        .iter()
        .any(|p| p.id == provider_id)
    {
        return Err(format!("Cloud provider '{}' not found", provider_id));
    }

    settings.cloud_transcription.provider_id = provider_id.clone();
    write_settings(&app, settings);
    info!("Cloud transcription provider set to: {}", provider_id);
    Ok(())
}

/// Set the API key for a cloud transcription provider
#[tauri::command]
#[specta::specta]
pub fn set_cloud_api_key(
    app: AppHandle,
    provider_id: String,
    api_key: String,
) -> Result<(), String> {
    let mut settings = get_settings(&app);

    // Validate provider exists
    if !settings
        .cloud_transcription
        .providers
        .iter()
        .any(|p| p.id == provider_id)
    {
        return Err(format!("Cloud provider '{}' not found", provider_id));
    }

    settings
        .cloud_transcription
        .api_keys
        .insert(provider_id.clone(), api_key);
    write_settings(&app, settings);
    debug!("Cloud API key updated for provider: {}", provider_id);
    Ok(())
}

/// Set the endpoint for a custom cloud provider
#[tauri::command]
#[specta::specta]
pub fn set_cloud_endpoint(
    app: AppHandle,
    provider_id: String,
    endpoint: String,
) -> Result<(), String> {
    let mut settings = get_settings(&app);

    let provider = settings
        .cloud_transcription
        .providers
        .iter_mut()
        .find(|p| p.id == provider_id)
        .ok_or_else(|| format!("Cloud provider '{}' not found", provider_id))?;

    if !provider.allow_endpoint_edit {
        return Err(format!(
            "Provider '{}' does not allow editing the endpoint",
            provider.label
        ));
    }

    provider.api_endpoint = endpoint;
    write_settings(&app, settings);
    Ok(())
}

/// Set cloud transcription language
#[tauri::command]
#[specta::specta]
pub fn set_cloud_language(app: AppHandle, language: String) -> Result<(), String> {
    let mut settings = get_settings(&app);
    settings.cloud_transcription.selected_language = language;
    write_settings(&app, settings);
    Ok(())
}

/// Set cloud transcription translate-to-english option
#[tauri::command]
#[specta::specta]
pub fn set_cloud_translate_to_english(app: AppHandle, translate: bool) -> Result<(), String> {
    let mut settings = get_settings(&app);
    settings.cloud_transcription.translate_to_english = translate;
    write_settings(&app, settings);
    Ok(())
}

/// Test the cloud provider connection
#[tauri::command]
#[specta::specta]
pub async fn test_cloud_connection(
    _app: AppHandle,
    cloud_manager: State<'_, Arc<CloudTranscriptionManager>>,
    provider_id: String,
    api_key: String,
    endpoint: Option<String>,
) -> Result<String, String> {
    cloud_manager
        .test_connection(&provider_id, &api_key, endpoint.as_deref())
        .await
        .map_err(|e| {
            let error_msg = e.to_string();
            // Sanitize error messages to prevent API key exposure
            // Replace any potential API key patterns (long alphanumeric strings)
            sanitize_error_message(&error_msg)
        })
}

/// Sanitize error messages to remove potential API keys
fn sanitize_error_message(msg: &str) -> String {
    // Replace patterns that look like API keys (32+ alphanumeric chars)
    // This is a conservative approach to prevent key leakage
    let api_key_pattern = regex::Regex::new(r"[a-zA-Z0-9]{32,}").unwrap();
    let sanitized = api_key_pattern.replace_all(msg, "***REDACTED***");

    // Also remove any Bearer/Token prefixes followed by potential keys
    let bearer_pattern = regex::Regex::new(r"(Bearer\s+)[a-zA-Z0-9_\-\.]+").unwrap();
    let sanitized = bearer_pattern.replace_all(&sanitized, "${1}***REDACTED***");

    let token_pattern = regex::Regex::new(r"(Token\s+)[a-zA-Z0-9_\-\.]+").unwrap();
    let sanitized = token_pattern.replace_all(&sanitized, "${1}***REDACTED***");

    sanitized.to_string()
}
