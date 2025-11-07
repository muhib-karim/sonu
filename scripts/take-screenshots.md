# Taking Screenshots for SONU

This guide explains how to take professional screenshots of SONU for the GitHub repository.

## Prerequisites

- SONU application running
- Windows Snipping Tool or any screenshot tool
- Image editing software (optional, for annotations)

## Screenshots to Take

### 1. Main Application Window
- **File**: `screenshots/main-window.png`
- **Description**: Main application window showing the home page
- **Size**: 1920x1080 or 1280x720
- **Theme**: Both light and dark themes

### 2. Settings Page
- **File**: `screenshots/settings-page.png`
- **Description**: Settings page showing all tabs
- **Size**: 1920x1080 or 1280x720

### 3. Model Selector
- **File**: `screenshots/model-selector.png`
- **Description**: Model selector tab showing available models
- **Size**: 1920x1080 or 1280x720

### 4. Dictation in Action
- **File**: `screenshots/dictation-active.png`
- **Description**: Application showing active dictation with live transcription
- **Size**: 1920x1080 or 1280x720

### 5. System Tray Menu
- **File**: `screenshots/tray-menu.png`
- **Description**: System tray context menu
- **Size**: 400x600 (menu size)

### 6. Theme Comparison
- **File**: `screenshots/theme-light.png` and `screenshots/theme-dark.png`
- **Description**: Side-by-side comparison of light and dark themes
- **Size**: 1920x1080 or 1280x720

## Taking Screenshots

### Method 1: Windows Snipping Tool

1. Open SONU application
2. Press `Windows + Shift + S` to open Snipping Tool
3. Select the area to capture
4. Save as PNG in `screenshots/` directory

### Method 2: Print Screen

1. Open SONU application
2. Press `Print Screen` to capture full screen
3. Open Paint or any image editor
4. Paste and crop to desired area
5. Save as PNG in `screenshots/` directory

### Method 3: Electron DevTools Screenshot

1. Open SONU application
2. Press `Ctrl + Shift + I` to open DevTools
3. Press `Ctrl + Shift + P` to open command palette
4. Type "Capture screenshot"
5. Save in `screenshots/` directory

## Image Requirements

- **Format**: PNG (preferred) or JPG
- **Size**: Minimum 1280x720, preferred 1920x1080
- **Quality**: High quality, no compression artifacts
- **Naming**: Use descriptive names (e.g., `main-window-light.png`)

## Adding to Repository

1. Place screenshots in `screenshots/` directory
2. Update `README.md` to include screenshots
3. Commit and push to GitHub

```bash
git add screenshots/
git commit -m "docs: Add application screenshots"
git push origin main
```

## Professional Tips

- **Remove sensitive data**: Blur or remove any personal information
- **Consistent styling**: Use same theme and window size for consistency
- **Annotations**: Add arrows or labels to highlight features (optional)
- **File size**: Optimize images (use tools like TinyPNG) before committing

