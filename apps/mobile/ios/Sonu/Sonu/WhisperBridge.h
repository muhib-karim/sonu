//
//  WhisperBridge.h
//  Sonu
//
//  Objective-C bridge for Whisper.cpp on iOS
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface WhisperBridge : NSObject

/**
 * Initialize whisper context from model file
 * @param modelPath Path to the whisper model file (.bin)
 * @return true if initialization successful, false otherwise
 */
- (BOOL)initContext:(NSString *)modelPath;

/**
 * Free the whisper context
 */
- (void)freeContext;

/**
 * Transcribe audio file
 * @param audioPath Path to the audio file (WAV format, 16kHz, mono)
 * @return Transcription text or error message
 */
- (NSString *)transcribe:(NSString *)audioPath;

/**
 * Transcribe from float array (for real-time audio)
 * @param audioData Audio samples as NSArray of NSNumber (float) (16kHz, mono, normalized to [-1, 1])
 * @return Transcription text or error message
 */
- (NSString *)transcribeFromFloatArray:(NSArray<NSNumber *> *)audioData;

/**
 * Get system information
 * @return System info string
 */
- (NSString *)getSystemInfo;

/**
 * Check if context is initialized
 * @return true if initialized, false otherwise
 */
- (BOOL)isInitialized;

@end

NS_ASSUME_NONNULL_END

