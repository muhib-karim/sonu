# SONU - Offline Voice Typing Application

<div align="center">

![SONU Logo](assets/showcase/mic-32.png)

**Professional-grade offline voice typing solution powered by Faster-Whisper AI**

[![Video Formats](https://img.shields.io/badge/video-MP4%20%7C%20H.265%20%7C%20VP9-orange)](#-showcase)
[![Screenshots](https://img.shields.io/badge/screenshots-17-blue)](#-showcase)
[![Version](https://img.shields.io/badge/version-3.5.0-blue.svg)](https://github.com/muhib-karim/sonu)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-lightgrey.svg)](https://www.microsoft.com/windows)
[![Python](https://img.shields.io/badge/python-3.8%2B-blue.svg)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/node.js-16.0%2B-green.svg)](https://nodejs.org/)

*Transform your voice into text instantly, completely offline, with enterprise-grade accuracy*

</div>

<div align="center">

<!-- Banner GIF/PNG preview -->
![SONU Showcase Banner](assets/showcase/banner.png)

<br/>
<sub>Quickstart showcase generation: <code>npm run showcase</code> · Banner: <code>npm run banner</code></sub>

</div>

---

## 📸 Showcase

<div align="center">

### Full Gallery

<table>
  <tr>
    <td>![Home](assets/showcase/01_home.png)</td>
    <td>![Dictation Start](assets/showcase/02_dictation_start.png)</td>
    <td>![Output Log](assets/showcase/03_output_log.png)</td>
  </tr>
  <tr>
    <td>![Help](assets/showcase/04_help.png)</td>
    <td>![Dictionary](assets/showcase/05_dictionary.png)</td>
    <td>![Snippets](assets/showcase/06_snippets.png)</td>
  </tr>
  <tr>
    <td>![Style](assets/showcase/07_style.png)</td>
    <td>![Notes](assets/showcase/08_notes.png)</td>
    <td>![Settings](assets/showcase/09_settings.png)</td>
  </tr>
  <tr>
    <td>![Settings - General](assets/showcase/10_settings-general.png)</td>
    <td>![Settings - System](assets/showcase/11_settings-system.png)</td>
    <td>![Model Selector](assets/showcase/12_model_selector.png)</td>
  </tr>
  <tr>
    <td>![Settings - Themes](assets/showcase/13_settings-themes.png)</td>
    <td>![Settings - Vibe](assets/showcase/14_settings-vibe.png)</td>
    <td>![Settings - Experimental](assets/showcase/15_settings-experimental.png)</td>
  </tr>
  <tr>
    <td>![Theme - Light](assets/showcase/16_theme-light.png)</td>
    <td>![Theme - Dark](assets/showcase/17_theme-dark.png)</td>
    <td></td>
  </tr>
  
  <!-- Theme Comparison Row -->
  <tr>
    <td colspan="3">
      <em>Beautiful light and dark themes with smooth transitions</em>
    </td>
  </tr>
  
  <!-- Video Showcase -->
  <tr>
    <td colspan="3">
      <h3>Video Showcase</h3>
      <p>
        <a href="assets/showcase/showcase.mp4">MP4 Montage</a> ·
        <a href="assets/showcase/showcase_vp9.webm">VP9 Montage</a> ·
        <a href="assets/showcase/showcase_h265.mp4">HEVC Montage</a>
      </p>
      <p>
        Slideshow: 
        <a href="assets/showcase/showcase_slideshow_h265.mp4">HEVC</a> ·
        <a href="assets/showcase/showcase_slideshow_vp9.webm">VP9</a> ·
        <a href="assets/showcase/showcase_slideshow_3s_h265.mp4">HEVC (Ken Burns)</a> ·
        <a href="assets/showcase/showcase_slideshow_3s_vp9.webm">VP9 (Ken Burns)</a>
      </p>
    </td>
  </tr>
  
  <tr>
    <td colspan="3">
      <sub>Screenshots and videos are auto-generated via <code>npm run showcase</code> and saved to <code>assets/showcase/</code>.</sub>
    </td>
  </tr>
  
  <tr>
    <td colspan="3">
      <sub>Use <code>scripts/run-showcase.js</code> with <code>ffmpeg</code> filters from <code>assets/showcase/slideshow_filter*.txt</code> to render slideshows.</sub>
    </td>
  </tr>
  
</table>

</div>

---

## 🚀 Overview

**SONU** is a cutting-edge desktop application that provides real-time voice-to-text transcription using OpenAI's Whisper model via the faster-whisper library, running entirely offline on your Windows machine. Built with Electron and Python using TraeAI IDE and AI assistance, SONU offers a seamless, privacy-focused dictation experience that works across all your applications.

### Key Highlights

- ✅ **100% Offline** - No internet connection required, complete privacy
- ✅ **Real-time Transcription** - Live partial results during dictation
- ✅ **Dual Interaction Modes** - Press-and-hold or toggle on/off
- ✅ **System-wide Integration** - Works in any application
- ✅ **Professional UI** - Modern, glassmorphic design with light/dark themes
- ✅ **Enterprise Ready** - Commercial-grade architecture and documentation
- ✅ **Faster-Whisper Powered** - CPU-optimized transcription engine

---

## ✨ Features

### Core Functionality

- **Press-and-Hold Mode**: Hold a hotkey to dictate, release to finalize and output text
- **Toggle Mode**: Start/stop continuous dictation with a single keypress
- **Live Preview**: See partial transcriptions in real-time during dictation
- **System-wide Output**: Automatically types text at cursor location in any application
- **Clipboard Integration**: Final transcriptions automatically copied to clipboard
- **History Management**: View, edit, and copy previous transcriptions (last 100 items)

### Model Management

- **Multiple Model Sizes**: Choose from tiny, base, small, medium, or large-v3 models
- **Auto-Download**: Automatic model download with progress tracking
- **Model Import**: Import locally downloaded models
- **Smart Recommendations**: System-based model recommendations
- **Cache Management**: Automatic detection of faster-whisper cache locations

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
- **Storage**: 2GB free space (for models)
- **Audio**: Microphone input device

### Software Dependencies

- **Node.js**: v16.0.0 or higher
- **Python**: 3.8 or higher
- **Python Packages**:
  - `faster-whisper` (Whisper model implementation)
  - `pyaudio` (Audio capture)

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
   pip install faster-whisper pyaudio
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

3. **Configure Application**
   ```bash
   # Copy example configuration files
   cp config.json.example config.json
   cp data/settings.json.example data/settings.json
   cp data/dictionary.json.example data/dictionary.json
   ```

4. **Run the Application**
   ```bash
   npm start
   ```

### Building for Distribution

```bash
npm run build
```

This creates a Windows installer in the `dist` folder.

## 📸 Automated Showcase Capture

Generate fresh screenshots of every major tab without manual clicking:

```bash
npm run showcase
```

The command launches SONU in a special showcase mode, walks through Home, Dictionary, Snippets, Style, Notes, and all Settings sub-pages, and saves PNGs to `assets/showcase/`. To turn the stills into a short MP4 for GitHub or the redbook, run (requires `ffmpeg`):

```bash
ffmpeg -y -framerate 1 -pattern_type glob -i "assets/showcase/*.png" -c:v libx264 -pix_fmt yuv420p assets/showcase/showcase.mp4
```

### Showcase Videos

- HEVC (H.265) slideshow: `assets/showcase/showcase_slideshow_h265.mp4`
- VP9 (WebM) slideshow: `assets/showcase/showcase_slideshow_vp9.webm`
- Original MP4 montage: `assets/showcase/showcase.mp4`
- Social-ready HEVC: `assets/showcase/showcase_h265.mp4`
- Social-ready VP9: `assets/showcase/showcase_vp9.webm`

--- 

## 🎯 Usage

### First Launch

1. Launch SONU from the command line or desktop shortcut
2. The application will start minimized to the system tray
3. Right-click the tray icon to access the main window

### Basic Dictation

#### Press-and-Hold Mode

1. **Configure Hotkey**: Go to Settings → Keyboard Shortcuts → Hold Key
2. **Default**: `Ctrl+Win+Space` (customizable)
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

### Model Management

1. **Select Model**: Go to Settings → Model Selector
2. **Download Model**: Click "Download and Apply" for your preferred model
3. **Import Model**: Use "Import Model File" to use a locally downloaded model
4. **Auto-Recommendation**: System will recommend the best model based on your hardware

### Advanced Usage

- **View History**: Access previous transcriptions from the Home page
- **Edit Transcripts**: Click any history item to edit before copying
- **Change Themes**: Toggle between light and dark themes via the header switch
- **Customize Settings**: Access comprehensive settings via the sidebar
- **Dictionary Management**: Add custom words to improve transcription accuracy

---

## ⚙️ Configuration

### Hotkey Configuration

Hotkeys are stored in `config.json`:

```json
{
  "holdHotkey": "CommandOrControl+Super+Space",
  "toggleHotkey": "CommandOrControl+Shift+Space",
  "activeModel": "tiny"
}
```

### Settings Configuration

Settings are stored in `data/settings.json`:

```json
{
  "theme": "dark",
  "selected_model": "base",
  "dictation_hotkey": "Ctrl+Space",
  "sound_feedback": true,
  "model_download_path": ""
}
```

### Dictionary Management

Add custom words to `data/dictionary.json`:

```json
[
  "custom",
  "words",
  "here"
]
```

---

## 🏗️ Architecture

### Technology Stack

- **Frontend**: Electron (Chromium + Node.js)
- **Backend**: Python 3.x
- **AI Model**: Faster-Whisper (OpenAI Whisper implementation)
- **UI Framework**: Vanilla HTML/CSS/JavaScript
- **System Integration**: robotjs (system-wide typing)

### Project Structure

```
sonu/
├── main.js              # Electron main process
├── renderer.js          # UI logic and interactions
├── preload.js           # IPC bridge
├── styles.css           # Application styles
├── index.html           # Main UI structure
├── whisper_service.py   # Python transcription service
├── system_utils.py     # System information utilities
├── model_manager.py    # Model download and management
├── config.json.example # Example configuration
├── data/                # User data directory
│   ├── settings.json.example
│   ├── dictionary.json.example
│   └── snippets.json
├── assets/              # Application assets
│   └── tray/           # Tray icons
├── scripts/             # Utility scripts
├── tests/               # Test suite
└── versions/            # Version snapshots
```

### Key Components

1. **Main Process** (`main.js`): Window management, hotkey registration, IPC handling, model management
2. **Renderer Process** (`renderer.js`): UI state management, user interactions
3. **Whisper Service** (`whisper_service.py`): Audio capture and transcription using faster-whisper
4. **Preload Script** (`preload.js`): Secure IPC communication bridge
5. **Model Manager** (`model_manager.py`): Model download and cache management

### Faster-Whisper Integration

SONU uses **faster-whisper** (not whisper.cpp) for transcription:

- **Model Names**: Uses faster-whisper standard names (tiny, base, small, medium, large-v3)
- **Cache Location**: 
  - Windows: `%LOCALAPPDATA%\.cache\huggingface\hub\models--openai--whisper-{model}\`
  - Linux/Mac: `~/.cache/huggingface/hub/models--openai--whisper-{model}/`
- **Download**: Automatically downloads from Hugging Face Systran repositories
- **CPU Optimized**: Uses CTranslate2 for efficient CPU-based transcription

---

## 🔒 Privacy & Security

- **100% Offline**: All processing happens locally on your machine
- **No Data Transmission**: Audio never leaves your device
- **No Telemetry**: Zero tracking or analytics
- **Open Source**: Full source code transparency
- **Local Storage**: All data stored locally in JSON files
- **No Cloud Sync**: All data remains on your device

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
- **Solution**: Verify faster-whisper is installed: `pip install faster-whisper`

**Issue**: System-wide typing not working
- **Solution**: Verify `robotjs` is installed: `npm install robotjs`
- **Solution**: Use clipboard fallback (`Ctrl+V`) if robotjs unavailable

**Issue**: Model download fails
- **Solution**: Check internet connection (required only for initial download)
- **Solution**: Verify faster-whisper is installed correctly
- **Solution**: Check disk space availability

### Performance Optimization

- **First Run**: Initial model loading may take 30-60 seconds
- **Memory Usage**: Whisper model requires ~2GB RAM (varies by model size)
- **CPU Usage**: Transcription is CPU-intensive; expect 20-40% usage
- **Model Selection**: Use smaller models (tiny, base) for faster transcription

---

## 📝 Development

### Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

### Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Building from Source

```bash
# Install dependencies
npm install

# Run in development mode
npm start

# Build for production
npm run build
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- tests/unit/
npm test -- tests/integration/
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements & Inspirations

This project was shaped by the creativity of the open-source AI community and by several pioneering dictation and productivity tools.

### 🧠 Open-Source Projects & Frameworks
| Project | Description |
|----------|--------------|
| <a href=" `https://github.com/ggml-org/whisper.cpp` ">![whisper.cpp-ggml--org-blue?logo=github` ](assets/showcase/whisper.png)</a> | Core C/C++ Whisper engine enabling fully offline transcription. |
| <a href=" `https://github.com/SYSTRAN/faster-whisper` ">![faster--whisper-SYSTRAN-blue?logo=github` ](assets/showcase/faster--whisper-systran-blue?logo=github`_.png)</a> | CTranslate2-based Whisper implementation optimized for speed and memory. |
| <a href=" `https://github.com/Const-me/Whisper` ">![Const--me%2FWhisper-GPU-orange?logo=github` ](assets/showcase/const--me%2fwhisper-gpu-orange?logo=github`_.png)</a> | GPU-accelerated desktop Whisper engine inspiring local inference pipelines. |
| <a href=" `https://github.com/rhasspy/wyoming-faster-whisper` ">![Rhasspy%20Wyoming-Faster--Whisper-lightgrey?logo=github` ](assets/showcase/rhasspy%20wyoming-faster--whisper-lightgrey?logo=github`_.png)</a> | Offline speech-to-text service used in Home Assistant voice stacks. |
| <a href=" `https://github.com/handyorg/handy` ">![Handy-Tauri--App-green?logo=tauri` ](assets/showcase/handy-tauri--app-green?logo=tauri`_.png)</a> | Example of a privacy-first desktop STT UX. |
| <a href=" `https://github.com/dimastatz/whisper-flow` ">![whisper--flow-library-blueviolet?logo=github` ](assets/showcase/whisper--flow-library-blueviolet?logo=github`_.png)</a> | Real-time Whisper streaming library influencing pipeline design. |
| <a href=" `https://github.com/AlexxIT/FasterWhisper` ">![AlexxIT-FasterWhisper-yellow?logo=github` ](assets/showcase/alexxit-fasterwhisper-yellow?logo=github`_.png)</a> | Containerized deployment reference for Whisper services. |

---

### 💬 Commercial & UX Inspirations
| App / Product | Influence |
|----------------|------------|
| 🌀 **Wispr Flow** | Seamless real-time voice dictation workflow and fluid UI. |
| ⌨️ **Typeless** | Minimalist speech-to-text experience with focus on flow and speed. |
| 🎧 **MacWhisper / Whisper Desktop / WhisperNote** | Early desktop attempts to make Whisper accessible for everyday users. |
| 🪄 **Descript & Otter.ai** | Best-in-class transcription UX and editing concepts that inspired offline workflow design. |

---

### ⚙️ Development Tools & Automation
| Tool | Role |
|------|------|
| ![Cursor-IDE-blue?logo=visualstudiocode` ](assets/showcase/cursor-ide-blue?logo=visualstudiocode`_.png) | Main environment for iterative coding and debugging. |
| ![Trae`  AI-Solo Code-orange?logo=bolt](assets/showcase/trae`_ai-solo_code-orange?logo=bolt.png) | Local autonomous build automation and showcase generation. |

---

> Built independently, with deep respect for every developer and researcher advancing local speech recognition.  
> Engineered and tested entirely offline using **Cursor IDE** + **Trae AI Solo Code**.  
> All trademarks and product names belong to their respective owners.

---

## 📞 Support

For issues, questions, or feature requests:

- **GitHub Issues**: [Create an issue](https://github.com/muhib-karim/sonu/issues)
- **GitHub Profile**: [@muhib-karim](https://github.com/muhib-karim)

---

## 🗺️ Roadmap

### Version 3.6 (Planned)

- [ ] Multi-language support
- [ ] Advanced audio processing
- [ ] Custom model fine-tuning
- [ ] Plugin system

### Future Considerations

- [ ] macOS and Linux support
- [ ] API for third-party integrations
- [ ] Enterprise deployment tools
- [ ] Mobile companion app

---

<div align="center">

**Made with ❤️ by a solo developer using TraeAI IDE and AI assistance**

*Built to demonstrate the power of AI-augmented development*

[Documentation](docs/README.md) • [Changelog](CHANGELOG.md) • [Contributing](CONTRIBUTING.md) • [License](LICENSE)

© 2025 SONU. All rights reserved.

</div>
<!-- Showcase consolidated in the main Screenshots section above -->
