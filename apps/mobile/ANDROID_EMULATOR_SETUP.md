# Android Emulator Setup Guide

This guide will help you set up an Android emulator to test the Sonu mobile app.

## Prerequisites

1. **Android Studio** - Download from https://developer.android.com/studio
2. **Android SDK** - Included with Android Studio
3. **At least 8GB RAM** - Recommended 16GB for smooth operation
4. **Hardware acceleration** - Enable virtualization in BIOS (Intel VT-x or AMD-V)

## Step 1: Install Android Studio

1. Download Android Studio from the official website
2. Run the installer and follow the setup wizard
3. During installation, make sure to install:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device (AVD)

## Step 2: Create an Android Virtual Device (AVD)

1. Open Android Studio
2. Click on **Tools** → **Device Manager** (or **AVD Manager**)
3. Click **Create Device**
4. Select a device definition (recommended: **Pixel 5** or **Pixel 6**)
5. Click **Next**
6. Select a system image:
   - **Recommended**: API Level 33 (Android 13) or API Level 34 (Android 14)
   - Make sure to download the system image if not already downloaded
7. Click **Next**
8. Configure AVD:
   - **Name**: Sonu Test Device (or your preferred name)
   - **Graphics**: Automatic (or Hardware - GLES 2.0 for better performance)
   - **RAM**: At least 2048 MB (recommended: 4096 MB)
   - **VM heap**: 512 MB
9. Click **Finish**

## Step 3: Start the Emulator

1. In Device Manager, click the **Play** button next to your AVD
2. Wait for the emulator to boot (may take 1-2 minutes on first launch)
3. The emulator should now be running

## Step 4: Build and Install the App

### Option A: Using Android Studio

1. Open Android Studio
2. Click **File** → **Open**
3. Navigate to `apps/mobile/android` and select it
4. Wait for Gradle sync to complete
5. Click **Run** → **Run 'app'** (or press Shift+F10)
6. Select your emulator from the device list
7. The app will build and install automatically

### Option B: Using Command Line

```bash
# Navigate to Android app directory
cd apps/mobile/android

# Build the app
./gradlew assembleDebug

# Install to emulator (make sure emulator is running)
./gradlew installDebug

# Or use adb directly
adb install app/build/outputs/apk/debug/app-debug.apk
```

## Step 5: Test the App

1. **Grant Permissions**: When you first run the app, grant microphone permission
2. **Download Model**: 
   - Click "Download Model" button
   - Select "Tiny (75MB)" for fastest download
   - Wait for download to complete
3. **Record Audio**:
   - Click "Record" button
   - Speak into your computer's microphone (or use emulator's virtual mic)
   - Click "Stop" when done
4. **Transcribe**:
   - Click "Transcribe" button
   - Wait for transcription to complete
   - View the results

## Troubleshooting

### Emulator Won't Start

- **Check virtualization**: Make sure virtualization is enabled in BIOS
- **Check HAXM/HAXM**: For Intel processors, install Intel HAXM
- **Check Hyper-V**: On Windows, disable Hyper-V if using HAXM
- **Try different graphics**: Change Graphics setting to Software - GLES 2.0

### App Won't Install

- **Check emulator is running**: `adb devices` should show your emulator
- **Check API level**: Make sure emulator API level matches minSdk (24)
- **Check storage**: Ensure emulator has enough storage space

### Audio Recording Issues

- **Check permissions**: Make sure microphone permission is granted
- **Check audio input**: On emulator, audio input may be limited
- **Test on real device**: For best results, test on a physical device

### Build Errors

- **Sync Gradle**: In Android Studio, click **File** → **Sync Project with Gradle Files**
- **Clean build**: Run `./gradlew clean` then rebuild
- **Check NDK**: Make sure NDK is installed (Android Studio → SDK Manager → SDK Tools)

### Whisper.cpp Build Issues

- **Check submodule**: Run `git submodule update --init --recursive`
- **Check CMake**: Make sure CMake 3.18+ is installed
- **Check NDK version**: Use NDK r21e or later

## Performance Tips

1. **Allocate more RAM**: Give emulator at least 4GB RAM
2. **Use x86_64 images**: Faster than ARM images
3. **Enable hardware acceleration**: Use Hardware - GLES 2.0 graphics
4. **Close other apps**: Free up system resources
5. **Use physical device**: For best performance, use a real Android device

## Testing Checklist

- [ ] Emulator starts successfully
- [ ] App installs without errors
- [ ] Microphone permission is granted
- [ ] Model downloads successfully
- [ ] Audio recording works
- [ ] Transcription produces results
- [ ] UI is responsive
- [ ] No crashes during normal use

## Next Steps

After successful testing on emulator:
1. Test on a physical Android device
2. Test different model sizes (tiny, base, small)
3. Test with different audio sources
4. Measure performance metrics
5. Optimize for production

