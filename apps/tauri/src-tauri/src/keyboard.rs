// SONU - Keyboard simulation module
// Types text into the active application after transcription

use enigo::{Enigo, Keyboard, Settings};
use std::thread;
use std::time::Duration;

pub struct KeyboardTyper {
    // Enigo is created fresh for each typing operation
    _marker: std::marker::PhantomData<()>,
}

// KeyboardTyper is Send + Sync safe
unsafe impl Send for KeyboardTyper {}
unsafe impl Sync for KeyboardTyper {}

impl KeyboardTyper {
    pub fn new() -> Result<Self, anyhow::Error> {
        // Test that we can create an Enigo instance
        let _ = Enigo::new(&Settings::default())
            .map_err(|e| anyhow::anyhow!("Failed to create keyboard controller: {:?}", e))?;
        
        Ok(Self {
            _marker: std::marker::PhantomData,
        })
    }
    
    /// Type text character by character
    pub fn type_text(&mut self, text: &str) -> Result<(), anyhow::Error> {
        // Create fresh Enigo instance for typing
        let mut enigo = Enigo::new(&Settings::default())
            .map_err(|e| anyhow::anyhow!("Failed to create keyboard controller: {:?}", e))?;
        
        // Small delay before typing to ensure focus is correct
        thread::sleep(Duration::from_millis(50));
        
        enigo.text(text)
            .map_err(|e| anyhow::anyhow!("Failed to type text: {:?}", e))?;
        
        log::info!("[SONU] Typed {} characters", text.len());
        Ok(())
    }
}

impl Default for KeyboardTyper {
    fn default() -> Self {
        Self::new().expect("Failed to create keyboard typer")
    }
}
