use std::{
    io::Error,
    sync::{mpsc, Arc, Mutex},
    time::Duration,
};

use cpal::{
    traits::{DeviceTrait, HostTrait, StreamTrait},
    Device, Sample, SizedSample,
};

use crate::audio_toolkit::{
    audio::{AudioVisualiser, FrameResampler},
    constants,
    vad::{self, VadFrame},
    VoiceActivityDetector,
};

enum Cmd {
    Start,
    Stop(mpsc::Sender<Vec<f32>>),
    /// Clone the tail of the current in-flight sample buffer without
    /// stopping. The usize caps how many of the most recent samples are
    /// returned so previews never clone the full (unbounded) buffer.
    Peek(usize, mpsc::Sender<Vec<f32>>),
    Shutdown,
}

/// How long `open` waits for the worker to build and start the input stream
/// before giving up. Stream construction is normally sub-millisecond; this
/// only matters for a wedged driver.
const WORKER_INIT_TIMEOUT: Duration = Duration::from_secs(5);

/// How often the consumer wakes up to service commands while no audio is
/// arriving. Bounds how long `close()` can block when a device stops
/// delivering callbacks (unplugged, muted at the OS level, stalled driver).
const CMD_POLL_INTERVAL: Duration = Duration::from_millis(50);

pub struct AudioRecorder {
    device: Option<Device>,
    cmd_tx: Option<mpsc::Sender<Cmd>>,
    worker_handle: Option<std::thread::JoinHandle<()>>,
    vad: Option<Arc<Mutex<Box<dyn vad::VoiceActivityDetector>>>>,
    level_cb: Option<Arc<dyn Fn(Vec<f32>) + Send + Sync + 'static>>,
}

