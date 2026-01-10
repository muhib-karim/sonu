// SONU - Voice Activity Detection (VAD)
// Simple energy-based VAD to filter silence

/// Simple energy-based Voice Activity Detection
pub struct VoiceActivityDetector {
    /// Energy threshold for speech detection (0.0 - 1.0)
    threshold: f32,
    /// Minimum number of consecutive frames for speech
    min_speech_frames: usize,
    /// Frame size in samples (at 16kHz)
    frame_size: usize,
}

impl VoiceActivityDetector {
    pub fn new() -> Self {
        Self {
            threshold: 0.01,        // RMS energy threshold
            min_speech_frames: 3,   // ~60ms of speech at 20ms frames
            frame_size: 320,        // 20ms at 16kHz
        }
    }
    
    /// Set the energy threshold (0.0 - 1.0)
    pub fn set_threshold(&mut self, threshold: f32) {
        self.threshold = threshold.clamp(0.001, 0.5);
    }
    
    /// Calculate RMS energy of audio frame
    fn calculate_rms(&self, frame: &[f32]) -> f32 {
        if frame.is_empty() {
            return 0.0;
        }
        let sum: f32 = frame.iter().map(|&x| x * x).sum();
        (sum / frame.len() as f32).sqrt()
    }
    
    /// Detect speech in audio buffer
    /// Returns (has_speech, speech_ratio)
    pub fn detect(&self, audio: &[f32]) -> (bool, f32) {
        if audio.len() < self.frame_size {
            return (false, 0.0);
        }
        
        let num_frames = audio.len() / self.frame_size;
        let mut speech_frames = 0;
        
        for i in 0..num_frames {
            let start = i * self.frame_size;
            let end = start + self.frame_size;
            let frame = &audio[start..end];
            
            let energy = self.calculate_rms(frame);
            if energy > self.threshold {
                speech_frames += 1;
            }
        }
        
        let speech_ratio = speech_frames as f32 / num_frames as f32;
        let has_speech = speech_frames >= self.min_speech_frames;
        
        (has_speech, speech_ratio)
    }
    
    /// Trim silence from beginning and end of audio
    pub fn trim_silence(&self, audio: &[f32]) -> Vec<f32> {
        if audio.len() < self.frame_size {
            return audio.to_vec();
        }
        
        let num_frames = audio.len() / self.frame_size;
        let mut start_frame = 0;
        let mut end_frame = num_frames;
        
        // Find first speech frame
        for i in 0..num_frames {
            let start = i * self.frame_size;
            let end = start + self.frame_size;
            let energy = self.calculate_rms(&audio[start..end]);
            if energy > self.threshold {
                start_frame = i;
                break;
            }
        }
        
        // Find last speech frame
        for i in (0..num_frames).rev() {
            let start = i * self.frame_size;
            let end = start + self.frame_size;
            let energy = self.calculate_rms(&audio[start..end]);
            if energy > self.threshold {
                end_frame = i + 1;
                break;
            }
        }
        
        if start_frame >= end_frame {
            return Vec::new();
        }
        
        // Add small padding (2 frames = 40ms)
        let start = (start_frame.saturating_sub(2)) * self.frame_size;
        let end = ((end_frame + 2).min(num_frames)) * self.frame_size;
        
        audio[start..end.min(audio.len())].to_vec()
    }
}

impl Default for VoiceActivityDetector {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_silence_detection() {
        let vad = VoiceActivityDetector::new();
        let silence: Vec<f32> = vec![0.0; 16000]; // 1 second of silence
        let (has_speech, ratio) = vad.detect(&silence);
        assert!(!has_speech);
        assert_eq!(ratio, 0.0);
    }
    
    #[test]
    fn test_speech_detection() {
        let vad = VoiceActivityDetector::new();
        // Simulate speech with sine wave
        let speech: Vec<f32> = (0..16000)
            .map(|i| (i as f32 * 0.1).sin() * 0.5)
            .collect();
        let (has_speech, ratio) = vad.detect(&speech);
        assert!(has_speech);
        assert!(ratio > 0.5);
    }
}
