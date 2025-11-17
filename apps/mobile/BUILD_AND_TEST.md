# Build and Test Guide

Quick reference for building and testing the mobile apps.

## Android

### Prerequisites Check

```bash
# Check if Android SDK is installed
echo $ANDROID_HOME
# Should output path to Android SDK

# Check if adb is available
adb version

# Check if emulator is available
emulator -list-avds
```

### Build Commands

```bash
cd apps/mobile/android

# Clean build
./gradlew clean

# Build debug APK
./gradlew assembleDebug

# Build release APK (requires signing)
./gradlew assembleRelease

# Install to connected device/emulator
./gradlew installDebug

# Run tests
./gradlew test
./gradlew connectedAndroidTest
```

### Quick Test Script

```bash
#!/bin/bash
# test_android.sh

cd apps/mobile/android

echo "Building Android app..."
./gradlew assembleDebug

if [ $? -eq 0 ]; then
    echo "Build successful!"
    echo "Installing to device..."
    ./gradlew installDebug
    
    if [ $? -eq 0 ]; then
        echo "Installation successful!"
        echo "Launching app..."
        adb shell am start -n com.sonu/.MainActivity
    else
        echo "Installation failed. Make sure device/emulator is connected."
        adb devices
    fi
else
    echo "Build failed!"
    exit 1
fi
```

## iOS

### Prerequisites

- Xcode 15+ installed
- iOS 15.0+ simulator or physical device
- Apple Developer account (for physical device)

### Build Commands

```bash
cd apps/mobile/ios

# List available simulators
xcrun simctl list devices

# Build for simulator
xcodebuild -project Sonu.xcodeproj -scheme Sonu -sdk iphonesimulator -configuration Debug

# Build for device (requires signing)
xcodebuild -project Sonu.xcodeproj -scheme Sonu -sdk iphoneos -configuration Release

# Run tests
xcodebuild test -project Sonu.xcodeproj -scheme Sonu -destination 'platform=iOS Simulator,name=iPhone 15'
```

### Using Xcode

1. Open `apps/mobile/ios/Sonu.xcodeproj` in Xcode
2. Select target device (simulator or physical device)
3. Press `Cmd+B` to build
4. Press `Cmd+R` to run
5. Press `Cmd+U` to run tests

## Testing Checklist

### Android
- [ ] App builds without errors
- [ ] App installs on emulator/device
- [ ] Permissions are requested correctly
- [ ] Model download works
- [ ] Audio recording works
- [ ] Transcription produces results
- [ ] UI is responsive

### iOS
- [ ] App builds without errors
- [ ] App runs on simulator/device
- [ ] Microphone permission is requested
- [ ] Model download works
- [ ] Audio recording works
- [ ] Transcription produces results
- [ ] UI is responsive

## Common Issues

### Android Build Fails

```bash
# Clean and rebuild
cd apps/mobile/android
./gradlew clean
./gradlew build --refresh-dependencies
```

### iOS Build Fails

```bash
# Clean build folder
cd apps/mobile/ios
rm -rf build/
xcodebuild clean -project Sonu.xcodeproj -scheme Sonu
```

### Submodule Issues

```bash
# Update submodules
git submodule update --init --recursive

# If submodule is out of sync
cd apps/mobile/whisper.cpp
git pull origin master
cd ../../..
```

## Performance Testing

### Android

```bash
# Monitor app performance
adb shell dumpsys meminfo com.sonu
adb shell top -n 1 | grep com.sonu

# Check logcat
adb logcat | grep -i whisper
```

### iOS

```bash
# View device logs
xcrun simctl spawn booted log stream --predicate 'processImagePath contains "Sonu"'
```

## Continuous Integration

For CI/CD pipelines, see:
- `.github/workflows/build.yml` (if exists)
- Platform-specific build scripts in `scripts/` directory