impl AudioRecorder {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(AudioRecorder {
            device: None,
            cmd_tx: None,
            worker_handle: None,
            vad: None,
            level_cb: None,
        })
    }

    pub fn with_vad(mut self, vad: Box<dyn VoiceActivityDetector>) -> Self {
        self.vad = Some(Arc::new(Mutex::new(vad)));
        self
    }

    pub fn with_level_callback<F>(mut self, cb: F) -> Self
    where
        F: Fn(Vec<f32>) + Send + Sync + 'static,
    {
        self.level_cb = Some(Arc::new(cb));
        self
    }

    pub fn open(&mut self, device: Option<Device>) -> Result<(), Box<dyn std::error::Error>> {
        if self.worker_handle.is_some() {
            return Ok(()); // already open
        }

        let (sample_tx, sample_rx) = mpsc::channel::<Vec<f32>>();
        let (cmd_tx, cmd_rx) = mpsc::channel::<Cmd>();
        // Handshake so `open` can report why the device could not be used.
        // Previously the worker used `unwrap`/`expect`/`panic!` here, and
        // because the release profile sets `panic = "abort"` an unusable
        // microphone killed the whole process instead of failing the recording.
        let (init_tx, init_rx) = mpsc::channel::<Result<(), String>>();

        let host = crate::audio_toolkit::get_cpal_host();
        let device = match device {
            Some(dev) => dev,
            None => host
                .default_input_device()
                .ok_or_else(|| Error::new(std::io::ErrorKind::NotFound, "No input device found"))?,
        };

        let thread_device = device.clone();
        let vad = self.vad.clone();
        // Move the optional level callback into the worker thread
        let level_cb = self.level_cb.clone();

        let worker = std::thread::spawn(move || {
            let config = match AudioRecorder::get_preferred_config(&thread_device) {
                Ok(config) => config,
                Err(e) => {
                    let _ = init_tx.send(Err(format!("failed to fetch preferred config: {e}")));
                    return;
                }
            };

            let sample_rate = config.sample_rate().0;
            let channels = config.channels() as usize;

            log::info!(
                "Using device: {:?}\nSample rate: {}\nChannels: {}\nFormat: {:?}",
                thread_device.name(),
                sample_rate,
                channels,
                config.sample_format()
            );

            let stream = match build_input_stream(&thread_device, &config, sample_tx, channels) {
                Ok(stream) => stream,
                Err(e) => {
                    let _ = init_tx.send(Err(e));
                    return;
                }
            };

            if let Err(e) = stream.play() {
                let _ = init_tx.send(Err(format!("failed to start input stream: {e}")));
                return;
            }

            // Tell the caller we are live. If the caller has already given up
            // the send fails, in which case there is nothing to consume.
            if init_tx.send(Ok(())).is_err() {
                return;
            }

            // keep the stream alive while we process samples
            run_consumer(sample_rate, vad, sample_rx, cmd_rx, level_cb);
            // stream is dropped here, after run_consumer returns
        });

        // Wait for the worker to report success or failure. Bounded so a
        // wedged device driver cannot block the caller indefinitely.
        match init_rx.recv_timeout(WORKER_INIT_TIMEOUT) {
            Ok(Ok(())) => {}
            Ok(Err(e)) => {
                let _ = worker.join();
                return Err(Error::other(e).into());
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                let _ = cmd_tx.send(Cmd::Shutdown);
                let _ = worker.join();
                return Err(Error::new(
                    std::io::ErrorKind::TimedOut,
                    "timed out while opening the microphone",
                )
                .into());
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                let _ = worker.join();
                return Err(
                    Error::other("audio worker exited before the microphone was ready").into(),
                );
            }
        }

        self.device = Some(device);
        self.cmd_tx = Some(cmd_tx);
        self.worker_handle = Some(worker);

        Ok(())
    }

    pub fn start(&self) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(tx) = &self.cmd_tx {
            tx.send(Cmd::Start)?;
        }
        Ok(())
    }

    pub fn stop(&self) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        let (resp_tx, resp_rx) = mpsc::channel();
        if let Some(tx) = &self.cmd_tx {
            tx.send(Cmd::Stop(resp_tx))?;
        }
        Ok(resp_rx.recv()?) // wait for the samples
    }

    /// Returns a clone of the most recent `max_samples` buffered since
    /// recording started, without stopping the recording. Returns an empty
    /// buffer when idle.
    pub fn peek(&self, max_samples: usize) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        let (resp_tx, resp_rx) = mpsc::channel();
        if let Some(tx) = &self.cmd_tx {
            tx.send(Cmd::Peek(max_samples, resp_tx))?;
        }
        Ok(resp_rx.recv()?)
    }

    pub fn close(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(tx) = self.cmd_tx.take() {
            let _ = tx.send(Cmd::Shutdown);
        }
        if let Some(h) = self.worker_handle.take() {
            let _ = h.join();
        }
        self.device = None;
        Ok(())
    }

    fn build_stream<T>(
        device: &cpal::Device,
        config: &cpal::SupportedStreamConfig,
        sample_tx: mpsc::Sender<Vec<f32>>,
        channels: usize,
    ) -> Result<cpal::Stream, cpal::BuildStreamError>
    where
        T: Sample + SizedSample + Send + 'static,
        f32: cpal::FromSample<T>,
    {
        let mut output_buffer = Vec::new();

        let stream_cb = move |data: &[T], _: &cpal::InputCallbackInfo| {
            output_buffer.clear();

            if channels == 1 {
                // Direct conversion without intermediate Vec
                output_buffer.extend(data.iter().map(|&sample| sample.to_sample::<f32>()));
            } else {
                // Convert to mono directly
                let frame_count = data.len() / channels;
                output_buffer.reserve(frame_count);

                for frame in data.chunks_exact(channels) {
                    let mono_sample = frame
                        .iter()
                        .map(|&sample| sample.to_sample::<f32>())
                        .sum::<f32>()
                        / channels as f32;
                    output_buffer.push(mono_sample);
                }
            }

            if sample_tx.send(output_buffer.clone()).is_err() {
                log::error!("Failed to send samples");
            }
        };

        device.build_input_stream(
            &config.clone().into(),
            stream_cb,
            |err| log::error!("Stream error: {}", err),
            None,
        )
    }

    fn get_preferred_config(
        device: &cpal::Device,
    ) -> Result<cpal::SupportedStreamConfig, Box<dyn std::error::Error>> {
        let supported_configs = device.supported_input_configs()?;
        let mut best_config: Option<cpal::SupportedStreamConfigRange> = None;

        // Try to find a config that supports 16kHz, prioritizing better formats
        for config_range in supported_configs {
            if config_range.min_sample_rate().0 <= constants::WHISPER_SAMPLE_RATE
                && config_range.max_sample_rate().0 >= constants::WHISPER_SAMPLE_RATE
            {
                match best_config {
                    None => best_config = Some(config_range),
                    Some(ref current) => {
                        // Prioritize F32 > I16 > I32 > others
                        let score = |fmt: cpal::SampleFormat| match fmt {
                            cpal::SampleFormat::F32 => 4,
                            cpal::SampleFormat::I16 => 3,
                            cpal::SampleFormat::I32 => 2,
                            _ => 1,
                        };

                        if score(config_range.sample_format()) > score(current.sample_format()) {
                            best_config = Some(config_range);
                        }
                    }
                }
            }
        }

        if let Some(config) = best_config {
            return Ok(config.with_sample_rate(cpal::SampleRate(constants::WHISPER_SAMPLE_RATE)));
        }

        // If no config supports 16kHz, fall back to default
        Ok(device.default_input_config()?)
    }
}

