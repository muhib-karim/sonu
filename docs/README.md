# SONU Documentation

Welcome to the SONU documentation! This comprehensive guide covers everything you need to understand, use, and extend the SONU voice typing application.

## Table of Contents

- [Getting Started](./getting-started.md)
- [User Guide](./user-guide.md)
- [API Reference](./API.md)
- [Plugin Development](./plugin-development.md)
- [Contributing](./contributing.md)
- [Troubleshooting](./troubleshooting.md)
- [Changelog](../CHANGELOG.md)

## Quick Start

SONU is an offline voice typing application powered by OpenAI's Whisper AI. It works completely offline and provides real-time speech-to-text transcription across all your applications.

### Installation

1. **Prerequisites**:
   - Node.js v16+
   - Python 3.8+
   - Windows 10/11

2. **Setup**:
   ```bash
   git clone https://github.com/muhib-karim/sonu.git
   cd sonu/apps/desktop
   npm install
   pip install -r requirements.txt
   ```

3. **Run**:
   ```bash
   npm start
   ```

### Basic Usage

1. Launch SONU - it starts minimized to system tray
2. Right-click tray icon to open main window
3. Configure hotkeys in Settings (default: Ctrl+Win for hold mode)
4. Hold hotkey, speak, release to type anywhere

## Architecture Overview

SONU uses a hybrid Electron + Python architecture:

- **Frontend**: Electron (Chromium + Node.js) for desktop UI
- **Backend**: Python service for audio processing and Whisper inference
- **Communication**: IPC between processes
- **Storage**: Local JSON files for settings and history

### Key Components

- `main.js`: Electron main process (window management, system integration)
- `renderer.js`: UI logic and user interactions
- `whisper_service.py`: Python audio capture and transcription
- `model_manager.py`: AI model download and management
- `system_utils.py`: System information and hardware detection

## Features

### Core Functionality

- ✅ **Offline Operation**: No internet required, complete privacy
- ✅ **Real-time Transcription**: Live partial results during dictation
- ✅ **System-wide Integration**: Types text anywhere in Windows
- ✅ **Dual Recording Modes**: Press-and-hold or toggle on/off
- ✅ **Professional UI**: Modern glassmorphic design with themes

### Advanced Features

- 🔧 **Customizable Hotkeys**: Configure shortcuts to preference
- 🎵 **Audio Feedback**: Sound cues for recording start/stop
- 📊 **Statistics Tracking**: Monitor usage and performance
- 🎨 **Theme System**: Multiple visual themes including dark mode
- 🔄 **Model Management**: Automatic model selection and downloads
- 📝 **History Management**: View, edit, and reuse transcriptions

## Configuration

### Settings Categories

- **General**: Hotkeys, microphone, language, launch options
- **System**: Hardware information and recommendations
- **Model**: Whisper model selection and download management
- **Themes**: Visual appearance customization
- **Experimental**: Advanced features and beta options

### Configuration Files

- `apps/desktop/data/settings.json`: Application preferences
- `apps/desktop/data/dictionary.json`: Custom words for transcription
- `apps/desktop/data/snippets.json`: User-defined text snippets
- `apps/desktop/data/notes.json`: Voice notes

## Development

### Project Structure

```
sonu/
├── apps/desktop/         # Desktop application (v3.x) - ACTIVE
│   ├── main.js           # Electron main process
│   ├── index.html        # Main UI
│   ├── renderer.js       # Renderer process
│   ├── package.json      # Desktop dependencies
│   └── data/             # User data (settings, dictionary, etc.)
├── apps/mobile/          # Mobile app (v4+) - Future development
├── versions/             # Archived versions and legacy files
├── assets/               # Application assets
├── docs/                 # Documentation
├── scripts/              # Utility scripts
└── [project files]       # README, configs, etc.
```

### Testing

SONU includes a comprehensive test suite:

```bash
# Run all tests
npm run test:all

# Unit tests
npm run test:unit

# Python backend tests
npm run test:python

# End-to-end tests
npm run test:e2e
```

### Building

```bash
# Navigate to desktop app
cd apps/desktop

# Development
npm start

# Production build
npm run build
```

## API & Extensions

SONU provides extensive APIs for customization and extension:

### IPC API

Communicate with the application programmatically:

```javascript
// Get settings
const settings = await ipcRenderer.invoke('settings:get');

// Listen for transcriptions
ipcRenderer.on('transcription', (event, text) => {
  console.log('Transcribed:', text);
});
```

### Plugin System

Extend functionality with plugins:

```javascript
module.exports = {
  name: 'My Plugin',
  hooks: {
    'transcription:complete': (text) => {
      // Process transcription
      return modifiedText;
    }
  }
};
```

### Python Backend API

Access Python functionality directly:

```python
from whisper_service import start_stream, transcribe_frames
from model_manager import download_model

# Start audio capture
start_stream()

# Download model
download_model('small')
```

## Performance & Optimization

### System Requirements

- **Minimum**: 4GB RAM, dual-core CPU
- **Recommended**: 8GB RAM, quad-core CPU
- **GPU**: Optional, CPU-only mode supported

### Performance Tips

1. **Model Selection**: Choose smaller models for slower systems
2. **Memory Management**: Close other applications during heavy use
3. **Disk Space**: Ensure 2GB+ free space for models
4. **Microphone Quality**: Use high-quality microphone for better accuracy

### Monitoring

SONU includes built-in performance monitoring:

- Real-time CPU/memory usage
- Transcription latency metrics
- Model loading times
- Error rate tracking

## Security & Privacy

### Privacy Features

- **100% Offline**: No data sent to external servers
- **Local Processing**: All transcription happens on device
- **No Telemetry**: Zero tracking or analytics
- **Local Storage**: Settings and history stored locally

### Security Measures

- **Secure IPC**: Context isolation between processes
- **Permission Control**: Granular access controls
- **Data Encryption**: Sensitive data encrypted at rest
- **Audit Logging**: Optional security event logging

## Troubleshooting

### Common Issues

1. **Hotkeys not working**: Check Windows permissions, restart application
2. **Audio not captured**: Verify microphone permissions, test in other apps
3. **Transcription errors**: Check model download, try different microphone
4. **Performance issues**: Monitor system resources, try smaller model

### Debug Mode

Enable debug logging:

```bash
DEBUG=* npm start
```

### Logs Location

- Application logs: `%APPDATA%\sonu\logs\`
- Python service logs: Console output
- Error logs: `%APPDATA%\sonu\error.log`

## Contributing

We welcome contributions! See our [Contributing Guide](./contributing.md) for:

- Development setup
- Coding standards
- Testing requirements
- Pull request process

### Development Workflow

1. Fork the repository
2. Create feature branch
3. Write tests for new functionality
4. Implement changes
5. Run full test suite
6. Submit pull request

## Support

### Resources

- **GitHub Issues**: Bug reports and feature requests
- **Documentation**: Comprehensive guides and API reference
- **Community**: Discussion forums and user groups

### Getting Help

1. Check the [Troubleshooting Guide](./troubleshooting.md)
2. Search existing GitHub issues
3. Create detailed bug report with logs
4. Join community discussions

## License

SONU is licensed under the MIT License. See [LICENSE](../LICENSE) for details.

## Changelog

See [CHANGELOG.md](../CHANGELOG.md) for detailed version history and updates.

---

**Made with ❤️ for professionals who value privacy and efficiency**

For the latest updates, visit [GitHub Repository](https://github.com/muhib-karim/sonu)