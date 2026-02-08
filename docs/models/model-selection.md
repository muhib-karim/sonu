# Model Selection Guide

SONU supports multiple AI models for speech recognition and text processing. This guide helps you choose the right model for your needs.

## Quick Comparison

| Model | Size | Speed | Accuracy | VRAM | Best For |
|-------|------|-------|----------|------|----------|
| Whisper Tiny | 39 MB | ⚡⚡⚡⚡⚡ | ⭐⭐⭐ | 1 GB | Quick notes, testing |
| Whisper Base | 74 MB | ⚡⚡⚡⚡ | ⭐⭐⭐⭐ | 1 GB | General use |
| Whisper Small | 244 MB | ⚡⚡⚡ | ⭐⭐⭐⭐⭐ | 2 GB | Balanced performance |
| Whisper Medium | 769 MB | ⚡⚡ | ⭐⭐⭐⭐⭐⭐ | 5 GB | High accuracy |
| Whisper Large | 1.5 GB | ⚡ | ⭐⭐⭐⭐⭐⭐⭐ | 10 GB | Maximum accuracy |
| Parakeet | 600 MB | ⚡⚡⚡⚡⚡ | ⭐⭐⭐⭐⭐ | 2 GB | GPU acceleration |

## Whisper Models

### Tiny (Recommended for Beginners)
- **Size**: 39 MB
- **Download**: ~10 seconds on fast connection
- **Features**: Multilingual, fastest
- **Use Cases**: Testing, quick notes, low-resource devices
- **Performance**: Real-time on most systems

### Base (Recommended for Most Users)
- **Size**: 74 MB
- **Download**: ~20 seconds
- **Features**: Multilingual, good accuracy
- **Use Cases**: General voice typing, dictation
- **Performance**: Near real-time

### Small (Recommended for Professionals)
- **Size**: 244 MB
- **Download**: ~1 minute
- **Features**: Multilingual, high accuracy
- **Use Cases**: Professional transcription, long documents
- **Performance**: Good balance of speed and accuracy

### Medium (Recommended for High-Accuracy Needs)
- **Size**: 769 MB
- **Download**: ~3 minutes
- **Features**: Multilingual, very high accuracy
- **Use Cases**: Legal/medical transcription, accessibility
- **Performance**: Slower but more accurate

### Large (Recommended for Maximum Accuracy)
- **Size**: 1.5 GB
- **Download**: ~6 minutes
- **Features**: Multilingual, maximum accuracy
- **Use Cases**: Critical transcription, multiple speakers
- **Performance**: Slowest but most accurate

## Parakeet Models

### Parakeet 0.6B (Recommended for GPU Users)
- **Size**: 600 MB
- **Engine**: NVIDIA Parakeet
- **Features**: English only, GPU acceleration
- **Use Cases**: Real-time dictation, gaming, streaming
- **Requirements**: NVIDIA GPU with CUDA support

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

### 🎯 Quick Notes & Testing
**Recommended**: Whisper Tiny
- Fastest download
- Runs on any hardware
- Good enough for testing

### 💼 Office Work & General Dictation
**Recommended**: Whisper Base or Small
- Good balance
- Fast enough for real-time
- High accuracy for common vocabulary

### 📄 Professional Transcription
**Recommended**: Whisper Small or Medium
- High accuracy
- Handles technical terms better
- Worth the extra download time

### 🔬 Legal/Medical/Technical
**Recommended**: Whisper Medium or Large
- Maximum accuracy
- Handles jargon well
- Critical for professional use

### 🎮 Gaming & Streaming
**Recommended**: Parakeet (if GPU available)
- Real-time performance
- Low latency
- GPU acceleration

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
- **Recommended Model**: Whisper Tiny

### Recommended Requirements
- **CPU**: Quad-core processor
- **RAM**: 8 GB
- **Storage**: 2 GB free
- **Recommended Model**: Whisper Small

### Optimal Requirements
- **CPU**: 6+ cores or GPU
- **RAM**: 16 GB
- **Storage**: 5 GB free
- **Recommended Model**: Whisper Medium + Qwen2.5 3B

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
- **English only** (currently)
- Optimized for English transcription

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
- **Whisper v3 Turbo**: Faster inference
- **Custom Fine-tuned**: Domain-specific models
- **Multilingual LLMs**: Better for non-English
- **Tiny English**: Ultra-small English-only

---

For help selecting the right model, visit our [Discussions](https://github.com/muhib-karim/sonu/discussions).
