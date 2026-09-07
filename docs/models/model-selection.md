# Model Selection Guide

SONU supports the full transcription model catalog — Whisper, Parakeet, and
Moonshine — all running locally on your device. This guide helps you choose the
right model for your needs.

> **Note on sizes:** Sizes below are the actual download sizes served by SONU's
> model catalog (see `apps/tauri-v2/src-tauri/resources/models.json`). Most
> Whisper models are quantized ggml builds, so they are smaller than the
> upstream fp16 releases.

## Quick Comparison

| Model              | Download Size | Languages          | Recommended For                     |
| ------------------ | ------------- | ------------------ | ----------------------------------- |
| **Moonshine Base** | 58 MB         | English            | Ultra-light, low-resource machines  |
| **Whisper Tiny**   | 75 MB         | 99 languages       | Quick tests, very old hardware      |
| **Whisper Base**   | 142 MB        | 99 languages       | Lightweight multilingual dictation  |
| **Whisper Small**  | 487 MB        | 99 languages       | Balanced multilingual dictation     |
| **Whisper Medium** | 492 MB        | 99 languages       | High-accuracy work (quantized)      |
| **Whisper Large**  | 1.1 GB        | 99 languages       | Maximum accuracy (quantized)        |
| **Whisper Turbo**  | 1.6 GB        | 99 languages       | Large-v3 speed/accuracy balance     |
| **Parakeet V2** ⭐ | 473 MB        | English            | **Best speed/accuracy for English** |
| **Parakeet V3** ⭐ | 478 MB        | Multilingual (auto)| **Default recommendation**          |

⭐ = marked **Recommended** in the app. Parakeet V3 is the default pick for new
installations (multilingual with automatic language detection); Parakeet V2 is
the top choice for English-only dictation.

## Whisper Models

All Whisper models are multilingual (99 languages) and run on CPU, with GPU
acceleration when available.

### Tiny
- **Download Size**: 75 MB
- **Use Cases**: Testing, very old hardware
- **Performance**: Fastest, lowest accuracy

### Base
- **Download Size**: 142 MB
- **Use Cases**: Lightweight multilingual dictation
- **Performance**: Fast, decent accuracy

### Small
- **Download Size**: 487 MB
- **Use Cases**: Everyday multilingual dictation
- **Performance**: Good balance of speed and accuracy

### Medium
- **Download Size**: 492 MB (Q4 quantized)
- **Use Cases**: Legal/medical transcription, accessibility
- **Performance**: Slower but more accurate

### Large
- **Download Size**: 1.1 GB (Q5 quantized)
- **Use Cases**: Critical transcription, multiple speakers
- **Performance**: Slowest but most accurate

### Turbo
- **Download Size**: 1.6 GB (large-v3-turbo)
- **Use Cases**: Professional transcription where accuracy matters most
- **Performance**: Large-model accuracy at a more usable speed

## Parakeet Models

NVIDIA Parakeet TDT models are CPU-optimized (int8) and extremely fast —
several times faster than real time on mid-range hardware. No GPU required.

### Parakeet V2 ⭐ (Recommended for English speakers)
- **Download Size**: 473 MB (int8)
- **Features**: English only, extremely fast inference
- **Use Cases**: Real-time English dictation, long-form transcription

### Parakeet V3 ⭐ (Default recommendation)
- **Download Size**: 478 MB (int8)
- **Features**: Multilingual with automatic language detection — no manual
  language selection needed
- **Use Cases**: Non-English or mixed-language dictation at near real-time speed

## Moonshine Models

### Moonshine Base
- **Download Size**: 58 MB
- **Engine**: Moonshine
- **Features**: English only, very fast, handles accents well
- **Use Cases**: Low-resource machines, quick dictation

## Model Selection by Use Case

### 🎯 Quick Notes & Low-Resource Machines
**Recommended**: Moonshine Base
- Tiny download (58 MB)
- Runs on almost any hardware
- English only

### 🇺🇸 English Dictation
**Recommended**: Parakeet V2
- Best speed/accuracy ratio
- Extremely fast on CPU

### 🌍 Multilingual Dictation
**Recommended**: Parakeet V3
- Multilingual with automatic language detection
- Near real-time performance

### 📄 Professional Transcription
**Recommended**: Whisper Medium or Turbo
- High accuracy across 99 languages
- Handles technical terms well

### 🔬 Legal/Medical/Technical
**Recommended**: Whisper Large or Turbo
- Maximum accuracy
- Critical for professional use

## System Requirements

### Minimum Requirements
- **CPU**: Dual-core processor
- **RAM**: 4 GB
- **Storage**: 500 MB free
- **Recommended Model**: Moonshine Base

### Recommended Requirements
- **CPU**: Quad-core processor
- **RAM**: 8 GB
- **Storage**: 2 GB free
- **Recommended Model**: Parakeet V2 / V3

### Optimal Requirements
- **CPU**: 6+ cores or GPU
- **RAM**: 16 GB
- **Storage**: 5 GB free
- **Recommended Model**: Whisper Turbo + cloud LLM post-processing

## Performance Tuning

### CPU-Only Mode
All models run on CPU. Performance scales with:
- CPU core count
- CPU clock speed
- Memory bandwidth

### GPU Acceleration
- **Whisper**: GPU acceleration when available
- **Parakeet**: CPU-optimized (int8); no GPU required
- **LLM**: Can use GPU if available

### Memory Management
- Close other applications
- Use smaller models on limited RAM
- Enable model caching
- Consider model unloading timeout

## Language Support

### Whisper Models
Supports 99 languages including:
- English, Spanish, French, German, Italian
- Portuguese, Russian, Japanese, Korean, Chinese
- Arabic, Hindi, Polish, Dutch, Turkish
- And many more...

### Parakeet Models
- **Parakeet V2**: English only
- **Parakeet V3**: Multilingual with automatic language detection

### Moonshine Models
- **English only**

### LLM Post-Processing
- Works with cloud providers (OpenAI, Groq, custom endpoints)
- Multilingual support varies by provider model

## Download Management

### Automatic Downloads
- Models download on first use
- Resume support for interrupted downloads
- Progress tracking in UI
- Background downloading

### Manual Downloads
- Pre-download models for offline use
- Select specific models
- Delete unused models to save space

### Storage Locations
- **Windows**: `%APPDATA%\com.sonu.desktop\models\`
- **macOS**: `~/Library/Application Support/com.sonu.desktop/models/`
- **Linux**: `~/.config/com.sonu.desktop/models/`

## Troubleshooting

### Model Download Fails
1. Check internet connection
2. Verify storage space
3. Try smaller model first
4. Check firewall/antivirus

### Slow Performance
1. Try a Parakeet model (CPU-optimized)
2. Close other applications
3. Check system resources

### Low Accuracy
1. Use a larger model
2. Check microphone quality
3. Speak clearly
4. Adjust audio settings

## Future Models

### Planned Support
- **Custom fine-tuned models**: Domain-specific models
- **GPU acceleration improvements**: Faster inference on CUDA hardware

---

For help selecting the right model, visit our
[Discussions](https://github.com/muhib-karim/sonu/discussions).
