use crate::settings::{
    get_settings, CloudTranscriptionProvider, CLOUD_PROVIDER_CUSTOM_CLOUD, CLOUD_PROVIDER_DEEPGRAM,
    CLOUD_PROVIDER_GROQ,
};
use anyhow::Result;
use log::{debug, error, info};
use reqwest::multipart;
use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::{AppHandle, Emitter};

/// Errors that can occur in cloud transcription operations
#[derive(Debug, thiserror::Error)]
pub enum CloudTranscriptionError {
    #[error("Cloud transcription not enabled")]
    NotEnabled,
    #[error("No API key configured for provider: {0}")]
    NoApiKey(String),
    #[error("Provider not found: {0}")]
    ProviderNotFound(String),
    #[error("Network request failed: {0}")]
    NetworkError(String),
    #[error("API error: {status} - {message}")]
    ApiError { status: u16, message: String },
    #[error("Failed to parse response: {0}")]
    ParseError(String),
    #[error("Audio encoding failed: {0}")]
    AudioEncodingError(String),
}

/// Result type for cloud transcription operations
pub type CloudTranscriptionResult<T> = Result<T, CloudTranscriptionError>;

/// Response from Groq / OpenAI-compatible Whisper API
#[derive(Deserialize, Debug)]
struct WhisperApiResponse {
    text: String,
}

/// Response from Deepgram API
#[derive(Deserialize, Debug)]
struct DeepgramResponse {
    results: Option<DeepgramResults>,
}

#[derive(Deserialize, Debug)]
struct DeepgramResults {
    channels: Vec<DeepgramChannel>,
}

#[derive(Deserialize, Debug)]
struct DeepgramChannel {
    alternatives: Vec<DeepgramAlternative>,
}

#[derive(Deserialize, Debug)]
struct DeepgramAlternative {
    transcript: String,
}

/// Event emitted during cloud transcription
#[derive(Clone, Debug, Serialize, Type)]
pub struct CloudTranscriptionEvent {
    pub event_type: String,
    pub message: Option<String>,
    pub error: Option<String>,
}

/// The cloud transcription manager handles sending audio to cloud APIs
#[derive(Clone)]
pub struct CloudTranscriptionManager {
    app_handle: AppHandle,
    client: reqwest::Client,
}

impl CloudTranscriptionManager {
    pub fn new(app_handle: &AppHandle) -> Result<Self> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .build()
            .map_err(|e| anyhow::anyhow!("Failed to build HTTP client: {}", e))?;

