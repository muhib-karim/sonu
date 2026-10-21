pub mod audio;
#[cfg(all(test, feature = "whisper", feature = "parakeet", feature = "moonshine"))]
mod benchmark;
pub mod cloud_transcription;
pub mod history;
pub mod model;
pub mod offline_llm;
pub mod transcription;
