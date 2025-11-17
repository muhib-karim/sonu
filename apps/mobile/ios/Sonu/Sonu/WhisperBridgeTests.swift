//
//  WhisperBridgeTests.swift
//  Sonu
//
//  Test class for WhisperBridge
//
//  Prerequisites:
//  1. Place a whisper model file (e.g., ggml-tiny.bin) in the app bundle
//  2. Place a test audio file (WAV, 16kHz, mono) in the app bundle
//

import XCTest
@testable import Sonu

class WhisperBridgeTests: XCTestCase {
    
    var whisperBridge: WhisperBridge!
    
    override func setUp() {
        super.setUp()
        whisperBridge = WhisperBridge()
    }
    
    override func tearDown() {
        if whisperBridge.isInitialized() {
            whisperBridge.freeContext()
        }
        whisperBridge = nil
        super.tearDown()
    }
    
    func testSystemInfo() {
        let sysInfo = whisperBridge.getSystemInfo()
        XCTAssertNotNil(sysInfo, "System info should not be nil")
        XCTAssertFalse(sysInfo.isEmpty, "System info should not be empty")
        print("System Info: \(sysInfo)")
    }
    
    func testInitContext() {
        // Note: Update this path to point to an actual model file in the bundle
        guard let modelPath = Bundle.main.path(forResource: "ggml-tiny", ofType: "bin") else {
            print("Model file not found in bundle. Skipping initialization test.")
            print("Please add a whisper model file to the app bundle.")
            return
        }
        
        let initialized = whisperBridge.initContext(modelPath)
        XCTAssertTrue(initialized, "Context should be initialized")
        XCTAssertTrue(whisperBridge.isInitialized(), "Context should be initialized")
        
        whisperBridge.freeContext()
        XCTAssertFalse(whisperBridge.isInitialized(), "Context should be freed")
    }
    
    func testTranscribeWithoutInit() {
        let result = whisperBridge.transcribe("/path/to/audio.wav")
        XCTAssertTrue(result.hasPrefix("Error:"), "Should return error message")
    }
    
    func testTranscribeFromFloatArray() {
        // Create a simple test audio signal (sine wave)
        var testAudio: [NSNumber] = []
        for i in 0..<16000 { // 1 second at 16kHz
            let sample = 0.5 * sin(2 * Double.pi * 440 * Double(i) / 16000.0)
            testAudio.append(NSNumber(value: Float(sample)))
        }
        
        let result = whisperBridge.transcribeFromFloatArray(testAudio)
        XCTAssertTrue(result.hasPrefix("Error:"), "Should return error message when not initialized")
    }
    
    /**
     * Integration test - requires model and audio files
     * Uncomment and configure paths to run
     */
    /*
    func testFullTranscription() {
        guard let modelPath = Bundle.main.path(forResource: "ggml-tiny", ofType: "bin") else {
            XCTFail("Model file not found")
            return
        }
        
        guard let audioPath = Bundle.main.path(forResource: "test_audio", ofType: "wav") else {
            XCTFail("Audio file not found")
            return
        }
        
        // Initialize
        XCTAssertTrue(whisperBridge.initContext(modelPath), "Failed to initialize context")
        
        // Transcribe
        let result = whisperBridge.transcribe(audioPath)
        XCTAssertNotNil(result, "Transcription result should not be nil")
        XCTAssertFalse(result.isEmpty, "Transcription result should not be empty")
        XCTAssertFalse(result.hasPrefix("Error:"), "Should not be an error")
        
        print("Transcription: \(result)")
        
        // Cleanup
        whisperBridge.freeContext()
    }
    */
}

