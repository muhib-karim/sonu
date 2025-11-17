# Quick Start Guide

Get up and running with the Sonu mobile app in 5 minutes.

## Android Quick Start

### Prerequisites
- Android Studio installed
- Android emulator created (or physical device)

### Steps

1. **Open Project**
   ```bash
   # In Android Studio: File → Open → Select apps/mobile/android
   ```

2. **Sync Gradle**
   - Wait for Gradle sync to complete
   - Resolve any dependency issues if prompted

3. **Start Emulator**
   - Tools → Device Manager
   - Click Play button on your AVD

4. **Run App**
   - Click Run button (green play icon)
   - Or press Shift+F10

5. **Test**
   - Grant microphone permission when prompted
   - Tap "Download Model" → Select "Tiny (75MB)"
   - Wait for download
   - Tap "Record" → Speak → Tap "Stop"
   - Tap "Transcribe" → View results

## iOS Quick Start

### Prerequisites
- macOS with Xcode 15+ installed
- iOS Simulator or physical device

### Steps

1. **Open Project**
   ```bash
   open apps/mobile/ios/Sonu.xcodeproj
   ```

2. **Select Target**
   - Choose simulator (e.g., iPhone 15)
   - Or connect physical device

3. **Build & Run**
   - Press Cmd+R
   - Or click Run button

4. **Test**
   - Grant microphone permission
   - Tap "Download Model" → Select "Tiny"
   - Tap "Record" → Speak → Tap "Stop"
   - Tap "Transcribe" → View results

## Troubleshooting

### Android Build Fails
```bash
cd apps/mobile/android
./gradlew clean
./gradlew build --refresh-dependencies
```

### iOS Build Fails
- Clean build folder: Product → Clean Build Folder (Shift+Cmd+K)
- Check signing: Select target → Signing & Capabilities

### Model Download Fails
- Check internet connection
- Try different model (Tiny is smallest)
- Check device storage space

### Audio Recording Fails
- Grant microphone permission in Settings
- Check microphone is working
- On emulator, audio input may be limited

## Need Help?

- **Setup Issues**: See `ANDROID_EMULATOR_SETUP.md`
- **Build Issues**: See `BUILD_AND_TEST.md`
- **Testing**: See `TEST_TRANSCRIPTION.md`
- **Technical Details**: See `IMPLEMENTATION_SUMMARY.md`

## What's Next?

After successful testing:
1. Try different models (Base, Small)
2. Test with longer recordings
3. Measure performance
4. Customize UI
5. Add features (real-time transcription, language selection, etc.)

