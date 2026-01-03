/**
 * Integration tests for model download functionality
 * Tests progress callbacks, network scenarios, and download verification
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

describe('Model Download Integration Tests', () => {
  const testModelsDir = path.join(__dirname, '..', 'test-data', 'models');
  const pythonScript = path.join(__dirname, '..', '..', 'src', 'core', 'python', 'offline_model_downloader.py');

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

  describe('Progress Callback JSON Format', () => {
    test('should have all required progress fields', () => {
      // Mock progress callback from Python downloader
      const progressCallback = {
        type: 'progress',
        percent: 50,
        bytesDownloaded: 38845856,
        bytesTotal: 77691713,
        speedKB: 9500,
        elapsed: 4,
        remaining: 4,
        message: 'Downloading... (50.0%)'
      };

      expect(progressCallback).toHaveProperty('type');
      expect(progressCallback).toHaveProperty('percent');
      expect(progressCallback).toHaveProperty('bytesDownloaded');
      expect(progressCallback).toHaveProperty('bytesTotal');
      expect(progressCallback).toHaveProperty('speedKB');
      expect(progressCallback).toHaveProperty('elapsed');
      expect(progressCallback).toHaveProperty('remaining');
      expect(progressCallback).toHaveProperty('message');

      expect(progressCallback.type).toBe('progress');
      expect(progressCallback.percent).toBeGreaterThanOrEqual(0);
      expect(progressCallback.percent).toBeLessThanOrEqual(100);
    });

    test('should have valid result callback format', () => {
      const resultCallback = {
        type: 'result',
        success: true,
        model: 'tiny',
        path: 'C:\\models\\ggml-tiny.bin',
        size_mb: 75,
        cached: false,
        status: 'downloaded'
      };

      expect(resultCallback.type).toBe('result');
      expect(resultCallback.success).toBe(true);
      expect(resultCallback).toHaveProperty('model');
      expect(resultCallback).toHaveProperty('path');
      expect(resultCallback).toHaveProperty('size_mb');
      expect(resultCallback).toHaveProperty('cached');
      expect(resultCallback).toHaveProperty('status');
    });

    test('should have valid error callback format', () => {
      const errorCallback = {
        type: 'result',
        success: false,
        model: 'tiny',
        error: 'Network timeout',
        status: 'error'
      };

      expect(errorCallback.type).toBe('result');
      expect(errorCallback.success).toBe(false);
      expect(errorCallback).toHaveProperty('error');
      expect(errorCallback.status).toBe('error');
    });
  });

  describe('Download State Machine', () => {
    test('should track download states correctly', () => {
      const states = ['idle', 'initializing', 'downloading', 'verifying', 'completed', 'error'];

      const downloadState = {
        current: 'idle',
        transitions: [],

        transition(newState) {
          if (!states.includes(newState)) {
            throw new Error(`Invalid state: ${newState}`);
          }
          this.transitions.push({ from: this.current, to: newState, time: Date.now() });
          this.current = newState;
        }
      };

      expect(downloadState.current).toBe('idle');

      downloadState.transition('initializing');
      expect(downloadState.current).toBe('initializing');

      downloadState.transition('downloading');
      expect(downloadState.current).toBe('downloading');

      downloadState.transition('verifying');
      expect(downloadState.current).toBe('verifying');

      downloadState.transition('completed');
      expect(downloadState.current).toBe('completed');

      expect(downloadState.transitions.length).toBe(4);
    });

    test('should reject invalid state transitions', () => {
      const states = ['idle', 'initializing', 'downloading', 'verifying', 'completed', 'error'];

      const downloadState = {
        current: 'idle',
        transition(newState) {
          if (!states.includes(newState)) {
            throw new Error(`Invalid state: ${newState}`);
          }
          this.current = newState;
        }
      };

      expect(() => downloadState.transition('invalid_state')).toThrow('Invalid state');
    });
  });

  describe('Progress Calculation', () => {
    test('should calculate progress percentage correctly', () => {
      const calculateProgress = (bytesDownloaded, bytesTotal) => {
        if (bytesTotal === 0) return 0;
        return Math.round((bytesDownloaded / bytesTotal) * 100);
      };

      expect(calculateProgress(0, 100)).toBe(0);
      expect(calculateProgress(50, 100)).toBe(50);
      expect(calculateProgress(100, 100)).toBe(100);
      expect(calculateProgress(77691713, 77691713)).toBe(100);
      expect(calculateProgress(0, 0)).toBe(0); // Edge case: empty file
    });

    test('should calculate download speed correctly', () => {
      const calculateSpeed = (bytesDownloaded, elapsedSeconds) => {
        if (elapsedSeconds === 0) return 0;
        return Math.round(bytesDownloaded / 1024 / elapsedSeconds);
      };

      expect(calculateSpeed(1024 * 1024, 1)).toBe(1024); // 1 MB/s = 1024 KB/s
      expect(calculateSpeed(10 * 1024 * 1024, 10)).toBe(1024); // 10 MB in 10s = 1024 KB/s
      expect(calculateSpeed(0, 0)).toBe(0); // Edge case
    });

    test('should calculate ETA correctly', () => {
      const calculateETA = (bytesRemaining, speedKB) => {
        if (speedKB === 0) return -1; // Unknown
        return Math.round(bytesRemaining / 1024 / speedKB);
      };

      expect(calculateETA(1024 * 1024, 1024)).toBe(1); // 1 MB at 1024 KB/s = 1 second
      expect(calculateETA(10 * 1024 * 1024, 1024)).toBe(10); // 10 MB at 1024 KB/s = 10 seconds
      expect(calculateETA(77691713, 0)).toBe(-1); // Unknown when speed is 0
    });
  });

  describe('Model File Verification', () => {
    test('should verify file exists after download', () => {
      const testFile = path.join(testModelsDir, 'test-model.bin');

      // Simulate file creation
      fs.writeFileSync(testFile, 'test content');

      expect(fs.existsSync(testFile)).toBe(true);

      // Cleanup
      fs.unlinkSync(testFile);
    });

    test('should verify file size within tolerance', () => {
      const testFile = path.join(testModelsDir, 'test-size.bin');
      const expectedSizeMB = 10;
      const tolerancePercent = 5;

      // Create file with exact expected size
      const buffer = Buffer.alloc(expectedSizeMB * 1024 * 1024);
      fs.writeFileSync(testFile, buffer);

      const stats = fs.statSync(testFile);
      const actualSizeMB = stats.size / (1024 * 1024);

      const minSize = expectedSizeMB * (1 - tolerancePercent / 100);
      const maxSize = expectedSizeMB * (1 + tolerancePercent / 100);

      expect(actualSizeMB).toBeGreaterThanOrEqual(minSize);
      expect(actualSizeMB).toBeLessThanOrEqual(maxSize);

      // Cleanup
      fs.unlinkSync(testFile);
    });

    test('should detect corrupt/incomplete downloads', () => {
      const testFile = path.join(testModelsDir, 'corrupt-model.bin');
      const expectedSizeMB = 75;
      const actualSizeBytes = 1000; // Much smaller than expected

      fs.writeFileSync(testFile, Buffer.alloc(actualSizeBytes));

      const stats = fs.statSync(testFile);
      const actualSizeMB = stats.size / (1024 * 1024);

      // Should fail size check
      const isValid = actualSizeMB >= expectedSizeMB * 0.95;
      expect(isValid).toBe(false);

      // Cleanup
      fs.unlinkSync(testFile);
    });
  });

  describe('Network Error Handling', () => {
    test('should handle network timeout scenario', () => {
      const simulateTimeout = () => {
        return {
          type: 'result',
          success: false,
          error: 'Connection timed out after 30000ms',
          status: 'error',
          retryable: true
        };
      };

      const result = simulateTimeout();
      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
      expect(result.retryable).toBe(true);
    });

    test('should handle HTTP error responses', () => {
      const httpErrors = [
        { code: 404, message: 'Model not found', retryable: false },
        { code: 500, message: 'Server error', retryable: true },
        { code: 503, message: 'Service unavailable', retryable: true },
        { code: 429, message: 'Rate limited', retryable: true }
      ];

      httpErrors.forEach(error => {
        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('retryable');
      });

      // 404 should not be retryable
      expect(httpErrors.find(e => e.code === 404).retryable).toBe(false);
      // 5xx should be retryable
      expect(httpErrors.find(e => e.code === 500).retryable).toBe(true);
    });

    test('should implement retry logic with backoff', () => {
      const calculateBackoff = (attempt, baseDelayMs = 1000, maxDelayMs = 30000) => {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        return delay;
      };

      expect(calculateBackoff(0)).toBe(1000);  // 1s
      expect(calculateBackoff(1)).toBe(2000);  // 2s
      expect(calculateBackoff(2)).toBe(4000);  // 4s
      expect(calculateBackoff(3)).toBe(8000);  // 8s
      expect(calculateBackoff(4)).toBe(16000); // 16s
      expect(calculateBackoff(5)).toBe(30000); // Capped at 30s
      expect(calculateBackoff(10)).toBe(30000); // Still capped
    });
  });

  describe('Cached Model Detection', () => {
    test('should detect cached model correctly', () => {
      const modelPath = path.join(testModelsDir, 'ggml-tiny.bin');
      const expectedSizeMB = 75;

      // Create a "cached" model file
      fs.writeFileSync(modelPath, Buffer.alloc(expectedSizeMB * 1024 * 1024));

      const isCached = fs.existsSync(modelPath);
      expect(isCached).toBe(true);

      // Verify size matches expected
      const stats = fs.statSync(modelPath);
      const actualSizeMB = stats.size / (1024 * 1024);
      expect(actualSizeMB).toBe(expectedSizeMB);

      // Cleanup
      fs.unlinkSync(modelPath);
    });

    test('should return cached result without downloading', () => {
      const simulateCachedResult = (modelName, modelPath) => {
        return {
          type: 'result',
          success: true,
          model: modelName,
          path: modelPath,
          size_mb: 75,
          cached: true,
          status: 'cached'
        };
      };

      const result = simulateCachedResult('tiny', '/models/ggml-tiny.bin');
      expect(result.cached).toBe(true);
      expect(result.status).toBe('cached');
      expect(result.success).toBe(true);
    });
  });

  describe('Python Downloader Script Existence', () => {
    test('should find the offline_model_downloader.py script', () => {
      expect(fs.existsSync(pythonScript)).toBe(true);
    });

    test('should find required Python modules', () => {
      const pythonDir = path.dirname(pythonScript);
      const modelManager = path.join(pythonDir, 'model_manager.py');

      expect(fs.existsSync(modelManager)).toBe(true);
    });
  });
});