        Ok(Self {
            app_handle: app_handle.clone(),
            client,
        })
    }

    /// Transcribe audio samples using the configured cloud provider.
    /// Samples are f32 PCM at 16kHz mono.
    pub async fn transcribe(&self, samples: Vec<f32>) -> CloudTranscriptionResult<String> {
        let settings = get_settings(&self.app_handle);

        if !settings.cloud_transcription.enabled {
            return Err(CloudTranscriptionError::NotEnabled);
        }

        let provider_id = &settings.cloud_transcription.provider_id;
        let provider = settings
            .cloud_transcription
            .providers
            .iter()
            .find(|p| &p.id == provider_id)
            .cloned()
            .ok_or_else(|| CloudTranscriptionError::ProviderNotFound(provider_id.clone()))?;

        let api_key = settings
            .cloud_transcription
            .api_keys
            .get(provider_id)
            .cloned()
            .unwrap_or_default();

        // Custom/self-hosted provider may not need an API key
        if api_key.is_empty() && provider_id != CLOUD_PROVIDER_CUSTOM_CLOUD {
            return Err(CloudTranscriptionError::NoApiKey(provider.label.clone()));
        }

        // Emit event: cloud transcription started
        let _ = self.app_handle.emit(
            "cloud-transcription-event",
            CloudTranscriptionEvent {
                event_type: "started".to_string(),
                message: Some(format!("Transcribing via {}", provider.label)),
                error: None,
            },
        );

        let language = &settings.cloud_transcription.selected_language;
        let translate = settings.cloud_transcription.translate_to_english;

        // Encode samples to WAV
        let wav_bytes = encode_wav(&samples).map_err(|e| {
            CloudTranscriptionError::AudioEncodingError(format!("WAV encoding failed: {}", e))
        })?;

        debug!(
            "Cloud transcription: encoded {} samples to {} bytes WAV, provider={}",
            samples.len(),
            wav_bytes.len(),
            provider.label
        );

        let result = match provider_id.as_str() {
            CLOUD_PROVIDER_GROQ => {
                self.transcribe_groq(&provider, &api_key, wav_bytes, language, translate)
                    .await
            }
            CLOUD_PROVIDER_DEEPGRAM => {
                self.transcribe_deepgram(&provider, &api_key, wav_bytes, language, translate)
                    .await
            }
            CLOUD_PROVIDER_CUSTOM_CLOUD => {
                // Custom / self-hosted uses OpenAI-compatible API format
                self.transcribe_openai_compatible(
                    &provider, &api_key, wav_bytes, language, translate,
                )
                .await
            }
            _ => Err(CloudTranscriptionError::ProviderNotFound(
                provider_id.clone(),
            )),
        };

        match &result {
            Ok(text) => {
                info!(
                    "Cloud transcription successful via {}: {} chars",
                    provider.label,
                    text.len()
                );
                let _ = self.app_handle.emit(
                    "cloud-transcription-event",
                    CloudTranscriptionEvent {
                        event_type: "completed".to_string(),
                        message: Some(format!("Transcribed {} characters", text.len())),
                        error: None,
                    },
                );
            }
            Err(e) => {
                error!("Cloud transcription failed via {}: {}", provider.label, e);
                let _ = self.app_handle.emit(
                    "cloud-transcription-event",
                    CloudTranscriptionEvent {
                        event_type: "error".to_string(),
                        message: None,
                        error: Some(e.to_string()),
                    },
                );
            }
        }

        result
    }

    /// Transcribe using Groq's Whisper API (OpenAI-compatible format)
    async fn transcribe_groq(
        &self,
        provider: &CloudTranscriptionProvider,
        api_key: &str,
        wav_bytes: Vec<u8>,
        language: &str,
        translate: bool,
    ) -> CloudTranscriptionResult<String> {
        let endpoint = &provider.api_endpoint;

        let file_part = multipart::Part::bytes(wav_bytes)
            .file_name("audio.wav")
            .mime_str("audio/wav")
            .map_err(|e| CloudTranscriptionError::NetworkError(e.to_string()))?;

        let mut form = multipart::Form::new()
            .part("file", file_part)
            .text("model", "whisper-large-v3-turbo")
            .text("response_format", "json");

        if language != "auto" && !language.is_empty() {
            form = form.text("language", language.to_string());
        }

        if translate {
            // Groq uses the same "task" parameter as OpenAI Whisper
            form = form.text("task", "translate");
        }

        let response = self
            .client
            .post(endpoint)
            .header("Authorization", format!("Bearer {}", api_key))
            .multipart(form)
            .send()
            .await
            .map_err(|e| CloudTranscriptionError::NetworkError(e.to_string()))?;

        let status = response.status().as_u16();
        if status != 200 {
            let body = response.text().await.unwrap_or_default();
            return Err(CloudTranscriptionError::ApiError {
                status,
                message: body,
            });
        }

        let api_response: WhisperApiResponse = response
            .json()
            .await
            .map_err(|e| CloudTranscriptionError::ParseError(e.to_string()))?;

        Ok(api_response.text.trim().to_string())
    }

    /// Transcribe using Deepgram's API
    async fn transcribe_deepgram(
        &self,
        provider: &CloudTranscriptionProvider,
        api_key: &str,
        wav_bytes: Vec<u8>,
        language: &str,
        translate: bool,
    ) -> CloudTranscriptionResult<String> {
        let mut endpoint = provider.api_endpoint.clone();

        // Build query parameters
        let mut params = vec![
            ("model".to_string(), "nova-2".to_string()),
            ("smart_format".to_string(), "true".to_string()),
            ("punctuate".to_string(), "true".to_string()),
        ];

        if language != "auto" && !language.is_empty() {
            params.push(("language".to_string(), language.to_string()));
        } else {
            params.push(("detect_language".to_string(), "true".to_string()));
        }

        if translate {
            // Deepgram supports translation as a separate feature
            params.push(("translate".to_string(), "en".to_string()));
        }

        // Append query params to URL with proper encoding
        use reqwest::Url;
        let url = Url::parse(&endpoint).map_err(|e| {
            CloudTranscriptionError::NetworkError(format!("Invalid endpoint URL: {}", e))
        })?;

        let mut url_with_params = url.clone();
        for (k, v) in &params {
            url_with_params.query_pairs_mut().append_pair(k, v);
        }
        endpoint = url_with_params.to_string();

        let response = self
            .client
            .post(&endpoint)
            .header("Authorization", format!("Token {}", api_key))
            .header("Content-Type", "audio/wav")
            .body(wav_bytes)
            .send()
            .await
            .map_err(|e| CloudTranscriptionError::NetworkError(e.to_string()))?;

        let status = response.status().as_u16();
        if status != 200 {
            let body = response.text().await.unwrap_or_default();
            return Err(CloudTranscriptionError::ApiError {
                status,
                message: body,
            });
        }

        let api_response: DeepgramResponse = response
            .json()
            .await
            .map_err(|e| CloudTranscriptionError::ParseError(e.to_string()))?;

        let transcript = api_response
            .results
            .and_then(|r| r.channels.into_iter().next())
            .and_then(|c| c.alternatives.into_iter().next())
            .map(|a| a.transcript)
            .unwrap_or_default();

        Ok(transcript.trim().to_string())
    }

    /// Transcribe using an OpenAI-compatible API (for custom/self-hosted servers)
    async fn transcribe_openai_compatible(
        &self,
        provider: &CloudTranscriptionProvider,
        api_key: &str,
        wav_bytes: Vec<u8>,
        language: &str,
        translate: bool,
    ) -> CloudTranscriptionResult<String> {
        let endpoint = &provider.api_endpoint;

        let file_part = multipart::Part::bytes(wav_bytes)
            .file_name("audio.wav")
            .mime_str("audio/wav")
            .map_err(|e| CloudTranscriptionError::NetworkError(e.to_string()))?;

        let mut form = multipart::Form::new()
            .part("file", file_part)
            .text("model", "whisper-large-v3")
            .text("response_format", "json");

        if language != "auto" && !language.is_empty() {
            form = form.text("language", language.to_string());
        }

        if translate {
            form = form.text("task", "translate");
        }

        let mut request = self.client.post(endpoint).multipart(form);

        // Only add auth header if API key is provided
        if !api_key.is_empty() {
            request = request.header("Authorization", format!("Bearer {}", api_key));
        }

        let response = request
            .send()
            .await
            .map_err(|e| CloudTranscriptionError::NetworkError(e.to_string()))?;

        let status = response.status().as_u16();
        if status != 200 {
            let body = response.text().await.unwrap_or_default();
            return Err(CloudTranscriptionError::ApiError {
                status,
                message: body,
            });
        }

        let api_response: WhisperApiResponse = response
            .json()
            .await
            .map_err(|e| CloudTranscriptionError::ParseError(e.to_string()))?;

        Ok(api_response.text.trim().to_string())
    }

    /// Test the connection to the cloud provider by sending a tiny silent audio clip
    pub async fn test_connection(
        &self,
        provider_id: &str,
        api_key: &str,
        endpoint: Option<&str>,
    ) -> CloudTranscriptionResult<String> {
        let settings = get_settings(&self.app_handle);
        let provider = settings
            .cloud_transcription
            .providers
            .iter()
            .find(|p| p.id == provider_id)
            .cloned()
            .ok_or_else(|| CloudTranscriptionError::ProviderNotFound(provider_id.to_string()))?;

        let actual_endpoint = endpoint.unwrap_or(&provider.api_endpoint);

        // Create a short silent WAV (0.5 seconds of silence at 16kHz)
        let silent_samples = vec![0.0f32; 8000];
        let wav_bytes = encode_wav(&silent_samples).map_err(|e| {
            CloudTranscriptionError::AudioEncodingError(format!("WAV encoding failed: {}", e))
        })?;

        debug!(
            "Testing cloud connection to {} at {}",
            provider.label, actual_endpoint
        );

        // Use OpenAI-compatible format for Groq and custom, different for Deepgram
        match provider_id {
            CLOUD_PROVIDER_DEEPGRAM => {
                let url = format!("{}?model=nova-2", actual_endpoint);
                let response = self
                    .client
                    .post(&url)
                    .header("Authorization", format!("Token {}", api_key))
                    .header("Content-Type", "audio/wav")
                    .body(wav_bytes)
                    .send()
                    .await
                    .map_err(|e| CloudTranscriptionError::NetworkError(e.to_string()))?;

                let status = response.status().as_u16();
                if status == 200 {
                    Ok("Connection successful! Deepgram API is working.".to_string())
                } else {
                    let body = response.text().await.unwrap_or_default();
                    Err(CloudTranscriptionError::ApiError {
                        status,
                        message: body,
                    })
                }
            }
            _ => {
                // Groq / Custom / Self-hosted - OpenAI-compatible format
                let file_part = multipart::Part::bytes(wav_bytes)
                    .file_name("audio.wav")
                    .mime_str("audio/wav")
                    .map_err(|e| CloudTranscriptionError::NetworkError(e.to_string()))?;

                let model = if provider_id == CLOUD_PROVIDER_GROQ {
                    "whisper-large-v3-turbo"
                } else {
                    "whisper-large-v3"
                };

                let form = multipart::Form::new()
                    .part("file", file_part)
                    .text("model", model.to_string())
                    .text("response_format", "json");

                let mut request = self.client.post(actual_endpoint).multipart(form);

                if !api_key.is_empty() {
                    request = request.header("Authorization", format!("Bearer {}", api_key));
                }

                let response = request
                    .send()
                    .await
                    .map_err(|e| CloudTranscriptionError::NetworkError(e.to_string()))?;

                let status = response.status().as_u16();
                if status == 200 {
                    Ok(format!(
                        "Connection successful! {} API is working.",
                        provider.label
                    ))
                } else {
                    let body = response.text().await.unwrap_or_default();
                    Err(CloudTranscriptionError::ApiError {
                        status,
                        message: body,
                    })
                }
            }
        }
    }
}

/// Encode f32 PCM samples (16kHz mono) to WAV format bytes
fn encode_wav(samples: &[f32]) -> Result<Vec<u8>> {
    let spec = hound::WavSpec {
        channels: 1,
        sample_rate: 16000,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };

    let mut cursor = std::io::Cursor::new(Vec::new());
    {
        let mut writer = hound::WavWriter::new(&mut cursor, spec)?;
        for &sample in samples {
            // Convert f32 [-1.0, 1.0] to i16
            let clamped = sample.clamp(-1.0, 1.0);
            let i16_sample = (clamped * 32767.0) as i16;
            writer.write_sample(i16_sample)?;
        }
        writer.finalize()?;
    }

    Ok(cursor.into_inner())
}
