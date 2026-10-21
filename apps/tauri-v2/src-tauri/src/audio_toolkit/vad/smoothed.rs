use super::{VadFrame, VoiceActivityDetector};
use anyhow::Result;
use std::collections::VecDeque;

pub struct SmoothedVad {
    inner_vad: Box<dyn VoiceActivityDetector>,
    prefill_frames: usize,
    hangover_frames: usize,
    onset_frames: usize,

    frame_buffer: VecDeque<Vec<f32>>,
    hangover_counter: usize,
    onset_counter: usize,
    in_speech: bool,

    temp_out: Vec<f32>,
}

impl SmoothedVad {
    pub fn new(
        inner_vad: Box<dyn VoiceActivityDetector>,
        prefill_frames: usize,
        hangover_frames: usize,
        onset_frames: usize,
    ) -> Self {
        Self {
            inner_vad,
            prefill_frames,
            hangover_frames,
            onset_frames,
            frame_buffer: VecDeque::new(),
            hangover_counter: 0,
            onset_counter: 0,
            in_speech: false,
            temp_out: Vec::new(),
        }
    }
}

impl VoiceActivityDetector for SmoothedVad {
    fn push_frame<'a>(&'a mut self, frame: &'a [f32]) -> Result<VadFrame<'a>> {
        // 1. Buffer every incoming frame for possible pre-roll
        self.frame_buffer.push_back(frame.to_vec());
        while self.frame_buffer.len() > self.prefill_frames + 1 {
            self.frame_buffer.pop_front();
        }

        // 2. Delegate to the wrapped boolean VAD
        let is_voice = self.inner_vad.is_voice(frame)?;

        match (self.in_speech, is_voice) {
            // Potential start of speech - need to accumulate onset frames
            (false, true) => {
                self.onset_counter += 1;
                if self.onset_counter >= self.onset_frames {
                    // We have enough consecutive voice frames to trigger speech
                    self.in_speech = true;
                    self.hangover_counter = self.hangover_frames;
                    self.onset_counter = 0; // Reset for next time

                    // Collect prefill + current frame
                    self.temp_out.clear();
                    for buf in &self.frame_buffer {
                        self.temp_out.extend(buf);
                    }
                    Ok(VadFrame::Speech(&self.temp_out))
                } else {
                    // Not enough frames yet, still silence
                    Ok(VadFrame::Noise)
                }
            }

            // Ongoing Speech
            (true, true) => {
                self.hangover_counter = self.hangover_frames;
                Ok(VadFrame::Speech(frame))
            }

            // End of Speech or interruption during onset phase
            (true, false) => {
                if self.hangover_counter > 0 {
                    self.hangover_counter -= 1;
                    Ok(VadFrame::Speech(frame))
                } else {
                    self.in_speech = false;
                    Ok(VadFrame::Noise)
                }
            }

            // Silence or broken onset sequence
            (false, false) => {
                self.onset_counter = 0; // Reset onset counter on silence
                Ok(VadFrame::Noise)
            }
        }
    }

    fn reset(&mut self) {
        self.frame_buffer.clear();
        self.hangover_counter = 0;
        self.onset_counter = 0;
        self.in_speech = false;
        self.temp_out.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Inner VAD that replays a fixed script of voice / no-voice decisions,
    /// so the smoothing logic can be tested without a model.
    struct Scripted(VecDeque<bool>);

    impl VoiceActivityDetector for Scripted {
        fn push_frame<'a>(&'a mut self, frame: &'a [f32]) -> Result<VadFrame<'a>> {
            if self.0.pop_front().unwrap_or(false) {
                Ok(VadFrame::Speech(frame))
            } else {
                Ok(VadFrame::Noise)
            }
        }
    }

    /// Feeds `frames` frames numbered from `first` (frame `i` is filled with
    /// the value `i`) and returns what the smoothed VAD emitted for each one.
    fn run(vad: &mut SmoothedVad, frames: usize, first: usize) -> Result<Vec<Option<Vec<f32>>>> {
        let mut out = Vec::with_capacity(frames);
        for i in first..first + frames {
            let frame = vec![i as f32; 2];
            let decision = match vad.push_frame(&frame)? {
                VadFrame::Speech(samples) => Some(samples.to_vec()),
                VadFrame::Noise => None,
            };
            out.push(decision);
        }
        Ok(out)
    }

    fn smoothed(script: &[bool], prefill: usize, hangover: usize, onset: usize) -> SmoothedVad {
        let inner = Scripted(script.iter().copied().collect());
        SmoothedVad::new(Box::new(inner), prefill, hangover, onset)
    }

    #[test]
    fn speech_starts_only_after_onset_frames_and_includes_prefill() -> Result<()> {
        let script = [true, false, true, true, true];
        let mut vad = smoothed(&script, 1, 0, 2);

        let out = run(&mut vad, script.len(), 0)?;

        assert_eq!(
            out,
            vec![
                None, // one voiced frame is below the onset of two
                None, // silence resets the onset counter
                None,
                // Onset reached: the prefill frame (2) is emitted with frame 3
                // so the first syllable is not clipped.
                Some(vec![2.0, 2.0, 3.0, 3.0]),
                Some(vec![4.0, 4.0]),
            ]
        );
        Ok(())
    }

    #[test]
    fn hangover_keeps_short_pauses_inside_speech() -> Result<()> {
        let script = [true, false, false, false, true];
        let mut vad = smoothed(&script, 0, 2, 1);

        let out = run(&mut vad, script.len(), 0)?;

        assert_eq!(
            out,
            vec![
                Some(vec![0.0, 0.0]),
                Some(vec![1.0, 1.0]), // hangover 2 -> 1
                Some(vec![2.0, 2.0]), // hangover 1 -> 0
                None,                 // hangover exhausted: speech ends
                Some(vec![4.0, 4.0]), // onset of 1 restarts immediately
            ]
        );
        Ok(())
    }

    #[test]
    fn prefill_is_capped_by_frames_seen_so_far() -> Result<()> {
        let mut vad = smoothed(&[true], 3, 0, 1);
        let out = run(&mut vad, 1, 0)?;
        assert_eq!(out, vec![Some(vec![0.0, 0.0])]);
        Ok(())
    }

    #[test]
    fn prefill_keeps_only_the_most_recent_frames() -> Result<()> {
        let script = [false, false, false, false, true];
        let mut vad = smoothed(&script, 2, 0, 1);

        let out = run(&mut vad, script.len(), 0)?;

        assert_eq!(out[4], Some(vec![2.0, 2.0, 3.0, 3.0, 4.0, 4.0]));
        Ok(())
    }

    #[test]
    fn reset_clears_onset_progress_and_speech_state() -> Result<()> {
        let script = [true, true, true, true];
        let mut vad = smoothed(&script, 0, 5, 2);

        let before = run(&mut vad, 2, 0)?;
        assert_eq!(before[1], Some(vec![1.0, 1.0]));

        vad.reset();

        // After a reset a single voiced frame is again below the onset, and
        // the long hangover from before the reset no longer applies.
        let after = run(&mut vad, 1, 2)?;
        assert_eq!(after, vec![None]);
        Ok(())
    }
}
