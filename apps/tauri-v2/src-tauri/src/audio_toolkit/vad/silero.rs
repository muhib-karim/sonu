use anyhow::Result;
use std::path::Path;

use vad_rs::Vad;

use super::{VadFrame, VoiceActivityDetector};
use crate::audio_toolkit::constants;

const SILERO_FRAME_MS: u32 = 30;
const SILERO_FRAME_SAMPLES: usize =
    (constants::WHISPER_SAMPLE_RATE * SILERO_FRAME_MS / 1000) as usize;

pub struct SileroVad {
    engine: Vad,
    threshold: f32,
}

impl SileroVad {
    pub fn new<P: AsRef<Path>>(model_path: P, threshold: f32) -> Result<Self> {
        if !(0.0..=1.0).contains(&threshold) {
            anyhow::bail!("threshold must be between 0.0 and 1.0");
        }

        Ok(Self {
            engine: Vad::new(&model_path, constants::WHISPER_SAMPLE_RATE as usize)
                .map_err(|e| anyhow::anyhow!("Failed to create VAD: {e}"))?,
            threshold,
        })
    }
}

impl VoiceActivityDetector for SileroVad {
    fn push_frame<'a>(&'a mut self, frame: &'a [f32]) -> Result<VadFrame<'a>> {
        if frame.len() != SILERO_FRAME_SAMPLES {
            anyhow::bail!(
                "expected {SILERO_FRAME_SAMPLES} samples, got {}",
                frame.len()
            );
        }

        let result = self
            .engine
            .compute(frame)
            .map_err(|e| anyhow::anyhow!("Silero VAD error: {e}"))?;

        if result.prob > self.threshold {
            Ok(VadFrame::Speech(frame))
        } else {
            Ok(VadFrame::Noise)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn frame_is_30ms_at_16khz() {
        assert_eq!(SILERO_FRAME_SAMPLES, 480);
    }

    #[test]
    fn out_of_range_threshold_is_rejected_before_the_model_is_loaded() {
        // The path does not exist: if validation ran after the model load the
        // error would be about the file, not the threshold.
        for threshold in [-0.01, 1.01, f32::NAN, f32::INFINITY] {
            let Err(err) = SileroVad::new("missing-silero.onnx", threshold) else {
                panic!("threshold {threshold} must be rejected");
            };
            assert!(
                err.to_string().contains("threshold must be between"),
                "threshold {threshold}: unexpected error {err}"
            );
        }
    }
}
