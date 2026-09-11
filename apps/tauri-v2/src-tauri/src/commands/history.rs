use crate::managers::history::{HistoryEntry, HistoryManager};
use std::sync::Arc;
use tauri::{AppHandle, State};

#[tauri::command]
#[specta::specta]
pub async fn get_history_entries(
    _app: AppHandle,
    history_manager: State<'_, Arc<HistoryManager>>,
) -> Result<Vec<HistoryEntry>, String> {
    history_manager
        .get_history_entries()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn toggle_history_entry_saved(
    _app: AppHandle,
    history_manager: State<'_, Arc<HistoryManager>>,
    id: i64,
) -> Result<(), String> {
    history_manager
        .toggle_saved_status(id)
        .await
        .map_err(|e| e.to_string())
}

/// Smallest history limit a caller may set.
///
/// `cleanup_by_count` deletes every unsaved entry beyond the limit, so a limit
/// of `0` wiped the entire unsaved history.
const MIN_HISTORY_LIMIT: usize = 1;
/// Upper bound, to reject absurd values from a malformed or hostile caller.
const MAX_HISTORY_LIMIT: usize = 10_000;

/// Validate a caller-supplied recording file name.
///
/// The value comes from the frontend and is joined onto the recordings
/// directory, so it must be a bare file name: no separators, no `..`, no
/// drive-relative prefix, no NUL. Anything else could resolve outside the
/// recordings directory.
fn validate_recording_file_name(file_name: &str) -> Result<(), String> {
    if file_name.is_empty() {
        return Err("File name must not be empty".to_string());
    }
    if file_name.contains('\0') {
        return Err("File name must not contain NUL".to_string());
    }
    if file_name.contains('/') || file_name.contains('\\') {
        return Err("File name must not contain path separators".to_string());
    }
    if file_name.contains("..") {
        return Err("File name must not contain '..'".to_string());
    }
    if file_name.contains(':') {
        return Err("File name must not contain ':'".to_string());
    }
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_audio_file_path(
    _app: AppHandle,
    history_manager: State<'_, Arc<HistoryManager>>,
    file_name: String,
) -> Result<String, String> {
    validate_recording_file_name(&file_name)?;
    let path = history_manager.get_audio_file_path(&file_name);
    path.to_str()
        .ok_or_else(|| "Invalid file path".to_string())
        .map(|s| s.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_history_entry(
    _app: AppHandle,
    history_manager: State<'_, Arc<HistoryManager>>,
    id: i64,
) -> Result<(), String> {
    history_manager
        .delete_entry(id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn update_history_limit(
    app: AppHandle,
    history_manager: State<'_, Arc<HistoryManager>>,
    limit: usize,
) -> Result<(), String> {
    if !(MIN_HISTORY_LIMIT..=MAX_HISTORY_LIMIT).contains(&limit) {
        return Err(format!(
            "History limit must be between {} and {}",
            MIN_HISTORY_LIMIT, MAX_HISTORY_LIMIT
        ));
    }

    let mut settings = crate::settings::get_settings(&app);
    settings.history_limit = limit;
    crate::settings::write_settings(&app, settings);

    history_manager
        .cleanup_old_entries()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn update_recording_retention_period(
    app: AppHandle,
    history_manager: State<'_, Arc<HistoryManager>>,
    period: String,
) -> Result<(), String> {
    use crate::settings::RecordingRetentionPeriod;

    let retention_period = match period.as_str() {
        "never" => RecordingRetentionPeriod::Never,
        "preserve_limit" => RecordingRetentionPeriod::PreserveLimit,
        "days3" => RecordingRetentionPeriod::Days3,
        "weeks2" => RecordingRetentionPeriod::Weeks2,
        "months3" => RecordingRetentionPeriod::Months3,
        _ => return Err(format!("Invalid retention period: {}", period)),
    };

    let mut settings = crate::settings::get_settings(&app);
    settings.recording_retention_period = retention_period;
    crate::settings::write_settings(&app, settings);

    history_manager
        .cleanup_old_entries()
        .map_err(|e| e.to_string())?;

    Ok(())
}
