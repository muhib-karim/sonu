// SONU - Whisper transcription module
// Using whisper-rs for whisper.cpp bindings

use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};
use std::sync::{Arc, Mutex};
use std::path::PathBuf;

pub struct Transcriber {
    ctx: Option<WhisperContext>,
    model_path: PathBuf,
}

impl Transcriber {
    pub fn new() -> Self {
        Self {
            ctx: None,
            model_path: PathBuf::new(),
        }
    }
    
    pub fn load_model(&mut self, model_path: &str) -> Result<(), anyhow::Error> {
        log::info!("Loading whisper model: {}", model_path);
        
        let params = WhisperContextParameters::default();
        let ctx = WhisperContext::new_with_params(model_path, params)
            .map_err(|e| anyhow::anyhow!("Failed to load model: {:?}", e))?;
        
        self.ctx = Some(ctx);
        self.model_path = PathBuf::from(model_path);
        
        log::info!("Model loaded successfully");
        Ok(())
    }
    
    pub fn transcribe(&self, audio: &[f32]) -> Result<String, anyhow::Error> {
        let ctx = self.ctx.as_ref()
            .ok_or_else(|| anyhow::anyhow!("Model not loaded"))?;
        
        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
        
        // Configure for speed
        params.set_n_threads(4);
        params.set_translate(false);
        params.set_language(Some("en"));
        params.set_print_progress(false);
        params.set_print_realtime(false);
        params.set_print_timestamps(false);
        params.set_single_segment(true);
        params.set_no_context(true);
        
        // Create a new state for transcription
        let mut state = ctx.create_state()
            .map_err(|e| anyhow::anyhow!("Failed to create state: {:?}", e))?;
        
        state.full(params, audio)
            .map_err(|e| anyhow::anyhow!("Transcription failed: {:?}", e))?;
        
        // Get all segments
        let num_segments = state.full_n_segments()
            .map_err(|e| anyhow::anyhow!("Failed to get segments: {:?}", e))?;
        
        let mut text = String::new();
        for i in 0..num_segments {
            if let Ok(segment) = state.full_get_segment_text(i) {
                text.push_str(&segment);
            }
        }
        
        Ok(text.trim().to_string())
    }
    
    pub fn is_loaded(&self) -> bool {
        self.ctx.is_some()
    }
}

// Find model file in common locations
pub fn find_model_path(model_name: &str) -> Option<PathBuf> {
    let home = dirs::home_dir()?;
    let candidates = vec![
        home.join(".sonu").join("models").join(format!("{}.bin", model_name)),
        home.join(".sonu").join("models").join(format!("ggml-{}.bin", model_name)),
        PathBuf::from(format!("models/{}.bin", model_name)),
        PathBuf::from(format!("models/ggml-{}.bin", model_name)),
    ];
    
    for path in candidates {
        if path.exists() {
            return Some(path);
        }
    }
    
    None
}
