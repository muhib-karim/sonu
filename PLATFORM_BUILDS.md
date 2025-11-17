# 📦 SONU - Platform-Specific Build Instructions

## Multi-Platform Installation Guide

SONU supports multiple platforms with different installation methods for each.

---

## 🖥️ Desktop Platforms

### Windows

**Requirements:**
- Node.js 18+ and npm
- Python 3.8+
- faster-whisper (auto-installed)

**Installation:**
```bash
# Clone repository
git clone https://github.com/yourusername/sonu.git
cd sonu

# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt

# Run the app
npm start
```

**Build for Distribution:**
```bash
npm run build
# Creates installer in dist/ folder
```

---

### macOS

**Requirements:**
- Node.js 18+ and npm
- Python 3.8+
- faster-whisper (auto-installed)

**Installation:**
```bash
# Clone repository
git clone https://github.com/yourusername/sonu.git
cd sonu

# Install Node.js dependencies
npm install

# Install Python dependencies
pip3 install -r requirements.txt

# Run the app
npm start
```

**Build for Distribution:**
```bash
npm run build
# Creates .dmg installer in dist/ folder
```

---

### Linux

**Requirements:**
- Node.js 18+ and npm
- Python 3.8+
- faster-whisper (auto-installed)
- System dependencies: `libasound2-dev`, `portaudio19-dev`

**Installation:**
```bash
# Install system dependencies (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install -y libasound2-dev portaudio19-dev python3-pip

# Clone repository
git clone https://github.com/yourusername/sonu.git
cd sonu

# Install Node.js dependencies
npm install

# Install Python dependencies
pip3 install -r requirements.txt

# Run the app
npm start
```

**Build for Distribution:**
```bash
npm run build
# Creates .AppImage or .deb package in dist/ folder
```

---

## 🔌 Embedded/IoT Devices

### Raspberry Pi & ARM Devices

**Requirements:**
- Node.js 18+ and npm
- Python 3.8+
- whisper.cpp binary (compiled for ARM)

**Installation:**
```bash
# Clone repository
git clone https://github.com/yourusername/sonu.git
cd sonu

# Install Node.js dependencies
npm install

# Install Python dependencies (without faster-whisper for IoT)
pip3 install pyaudio keyboard numpy

# Download and compile whisper.cpp
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp
make

# Copy binary to SONU directory
cp whisper ../sonu/

# Download model
cd models
bash download-ggml-model.sh base
# Move model to ~/models/ or %LOCALAPPDATA%/whisper-models/

# Run the app
cd ../sonu
npm start
```

**Configuration:**
- Set `WHISPER_ENGINE=whisper-cpp` in environment or settings
- App will auto-detect whisper.cpp binary

---

### Other Embedded Devices

**Requirements:**
- whisper.cpp binary compiled for your platform
- Node.js runtime (if using Electron)
- Python 3.8+ (for whisper_service.py)

**Steps:**
1. Compile whisper.cpp for your platform
2. Place `whisper` binary in app directory
3. Download GGML model files
4. Set `WHISPER_ENGINE=whisper-cpp`
5. Run the app

---

## 📱 Mobile Platforms (Coming Soon)

### iOS

**Status:** In Development  
**Planned:** Native iOS app with CoreML integration

### Android

**Status:** In Development  
**Planned:** Native Android app with TensorFlow Lite

---

## 🔧 Engine Selection

### Automatic Detection (Recommended)

The app automatically detects available engines:
- **Desktop:** Prefers Faster Whisper (if available)
- **IoT:** Falls back to Whisper.cpp (if Faster Whisper unavailable)

### Manual Selection

Set engine preference in settings or environment:

**Via Settings UI:**
- Settings → Transcription Engine → Select engine

**Via Environment Variable:**
```bash
# Windows
set WHISPER_ENGINE=faster-whisper

# Mac/Linux
export WHISPER_ENGINE=faster-whisper
```

**Options:**
- `auto` - Auto-detect (default)
- `faster-whisper` - Use Faster Whisper (Desktop)
- `whisper-cpp` - Use Whisper.cpp (IoT/Embedded)

---

## 📋 Platform Comparison

| Platform | Engine | Installation | Performance |
|----------|--------|--------------|-------------|
| **Windows** | Faster Whisper | Easy (pip install) | ⚡⚡⚡⚡ Fastest |
| **macOS** | Faster Whisper | Easy (pip install) | ⚡⚡⚡⚡ Fastest |
| **Linux** | Faster Whisper | Easy (pip install) | ⚡⚡⚡⚡ Fastest |
| **Raspberry Pi** | Whisper.cpp | Medium (compile) | ⚡⚡⚡ Good |
| **ARM IoT** | Whisper.cpp | Medium (compile) | ⚡⚡⚡ Good |
| **iOS** | CoreML | Coming Soon | - |
| **Android** | TensorFlow Lite | Coming Soon | - |

---

## 🚀 Quick Start by Platform

### Desktop (Recommended)
```bash
npm install
pip install -r requirements.txt
npm start
```

### IoT/Embedded
```bash
npm install
pip install pyaudio keyboard numpy
# Download whisper.cpp binary
# Set WHISPER_ENGINE=whisper-cpp
npm start
```

---

## 📝 Notes

- **Desktop users:** Faster Whisper is recommended (4x faster, GPU support)
- **IoT users:** Whisper.cpp is required (lower memory, CPU-only)
- **Mobile users:** Native apps coming soon
- **All platforms:** Models auto-download on first use

---

**Last Updated:** 2024  
**Version:** 4.0.0