/// Dispatches to [`AudioRecorder::build_stream`] for the device's sample format.
///
/// Unsupported formats return a descriptive error rather than panicking: with
/// `panic = "abort"` in the release profile, the old `panic!` arm terminated
/// the entire application whenever a device reported an unusual format.
fn build_input_stream(
    device: &cpal::Device,
    config: &cpal::SupportedStreamConfig,
    sample_tx: mpsc::Sender<Vec<f32>>,
    channels: usize,
) -> Result<cpal::Stream, String> {
    fn build<T>(
        device: &cpal::Device,
        config: &cpal::SupportedStreamConfig,
        sample_tx: mpsc::Sender<Vec<f32>>,
        channels: usize,
    ) -> Result<cpal::Stream, String>
    where
        T: Sample + SizedSample + Send + 'static,
        f32: cpal::FromSample<T>,
    {
        AudioRecorder::build_stream::<T>(device, config, sample_tx, channels)
            .map_err(|e| format!("{e}"))
    }

    match config.sample_format() {
        cpal::SampleFormat::U8 => build::<u8>(device, config, sample_tx, channels),
        cpal::SampleFormat::I8 => build::<i8>(device, config, sample_tx, channels),
        cpal::SampleFormat::I16 => build::<i16>(device, config, sample_tx, channels),
        cpal::SampleFormat::I32 => build::<i32>(device, config, sample_tx, channels),
        cpal::SampleFormat::F32 => build::<f32>(device, config, sample_tx, channels),
        other => Err(format!(
            "unsupported sample format {other:?} (supported: U8, I8, I16, I32, F32)"
        )),
    }
}

