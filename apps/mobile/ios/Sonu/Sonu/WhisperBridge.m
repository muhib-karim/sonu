//
//  WhisperBridge.m
//  Sonu
//
//  Objective-C bridge implementation for Whisper.cpp on iOS
//

#import "WhisperBridge.h"
#import "whisper.h"
#import <AVFoundation/AVFoundation.h>

@interface WhisperBridge ()
@property (nonatomic, assign) struct whisper_context *context;
@end

@implementation WhisperBridge

- (instancetype)init {
    self = [super init];
    if (self) {
        _context = NULL;
    }
    return self;
}

- (void)dealloc {
    [self freeContext];
}

- (BOOL)initContext:(NSString *)modelPath {
    if (_context != NULL) {
        NSLog(@"Warning: Context already initialized. Freeing existing context.");
        [self freeContext];
    }
    
    if (![[NSFileManager defaultManager] fileExistsAtPath:modelPath]) {
        NSLog(@"Error: Model file not found at path: %@", modelPath);
        return NO;
    }
    
    NSLog(@"Initializing whisper context from: %@", modelPath);
    
    struct whisper_context_params cparams = whisper_context_default_params();
    
#if TARGET_OS_SIMULATOR
    cparams.use_gpu = false;
    NSLog(@"Running on simulator, using CPU");
#endif
    
    _context = whisper_init_from_file_with_params([modelPath UTF8String], cparams);
    
    if (_context == NULL) {
        NSLog(@"Error: Failed to initialize whisper context");
        return NO;
    }
    
    NSLog(@"Whisper context initialized successfully");
    return YES;
}

- (void)freeContext {
    if (_context != NULL) {
        whisper_free(_context);
        _context = NULL;
        NSLog(@"Whisper context freed");
    }
}

- (NSString *)transcribe:(NSString *)audioPath {
    if (_context == NULL) {
        return @"Error: Context not initialized. Call initContext: first.";
    }
    
    if (![[NSFileManager defaultManager] fileExistsAtPath:audioPath]) {
        return [NSString stringWithFormat:@"Error: Audio file not found at path: %@", audioPath];
    }
    
    NSLog(@"Transcribing audio file: %@", audioPath);
    
    // Read audio file using AVFoundation
    NSURL *audioURL = [NSURL fileURLWithPath:audioPath];
    AVAsset *asset = [AVAsset assetWithURL:audioURL];
    
    NSError *error = nil;
    AVAssetReader *reader = [[AVAssetReader alloc] initWithAsset:asset error:&error];
    if (error) {
        return [NSString stringWithFormat:@"Error: Failed to read audio file: %@", error.localizedDescription];
    }
    
    NSArray<AVAssetTrack *> *audioTracks = [asset tracksWithMediaType:AVMediaTypeAudio];
    if (audioTracks.count == 0) {
        return @"Error: No audio track found in file";
    }
    
    AVAssetTrack *audioTrack = audioTracks[0];
    NSDictionary *outputSettings = @{
        AVFormatIDKey: @(kAudioFormatLinearPCM),
        AVLinearPCMBitDepthKey: @(32),
        AVLinearPCMIsFloatKey: @(YES),
        AVLinearPCMIsBigEndianKey: @(NO),
        AVSampleRateKey: @(WHISPER_SAMPLE_RATE),
        AVNumberOfChannelsKey: @(1)
    };
    
    AVAssetReaderTrackOutput *output = [[AVAssetReaderTrackOutput alloc] initWithTrack:audioTrack outputSettings:outputSettings];
    [reader addOutput:output];
    
    if (![reader startReading]) {
        return @"Error: Failed to start reading audio";
    }
    
    NSMutableData *audioData = [NSMutableData data];
    CMSampleBufferRef sampleBuffer = NULL;
    
    while ((sampleBuffer = [output copyNextSampleBuffer])) {
        CMBlockBufferRef blockBuffer = CMSampleBufferGetDataBuffer(sampleBuffer);
        size_t length = CMBlockBufferGetDataLength(blockBuffer);
        void *data = malloc(length);
        CMBlockBufferCopyDataBytes(blockBuffer, 0, length, data);
        [audioData appendBytes:data length:length];
        free(data);
        CFRelease(sampleBuffer);
    }
    
    float *audioFloats = (float *)audioData.bytes;
    NSUInteger sampleCount = audioData.length / sizeof(float);
    
    NSLog(@"Read %lu audio samples", (unsigned long)sampleCount);
    
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
    int result = whisper_full(_context, params, audioFloats, (int)sampleCount);
    
    if (result != 0) {
        NSLog(@"Whisper transcription failed with code: %d", result);
        return [NSString stringWithFormat:@"Error: Transcription failed with code %d", result];
    }
    
    // Collect transcription segments
    NSMutableString *transcription = [NSMutableString string];
    const int n_segments = whisper_full_n_segments(_context);
    
    NSLog(@"Found %d segments", n_segments);
    
    for (int i = 0; i < n_segments; i++) {
        const char *text = whisper_full_get_segment_text(_context, i);
        [transcription appendString:[NSString stringWithUTF8String:text]];
        if (i < n_segments - 1) {
            [transcription appendString:@" "];
        }
    }
    
    NSLog(@"Transcription complete: %@", transcription);
    
    return [transcription copy];
}

- (NSString *)transcribeFromFloatArray:(NSArray<NSNumber *> *)audioData {
    if (_context == NULL) {
        return @"Error: Context not initialized. Call initContext: first.";
    }
    
    NSUInteger sampleCount = audioData.count;
    float *audioFloats = (float *)malloc(sampleCount * sizeof(float));
    
    for (NSUInteger i = 0; i < sampleCount; i++) {
        audioFloats[i] = [audioData[i] floatValue];
    }
    
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
    int result = whisper_full(_context, params, audioFloats, (int)sampleCount);
    
    free(audioFloats);
    
    if (result != 0) {
        NSLog(@"Whisper transcription failed with code: %d", result);
        return [NSString stringWithFormat:@"Error: Transcription failed with code %d", result];
    }
    
    // Collect transcription segments
    NSMutableString *transcription = [NSMutableString string];
    const int n_segments = whisper_full_n_segments(_context);
    
    for (int i = 0; i < n_segments; i++) {
        const char *text = whisper_full_get_segment_text(_context, i);
        [transcription appendString:[NSString stringWithUTF8String:text]];
        if (i < n_segments - 1) {
            [transcription appendString:@" "];
        }
    }
    
    return [transcription copy];
}

- (NSString *)getSystemInfo {
    const char *sysinfo = whisper_print_system_info();
    return [NSString stringWithUTF8String:sysinfo];
}

- (BOOL)isInitialized {
    return _context != NULL;
}

@end

