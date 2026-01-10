// SONU - Fast Offline Voice Typing
// Built with Tauri + whisper.cpp
// Similar architecture to Handy (https://github.com/cjpais/Handy)

mod audio;
mod keyboard;
mod transcribe;
mod vad;

use audio::{AudioCapture, resample_to_16khz};
use keyboard::KeyboardTyper;
use transcribe::Transcriber;
use vad::VoiceActivityDetector;

use std::sync::{Arc, Mutex};
use tauri::State;
use serde::{Deserialize, Serialize};

// ============================================================================
// Configuration
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub model_path: String,
    pub hotkey: String,
    pub mode: RecordingMode,
    pub auto_paste: bool,
    pub vad_enabled: bool,
    pub vad_threshold: f32,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            model_path: String::new(),
            hotkey: "Control+Shift+Space".to_string(),
            mode: RecordingMode::HoldToRecord,
            auto_paste: true,
            vad_enabled: true,
            vad_threshold: 0.01,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum RecordingMode {
    HoldToRecord,
    ToggleRecord,
}

// ============================================================================
// Application State
// ============================================================================

pub struct AppState {
    audio: Mutex<AudioCapture>,
    transcriber: Mutex<Transcriber>,
    keyboard: Mutex<Option<KeyboardTyper>>,
    vad: Mutex<VoiceActivityDetector>,
    is_recording: Mutex<bool>,
    settings: Mutex<Settings>,
}

// Make AppState Send + Sync safe
unsafe impl Send for AppState {}
unsafe impl Sync for AppState {}

// ============================================================================
// Tauri Commands
// ============================================================================

#[tauri::command]
fn start_recording(state: State<'_, Arc<AppState>>) -> Result<(), String> {
    let mut audio = state.audio.lock().map_err(|e| e.to_string())?;
    let mut is_recording = state.is_recording.lock().map_err(|e| e.to_string())?;
    
    if *is_recording {
        return Err("Already recording".to_string());
    }
    
    audio.start_recording().map_err(|e| e.to_string())?;
    *is_recording = true;
    
    log::info!("[SONU] Recording started");
    Ok(())
}

#[tauri::command]
fn stop_recording_and_transcribe(state: State<'_, Arc<AppState>>) -> Result<String, String> {
    let mut audio = state.audio.lock().map_err(|e| e.to_string())?;
    let transcriber = state.transcriber.lock().map_err(|e| e.to_string())?;
    let vad = state.vad.lock().map_err(|e| e.to_string())?;
    let settings = state.settings.lock().map_err(|e| e.to_string())?;
    let mut is_recording = state.is_recording.lock().map_err(|e| e.to_string())?;
    
    if !*is_recording {
        return Err("Not recording".to_string());
    }
    
    *is_recording = false;
    
    // Get audio data
    let raw_audio = audio.stop_recording();
    let sample_rate = audio.get_sample_rate();
    
    log::info!("[SONU] Processing {} samples @ {}Hz", raw_audio.len(), sample_rate);
    
    // Resample to 16kHz for Whisper
    let audio_16k = resample_to_16khz(&raw_audio, sample_rate);
    
    // Apply VAD if enabled
    let audio_to_transcribe = if settings.vad_enabled {
        let (has_speech, ratio) = vad.detect(&audio_16k);
        log::info!("[SONU] VAD: speech={}, ratio={:.2}", has_speech, ratio);
        
        if !has_speech {
            return Ok(String::new()); // No speech detected
        }
        
        vad.trim_silence(&audio_16k)
    } else {
        audio_16k
    };
    
    if audio_to_transcribe.is_empty() {
        return Ok(String::new());
    }
    
    // Transcribe
    if !transcriber.is_loaded() {
        return Err("Model not loaded".to_string());
    }
    
    let text = transcriber.transcribe(&audio_to_transcribe).map_err(|e| e.to_string())?;
    
    log::info!("[SONU] Transcribed: {}", text);
    Ok(text)
}

#[tauri::command]
fn transcribe_and_paste(state: State<'_, Arc<AppState>>) -> Result<String, String> {
    // First stop recording and transcribe
    let mut audio = state.audio.lock().map_err(|e| e.to_string())?;
    let transcriber = state.transcriber.lock().map_err(|e| e.to_string())?;
    let vad = state.vad.lock().map_err(|e| e.to_string())?;
    let settings = state.settings.lock().map_err(|e| e.to_string())?;
    let mut is_recording = state.is_recording.lock().map_err(|e| e.to_string())?;
    
    if !*is_recording {
        return Err("Not recording".to_string());
    }
    
    *is_recording = false;
    
    // Get audio data
    let raw_audio = audio.stop_recording();
    let sample_rate = audio.get_sample_rate();
    
    // Resample to 16kHz for Whisper
    let audio_16k = resample_to_16khz(&raw_audio, sample_rate);
    
    // Apply VAD if enabled
    let audio_to_transcribe = if settings.vad_enabled {
        let (has_speech, _) = vad.detect(&audio_16k);
        if !has_speech {
            return Ok(String::new());
        }
        vad.trim_silence(&audio_16k)
    } else {
        audio_16k
    };
    
    if audio_to_transcribe.is_empty() {
        return Ok(String::new());
    }
    
    // Transcribe
    if !transcriber.is_loaded() {
        return Err("Model not loaded".to_string());
    }
    
    let text = transcriber.transcribe(&audio_to_transcribe).map_err(|e| e.to_string())?;
    
    // Auto-paste if enabled
    if settings.auto_paste && !text.is_empty() {
        let mut keyboard_guard = state.keyboard.lock().map_err(|e| e.to_string())?;
        if let Some(ref mut keyboard) = *keyboard_guard {
            let _ = keyboard.type_text(&text);
        }
    }
    
    Ok(text)
}

