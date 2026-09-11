#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
use crate::apple_intelligence;
use crate::managers::audio::AudioRecordingManager;
use crate::managers::cloud_transcription::CloudTranscriptionManager;
use crate::managers::history::HistoryManager;
use crate::managers::transcription::TranscriptionManager;
use crate::settings::{get_settings, AppSettings, APPLE_INTELLIGENCE_PROVIDER_ID};
use std::sync::Arc;
use tauri::{AppHandle, State};

#[tauri::command]
#[specta::specta]
pub fn unload_model_manually(
    transcription_manager: State<TranscriptionManager>,
) -> Result<(), String> {
    transcription_manager
        .unload_model()
        .map_err(|e| format!("Failed to unload model: {}", e))
}

#[tauri::command]
#[specta::specta]
pub async fn start_note_recording(
    _app: AppHandle,
    state: State<'_, Arc<AudioRecordingManager>>,
) -> Result<(), String> {
    let binding_id = "note_recording";

    // Check if already recording
    if state.is_recording() {
        return Err("Already recording".to_string());
    }

    if state.try_start_recording(binding_id) {
        Ok(())
    } else {
        Err("Failed to start recording".to_string())
    }
}

// Logic duplicated from actions.rs but simplified for Notes
async fn maybe_post_process(settings: &AppSettings, text: &str) -> Option<String> {
    if !settings.post_process_enabled {
        return None;
    }

    // Simple implementation accessing settings directly
    // Ideally this logic should be shared in a helper/manager
    let provider = settings.active_post_process_provider()?;
    let model = settings
        .post_process_models
        .get(&provider.id)
        .cloned()
        .unwrap_or_default();
    let prompt_id = settings.post_process_selected_prompt_id.as_ref()?;
    let prompt_template = settings
        .post_process_prompts
        .iter()
        .find(|p| &p.id == prompt_id)?
        .prompt
        .clone();

    if prompt_template.trim().is_empty() {
        return None;
    }

    let processed_prompt = prompt_template.replace("${output}", text);

    if provider.id == APPLE_INTELLIGENCE_PROVIDER_ID {
        #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
        {
            let token_limit = model.trim().parse::<i32>().unwrap_or(0);
            return crate::apple_intelligence::process_text(&processed_prompt, token_limit).ok();
        }
        #[cfg(not(all(target_os = "macos", target_arch = "aarch64")))]
        return None;
    }

    let api_key = settings
        .post_process_api_keys
        .get(&provider.id)
        .cloned()
        .unwrap_or_default();

    match crate::llm_client::send_chat_completion(provider, api_key, &model, processed_prompt).await
    {
        Ok(Some(content)) => Some(content),
        _ => None,
    }
}

#[tauri::command]
#[specta::specta]
pub async fn finish_note_recording(
    app: AppHandle,
    audio_manager: State<'_, Arc<AudioRecordingManager>>,
    transcription_manager: State<'_, Arc<TranscriptionManager>>,
    cloud_transcription_manager: State<'_, Arc<CloudTranscriptionManager>>,
    history_manager: State<'_, Arc<HistoryManager>>,
) -> Result<String, String> {
    let binding_id = "note_recording";

    let samples = audio_manager
        .stop_recording(binding_id)
        .ok_or("Failed to stop recording or no samples recorded")?;

    if samples.is_empty() {
        return Err("No audio recorded".to_string());
    }

    let samples_clone = samples.clone();

    // Check if cloud transcription is enabled
    let settings = get_settings(&app);
    let transcription = if settings.cloud_transcription.enabled {
        cloud_transcription_manager
            .transcribe(samples)
            .await
            .map_err(|e| format!("Cloud transcription failed: {}", e))?
    } else {
        transcription_manager
            .transcribe(samples)
            .map_err(|e| format!("Transcription failed: {}", e))?
    };

    if transcription.is_empty() {
        return Ok("".to_string());
    }

    // Load settings for post-processing check
    let settings = get_settings(&app);
    let mut final_text = transcription.clone();
    let mut post_processed_text: Option<String> = None;
    let mut post_process_prompt: Option<String> = None;

    // Apply Post-Processing if enabled
    if let Some(processed) = maybe_post_process(&settings, &transcription).await {
        final_text = processed.clone();
        post_processed_text = Some(processed);

        // Capture prompt for history
        if let Some(prompt_id) = &settings.post_process_selected_prompt_id {
            if let Some(prompt) = settings
                .post_process_prompts
                .iter()
                .find(|p| &p.id == prompt_id)
            {
                post_process_prompt = Some(prompt.prompt.clone());
            }
        }
    }

    // Save as a starred ("saved") history entry in a single insert. Doing it
    // here — rather than starring the row afterwards — is what makes the note
    // reliable: a post-processing pass changes the text, so matching on
    // `transcription_text == final_text` never held, and picking the newest row
    // by timestamp was racy. An unstarred row is also eligible for the
    // unsaved-entry retention cleanup, so the recording could be deleted too.
    history_manager
        .save_transcription(
            samples_clone,
            transcription,
            post_processed_text,
            post_process_prompt,
            true,
        )
        .await
        .map_err(|e| format!("Failed to save history: {}", e))?;

    Ok(final_text)
}
