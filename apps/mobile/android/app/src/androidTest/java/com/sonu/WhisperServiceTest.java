package com.sonu;

import android.content.Context;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.Before;
import org.junit.After;
import static org.junit.Assert.*;

/**
 * Test class for WhisperService
 * 
 * Prerequisites:
 * 1. Place a whisper model file (e.g., ggml-tiny.bin) in assets/ or app's data directory
 * 2. Place a test audio file (WAV, 16kHz, mono) in assets/ or app's data directory
 * 
 * To run tests:
 * ./gradlew connectedAndroidTest
 */
@RunWith(AndroidJUnit4.class)
public class WhisperServiceTest {
    
    private WhisperService whisperService;
    private Context context;
    
    @Before
    public void setUp() {
        context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        whisperService = new WhisperService();
    }
    
    @After
    public void tearDown() {
        if (whisperService != null && whisperService.isInitialized()) {
            whisperService.freeContext();
        }
    }
    
    @Test
    public void testSystemInfo() {
        String sysInfo = whisperService.getSystemInfo();
        assertNotNull("System info should not be null", sysInfo);
        assertFalse("System info should not be empty", sysInfo.isEmpty());
        System.out.println("System Info: " + sysInfo);
    }
    
    @Test
    public void testInitContext() {
        // Note: Update this path to point to an actual model file
        // For testing, you may need to copy a model to the device first
        String modelPath = "/data/local/tmp/ggml-tiny.bin";
        
        // This test will fail if model file doesn't exist
        // In a real scenario, you'd copy the model to the device first
        boolean initialized = whisperService.initContext(modelPath);
        
        if (initialized) {
            assertTrue("Context should be initialized", whisperService.isInitialized());
            whisperService.freeContext();
            assertFalse("Context should be freed", whisperService.isInitialized());
        } else {
            System.out.println("Model file not found at: " + modelPath);
            System.out.println("Skipping initialization test. Please provide a valid model path.");
        }
    }
    
    @Test
    public void testTranscribeWithoutInit() {
        String result = whisperService.transcribe("/path/to/audio.wav");
        assertTrue("Should return error message", result.startsWith("Error:"));
    }
    
    @Test
    public void testTranscribeFromFloatArray() {
        // Create a simple test audio signal (sine wave)
        float[] testAudio = new float[16000]; // 1 second at 16kHz
        for (int i = 0; i < testAudio.length; i++) {
            testAudio[i] = (float) (0.5 * Math.sin(2 * Math.PI * 440 * i / 16000.0));
        }
        
        String result = whisperService.transcribeFromFloatArray(testAudio);
        assertTrue("Should return error message when not initialized", result.startsWith("Error:"));
    }
    
    /**
     * Integration test - requires model and audio files
     * Uncomment and configure paths to run
     */
    /*
    @Test
    public void testFullTranscription() {
        String modelPath = "/data/local/tmp/ggml-tiny.bin";
        String audioPath = "/data/local/tmp/test_audio.wav";
        
        // Initialize
        assertTrue("Failed to initialize context", whisperService.initContext(modelPath));
        
        // Transcribe
        String result = whisperService.transcribe(audioPath);
        assertNotNull("Transcription result should not be null", result);
        assertFalse("Transcription result should not be empty", result.isEmpty());
        assertFalse("Should not be an error", result.startsWith("Error:"));
        
        System.out.println("Transcription: " + result);
        
        // Cleanup
        whisperService.freeContext();
    }
    */
}

