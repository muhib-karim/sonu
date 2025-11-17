# Mobile v4.x Setup Guide

## Prerequisites

- Android Studio (for Android development)
- Xcode 15+ (for iOS development)
- Git with submodule support

## Step 1: Add Whisper.cpp Submodule

```bash
cd apps/mobile
git submodule add https://github.com/ggerganov/whisper.cpp whisper.cpp
cd whisper.cpp
# Build the library (platform-specific)
make libwhisper.a  # or use CMake for Android
cd ../..
```

## Step 2: Android Setup

1. Open `apps/mobile/android/` in Android Studio
2. Sync Gradle files
3. Build the native library:
   ```bash
   cd apps/mobile/android
   ./gradlew build
   ```

## Step 3: iOS Setup

1. Open `apps/mobile/ios/Sonu.xcodeproj` in Xcode
2. Add whisper.cpp directory to project
3. Configure bridging header path in Build Settings
4. Build for device (simulator is too slow)

## Step 4: Verify Integration

- Android: Check that `libsonu-whisper.so` is generated
- iOS: Check that `whisper.h` is accessible from Swift

## Next Steps

See `docs/MOBILE_ROADMAP.md` for development phases.