#[tauri::command]
fn load_model(path: String, state: State<'_, Arc<AppState>>) -> Result<(), String> {
    let mut transcriber = state.transcriber.lock().map_err(|e| e.to_string())?;
    let mut settings = state.settings.lock().map_err(|e| e.to_string())?;
    
    transcriber.load_model(&path).map_err(|e| e.to_string())?;
    settings.model_path = path;
    
    Ok(())
}

#[tauri::command]
fn is_model_loaded(state: State<'_, Arc<AppState>>) -> bool {
    state.transcriber.lock().map(|t| t.is_loaded()).unwrap_or(false)
}

#[tauri::command]
fn get_recording_state(state: State<'_, Arc<AppState>>) -> bool {
    state.is_recording.lock().map(|r| *r).unwrap_or(false)
}

#[tauri::command]
fn get_settings(state: State<'_, Arc<AppState>>) -> Result<Settings, String> {
    state.settings.lock().map(|s| s.clone()).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_settings(new_settings: Settings, state: State<'_, Arc<AppState>>) -> Result<(), String> {
    let mut settings = state.settings.lock().map_err(|e| e.to_string())?;
    let mut vad = state.vad.lock().map_err(|e| e.to_string())?;
    
    // Update VAD threshold if changed
    if new_settings.vad_threshold != settings.vad_threshold {
        vad.set_threshold(new_settings.vad_threshold);
    }
    
    *settings = new_settings;
    Ok(())
}

#[tauri::command]
fn type_text(text: String, state: State<'_, Arc<AppState>>) -> Result<(), String> {
    let mut keyboard_guard = state.keyboard.lock().map_err(|e| e.to_string())?;
    if let Some(ref mut keyboard) = *keyboard_guard {
        keyboard.type_text(&text).map_err(|e| e.to_string())
    } else {
        Err("Keyboard not initialized".to_string())
    }
}

#[tauri::command]
fn get_model_path(model_name: String) -> Result<String, String> {
    let home = dirs::home_dir().ok_or("Cannot find home directory")?;
    let model_path = home
        .join(".sonu")
        .join("models")
        .join(format!("ggml-{}.bin", model_name));
    Ok(model_path.to_string_lossy().to_string())
}

// ============================================================================
// Model Management
// ============================================================================

#[tauri::command]
fn get_available_models() -> Vec<ModelInfo> {
    vec![
        ModelInfo {
            name: "tiny".to_string(),
            size_mb: 75,
            speed: "Fastest".to_string(),
            accuracy: "Basic".to_string(),
        },
        ModelInfo {
            name: "base".to_string(),
            size_mb: 145,
            speed: "Fast".to_string(),
            accuracy: "Good".to_string(),
        },
        ModelInfo {
            name: "small".to_string(),
            size_mb: 488,
            speed: "Medium".to_string(),
            accuracy: "Better".to_string(),
        },
        ModelInfo {
            name: "medium".to_string(),
            size_mb: 1500,
            speed: "Slow".to_string(),
            accuracy: "Great".to_string(),
        },
        ModelInfo {
            name: "large-v3".to_string(),
            size_mb: 3000,
            speed: "Slowest".to_string(),
            accuracy: "Best".to_string(),
        },
    ]
}

#[derive(Debug, Clone, Serialize)]
struct ModelInfo {
    name: String,
    size_mb: u32,
    speed: String,
    accuracy: String,
}

// ============================================================================
// Application Entry Point
// ============================================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();
    
    // Initialize app state
    let audio = AudioCapture::new().expect("Failed to initialize audio");
    let transcriber = Transcriber::new();
    let keyboard = KeyboardTyper::new().ok();
    let vad = VoiceActivityDetector::new();
    
    let state = Arc::new(AppState {
        audio: Mutex::new(audio),
        transcriber: Mutex::new(transcriber),
        keyboard: Mutex::new(keyboard),
        vad: Mutex::new(vad),
        is_recording: Mutex::new(false),
        settings: Mutex::new(Settings::default()),
    });
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            start_recording,
            stop_recording_and_transcribe,
            transcribe_and_paste,
            load_model,
            is_model_loaded,
            get_recording_state,
            get_settings,
            update_settings,
            type_text,
            get_available_models,
            get_model_path
        ])
        .setup(|_app| {
            log::info!("[SONU] Starting application...");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
