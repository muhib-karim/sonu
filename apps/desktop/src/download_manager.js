const EasyDl = require('easydl');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');

/**
 * Model Download Manager using easydl for robust pause/resume support
 * Handles downloading HuggingFace models with real-time progress tracking
 */
class ModelDownloadManager extends EventEmitter {
    constructor() {
        super();
        this.downloads = new Map(); // modelName -> { dl: EasyDl, files: [...], paused: bool }
        this.downloadStates = new Map(); // modelName -> state object
        this.stateFilePath = path.join(__dirname, '..', 'data', 'download_states.json');
        this.loadStates();
    }

    /**
     * HuggingFace model repository mapping
     */
    getModelConfig(modelName) {
        const configs = {
            'distil-small.en': {
                repo: 'Systran/faster-distil-whisper-small.en',
                files: [
                    'config.json',
                    'model.bin',
                    'preprocessor_config.json',
                    'tokenizer.json',
                    'tokenizer_config.json',
                    'vocabulary.json'
                ],
                expectedSizeMB: 250
            },
            'distil-medium.en': {
                repo: 'Systran/faster-distil-whisper-medium.en',
                files: [
                    'config.json',
                    'model.bin',
                    'preprocessor_config.json',
                    'tokenizer.json',
                    'tokenizer_config.json',
                    'vocabulary.json'
                ],
                expectedSizeMB: 420
            },
            'distil-large-v3': {
                repo: 'Systran/faster-distil-whisper-large-v3',
                files: [
                    'config.json',
                    'model.bin',
                    'preprocessor_config.json',
                    'tokenizer.json',
                    'tokenizer_config.json',
                    'vocabulary.json'
                ],
                expectedSizeMB: 756
            }
        };

        return configs[modelName] || null;
    }

    /**
     * Generate HuggingFace direct download URL
     */
    getDownloadUrl(modelName, filename) {
        const config = this.getModelConfig(modelName);
        if (!config) return null;

        return `https://huggingface.co/${config.repo}/resolve/main/${filename}`;
    }

    /**
     * Download a model with real-time progress
     */
    async downloadModel(modelName, targetDir, onProgress) {
        const config = this.getModelConfig(modelName);
        if (!config) {
            throw new Error(`Unknown model: ${modelName}`);
        }

        // Create target directory
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // Track overall progress across all files
        const fileProgress = new Map();
        let totalBytes = 0;
        let downloadedBytes = 0;

        const updateProgress = () => {
            const percent = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0;
            if (onProgress) {
                onProgress({
                    percent,
                    downloadedBytes,
                    totalBytes,
                    downloadedMB: downloadedBytes / (1024 * 1024),
                    totalMB: totalBytes / (1024 * 1024)
                });
            }
        };

        // Download each file
        const downloadPromises = [];

        for (const filename of config.files) {
            const url = this.getDownloadUrl(modelName, filename);
            const destPath = path.join(targetDir, filename);

            const dl = new EasyDl(url, destPath, {
                connections: 4, // Parallel connections for faster download
                maxRetry: 3,
                httpOptions: {
                    timeout: 30000
                }
            });

            // Track individual file progress
            dl.on('progress', (progress) => {
                // easydl progress: { total: { bytes, percentage, speed }, details: [...] }
                // progress.total.bytes = bytes downloaded so far
                // dl.size = total file size
                if (progress && progress.total) {
                    fileProgress.set(filename, {
                        total: dl.size || 0,
                        downloaded: progress.total.bytes || 0
                    });

                    // Calculate total progress
                    totalBytes = 0;
                    downloadedBytes = 0;
                    fileProgress.forEach((p) => {
                        totalBytes += p.total;
                        downloadedBytes += p.downloaded;
                    });

                    updateProgress();
                }
            });

            dl.on('end', () => {
                console.log(`✓ Downloaded: ${filename}`);
            });

            dl.on('error', (err) => {
                console.error(`✗ Error downloading ${filename}:`, err);
                this.emit('error', { modelName, filename, error: err.message });
            });

            // Store download instance
            if (!this.downloads.has(modelName)) {
                this.downloads.set(modelName, { files: [], paused: false });
            }
            this.downloads.get(modelName).files.push({ filename, dl });

            // Start download
            downloadPromises.push(dl.wait());
        }

        try {
            // Wait for all files to download
            await Promise.all(downloadPromises);

            // Download complete
            this.downloads.delete(modelName);
            this.downloadStates.delete(modelName);
            this.saveStates();

            return {
                success: true,
                modelName,
                path: targetDir,
                sizeMB: downloadedBytes / (1024 * 1024)
            };
        } catch (error) {
            throw new Error(`Download failed: ${error.message}`);
        }
    }

