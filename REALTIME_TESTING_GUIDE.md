# Real-Time Comprehensive Testing Guide

## Overview

The real-time comprehensive test suite (`realtime_comprehensive.test.js`) performs **actual user interactions** with the SONU app, clicking buttons, filling forms, toggling switches, and testing all features in real-time.

## What Gets Tested

### ✅ Navigation
- All 6 main tabs (Home, Dictionary, Snippets, Style, Notes, Settings)
- All 6 settings sub-tabs (General, System, Model, Themes, Vibe, Experimental)
- Rapid navigation to test responsiveness

### ✅ Dictionary
- **Add Word**: Opens modal, fills input, submits, verifies word appears
- **Copy Word**: Clicks copy button, verifies clipboard
- **Delete Word**: Clicks delete, verifies removal

### ✅ Snippets
- **Add Snippet**: Opens modal, fills name and text, submits
- **Copy Snippet**: Tests copy button functionality

### ✅ Notes
- **Add Note**: Opens modal, fills title and content, submits
- **Copy Note**: Tests copy button functionality
- **Notes Recording (NFC Dictation)**: Tests microphone button and IPC methods

### ✅ Theme System
- **Toggle Theme**: Clicks theme toggle button, verifies change
- **Theme Gallery**: Selects theme from gallery, verifies change
- **Persistence**: Verifies theme persists across navigation

### ✅ Model Management
- **Model Selection**: Changes model dropdown selection
- **Download Button**: Clicks download button
- **Cancel Download**: Clicks cancel if download starts

### ✅ All Toggles
- **Experimental Features**:
  - Continuous dictation (ON/OFF)
  - Low-latency audio backend (ON/OFF)
  - Noise reduction (ON/OFF)
- **General Settings**:
  - Sound feedback (ON/OFF)
  - Waveform animation (ON/OFF)
- **Verification**: Checks that settings are saved after each toggle

### ✅ Copy Buttons
- History items copy buttons
- Dictionary words copy buttons
- Snippets copy buttons
- Notes copy buttons

### ✅ Dictation
- Dictation UI elements (hotkey display, live preview, waveform)
- IPC methods availability check
- Notes recording button and functionality

### ✅ Window Controls
- Minimize button
- Maximize button
- Window restoration

### ✅ System Information
- Loads system info
- Refreshes system info

### ✅ Hotkey Settings
- Opens shortcuts modal
- Verifies modal elements

### ✅ Style Transformer
- Style categories display
- Style selection

### ✅ Complete User Journey
- Full workflow test that combines all features

## Running the Tests

### Automated (Recommended)
```bash
cd apps/desktop
npm run test:auto
```

This runs:
1. Unit tests
2. Integration tests
3. Real-time comprehensive E2E tests
4. Generates showcases
5. Uploads to GitHub

### Manual
```bash
cd apps/desktop/tests
npm install
npm run test:e2e:realtime
```

Or from desktop directory:
```bash
cd apps/desktop
npm run test:realtime
```

## Test Duration

- **Total Time**: ~5 minutes (300 seconds timeout)
- **Individual Tests**: 30-180 seconds each
- **Complete Journey**: ~3 minutes

## What the Tests Actually Do

The tests **actually interact** with the app:
- ✅ **Click buttons** - Real clicks, not just checking if they exist
- ✅ **Fill forms** - Actually types text into inputs
- ✅ **Toggle switches** - Actually toggles checkboxes on and off
- ✅ **Select options** - Actually changes dropdown selections
- ✅ **Copy to clipboard** - Actually clicks copy buttons
- ✅ **Navigate** - Actually clicks navigation items
- ✅ **Change themes** - Actually changes themes and verifies
- ✅ **Start downloads** - Actually clicks download buttons
- ✅ **Cancel downloads** - Actually clicks cancel buttons

## Test Output

The tests provide detailed console output:
- Which feature is being tested
- What actions are being performed
- Results of each action
- Any issues found

## Requirements

- Node.js 16+
- Playwright (installed automatically)
- Electron app dependencies
- Python 3.8+ (for whisper service, though tests don't require it to work)

## Notes

- Tests run in test mode (`NODE_ENV=test`, `E2E_TEST=1`)
- Tests don't require actual audio input (dictation UI is tested, not actual recording)
- Model downloads are tested (UI and cancellation, not full download completion)
- All tests are isolated and can run independently

---

**Last Updated**: 2025-01-XX  
**Version**: 3.5.4  
**Test File**: `tests/e2e/realtime_comprehensive.test.js`

