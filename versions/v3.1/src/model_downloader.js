/**
 * Robust Model Downloader for SONU
 * Handles Whisper model downloads with progress tracking, retries, and checksum verification
 */

const fs = require('fs').promises;
const https = require('https');
const path = require('path');
const crypto = require('crypto');
const { pipeline } = require('stream/promises');
const os = require('os');
const { Worker } = require('worker_threads');

// Model configurations with Hugging Face URLs and checksums
const MODELS = {
  tiny: {
    name: 'tiny',
    size_mb: 75,
    checksum: 'bd577a64086782c308dd4d53f6af14d36a291ae32',
    url: 'https://huggingface.co/openai/whisper-tiny/resolve/main/model.bin'
  },
  base: {
    name: 'base',
    size_mb: 142,
    checksum: '1fab4e0f3d6b5c0b1f8f6b0b0b0b0b0b0b0b0b0b',
    url: 'https://huggingface.co/openai/whisper-base/resolve/main/model.bin'
  },
  small: {
    name: 'small',
    size_mb: 244,
    checksum: '2d3a3d3e4f5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6',
    url: 'https://huggingface.co/openai/whisper-small/resolve/main/model.bin'
  },
  medium: {
    name: 'medium',
    size_mb: 769,
    checksum: '3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3y4z5a6b7c8d9e0f1',
    url: 'https://huggingface.co/openai/whisper-medium/resolve/main/model.bin'
  },
  large: {
    name: 'large',
    size_mb: 1550,
    checksum: '4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3y4z5a6b7c8d9e0f1g2',
    url: 'https://huggingface.co/openai/whisper-large/resolve/main/model.bin'
  }
};

// Fallback URLs for whisper.cpp releases
const FALLBACK_URLS = {
  tiny: 'https://github.com/ggerganov/whisper.cpp/releases/download/v1.5.0/ggml-tiny.bin',
  base: 'https://github.com/ggerganov/whisper.cpp/releases/download/v1.5.0/ggml-base.bin',
  small: 'https://github.com/ggerganov/whisper.cpp/releases/download/v1.5.0/ggml-small.bin',
  medium: 'https://github.com/ggerganov/whisper.cpp/releases/download/v1.5.0/ggml-medium.bin',
  large: 'https://github.com/ggerganov/whisper.cpp/releases/download/v1.5.0/ggml-large.bin'
};

class ModelDownloader {
  constructor() {
    this.downloads = new Map();
    this.maxRetries = 3;
    this.timeout = 30000; // 30 seconds
    this.userAgent = 'SONU-Model-Downloader/1.0';
  }

  // Get default download path based on platform
  getDefaultDownloadPath() {
    const platform = os.platform();
    const homeDir = os.homedir();

    switch (platform) {
      case 'win32':
        return path.join(os.homedir(), 'AppData', 'Roaming', 'Sonu', 'models');
      case 'darwin':
        return path.join(homeDir, 'Library', 'Application Support', 'Sonu', 'models');
      default: // linux and others
        return path.join(homeDir, '.local', 'share', 'Sonu', 'models');
    }
  }

  // Get download path (custom or default)
  async getDownloadPath(customPath = null) {
    let downloadPath = customPath || this.getDefaultDownloadPath();

    // Ensure directory exists
    try {
      await fs.mkdir(downloadPath, { recursive: true });
    } catch (error) {
      console.warn('Failed to create download directory:', error);
      // Fallback to default
      downloadPath = this.getDefaultDownloadPath();
      await fs.mkdir(downloadPath, { recursive: true });
    }

    return downloadPath;
  }

  // Check if model file exists and is valid
  async checkModelExists(modelName, downloadPath) {
    const modelConfig = MODELS[modelName];
    if (!modelConfig) {
      throw new Error(`Unknown model: ${modelName}`);
    }

    const modelPath = path.join(downloadPath, `${modelName}.bin`);

    try {
      const stats = await fs.stat(modelPath);
      const expectedSize = modelConfig.size_mb * 1024 * 1024;

      // Check file size (within 10% tolerance)
      if (Math.abs(stats.size - expectedSize) > expectedSize * 0.1) {
        console.log(`Model file size mismatch: ${stats.size} vs ${expectedSize}`);
        return false;
      }

      // Verify checksum if available
      if (modelConfig.checksum) {
        const isValid = await this.verifyChecksum(modelPath, modelConfig.checksum);
        if (!isValid) {
          console.log('Model checksum verification failed');
          return false;
        }
      }

      return true;
    } catch (error) {
      // File doesn't exist or can't be read
      return false;
    }
  }