fn run_consumer(
    in_sample_rate: u32,
    vad: Option<Arc<Mutex<Box<dyn vad::VoiceActivityDetector>>>>,
    sample_rx: mpsc::Receiver<Vec<f32>>,
    cmd_rx: mpsc::Receiver<Cmd>,
    level_cb: Option<Arc<dyn Fn(Vec<f32>) + Send + Sync + 'static>>,
) {
    let mut frame_resampler = FrameResampler::new(
        in_sample_rate as usize,
        constants::WHISPER_SAMPLE_RATE as usize,
        Duration::from_millis(30),
    );

    let mut processed_samples = Vec::<f32>::new();
    let mut recording = false;

    // ---------- spectrum visualisation setup ---------------------------- //
    const BUCKETS: usize = 16;
    const WINDOW_SIZE: usize = 512;
    let mut visualizer = AudioVisualiser::new(
        in_sample_rate,
        WINDOW_SIZE,
        BUCKETS,
        400.0,  // vocal_min_hz
        4000.0, // vocal_max_hz
    );

    fn handle_frame(
        samples: &[f32],
        recording: bool,
        vad: &Option<Arc<Mutex<Box<dyn vad::VoiceActivityDetector>>>>,
        out_buf: &mut Vec<f32>,
    ) {
        if !recording {
            return;
        }

        if let Some(vad_arc) = vad {
            // A poisoned VAD mutex must not abort the process; fall back to
            // treating the frame as speech.
            let mut det = match vad_arc.lock() {
                Ok(guard) => guard,
                Err(poisoned) => {
                    log::error!("VAD mutex poisoned; recovering");
                    poisoned.into_inner()
                }
            };
            match det.push_frame(samples).unwrap_or(VadFrame::Speech(samples)) {
                VadFrame::Speech(buf) => out_buf.extend_from_slice(buf),
                VadFrame::Noise => {}
            }
        } else {
            out_buf.extend_from_slice(samples);
        }
    }

    loop {
        // Bounded wait so commands are serviced even when the device has
        // stopped delivering callbacks. Previously this was a blocking
        // `recv()`, which meant a stalled or unplugged device left the worker
        // parked forever — `close()` then blocked in `join()` while holding
        // the manager's locks, wedging the whole audio subsystem.
        let mut disconnected = false;
        match sample_rx.recv_timeout(CMD_POLL_INTERVAL) {
            Ok(raw) => {
                // ---------- spectrum processing ------------------------------ //
                if let Some(buckets) = visualizer.feed(&raw) {
                    if let Some(cb) = &level_cb {
                        cb(buckets);
                    }
                }

                // ---------- existing pipeline -------------------------------- //
                frame_resampler.push(&raw, &mut |frame: &[f32]| {
                    handle_frame(frame, recording, &vad, &mut processed_samples)
                });
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {}
            Err(mpsc::RecvTimeoutError::Disconnected) => disconnected = true,
        }

        // Always drain pending commands — including on the disconnect path, so
        // a caller blocked in `stop()`/`peek()` still gets a reply instead of
        // hanging on a dropped response channel.
        while let Ok(cmd) = cmd_rx.try_recv() {
            match cmd {
                Cmd::Start => {
                    processed_samples.clear();
                    recording = true;
                    visualizer.reset(); // Reset visualization buffer
                    if let Some(v) = &vad {
                        match v.lock() {
                            Ok(mut guard) => guard.reset(),
                            Err(poisoned) => {
                                log::error!("VAD mutex poisoned; recovering");
                                poisoned.into_inner().reset();
                            }
                        }
                    }
                }
                Cmd::Stop(reply_tx) => {
                    recording = false;

                    frame_resampler.finish(&mut |frame: &[f32]| {
                        // we still want to process the last few frames
                        handle_frame(frame, true, &vad, &mut processed_samples)
                    });

                    let _ = reply_tx.send(std::mem::take(&mut processed_samples));
                }
                Cmd::Peek(max_samples, reply_tx) => {
                    let start = processed_samples.len().saturating_sub(max_samples);
                    let _ = reply_tx.send(processed_samples[start..].to_vec());
                }
                Cmd::Shutdown => return,
            }
        }

        if disconnected {
            return; // stream closed and all pending commands serviced
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Regression for the audio-manager hang.
    ///
    /// `run_consumer` used to block in `sample_rx.recv()` indefinitely, so a
    /// device that stopped delivering callbacks (unplugged, muted at the OS
    /// level, stalled driver) left the worker parked forever. `close()` then
    /// blocked in `join()` while holding the manager's locks and the whole
    /// audio subsystem wedged.
    ///
    /// Here the sample channel stays *open but silent* — exactly the stalled
    /// device case — and the worker must still service `Shutdown`.
    #[test]
    fn run_consumer_services_shutdown_while_no_audio_arrives() {
        let (_sample_tx, sample_rx) = mpsc::channel::<Vec<f32>>();
        let (cmd_tx, cmd_rx) = mpsc::channel::<Cmd>();

        let worker = std::thread::spawn(move || {
            run_consumer(48_000, None, sample_rx, cmd_rx, None);
        });

        // Let the worker reach its loop before asking it to stop.
        std::thread::sleep(Duration::from_millis(20));
        cmd_tx.send(Cmd::Shutdown).expect("worker should be alive");

        let (done_tx, done_rx) = mpsc::channel();
        std::thread::spawn(move || {
            let _ = worker.join();
            let _ = done_tx.send(());
        });

        assert!(
            done_rx.recv_timeout(Duration::from_secs(2)).is_ok(),
            "run_consumer did not exit after Shutdown while no audio was arriving"
        );
    }

    /// A caller blocked in `stop()` must still receive a reply when the device
    /// has gone silent, rather than hanging on a dropped response channel.
    #[test]
    fn run_consumer_replies_to_stop_while_no_audio_arrives() {
        let (_sample_tx, sample_rx) = mpsc::channel::<Vec<f32>>();
        let (cmd_tx, cmd_rx) = mpsc::channel::<Cmd>();

        let worker = std::thread::spawn(move || {
            run_consumer(48_000, None, sample_rx, cmd_rx, None);
        });

        std::thread::sleep(Duration::from_millis(20));
        let (reply_tx, reply_rx) = mpsc::channel::<Vec<f32>>();
        cmd_tx
            .send(Cmd::Stop(reply_tx))
            .expect("worker should be alive");

        assert!(
            reply_rx.recv_timeout(Duration::from_secs(2)).is_ok(),
            "stop() reply never arrived for a silent device"
        );

        let _ = cmd_tx.send(Cmd::Shutdown);
        let _ = worker.join();
    }
}
