package com.sonu;

/**
 * JNI bridge service for Whisper.cpp transcription on Android
 */
public class WhisperService {
    static {
        System.loadLibrary("sonu-whisper");
    }

    private long contextPtr = 0;

    /**
     * Initialize whisper context from model file
     * @param modelPath Path to the whisper model file (.bin)
     * @return true if initialization successful, false otherwise
     */
    public boolean initContext(String modelPath) {
        contextPtr = initContextNative(modelPath);
        return contextPtr != 0;
    }

    /**
     * Free the whisper context
     */
    public void freeContext() {
        if (contextPtr != 0) {
            freeContextNative(contextPtr);
            contextPtr = 0;
        }
    }

    /**
     * Transcribe audio file
     * @param audioPath Path to the audio file (WAV format, 16kHz, mono)
     * @return Transcription text or error message
     */
    public String transcribe(String audioPath) {
        if (contextPtr == 0) {
            return "Error: Context not initialized. Call initContext() first.";
        }
        return transcribeNative(contextPtr, audioPath);
    }

    /**
     * Transcribe from float array (for real-time audio)
     * @param audioData Audio samples as float array (16kHz, mono, normalized to [-1, 1])
     * @return Transcription text or error message
     */
    public String transcribeFromFloatArray(float[] audioData) {
        if (contextPtr == 0) {
            return "Error: Context not initialized. Call initContext() first.";
        }
        return transcribeFromFloatArrayNative(contextPtr, audioData);
    }

    /**
     * Get system information
     * @return System info string
     */
    public String getSystemInfo() {
        return getSystemInfoNative();
    }

    /**
     * Check if context is initialized
     * @return true if initialized, false otherwise
     */
    public boolean isInitialized() {
        return contextPtr != 0;
    }

    // Native method declarations
    private native long initContextNative(String modelPath);
    private native void freeContextNative(long contextPtr);
    private native String transcribeNative(long contextPtr, String audioPath);
    private native String transcribeFromFloatArrayNative(long contextPtr, float[] audioData);
    private native String getSystemInfoNative();
}