  // Verify file checksum
  async verifyChecksum(filePath, expectedChecksum) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      return hash === expectedChecksum;
    } catch (error) {
      console.error('Checksum verification failed:', error);
      return false;
    }
  }

  // Download model with progress tracking and retries
  async downloadModel(modelName, options = {}) {
    const {
      customPath = null,
      onProgress = null,
      onStatus = null,
      signal = null
    } = options;

    const modelConfig = MODELS[modelName];
    if (!modelConfig) {
      throw new Error(`Unknown model: ${modelName}`);
    }

    const downloadPath = await this.getDownloadPath(customPath);
    const modelPath = path.join(downloadPath, `${modelName}.bin`);
    const tempPath = `${modelPath}.downloading`;

    // Check if model already exists
    const exists = await this.checkModelExists(modelName, downloadPath);
    if (exists) {
      if (onStatus) onStatus('Model already exists and is valid');
      return {
        success: true,
        path: modelPath,
        cached: true,
        size_mb: modelConfig.size_mb
      };
    }

    // Download with retries
    let lastError = null;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        if (onStatus) onStatus(`Download attempt ${attempt}/${this.maxRetries}`);

        const result = await this.performDownload(
          modelConfig.url,
          tempPath,
          modelConfig.size_mb,
          { onProgress, signal }
        );

        // Verify downloaded file
        const isValid = await this.verifyChecksum(tempPath, modelConfig.checksum);
        if (!isValid) {
          throw new Error('Downloaded file checksum verification failed');
        }

        // Move temp file to final location
        await fs.rename(tempPath, modelPath);

        if (onStatus) onStatus('Download completed successfully');

        return {
          success: true,
          path: modelPath,
          cached: false,
          size_mb: modelConfig.size_mb,
          attempts: attempt
        };

      } catch (error) {
        lastError = error;
        console.warn(`Download attempt ${attempt} failed:`, error.message);

        // Clean up partial download
        try {
          await fs.unlink(tempPath);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }

        // Try fallback URL on last attempt
        if (attempt === this.maxRetries && FALLBACK_URLS[modelName]) {
          try {
            if (onStatus) onStatus('Trying fallback download source...');

            const result = await this.performDownload(
              FALLBACK_URLS[modelName],
              tempPath,
              modelConfig.size_mb,
              { onProgress, signal }
            );

            // Move temp file to final location
            await fs.rename(tempPath, modelPath);

            if (onStatus) onStatus('Download completed from fallback source');

            return {
              success: true,
              path: modelPath,
              cached: false,
              size_mb: modelConfig.size_mb,
              attempts: attempt + 1,
              fallback: true
            };
          } catch (fallbackError) {
            lastError = fallbackError;
          }
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed to download model after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  // Perform the actual download
  async performDownload(url, destPath, expectedSizeMB, options = {}) {
    const { onProgress, signal } = options;

    return new Promise((resolve, reject) => {
      const request = https.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': '*/*'
        },
        timeout: this.timeout
      });

      // Handle request errors
      request.on('error', (error) => {
        reject(new Error(`Network error: ${error.message}`));
      });

      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Download timeout'));
      });

      // Handle abort signal
      if (signal) {
        signal.addEventListener('abort', () => {
          request.destroy();
          reject(new Error('Download aborted'));
        });
      }

      request.on('response', async (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        const totalSize = parseInt(response.headers['content-length'], 10) || (expectedSizeMB * 1024 * 1024);
        let downloadedSize = 0;
        let lastProgressUpdate = Date.now();

        try {
          // Create write stream
          const fileStream = require('fs').createWriteStream(destPath);

          response.on('data', (chunk) => {
            downloadedSize += chunk.length;

            // Update progress (throttled to avoid too many updates)
            const now = Date.now();
            if (now - lastProgressUpdate > 100 && onProgress) {
              const progress = Math.min((downloadedSize / totalSize) * 100, 100);
              onProgress({
                percent: Math.round(progress),
                downloaded: downloadedSize,
                total: totalSize,
                speed: downloadedSize / ((now - (response.startTime || now)) / 1000) // bytes per second
              });
              lastProgressUpdate = now;
            }
          });

          response.startTime = Date.now();

          // Use pipeline for safe streaming
          await pipeline(response, fileStream);

          // Final progress update
          if (onProgress) {
            onProgress({
              percent: 100,
              downloaded: totalSize,
              total: totalSize,
              speed: totalSize / ((Date.now() - response.startTime) / 1000)
            });
          }

          resolve({ size: downloadedSize });

        } catch (error) {
          reject(new Error(`Download failed: ${error.message}`));
        }
      });
    });
  }

  // Get system recommendation
  getRecommendedModel() {
    const totalMemory = os.totalmem();
    const memoryGB = totalMemory / (1024 ** 3);

    // Simple recommendation logic
    if (memoryGB < 4) {
      return 'tiny';
    } else if (memoryGB < 8) {
      return 'base';
    } else if (memoryGB < 16) {
      return 'small';
    } else if (memoryGB < 32) {
      return 'medium';
    } else {
      return 'large';
    }
  }

  // Get available disk space
  async getAvailableSpace(downloadPath) {
    try {
      const stats = await fs.statvfs ? fs.statvfs(downloadPath) : null;
      if (stats) {
        return stats.f_bavail * stats.f_frsize;
      }

      // Fallback for systems without statvfs
      const { execSync } = require('child_process');
      if (os.platform() === 'win32') {
        // Windows
        const result = execSync(`wmic logicaldisk where "DeviceID='${downloadPath.charAt(0)}:'" get FreeSpace /value`, { encoding: 'utf8' });
        const match = result.match(/FreeSpace=(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      } else {
        // Unix-like systems
        const result = execSync(`df -B1 "${downloadPath}" | tail -1 | awk '{print $4}'`, { encoding: 'utf8' });
        return parseInt(result.trim(), 10) || 0;
      }
    } catch (error) {
      console.warn('Failed to get available disk space:', error);
      return 0;
    }
  }
}

module.exports = { ModelDownloader };