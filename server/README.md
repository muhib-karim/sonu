# SONU Cloud Transcription Server

A self-hosted, OpenAI Whisper-compatible transcription server powered by `faster-whisper`. 
This server provides free, private cloud transcription for the SONU voice typing app.

## Features

- 🎤 OpenAI Whisper-compatible API (`/v1/audio/transcriptions`)
- 🚀 Powered by `faster-whisper` for fast inference with CTranslate2
- 🔒 Self-hosted for complete privacy
- 🐳 Docker support for easy deployment
- 🌍 Multi-language support with automatic detection
- 📊 Health check endpoint

## Quick Start

### Docker (Recommended)

```bash
# CPU only
docker compose up -d

# With GPU (NVIDIA)
docker compose -f docker-compose.gpu.yml up -d
```

### Manual Setup

```bash
cd server
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

### POST `/v1/audio/transcriptions`

OpenAI Whisper-compatible transcription endpoint.

**Request:**
- `file`: Audio file (WAV, MP3, FLAC, etc.)
- `model`: Model name (default: `whisper-large-v3`)
- `language`: Optional language code (e.g., `en`, `fr`, `de`)
- `response_format`: `json` (default) or `text`
- `task`: `transcribe` (default) or `translate`

**Response:**
```json
{
  "text": "Hello, world!"
}
```

### GET `/health`

Health check endpoint.

```json
{
  "status": "ok",
  "model": "large-v3",
  "device": "cpu"
}
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `WHISPER_MODEL` | `large-v3` | Whisper model size (`tiny`, `base`, `small`, `medium`, `large-v3`, `turbo`) |
| `DEVICE` | `auto` | Device to use (`cpu`, `cuda`, `auto`) |
| `COMPUTE_TYPE` | `auto` | Compute type (`int8`, `float16`, `float32`, `auto`) |
| `HOST` | `0.0.0.0` | Server host |
| `PORT` | `8000` | Server port |
| `API_KEY` | `` | Optional API key for authentication |

## Connecting SONU to Your Server

1. Open SONU → Settings → Cloud
2. Enable Cloud Transcription
3. Select "Custom / Self-Hosted" provider
4. Set the endpoint to `http://your-server:8000/v1/audio/transcriptions`
5. Click "Test Connection" to verify

## License

Same as the main SONU project.
