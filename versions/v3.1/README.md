# SONU - Offline Voice Typing Application

<div align="center">

![SONU Logo](assets/tray/mic-32.png)

**Professional-grade offline voice typing solution powered by Whisper AI**

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/muhib-karim/sonu)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-lightgrey.svg)](https://www.microsoft.com/windows)

*Transform your voice into text instantly, completely offline, with enterprise-grade accuracy*

</div>

---

## 🚀 Overview

**SONU** is a cutting-edge desktop application that provides real-time voice-to-text transcription using OpenAI's Whisper model, running entirely offline on your Windows machine. Built with Electron and Python, SONU offers a seamless, privacy-focused dictation experience that works across all your applications.

### Key Highlights

- ✅ **100% Offline** - No internet connection required, complete privacy
- ✅ **Real-time Transcription** - Live partial results during dictation
- ✅ **Dual Interaction Modes** - Press-and-hold or toggle on/off
- ✅ **System-wide Integration** - Works in any application
- ✅ **Professional UI** - Modern, glassmorphic design with light/dark themes
- ✅ **Enterprise Ready** - Commercial-grade architecture and documentation

---

## ✨ Features

### Core Functionality

- **Press-and-Hold Mode**: Hold a hotkey to dictate, release to finalize and output text
- **Toggle Mode**: Start/stop continuous dictation with a single keypress
- **Live Preview**: See partial transcriptions in real-time during dictation
- **System-wide Output**: Automatically types text at cursor location in any application
- **Clipboard Integration**: Final transcriptions automatically copied to clipboard
- **History Management**: View, edit, and copy previous transcriptions (last 100 items)

### User Interface

- **Modern Design**: Glassmorphic UI inspired by Apple's design language
- **Theme Support**: Beautiful light and dim dark themes with smooth transitions
- **Responsive Layout**: Sidebar navigation with dedicated settings page
- **Live Statistics**: Track total transcriptions, words, and characters
- **Inline Editing**: Edit history items directly in the interface

### Advanced Features

- **Customizable Hotkeys**: Configure hold and toggle shortcuts to your preference
- **Audio Cues**: Audio feedback for dictation start/stop
- **Tray Integration**: System tray icon with comprehensive context menu
- **Window Controls**: Standard minimize, maximize, and close functionality
- **Version Management**: Built-in versioning system for development

---

## 📋 Requirements

### System Requirements

- **OS**: Windows 10/11 (64-bit)
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: 2GB free space
- **Audio**: Microphone input device

### Software Dependencies

- **Node.js**: v16.0.0 or higher
- **Python**: 3.8 or higher
- **Python Packages**:
  - `faster-whisper` (Whisper model implementation)
  - `pyaudio` (Audio capture)
  - `keyboard` (Hotkey detection)

---

## 🛠️ Installation

### Prerequisites

1. **Install Node.js**
   ```bash
   # Download from https://nodejs.org/
   # Verify installation
   node --version
   npm --version
   ```

2. **Install Python**
   ```bash
   # Download from https://www.python.org/
   # Verify installation
   python --version
   pip --version
   ```

3. **Install Python Dependencies**
   ```bash
   pip install faster-whisper pyaudio keyboard
   ```

### Application Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/muhib-karim/sonu.git
   cd sonu
   ```

2. **Install Node Dependencies**
   ```bash
   npm install
   ```

3. **Run the Application**
   ```bash
   npm start
   ```

### Building for Distribution

```bash
npm run build
```

This creates a Windows installer in the `dist` folder.

---

## 🎯 Usage

### First Launch

1. Launch SONU from the command line or desktop shortcut
2. The application will start minimized to the system tray
3. Right-click the tray icon to access the main window

### Basic Dictation

#### Press-and-Hold Mode

1. **Configure Hotkey**: Go to Settings → Keyboard Shortcuts → Hold Key
2. **Default**: `Ctrl+Win` (customizable)
3. **Usage**: 
   - Hold the configured hotkey combination
   - Speak your text
   - Release to finalize and output

#### Toggle Mode

1. **Configure Hotkey**: Go to Settings → Keyboard Shortcuts → Toggle Key
2. **Default**: `Ctrl+Shift+Space` (customizable)
3. **Usage**:
   - Press once to start dictation
   - Speak your text
   - Press again to stop and output

### Advanced Usage

- **View History**: Access previous transcriptions from the Home page
- **Edit Transcripts**: Click any history item to edit before copying
- **Change Themes**: Toggle between light and dark themes via the header switch
- **Customize Settings**: Access comprehensive settings via the sidebar

---

## ⚙️ Configuration

### Hotkey Configuration

Hotkeys are stored in `config.json`:

```json
{
  "holdHotkey": "Ctrl+Win",
  "toggleHotkey": "Ctrl+Shift+Space"
}
```

### History Management

- History is stored in `history.json`
- Limited to last 100 items
- Automatically managed by the application

### Theme Preferences

- Theme preference saved in browser `localStorage`
- Persists across application restarts

---

## 🏗️ Architecture

### Technology Stack

- **Frontend**: Electron (Chromium + Node.js)
- **Backend**: Python 3.x
- **AI Model**: Faster-Whisper (OpenAI Whisper)
- **UI Framework**: Vanilla HTML/CSS/JavaScript
- **System Integration**: robotjs (system-wide typing)

### Project Structure

```
sonu/
├── main.js              # Electron main process
├── renderer.js         # UI logic and interactions
├── preload.js          # IPC bridge
├── styles.css          # Application styles
├── index.html          # Main UI structure
├── whisper_service.py  # Python transcription service
├── config.json         # User configuration
├── history.json        # Transcription history
├── assets/             # Application assets
│   └── tray/          # Tray icons
├── scripts/            # Utility scripts
└── versions/           # Version snapshots
    ├── v1.0/          # Initial version
    └── v2.0/          # Current stable version
```

### Key Components

1. **Main Process** (`main.js`): Window management, hotkey registration, IPC handling
2. **Renderer Process** (`renderer.js`): UI state management, user interactions
3. **Whisper Service** (`whisper_service.py`): Audio capture and transcription
4. **Preload Script** (`preload.js`): Secure IPC communication bridge

---

## 🔒 Privacy & Security

- **100% Offline**: All processing happens locally on your machine
- **No Data Transmission**: Audio never leaves your device
- **No Telemetry**: Zero tracking or analytics
- **Open Source**: Full source code transparency
- **Local Storage**: All data stored locally in JSON files

---

## 🐛 Troubleshooting

### Common Issues

**Issue**: Hotkeys not working
- **Solution**: Ensure no other application is using the same hotkey combination
- **Solution**: Check Windows permissions for global hotkey registration

**Issue**: Audio not being captured
- **Solution**: Verify microphone permissions in Windows Settings
- **Solution**: Check if microphone is set as default input device

**Issue**: Transcription not appearing
- **Solution**: Ensure Python dependencies are installed correctly
- **Solution**: Check console for error messages

**Issue**: System-wide typing not working
- **Solution**: Verify `robotjs` is installed: `npm install robotjs`
- **Solution**: Use clipboard fallback (`Ctrl+V`) if robotjs unavailable

### Performance Optimization

- **First Run**: Initial model loading may take 30-60 seconds
- **Memory Usage**: Whisper model requires ~2GB RAM
- **CPU Usage**: Transcription is CPU-intensive; expect 20-40% usage

---

## 📝 Development

### Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

### Contributing

This is a private repository. For internal development:

1. Create a feature branch from `main`
2. Make your changes
3. Test thoroughly
4. Submit a pull request for review

### Building from Source

```bash
# Install dependencies
npm install

# Run in development mode
npm start

# Build for production
npm run build
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **OpenAI** for the Whisper model
- **Faster-Whisper** team for the efficient implementation
- **Electron** team for the desktop framework
- **Community** for feedback and testing

---

## 📞 Support

For issues, questions, or feature requests:

- **GitHub Issues**: [Create an issue](https://github.com/muhib-karim/sonu/issues)
- **Email**: [Contact via GitHub](https://github.com/muhib-karim)

---

## 🗺️ Roadmap

### Version 3.0 (In Development)

- [ ] Multi-language support
- [ ] Custom model selection
- [ ] Advanced audio processing
- [ ] Cloud sync (optional)
- [ ] Mobile companion app

### Future Considerations

- [ ] macOS and Linux support
- [ ] Plugin system
- [ ] API for third-party integrations
- [ ] Enterprise deployment tools

---

<div align="center">

**Made with ❤️ for professionals who value privacy and efficiency**

[Website](#) • [Documentation](#) • [Changelog](CHANGELOG.md) • [License](LICENSE)

© 2025 SONU. All rights reserved.

</div>
