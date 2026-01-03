const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');

/**
 * ModelManager - Single source of truth for AI models in SONU.
 * Handles metadata, download status, and execution.
 */
class ModelManager extends EventEmitter {
    constructor(pythonCorePath, modelsDir) {
        super();
        this.pythonCorePath = pythonCorePath;
        this.modelsDir = modelsDir;
        this.activeDownload = null;

        // Metadata from model_manager.py
        this.MODELS = {
            "tiny": { type: "whisper", size_mb: 75, display_name: "Whisper Tiny" },
            "base": { type: "whisper", size_mb: 142, display_name: "Whisper Base" },
            "small": { type: "whisper", size_mb: 466, display_name: "Whisper Small" },
            "distil-small.en": { type: "faster-whisper", size_mb: 250, display_name: "Distil Small (English)" },
            "distil-medium.en": { type: "faster-whisper", size_mb: 420, display_name: "Distil Medium (English)" },
            "moonshine-tiny": { type: "onnx", size_mb: 150, display_name: "Moonshine Tiny" },
            "canary-qwen": { type: "onnx", size_mb: 2500, display_name: "Canary Qwen 2.5B" }
        };
    }

    /**
     * Get list of all models with their download status
     */
    async listModels() {
        return new Promise((resolve, reject) => {
            const script = path.join(this.pythonCorePath, 'model_manager.py');
            const proc = spawn(this.getPythonCmd(), [script, 'list'], { cwd: this.pythonCorePath });

            let output = '';
            proc.stdout.on('data', d => output += d);
            proc.on('close', code => {
                if (code === 0) {
                    try {
                        resolve(JSON.parse(output));
                    } catch (e) {
                        reject(new Error("Failed to parse model list"));
                    }
                } else {
                    reject(new Error(`Process exited with code ${code}`));
                }
            });
        });
    }

    /**
     * Download a model and emit progress events
     */
    downloadModel(modelName) {
        if (this.activeDownload) {
            throw new Error("A download is already in progress");
        }

        const script = path.join(this.pythonCorePath, 'model_manager.py');
        const proc = spawn(this.getPythonCmd(), [script, 'download', modelName], {
            cwd: this.pythonCorePath,
            env: { ...process.env, SONU_MODELS_DIR: this.modelsDir }
        });

        this.activeDownload = proc;

        proc.stdout.on('data', (data) => {
            const raw = data.toString().trim();
            const lines = raw.split('\n');

            for (const line of lines) {
                try {
                    const parsed = JSON.parse(line);
                    if (parsed.type === 'progress') {
                        this.emit('progress', {
                            modelName,
                            percent: parsed.percent,
                            downloadedMB: parsed.bytesDownloaded ? (parsed.bytesDownloaded / 1024 / 1024).toFixed(1) : 0,
                            totalMB: parsed.bytesTotal ? (parsed.bytesTotal / 1024 / 1024).toFixed(1) : 0,
                            speedKB: parsed.speedKB || 0,
                            message: parsed.message
                        });
                    } else if (parsed.type === 'result') {
                        this.activeDownload = null;
                        this.emit('complete', { modelName, ...parsed });
                    }
                } catch (e) {
                    // Not JSON or partial JSON
                }
            }
        });

        proc.stderr.on('data', (data) => {
            console.error(`[ModelManager] ${data}`);
        });

        proc.on('close', (code) => {
            this.activeDownload = null;
            if (code !== 0) {
                this.emit('error', { modelName, error: `Process exited with code ${code}` });
            }
        });

        return proc;
    }

    cancelDownload() {
        if (this.activeDownload) {
            this.activeDownload.kill();
            this.activeDownload = null;
            return true;
        }
        return false;
    }

    getPythonCmd() {
        return process.platform === 'win32' ? 'python' : 'python3';
    }
}

module.exports = ModelManager;
