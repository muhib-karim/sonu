# Development Guide

This document provides comprehensive information for developers who want to contribute to or extend SONU.

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Setup](#development-setup)
- [Architecture](#architecture)
- [Code Style](#code-style)
- [Testing](#testing)
- [Building](#building)
- [Debugging](#debugging)

## Getting Started

### Prerequisites

- **Node.js**: v16.0.0 or higher
- **Python**: 3.8 or higher
- **Git**: For version control
- **Windows**: 10/11 (64-bit) for development

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/muhib-karim/sonu.git
   cd sonu
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application**
   ```bash
   npm start
   ```

## Project Structure

```
sonu/
├── main.js              # Electron main process
├── renderer.js           # UI logic and interactions
├── preload.js            # IPC bridge
├── styles.css            # Application styles
├── index.html            # Main UI structure
├── whisper_service.py    # Python transcription service
├── system_utils.py      # System information utilities
├── model_manager.py      # Model download and management
├── package.json          # Node.js dependencies
├── requirements.txt      # Python dependencies
├── config.json.example   # Example configuration
├── data/                 # User data directory
├── assets/               # Application assets
├── scripts/              # Utility scripts
├── tests/                # Test suite
└── docs/                 # Documentation
```

## Development Setup

### Development Mode

Run the application in development mode:

```bash
npm start
```

This will:
- Start the Electron application
- Enable developer tools
- Show console logs
- Enable hot reload (if configured)

### Debugging

#### Main Process Debugging

Add breakpoints in `main.js` and use Chrome DevTools:

1. Open DevTools: `Ctrl+Shift+I` (or `Cmd+Option+I` on Mac)
2. Go to Sources tab
3. Set breakpoints in `main.js`

#### Renderer Process Debugging

The renderer process runs in a Chromium window. Use standard browser DevTools:

1. Right-click in the window → Inspect
2. Or use `Ctrl+Shift+I`

#### Python Service Debugging

The Python service outputs to stderr. Check console output for errors:

```bash
# Run Python service directly
python whisper_service.py
```

## Architecture

See [ARCHITECTURE.md](../ARCHITECTURE.md) for detailed architecture documentation.

### Key Components

1. **Main Process** (`main.js`): Window management, IPC handlers, hotkey registration
2. **Renderer Process** (`renderer.js`): UI logic, user interactions
3. **Preload Script** (`preload.js`): Secure IPC bridge
4. **Whisper Service** (`whisper_service.py`): Audio capture and transcription

## Code Style

### JavaScript/Node.js

- Use ES6+ features
- Follow existing code patterns
- Use meaningful variable names
- Add comments for complex logic
- Keep functions focused and small

### Python

- Follow PEP 8 style guide
- Use type hints where appropriate
- Add docstrings for functions
- Keep functions focused and small

### Commit Messages

Follow conventional commits:

```
type: description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Maintenance tasks

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- tests/unit/
npm test -- tests/integration/
npm test -- tests/e2e/
```

### Test Structure

- **Unit Tests**: Test individual components
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test full application workflows

### Writing Tests

See [tests/README.md](../tests/README.md) for test writing guidelines.

## Building

### Development Build

```bash
npm run build
```

This creates a development build in the `dist` folder.

### Production Build

```bash
npm run build -- --publish=never
```

This creates a production-ready installer.

## Debugging

### Common Issues

1. **Hotkeys not working**
   - Check Windows permissions
   - Verify no other app uses the same hotkey
   - Check console for errors

2. **Audio not captured**
   - Verify microphone permissions
   - Check default input device
   - Test PyAudio installation

3. **Model download fails**
   - Check internet connection
   - Verify faster-whisper installation
   - Check disk space

### Logging

Logs are stored in:
- Windows: `%APPDATA%\Sonu\logs\`
- Development: `logs/` directory

Enable verbose logging:
```bash
npm start -- --verbose
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [Faster-Whisper Documentation](https://github.com/guillaumekln/faster-whisper)
- [Python Documentation](https://docs.python.org/)
- [Node.js Documentation](https://nodejs.org/docs)

## Support

For questions or issues:
- Open an issue on GitHub
- Check existing documentation
- Review [ARCHITECTURE.md](../ARCHITECTURE.md)

---

Happy coding! 🚀

