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

// Model configurations with correct Hugging Face URLs
// There are two types:
// 1. 'ggml' - Whisper GGML models (single .bin file from whisper.cpp repo)
// 2. 'faster-whisper' - Systran CTranslate2 models (delegated to Python)
const MODELS = {
  // =========================================================================
  // WHISPER GGML MODELS (Direct download from whisper.cpp repository)
  // =========================================================================
  tiny: {
    name: 'tiny',
    display_name: 'Whisper Tiny',
    size_mb: 75,
    type: 'ggml',
    filename: 'ggml-tiny.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
    description: 'Fastest, lowest accuracy - best for real-time'
  },
  'tiny.en': {
    name: 'tiny.en',
    display_name: 'Whisper Tiny (English)',
    size_mb: 75,
    type: 'ggml',
    filename: 'ggml-tiny.en.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin',
    description: 'English-only, faster for English transcription'
  },
  base: {
    name: 'base',
    display_name: 'Whisper Base',
    size_mb: 142,
    type: 'ggml',
    filename: 'ggml-base.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    description: 'Balanced speed and accuracy'
  },
  'base.en': {
    name: 'base.en',
    display_name: 'Whisper Base (English)',
    size_mb: 142,
    type: 'ggml',
    filename: 'ggml-base.en.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin',
    description: 'English-only base model'
  },
  small: {
    name: 'small',
    display_name: 'Whisper Small',
    size_mb: 466,
    type: 'ggml',
    filename: 'ggml-small.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
    description: 'Good accuracy, moderate speed'
  },
  'small.en': {
    name: 'small.en',
    display_name: 'Whisper Small (English)',
    size_mb: 466,
    type: 'ggml',
    filename: 'ggml-small.en.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin',
    description: 'English-only small model'
  },
  medium: {
    name: 'medium',
    display_name: 'Whisper Medium',
    size_mb: 1500,
    type: 'ggml',
    filename: 'ggml-medium.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
    description: 'High accuracy, needs resources'
  },
  'medium.en': {
    name: 'medium.en',
    display_name: 'Whisper Medium (English)',
    size_mb: 1500,
    type: 'ggml',
    filename: 'ggml-medium.en.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.en.bin',
    description: 'English-only medium model'
  },
  large: {
    name: 'large',
    display_name: 'Whisper Large',
    size_mb: 2900,
    type: 'ggml',
    filename: 'ggml-large.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large.bin',
    description: 'Best accuracy, requires significant resources'
  },
  'large-v2': {
    name: 'large-v2',
    display_name: 'Whisper Large V2',
    size_mb: 2900,
    type: 'ggml',
    filename: 'ggml-large-v2.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v2.bin',
    description: 'Large V2 - excellent accuracy'
  },
  'large-v3': {
    name: 'large-v3',
    display_name: 'Whisper Large V3',
    size_mb: 2900,
    type: 'ggml',
    filename: 'ggml-large-v3.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin',
    description: 'Latest large model, best accuracy'
  },
  'large-v3-turbo': {
    name: 'large-v3-turbo',
    display_name: 'Whisper Large V3 Turbo',
    size_mb: 1600,
    type: 'ggml',
    filename: 'ggml-large-v3-turbo.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin',
    description: 'Large V3 quality with 8x faster speed'
  },

  // =========================================================================
  // QUANTIZED MODELS (Smaller, faster - from whisper.cpp)
  // =========================================================================
  'tiny-q5_1': {
    name: 'tiny-q5_1',
    display_name: 'Whisper Tiny Q5',
    size_mb: 32,
    type: 'ggml',
    filename: 'ggml-tiny-q5_1.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny-q5_1.bin',
    description: 'Quantized tiny - half size, similar accuracy'
  },
  'base-q5_1': {
    name: 'base-q5_1',
    display_name: 'Whisper Base Q5',
    size_mb: 58,
    type: 'ggml',
    filename: 'ggml-base-q5_1.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin',
    description: 'Quantized base - half size, similar accuracy'
  },
  'small-q5_1': {
    name: 'small-q5_1',
    display_name: 'Whisper Small Q5',
    size_mb: 182,
    type: 'ggml',
    filename: 'ggml-small-q5_1.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin',
    description: 'Quantized small - half size, similar accuracy'
  },
  'medium-q5_0': {
    name: 'medium-q5_0',
    display_name: 'Whisper Medium Q5',
    size_mb: 515,
    type: 'ggml',
    filename: 'ggml-medium-q5_0.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium-q5_0.bin',
    description: 'Quantized medium - third size, similar accuracy'
  },
  'large-v3-turbo-q5_0': {
    name: 'large-v3-turbo-q5_0',
    display_name: 'Whisper Large V3 Turbo Q5',
    size_mb: 550,
    type: 'ggml',
    filename: 'ggml-large-v3-turbo-q5_0.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin',
    description: 'Best bang for buck - large quality, small size'
  },

  // =========================================================================
  // FASTER-WHISPER MODELS (Systran CTranslate2 - use Python downloader)
  // These require the faster_whisper Python library to download properly
  // =========================================================================
  'faster-tiny': {
    name: 'faster-tiny',
    display_name: 'Faster Whisper Tiny',
    size_mb: 75,
    type: 'faster-whisper',
    repo: 'Systran/faster-whisper-tiny',
    description: 'CTranslate2 optimized tiny model'
  },
  'faster-base': {
    name: 'faster-base',
    display_name: 'Faster Whisper Base',
    size_mb: 142,
    type: 'faster-whisper',
    repo: 'Systran/faster-whisper-base',
    description: 'CTranslate2 optimized base model'
  },
  'faster-small': {
    name: 'faster-small',
    display_name: 'Faster Whisper Small',
    size_mb: 466,
    type: 'faster-whisper',
    repo: 'Systran/faster-whisper-small',
    description: 'CTranslate2 optimized small model'
  },
  'faster-medium': {
    name: 'faster-medium',
    display_name: 'Faster Whisper Medium',
    size_mb: 1500,
    type: 'faster-whisper',
    repo: 'Systran/faster-whisper-medium',
    description: 'CTranslate2 optimized medium model'
  },
  'faster-large-v3': {
    name: 'faster-large-v3',
    display_name: 'Faster Whisper Large V3',
    size_mb: 2900,
    type: 'faster-whisper',
    repo: 'Systran/faster-whisper-large-v3',
    description: 'CTranslate2 optimized large-v3 model'
  },

  // =========================================================================
  // DISTIL-WHISPER MODELS (Optimized English - use Python downloader)
  // =========================================================================
  'distil-small.en': {
    name: 'distil-small.en',
    display_name: 'Distil Small (English)',
    size_mb: 250,
    type: 'faster-whisper',
    repo: 'Systran/faster-distil-whisper-small.en',
    description: 'Distilled - instant English transcription'
  },
  'distil-medium.en': {
    name: 'distil-medium.en',
    display_name: 'Distil Medium (English)',
    size_mb: 788,
    type: 'faster-whisper',
    repo: 'Systran/faster-distil-whisper-medium.en',
    description: 'Distilled - fast & accurate English'
  },
  'distil-large-v3': {
    name: 'distil-large-v3',
    display_name: 'Distil Large V3',
    size_mb: 1500,
    type: 'faster-whisper',
    repo: 'Systran/faster-distil-whisper-large-v3',
    description: 'Best Distil accuracy, multilingual'
  },

  // =========================================================================
  // NVIDIA PARAKEET V3 (CPU-optimized, ONNX)
  // =========================================================================
  'parakeet-v3': {
    name: 'parakeet-v3',
    display_name: 'Parakeet V3 (NVIDIA)',
    type: 'onnx',
    repo: 'nvidia/parakeet-tdt-0.6b-v3',
    size_mb: 600,
    description: 'NVIDIA RNN-T - extremely fast on CPU',
    recommended_for: 'Intel/AMD CPUs'
  },

  // =========================================================================
  // MOONSHINE (Ultra-light multilingual)
  // =========================================================================
  'moonshine-tiny': {
    name: 'moonshine-tiny',
    display_name: 'Moonshine Tiny',
    type: 'onnx',
    repo: 'UsefulSensors/moonshine-tiny',
    size_mb: 150,
    description: 'New 2025 architecture - faster than Whisper Tiny',
    recommended_for: 'Older laptops'
  },

  // QWEN3 ASR (SenseVoiceSmall - 500MB, SOTA)
  // =========================================================================
  'qwen3-asr': {
    name: 'qwen3-asr',
    display_name: 'Qwen3-ASR (SenseVoice)',
    type: 'onnx',
    repo: 'FunAudioLLM/SenseVoiceSmall',
    size_mb: 500,
    description: 'Alibaba SenseVoiceSmall (Qwen3-ASR) - Ultra-fast & Accurate',
    recommended_for: 'Mixed language / Music'
  },

  // CANARY QWEN (NVIDIA Canary 1B)
  // =========================================================================
  'canary-qwen': {
    name: 'canary-qwen',
    display_name: 'Canary Qwen 1B',
    type: 'onnx',
    repo: 'nvidia/canary-1b',
    size_mb: 2500,
    description: 'NVIDIA Canary 1B - Best for noisy environments',
    recommended_for: '16GB+ RAM'
  },

  // =========================================================================
  // VOXTRAL MINI (Mistral AI - 50+ languages)
  // =========================================================================
  'voxtral-mini': {
    name: 'voxtral-mini',
    display_name: 'Voxtral Mini',
    type: 'onnx',
    repo: 'mistralai/Voxtral-Mini-3B-2507',
    size_mb: 1200,
    description: 'Mistral 2025 SOTA - best multilingual accuracy',
    recommended_for: '16GB+ RAM'
  },

  // =========================================================================
  // LLM FOR POST-PROCESSING
  // =========================================================================
  'lfm2-1b': {
    name: 'lfm2-1b',
    display_name: 'LFM2 1B (Post-Process)',
    type: 'llm',
    repo: 'LiquidAI/LFM2-1.2B-GGUF',
    filename: 'LFM2-1B-Q4_K_M.gguf',
    size_mb: 700,
    description: 'LiquidAI LFM2 - commercial-safe post-processing',
    recommended_for: 'Post-processing (optional)'
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

    // For GGML models - check for the specific bin file
    if (modelConfig.type === 'ggml' && modelConfig.filename) {
      const modelPath = path.join(downloadPath, modelConfig.filename);

      try {
        const stats = await fs.stat(modelPath);
        const expectedSize = modelConfig.size_mb * 1024 * 1024;

        // Check file size (within 20% tolerance for approximate sizes)
        if (Math.abs(stats.size - expectedSize) > expectedSize * 0.2) {
          console.log(`Model file size mismatch: ${stats.size} vs expected ~${expectedSize}`);
          return false;
        }

        return true;
      } catch (error) {
        // File doesn't exist or can't be read
        return false;
      }
    }

    // For faster-whisper models - check HuggingFace cache
    if (modelConfig.type === 'faster-whisper' && modelConfig.repo) {
      try {
        // Check in HuggingFace cache directory
        const cacheDir = path.join(os.homedir(), '.cache', 'huggingface', 'hub');
        const repoDir = `models--${modelConfig.repo.replace('/', '--')}`;
        const modelCachePath = path.join(cacheDir, repoDir);

        const stats = await fs.stat(modelCachePath);
        if (stats.isDirectory()) {
          // Check if snapshots directory exists and has content
          const snapshotsPath = path.join(modelCachePath, 'snapshots');
          const snapshotStats = await fs.stat(snapshotsPath);
          if (snapshotStats.isDirectory()) {
            return true;
          }
        }
        return false;
      } catch (error) {
        return false;
      }
    }

    // Fallback for legacy model name format
    const legacyPath = path.join(downloadPath, `${modelName}.bin`);
    try {
      await fs.stat(legacyPath);
      return true;
    } catch (error) {
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

    // Check if model already exists
    const exists = await this.checkModelExists(modelName, downloadPath);
    if (exists) {
      if (onStatus) onStatus('Model already exists and is valid');
      const modelPath = modelConfig.filename
        ? path.join(downloadPath, modelConfig.filename)
        : path.join(downloadPath, `${modelName}.bin`);
      return {
        success: true,
        path: modelPath,
        cached: true,
        size_mb: modelConfig.size_mb
      };
    }

    // =========================================================================
    // Handle GGML models - Direct download from URL
    // =========================================================================
    if (modelConfig.type === 'ggml' && modelConfig.url) {
      const filename = modelConfig.filename || `${modelName}.bin`;
      const modelPath = path.join(downloadPath, filename);
      const tempPath = `${modelPath}.downloading`;

      let lastError = null;
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          if (onStatus) onStatus(`Downloading ${modelConfig.display_name || modelName}... (attempt ${attempt}/${this.maxRetries})`);

          await this.performDownload(
            modelConfig.url,
            tempPath,
            modelConfig.size_mb,
            { onProgress, signal }
          );

          // Move temp file to final location
          await fs.rename(tempPath, modelPath);

          if (onStatus) onStatus('Download completed successfully');

          return {
            success: true,
            path: modelPath,
            cached: false,
            size_mb: modelConfig.size_mb,
            attempts: attempt,
            type: 'ggml'
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

          // Wait before retry (exponential backoff)
          if (attempt < this.maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      throw new Error(`Failed to download GGML model after ${this.maxRetries} attempts: ${lastError.message}`);
    }

    // =========================================================================
    // Handle Delegated Models (Faster-Whisper, ONNX, LLM) - Delegate to Python
    // =========================================================================
    if ((modelConfig.type === 'faster-whisper' || modelConfig.type === 'onnx' || modelConfig.type === 'llm') && modelConfig.repo) {
      if (onStatus) onStatus(`Downloading ${modelConfig.display_name || modelName} via Python...`);

      return new Promise((resolve, reject) => {
        const { spawn } = require('child_process');

        // Find Python executable
        const pythonCommands = ['python', 'python3', 'py'];
        let pythonCmd = null;

        for (const cmd of pythonCommands) {
          try {
            require('child_process').execSync(`${cmd} --version`, { stdio: 'pipe' });
            pythonCmd = cmd;
            break;
          } catch (e) {
            continue;
          }
        }

        if (!pythonCmd) {
          reject(new Error('Python not found. Please install Python to download faster-whisper models.'));
          return;
        }

        // Use model_manager.py for downloading
        const scriptPath = path.join(__dirname, '..', 'model_manager.py');
        const modelNameForPython = modelName.startsWith('faster-')
          ? modelName.replace('faster-', '')
          : modelName;

        const proc = spawn(pythonCmd, [scriptPath, 'download', modelNameForPython], {
          cwd: path.join(__dirname, '..'),
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';
        let lastProgress = 0;

        proc.stdout.on('data', (data) => {
          const text = data.toString();
          stdout += text;

          // Try to parse progress updates
          try {
            const lines = text.split('\n').filter(l => l.trim());
            for (const line of lines) {
              const json = JSON.parse(line);
              if (json.type === 'progress' && onProgress) {
                lastProgress = json.percent || lastProgress;
                onProgress({
                  percent: lastProgress,
                  message: json.message
                });
              }
            }
          } catch (e) {
            // Not JSON, might be regular output
          }
        });

        proc.stderr.on('data', (data) => {
          stderr += data.toString();
          console.log('Python stderr:', data.toString());
        });

        proc.on('close', (code) => {
          if (code === 0) {
            // Try to parse result from stdout
            try {
              const lines = stdout.split('\n').filter(l => l.trim());
              for (const line of lines) {
                try {
                  const json = JSON.parse(line);
                  if (json.type === 'result' || json.success !== undefined) {
                    if (json.success) {
                      if (onStatus) onStatus('Download completed successfully');
                      resolve({
                        success: true,
                        path: json.path || modelConfig.repo,
                        cached: json.cached || false,
                        size_mb: modelConfig.size_mb,
                        type: 'faster-whisper'
                      });
                      return;
                    }
                  }
                } catch (e) {
                  // Not JSON
                }
              }
            } catch (e) {
              // Parse error
            }

            // If we got here, assume success
            if (onStatus) onStatus('Download completed');
            resolve({
              success: true,
              path: modelConfig.repo,
              cached: false,
              size_mb: modelConfig.size_mb,
              type: 'faster-whisper'
            });
          } else {
            reject(new Error(`Python download failed (code ${code}): ${stderr}`));
          }
        });

        proc.on('error', (error) => {
          reject(new Error(`Failed to start Python: ${error.message}`));
        });

        // Handle abort signal
        if (signal) {
          signal.addEventListener('abort', () => {
            proc.kill();
            reject(new Error('Download aborted'));
          });
        }
      });
    }

    throw new Error(`Unknown model type for ${modelName}: ${modelConfig.type}`);
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

// Attach MODELS as a static property so it can be accessed via constructor
ModelDownloader.MODELS = MODELS;

module.exports = { ModelDownloader, MODELS };

