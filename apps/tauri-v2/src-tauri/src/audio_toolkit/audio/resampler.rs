use rubato::{FftFixedIn, Resampler};
use std::time::Duration;

// Make this a constant you can tweak
const RESAMPLER_CHUNK_SIZE: usize = 1024;

pub struct FrameResampler {
    resampler: Option<FftFixedIn<f32>>,
    chunk_in: usize,
    in_buf: Vec<f32>,
    frame_samples: usize,
    pending: Vec<f32>,
}

impl FrameResampler {
    pub fn new(in_hz: usize, out_hz: usize, frame_dur: Duration) -> Self {
        let frame_samples = ((out_hz as f64 * frame_dur.as_secs_f64()).round()) as usize;
        assert!(frame_samples > 0, "frame duration too short");

        // Use fixed chunk size instead of GCD-based
        let chunk_in = RESAMPLER_CHUNK_SIZE;

        let resampler = (in_hz != out_hz).then(|| {
            FftFixedIn::<f32>::new(in_hz, out_hz, chunk_in, 1, 1)
                .expect("Failed to create resampler")
        });

        Self {
            resampler,
            chunk_in,
            in_buf: Vec::with_capacity(chunk_in),
            frame_samples,
            pending: Vec::with_capacity(frame_samples),
        }
    }

    pub fn push(&mut self, mut src: &[f32], mut emit: impl FnMut(&[f32])) {
        if self.resampler.is_none() {
            self.emit_frames(src, &mut emit);
            return;
        }

        while !src.is_empty() {
            let space = self.chunk_in - self.in_buf.len();
            let take = space.min(src.len());
            self.in_buf.extend_from_slice(&src[..take]);
            src = &src[take..];

            if self.in_buf.len() == self.chunk_in {
                // let start = std::time::Instant::now();
                if let Ok(out) = self
                    .resampler
                    .as_mut()
                    .unwrap()
                    .process(&[&self.in_buf[..]], None)
                {
                    // let duration = start.elapsed();
                    // log::debug!("Resampler took: {:?}", duration);
                    self.emit_frames(&out[0], &mut emit);
                }
                self.in_buf.clear();
            }
        }
    }

    pub fn finish(&mut self, mut emit: impl FnMut(&[f32])) {
        // Process any remaining input samples
        if let Some(ref mut resampler) = self.resampler {
            if !self.in_buf.is_empty() {
                // Pad with zeros to reach chunk size
                self.in_buf.resize(self.chunk_in, 0.0);
                if let Ok(out) = resampler.process(&[&self.in_buf[..]], None) {
                    self.emit_frames(&out[0], &mut emit);
                }
            }
        }

        // Emit any remaining pending frame (padded with zeros)
        if !self.pending.is_empty() {
            self.pending.resize(self.frame_samples, 0.0);
            emit(&self.pending);
            self.pending.clear();
        }
    }

    fn emit_frames(&mut self, mut data: &[f32], emit: &mut impl FnMut(&[f32])) {
        while !data.is_empty() {
            let space = self.frame_samples - self.pending.len();
            let take = space.min(data.len());
            self.pending.extend_from_slice(&data[..take]);
            data = &data[take..];

            if self.pending.len() == self.frame_samples {
                emit(&self.pending);
                self.pending.clear();
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::f32::consts::PI;

    const FRAME: Duration = Duration::from_millis(30);
    /// 30 ms at the 16 kHz rate every engine consumes.
    const FRAME_16K: usize = 480;

    fn run(resampler: &mut FrameResampler, input: &[f32], piece: usize) -> Vec<Vec<f32>> {
        let mut frames = Vec::new();
        for chunk in input.chunks(piece) {
            resampler.push(chunk, |f| frames.push(f.to_vec()));
        }
        resampler.finish(|f| frames.push(f.to_vec()));
        frames
    }

    fn tone(hz: f32, rate: usize, samples: usize) -> Vec<f32> {
        (0..samples)
            .map(|i| 0.5 * (2.0 * PI * hz * i as f32 / rate as f32).sin())
            .collect()
    }

    fn zero_crossings(samples: &[f32]) -> usize {
        samples
            .windows(2)
            .filter(|w| (w[0] < 0.0) != (w[1] < 0.0))
            .count()
    }

    #[test]
    fn same_rate_passes_samples_through_and_pads_the_last_frame() {
        let mut resampler = FrameResampler::new(16_000, 16_000, FRAME);
        let input: Vec<f32> = (0..1_000).map(|i| i as f32 / 1_000.0).collect();

        let frames = run(&mut resampler, &input, input.len());

        // 1 000 samples -> two full 480-sample frames plus one zero-padded frame.
        assert_eq!(frames.len(), 3);
        assert!(frames.iter().all(|f| f.len() == FRAME_16K));
        let flat = frames.concat();
        assert_eq!(&flat[..input.len()], &input[..]);
        assert!(flat[input.len()..].iter().all(|&s| s == 0.0));
    }

    #[test]
    fn finish_without_input_emits_nothing() {
        let mut resampler = FrameResampler::new(48_000, 16_000, FRAME);
        let frames = run(&mut resampler, &[], 1);
        assert!(frames.is_empty());
    }

    #[test]
    fn downsampling_48k_to_16k_keeps_duration_and_frame_size() {
        let mut resampler = FrameResampler::new(48_000, 16_000, FRAME);
        let input = tone(440.0, 48_000, 48_000);

        let frames = run(&mut resampler, &input, input.len());

        assert!(frames.iter().all(|f| f.len() == FRAME_16K));
        // One second in should be about one second (16 000 samples) out; the
        // slack covers the zero-padded final resampler chunk and output frame.
        let total: usize = frames.iter().map(Vec::len).sum();
        assert!((15_500..=17_000).contains(&total), "got {total} samples");
    }

    #[test]
    fn downsampling_preserves_pitch() {
        let mut resampler = FrameResampler::new(48_000, 16_000, FRAME);
        let input = tone(440.0, 48_000, 48_000);

        let flat = run(&mut resampler, &input, input.len()).concat();

        // Half a second from the steady-state middle of the output: a 440 Hz
        // tone crosses zero 440 times in 0.5 s. Skipping the edges avoids the
        // filter's start-up delay and the zero padding at the end.
        let middle = &flat[4_000..12_000];
        let crossings = zero_crossings(middle);
        assert!(
            (430..=450).contains(&crossings),
            "got {crossings} zero crossings"
        );
    }

    #[test]
    fn output_does_not_depend_on_how_input_is_split() {
        let input = tone(1_000.0, 44_100, 22_050);

        let mut whole = FrameResampler::new(44_100, 16_000, FRAME);
        let mut pieces = FrameResampler::new(44_100, 16_000, FRAME);

        // Audio callbacks deliver arbitrary buffer sizes; the frames handed to
        // the VAD must be identical either way.
        assert_eq!(
            run(&mut whole, &input, input.len()),
            run(&mut pieces, &input, 37)
        );
    }

    #[test]
    #[should_panic(expected = "frame duration too short")]
    fn zero_frame_duration_is_rejected() {
        let _ = FrameResampler::new(48_000, 16_000, Duration::ZERO);
    }
}
