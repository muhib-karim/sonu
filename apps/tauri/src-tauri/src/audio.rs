// SONU - Audio capture module using cpal
// Cross-platform audio input handling

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::{Arc, Mutex};
use std::collections::VecDeque;

/// Thread-safe audio buffer
pub type AudioBuffer = Arc<Mutex<VecDeque<f32>>>;

/// Audio capture configuration
pub struct AudioConfig {
    pub sample_rate: u32,
    pub channels: u16,
}

/// Manages audio recording (stream is created/destroyed per recording)
pub struct AudioCapture {
    buffer: AudioBuffer,
    sample_rate: u32,
    is_recording: Arc<Mutex<bool>>,
}

// Implement Send + Sync (the Stream is not stored, only created during recording)
unsafe impl Send for AudioCapture {}
unsafe impl Sync for AudioCapture {}

impl AudioCapture {
    pub fn new() -> Result<Self, anyhow::Error> {
        let host = cpal::default_host();
        let device = host.default_input_device()
            .ok_or_else(|| anyhow::anyhow!("No input device found"))?;
        
        let config = device.default_input_config()?;
        let sample_rate = config.sample_rate().0;
        
        log::info!("Audio input: {} @ {}Hz", device.name()?, sample_rate);
        
        Ok(Self {
            buffer: Arc::new(Mutex::new(VecDeque::new())),
            sample_rate,
            is_recording: Arc::new(Mutex::new(false)),
        })
    }
    
    pub fn start_recording(&mut self) -> Result<(), anyhow::Error> {
        let host = cpal::default_host();
        let device = host.default_input_device()
            .ok_or_else(|| anyhow::anyhow!("No input device found"))?;
        
        let config = device.default_input_config()?;
        let buffer = self.buffer.clone();
        let is_recording = self.is_recording.clone();
        
        // Clear previous buffer
        {
            let mut buf = buffer.lock().unwrap();
            buf.clear();
        }
        
        *is_recording.lock().unwrap() = true;
        
        // Spawn recording thread
        let is_rec_clone = is_recording.clone();
        let buffer_clone = buffer.clone();
        
        std::thread::spawn(move || {
            let stream = match config.sample_format() {
                cpal::SampleFormat::F32 => {
                    device.build_input_stream(
                        &config.into(),
                        move |data: &[f32], _: &cpal::InputCallbackInfo| {
                            if *is_rec_clone.lock().unwrap() {
                                let mut buf = buffer_clone.lock().unwrap();
                                buf.extend(data.iter().cloned());
                            }
                        },
                        |err| log::error!("Audio stream error: {}", err),
                        None,
                    )
                }
                cpal::SampleFormat::I16 => {
                    device.build_input_stream(
                        &config.into(),
                        move |data: &[i16], _: &cpal::InputCallbackInfo| {
                            if *is_rec_clone.lock().unwrap() {
                                let mut buf = buffer_clone.lock().unwrap();
                                buf.extend(data.iter().map(|&s| s as f32 / 32768.0));
                            }
                        },
                        |err| log::error!("Audio stream error: {}", err),
                        None,
                    )
                }
                _ => {
                    log::error!("Unsupported sample format");
                    return;
                }
            };
            
            if let Ok(stream) = stream {
                if let Err(e) = stream.play() {
                    log::error!("Failed to play stream: {}", e);
                    return;
                }
                
                // Keep thread alive while recording
                while *is_recording.lock().unwrap() {
                    std::thread::sleep(std::time::Duration::from_millis(10));
                }
            }
        });
        
        log::info!("Recording started");
        Ok(())
    }
    
    pub fn stop_recording(&mut self) -> Vec<f32> {
        *self.is_recording.lock().unwrap() = false;
        
        // Give the recording thread time to stop
        std::thread::sleep(std::time::Duration::from_millis(50));
        
        let mut buffer = self.buffer.lock().unwrap();
        let audio: Vec<f32> = buffer.drain(..).collect();
        
        log::info!("Recording stopped: {} samples", audio.len());
        audio
    }
    
    pub fn get_sample_rate(&self) -> u32 {
        self.sample_rate
    }
    
    pub fn is_recording(&self) -> bool {
        *self.is_recording.lock().unwrap()
    }
}

// Resample audio to 16kHz for Whisper
pub fn resample_to_16khz(audio: &[f32], from_rate: u32) -> Vec<f32> {
    if from_rate == 16000 {
        return audio.to_vec();
    }
    
    // Simple linear interpolation for resampling
    let ratio = from_rate as f64 / 16000.0;
    let new_len = (audio.len() as f64 / ratio) as usize;
    
    (0..new_len)
        .map(|i| {
            let src_idx = i as f64 * ratio;
            let idx = src_idx as usize;
            let frac = src_idx - idx as f64;
            
            if idx + 1 < audio.len() {
                audio[idx] * (1.0 - frac as f32) + audio[idx + 1] * frac as f32
            } else if idx < audio.len() {
                audio[idx]
            } else {
                0.0
            }
        })
        .collect()
}
