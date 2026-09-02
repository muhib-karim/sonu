# Model Selection Guide

SONU supports multiple AI models for speech recognition and text processing. This guide helps you choose the right model for your needs.

> **Note on sizes:** Sizes below are the actual download sizes served by SONU's model
> catalog (see `apps/tauri-v2/src-tauri/src/managers/model.rs`). Most Whisper models are
> quantized ggml builds, so they are smaller than the upstream fp16 releases.

## Quick Comparison

| Model              | Download Size | Speed      | Accuracy | Best For                            |
| ------------------ | ------------- | ---------- | -------- | ----------------------------------- |
| **Moonshine Base** | 58 MB         | ⚡⚡⚡⚡⚡ | ★★★☆☆    | Ultra-light English dictation       |
| **Whisper Small**  | 487 MB        | ⚡⚡⚡⚡   | ★★★☆☆    | Everyday multilingual dictation     |
| **Whisper Medium** | 492 MB        | ⚡⚡⚡     | ★★★★☆    | High-accuracy work (quantized)      |
| **Whisper Large**  | 1.1 GB        | ⚡         | ★★★★★    | Maximum accuracy (quantized)        |
| **Whisper Turbo**  | 1.6 GB        | ⚡⚡       | ★★★★☆    | Large-v3 speed/accuracy balance     |
| **Parakeet V2**    | 473 MB        | ⚡⚡⚡⚡   | ★★★★★    | English — best speed/accuracy ratio |
| **Parakeet V3**    | 478 MB        | ⚡⚡⚡⚡   | ★★★★☆    | Multilingual, fast and accurate     |

## Whisper Models

### Small (Recommended for Most Users)
- **Download Size**: 487 MB
- **Features**: Multilingual, fast
- **Use Cases**: General voice typing, dictation
- **Performance**: Good balance of speed and accuracy

### Medium (Recommended for High-Accuracy Needs)
- **Download Size**: 492 MB (Q4 quantized)
- **Features**: Multilingual, very high accuracy
- **Use Cases**: Legal/medical transcription, accessibility
- **Performance**: Slower but more accurate

### Large (Recommended for Maximum Accuracy)
- **Download Size**: 1.1 GB (Q5 quantized)
- **Features**: Multilingual, maximum accuracy
- **Use Cases**: Critical transcription, multiple speakers
- **Performance**: Slowest but most accurate

### Turbo
- **Download Size**: 1.6 GB (large-v3-turbo)
- **Features**: Multilingual, strong accuracy with better speed than Large
- **Use Cases**: Professional transcription where accuracy matters most
- **Performance**: Large-model accuracy at a more usable speed

## Parakeet Models

### Parakeet V2 (Recommended for English Speakers)
- **Download Size**: 473 MB (int8)
- **Engine**: NVIDIA Parakeet TDT
- **Features**: English only, extremely fast inference
- **Use Cases**: Real-time dictation, long-form transcription

### Parakeet V3
- **Download Size**: 478 MB (int8)
- **Engine**: NVIDIA Parakeet TDT
- **Features**: Multilingual (European languages), fast and accurate
- **Use Cases**: Non-English dictation with near real-time performance

### Moonshine Base
- **Download Size**: 58 MB
- **Engine**: Moonshine
- **Features**: English only, very fast, handles accents well
- **Use Cases**: Low-resource machines, quick dictation

## Offline LLM Models

### SmolLM2 360M (Recommended for Text Cleanup)
- **Size**: 720 MB
- **Tasks**: Grammar correction, basic formatting
- **Speed**: Very fast
- **Best For**: Quick text improvements

### SmolLM2 1.7B (Recommended for Advanced Processing)
- **Size**: 1.1 GB
- **Tasks**: Advanced formatting, summarization
- **Speed**: Fast
- **Best For**: Professional document processing

### Qwen2.5 1.5B (Recommended for Versatility)
- **Size**: 1.0 GB
- **Context**: 32K tokens
- **Tasks**: Text expansion, creative writing, translation
- **Best For**: Versatile text processing

### Qwen2.5 3B (Recommended for Complex Tasks)
- **Size**: 1.9 GB
- **Context**: 32K tokens
- **Tasks**: Complex analysis, detailed editing
- **Best For**: Power users with high-end hardware

## Model Selection by Use Case

### 🎯 Quick Notes & Low-Resource Machines
**Recommended**: Moonshine Base
- Tiny download (58 MB)
- Runs on almost any hardware
- English only

### 💼 Office Work & General Dictation
**Recommended**: Whisper Small or Parakeet (V2 for English, V3 for other languages)
- Good balance
- Fast enough for real-time
- High accuracy for common vocabulary

### 📄 Professional Transcription
**Recommended**: Whisper Medium or Turbo
- High accuracy
- Handles technical terms better
- Worth the extra download time

### 🔬 Legal/Medical/Technical
**Recommended**: Whisper Large or Turbo
- Maximum accuracy
- Handles jargon well
- Critical for professional use

### ✍️ Writing & Content Creation
**Recommended**: Whisper Small + Qwen2.5 1.5B
- Good transcription accuracy
- Powerful text enhancement
- Context-aware processing

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
- **Recommended Model**: Whisper Small

### Optimal Requirements
- **CPU**: 6+ cores or GPU
- **RAM**: 16 GB
- **Storage**: 5 GB free
- **Recommended Model**: Whisper Turbo + Qwen2.5 3B

## Performance Tuning

### CPU-Only Mode
All models run on CPU. Performance scales with:
- CPU core count
- CPU clock speed
- Memory bandwidth

### GPU Acceleration
- **Parakeet**: Requires NVIDIA GPU
- **Whisper**: CPU-only (future GPU support planned)
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
- **Parakeet V3**: Multilingual (European languages)

### Moonshine Models
- **English only**

### LLM Models
- Multilingual support varies by model
- Qwen2.5 models support multiple languages
- SmolLM2 primarily English-focused

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
- **Windows**: `%APPDATA%\sonu\models\`
- **macOS**: `~/Library/Application Support/sonu/models/`
- **Linux**: `~/.config/sonu/models/`

## Troubleshooting

### Model Download Fails
1. Check internet connection
2. Verify storage space
3. Try smaller model first
4. Check firewall/antivirus

### Slow Performance
1. Try smaller model
2. Close other applications
3. Enable CPU optimization
4. Check system resources

### Low Accuracy
1. Use larger model
2. Check microphone quality
3. Speak clearly
4. Adjust audio settings

## Future Models

### Planned Support
- **Custom Fine-tuned**: Domain-specific models
- **Multilingual LLMs**: Better for non-English
- **GPU acceleration for Whisper**: Faster inference on CUDA hardware

---

For help selecting the right model, visit our [Discussions](https://github.com/muhib-karim/sonu/discussions).
