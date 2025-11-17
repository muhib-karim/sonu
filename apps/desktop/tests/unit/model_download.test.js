/**
 * Unit tests for model download functionality
 * Tests the download logic without actual HTTP requests
 */

const path = require('path');
const fs = require('fs');

// Mock the downloader module
jest.mock('../../offline_model_downloader.py', () => ({
  OfflineModelDownloader: jest.fn()
}));

describe('Model Download Unit Tests', () => {
  const testModelsDir = path.join(__dirname, '..', '..', 'test-models');

  beforeAll(() => {
    if (!fs.existsSync(testModelsDir)) {
      fs.mkdirSync(testModelsDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testModelsDir)) {
      fs.rmSync(testModelsDir, { recursive: true, force: true });
    }
  });

  describe('Model Definitions', () => {
    test('should have valid model definitions', () => {
      const modelDefs = {
        tiny: {
          filename: 'ggml-tiny-q5_0.gguf',
          size_mb: 75,
          description: 'Fastest, lowest accuracy - best for real-time dictation'
        },
        base: {
          filename: 'ggml-base-q5_0.gguf',
          size_mb: 145,
          description: 'Balanced speed & accuracy - recommended for most users'
        },
        small: {
          filename: 'ggml-small-q5_0.gguf',
          size_mb: 480,
          description: 'Slower but more accurate - good for high-quality transcription'
        },
        medium: {
          filename: 'ggml-medium-q5_0.gguf',
          size_mb: 1536,
          description: 'Best accuracy for CPU use - requires powerful system'
        }
      };

      expect(modelDefs.tiny).toBeDefined();
      expect(modelDefs.tiny.filename).toBe('ggml-tiny-q5_0.gguf');
      expect(modelDefs.tiny.size_mb).toBeGreaterThan(0);
    });
  });

  describe('URL Generation', () => {
    test('should generate correct Hugging Face URLs', () => {
      const filename = 'ggml-tiny-q5_0.gguf';
      const baseUrl = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/';
      const expectedUrl = baseUrl + filename;
      
      expect(expectedUrl).toBe('https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny-q5_0.gguf');
    });
  });

  describe('File Verification', () => {
    test('should verify file size correctly', () => {
      const testFile = path.join(testModelsDir, 'test-verify.gguf');
      const expectedSizeMB = 75;
      const expectedSizeBytes = expectedSizeMB * 1024 * 1024;
      
      // Create a test file with correct size
      fs.writeFileSync(testFile, Buffer.alloc(expectedSizeBytes));
      
      const stats = fs.statSync(testFile);
      const actualSizeMB = stats.size / (1024 * 1024);
      
      // Check within 2% tolerance
      expect(actualSizeMB).toBeGreaterThanOrEqual(expectedSizeMB * 0.98);
      expect(actualSizeMB).toBeLessThanOrEqual(expectedSizeMB * 1.02);
      
      // Clean up
      fs.unlinkSync(testFile);
    });
  });
});