    /**
     * Pause a download
     */
    async pauseDownload(modelName) {
        const downloadInfo = this.downloads.get(modelName);
        if (!downloadInfo) {
            return { success: false, error: 'Download not found' };
        }

        // Pause all file downloads
        for (const { dl } of downloadInfo.files) {
            try {
                await dl.pause();
            } catch (e) {
                console.warn('Pause error:', e.message);
            }
        }

        downloadInfo.paused = true;

        // Save state
        this.downloadStates.set(modelName, {
            modelName,
            paused: true,
            timestamp: Date.now()
        });
        this.saveStates();

        return { success: true, modelName };
    }

    /**
     * Resume a paused download
     */
    async resumeDownload(modelName) {
        const downloadInfo = this.downloads.get(modelName);
        if (!downloadInfo) {
            return { success: false, error: 'Download not found' };
        }

        // Resume all file downloads
        for (const { dl } of downloadInfo.files) {
            try {
                await dl.resume();
            } catch (e) {
                console.warn('Resume error:', e.message);
            }
        }

        downloadInfo.paused = false;

        // Update state
        if (this.downloadStates.has(modelName)) {
            this.downloadStates.get(modelName).paused = false;
            this.saveStates();
        }

        return { success: true, modelName };
    }

    /**
     * Cancel a download
     */
    async cancelDownload(modelName) {
        const downloadInfo = this.downloads.get(modelName);
        if (!downloadInfo) {
            return { success: false, error: 'Download not found' };
        }

        // Cancel all file downloads
        for (const { dl } of downloadInfo.files) {
            try {
                await dl.destroy();
            } catch (e) {
                console.warn('Cancel error:', e.message);
            }
        }

        this.downloads.delete(modelName);
        this.downloadStates.delete(modelName);
        this.saveStates();

        return { success: true, modelName };
    }

    /**
     * Check if a download is in progress
     */
    isDownloading(modelName) {
        return this.downloads.has(modelName);
    }

    /**
     * Check if a download is paused
     */
    isPaused(modelName) {
        const downloadInfo = this.downloads.get(modelName);
        return downloadInfo ? downloadInfo.paused : false;
    }

    /**
     * Save download states to disk
     */
    saveStates() {
        try {
            const states = Array.from(this.downloadStates.values());
            const dir = path.dirname(this.stateFilePath);

            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(this.stateFilePath, JSON.stringify(states, null, 2));
        } catch (error) {
            console.error('Error saving download states:', error);
        }
    }

    /**
     * Load download states from disk
     */
    loadStates() {
        try {
            if (fs.existsSync(this.stateFilePath)) {
                const data = fs.readFileSync(this.stateFilePath, 'utf8');
                const states = JSON.parse(data);

                for (const state of states) {
                    this.downloadStates.set(state.modelName, state);
                }
            }
        } catch (error) {
            console.error('Error loading download states:', error);
        }
    }

    /**
     * Get all incomplete downloads (for restoration on app start)
     */
    getIncompleteDownloads() {
        return Array.from(this.downloadStates.values());
    }
}

module.exports = { ModelDownloadManager };
