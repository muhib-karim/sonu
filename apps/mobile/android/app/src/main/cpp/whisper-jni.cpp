// JNI bridge for Whisper.cpp on Android
#include <jni.h>
#include <android/log.h>
#include <string>
#include <vector>
#include <fstream>

#include "whisper.h"

#define TAG "WhisperJNI"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, TAG, __VA_ARGS__)

// Simple audio reading function for WAV files (16-bit PCM, mono, 16kHz)
// For production, use a proper audio decoder library
static bool read_wav_file(const std::string& filename, std::vector<float>& pcmf32) {
    std::ifstream file(filename, std::ios::binary);
    if (!file.is_open()) {
        LOGE("Failed to open audio file: %s", filename.c_str());
        return false;
    }

    // Read WAV header
    char header[44];
    file.read(header, 44);
    
    // Check for WAV format (simplified check)
    if (header[0] != 'R' || header[1] != 'I' || header[2] != 'F' || header[3] != 'F') {
        LOGE("Not a valid WAV file");
        return false;
    }

    // Get data size (offset 40-43)
    uint32_t data_size = *(uint32_t*)(header + 40);
    
    // Read audio data (assuming 16-bit PCM)
    std::vector<int16_t> pcm16(data_size / 2);
    file.read((char*)pcm16.data(), data_size);
    
    // Convert to float32
    pcmf32.resize(pcm16.size());
    for (size_t i = 0; i < pcm16.size(); i++) {
        pcmf32[i] = pcm16[i] / 32768.0f;
    }

    return true;
}

extern "C" {

// Initialize whisper context from model file
JNIEXPORT jlong JNICALL
Java_com_sonu_WhisperService_initContext(
    JNIEnv *env,
    jobject /* this */,
    jstring modelPath) {
    
    const char *model_path_chars = env->GetStringUTFChars(modelPath, NULL);
    if (!model_path_chars) {
        LOGE("Failed to get model path string");
        return 0;
    }

    LOGI("Initializing whisper context from: %s", model_path_chars);
    
    whisper_context_params cparams = whisper_context_default_params();
    struct whisper_context *ctx = whisper_init_from_file_with_params(model_path_chars, cparams);
    
    env->ReleaseStringUTFChars(modelPath, model_path_chars);
    
    if (!ctx) {
        LOGE("Failed to initialize whisper context");
        return 0;
    }
    
    LOGI("Whisper context initialized successfully");
    return (jlong)ctx;
}

// Free whisper context
JNIEXPORT void JNICALL
Java_com_sonu_WhisperService_freeContext(
    JNIEnv *env,
    jobject /* this */,
    jlong contextPtr) {
    
    if (contextPtr == 0) {
        return;
    }
    
    struct whisper_context *ctx = (struct whisper_context *)contextPtr;
    whisper_free(ctx);
    LOGI("Whisper context freed");
}

// Transcribe audio file
JNIEXPORT jstring JNICALL
Java_com_sonu_WhisperService_transcribe(
    JNIEnv *env,
    jobject /* this */,
    jlong contextPtr,
    jstring audioPath) {
    
    if (contextPtr == 0) {
        LOGE("Invalid context pointer");
        return env->NewStringUTF("Error: Invalid context");
    }
    
    const char *audio_path_chars = env->GetStringUTFChars(audioPath, NULL);
    if (!audio_path_chars) {
        LOGE("Failed to get audio path string");
        return env->NewStringUTF("Error: Failed to get audio path");
    }
    
    LOGI("Transcribing audio file: %s", audio_path_chars);
    
    // Read audio file
    std::vector<float> pcmf32;
    if (!read_wav_file(audio_path_chars, pcmf32)) {
        env->ReleaseStringUTFChars(audioPath, audio_path_chars);
        return env->NewStringUTF("Error: Failed to read audio file");
    }
    
    LOGI("Read %zu audio samples", pcmf32.size());
    
    struct whisper_context *ctx = (struct whisper_context *)contextPtr;
    
    // Configure whisper parameters
    struct whisper_full_params params = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
    params.print_realtime = false;
    params.print_progress = false;
    params.print_timestamps = false;
    params.print_special = false;
    params.translate = false;
    params.language = "en";
    params.n_threads = 4;
    params.offset_ms = 0;
    params.no_context = true;
    params.single_segment = false;
    
    // Run transcription
    int result = whisper_full(ctx, params, pcmf32.data(), pcmf32.size());
    
    env->ReleaseStringUTFChars(audioPath, audio_path_chars);
    
    if (result != 0) {
        LOGE("Whisper transcription failed with code: %d", result);
        return env->NewStringUTF("Error: Transcription failed");
    }
    
    // Collect transcription segments
    std::string transcription;
    const int n_segments = whisper_full_n_segments(ctx);
    
    LOGI("Found %d segments", n_segments);
    
    for (int i = 0; i < n_segments; i++) {
        const char *text = whisper_full_get_segment_text(ctx, i);
        transcription += text;
        if (i < n_segments - 1) {
            transcription += " ";
        }
    }
    
    LOGI("Transcription complete: %s", transcription.c_str());
    
    return env->NewStringUTF(transcription.c_str());
}

// Transcribe from float array (for real-time audio)
JNIEXPORT jstring JNICALL
Java_com_sonu_WhisperService_transcribeFromFloatArray(
    JNIEnv *env,
    jobject /* this */,
    jlong contextPtr,
    jfloatArray audioData) {
    
    if (contextPtr == 0) {
        LOGE("Invalid context pointer");
        return env->NewStringUTF("Error: Invalid context");
    }
    
    jsize len = env->GetArrayLength(audioData);
    jfloat *audio_data_arr = env->GetFloatArrayElements(audioData, NULL);
    
    if (!audio_data_arr) {
        LOGE("Failed to get audio data array");
        return env->NewStringUTF("Error: Failed to get audio data");
    }
    
    struct whisper_context *ctx = (struct whisper_context *)contextPtr;
    
    // Configure whisper parameters
    struct whisper_full_params params = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
    params.print_realtime = false;
    params.print_progress = false;
    params.print_timestamps = false;
    params.print_special = false;
    params.translate = false;
    params.language = "en";
    params.n_threads = 4;
    params.offset_ms = 0;
    params.no_context = true;
    params.single_segment = false;
    
    // Run transcription
    int result = whisper_full(ctx, params, audio_data_arr, len);
    
    env->ReleaseFloatArrayElements(audioData, audio_data_arr, JNI_ABORT);
    
    if (result != 0) {
        LOGE("Whisper transcription failed with code: %d", result);
        return env->NewStringUTF("Error: Transcription failed");
    }
    
    // Collect transcription segments
    std::string transcription;
    const int n_segments = whisper_full_n_segments(ctx);
    
    for (int i = 0; i < n_segments; i++) {
        const char *text = whisper_full_get_segment_text(ctx, i);
        transcription += text;
        if (i < n_segments - 1) {
            transcription += " ";
        }
    }
    
    return env->NewStringUTF(transcription.c_str());
}

// Get system info
JNIEXPORT jstring JNICALL
Java_com_sonu_WhisperService_getSystemInfo(
    JNIEnv *env,
    jobject /* this */) {
    
    const char *sysinfo = whisper_print_system_info();
    return env->NewStringUTF(sysinfo);
}

} // extern "C"

