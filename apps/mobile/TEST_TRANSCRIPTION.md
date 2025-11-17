# Whisper.cpp Transcription Testing Guide

This guide explains how to test the Whisper.cpp native bridges on both Android and iOS platforms.

## Prerequisites

1. **Whisper Model File**: Download a whisper model (e.g., `ggml-tiny.bin` or `ggml-base.bin`)
   - Models can be downloaded from: https://huggingface.co/ggerganov/whisper.cpp
   - Recommended for mobile: `ggml-tiny.bin` (smallest, fastest) or `ggml-base.bin` (better accuracy)

2. **Test Audio File**: Prepare a WAV audio file
   - Format: 16-bit PCM, mono, 16kHz sample rate
   - You can use the sample file from whisper.cpp: `apps/mobile/whisper.cpp/samples/jfk.wav`

## Android Testing

### Setup

1. **Copy model to device**:
   ```bash
   adb push ggml-tiny.bin /data/local/tmp/
   ```

2. **Copy test audio to device**:
   ```bash
   adb push test_audio.wav /data/local/tmp/
   ```

3. **Update test paths** in `apps/mobile/android/app/src/androidTest/java/com/sonu/WhisperServiceTest.java`:
   ```java
   String modelPath = "/data/local/tmp/ggml-tiny.bin";
   String audioPath = "/data/local/tmp/test_audio.wav";
   ```

### Running Tests

```bash
cd apps/mobile/android
./gradlew connectedAndroidTest
```

### Manual Testing

You can also test directly in your Android app:

```java
import com.sonu.WhisperService;

// Initialize
WhisperService service = new WhisperService();
boolean success = service.initContext("/path/to/ggml-tiny.bin");

if (success) {
    // Transcribe audio file
    String result = service.transcribe("/path/to/audio.wav");
    Log.d("Transcription", result);
    
    // Or transcribe from float array
    float[] audioData = ...; // Your audio samples
    String result2 = service.transcribeFromFloatArray(audioData);
    
    // Cleanup
    service.freeContext();
}
```

## iOS Testing

### Setup

1. **Add model to Xcode project**:
   - Drag `ggml-tiny.bin` into your Xcode project
   - Make sure "Copy items if needed" is checked
   - Add to target membership

2. **Add test audio to Xcode project**:
   - Drag `test_audio.wav` into your Xcode project
   - Make sure "Copy items if needed" is checked
   - Add to target membership

### Running Tests

1. Open `apps/mobile/ios/Sonu.xcodeproj` in Xcode
2. Select the test target
3. Press `Cmd+U` to run tests

### Manual Testing

You can also test directly in your iOS app:

```swift
import Foundation

let whisperBridge = WhisperBridge()

// Initialize
guard let modelPath = Bundle.main.path(forResource: "ggml-tiny", ofType: "bin") else {
    print("Model not found")
    return
}

if whisperBridge.initContext(modelPath) {
    // Transcribe audio file
    guard let audioPath = Bundle.main.path(forResource: "test_audio", ofType: "wav") else {
        print("Audio file not found")
        return
    }
    
    let result = whisperBridge.transcribe(audioPath)
    print("Transcription: \(result)")
    
    // Or transcribe from float array
    var audioData: [NSNumber] = []
    // ... populate audioData with your samples
    let result2 = whisperBridge.transcribeFromFloatArray(audioData)
    
    // Cleanup
    whisperBridge.freeContext()
}
```

## Expected Results

- **System Info Test**: Should print system information about CPU, memory, etc.
- **Initialization Test**: Should successfully load the model
- **Transcription Test**: Should return transcribed text from the audio file

## Troubleshooting

### Android

- **"Context not initialized"**: Make sure `initContext()` was called successfully
- **"Failed to read audio file"**: Check file path and format (must be WAV, 16kHz, mono)
- **Build errors**: Ensure whisper.cpp submodule is initialized: `git submodule update --init --recursive`

### iOS

- **"Model file not found"**: Ensure the model is added to the Xcode project and target
- **"Failed to read audio file"**: Check that audio file is in the bundle and format is correct
- **Build errors**: Ensure whisper.cpp is properly linked in Xcode project settings

## Performance Notes

- **Model Size**: `ggml-tiny.bin` (~75MB) is recommended for mobile devices
- **Transcription Speed**: Expect 2-5x real-time on modern devices (e.g., 10 seconds of audio in 2-5 seconds)
- **Memory Usage**: Models require significant RAM; ensure device has sufficient memory
- **Thread Count**: The default is 4 threads; adjust based on device capabilities

## Next Steps

1. Integrate the bridges into your app's UI
2. Add audio recording functionality
3. Implement real-time transcription (streaming)
4. Add language selection support
5. Optimize for your target devices

