const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class LLMManager {
    constructor() {
        this.process = null;
        this.ready = false;
        this.pendingRequests = [];
        this.modelPath = null;
    }

    isReady() {
        return this.ready;
    }

    start() {
        if (this.process) return;

        const pythonScript = path.join(__dirname, '..', 'llm_service.py');
        if (!fs.existsSync(pythonScript)) {
            console.error('LLM Service script not found');
            return;
        }

        console.log('Starting LLM Service...');

        // Find python - similar logic to main.js but simplified here
        const pythonCmd = 'python'; // simplified

        try {
            this.process = spawn(pythonCmd, [pythonScript], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            this.process.stdout.on('data', (data) => {
                const lines = data.toString().split('\n');
                for (const line of lines) {
                    if (!line.trim()) continue;
                    this.handleOutput(line.trim());
                }
            });

            this.process.stderr.on('data', (data) => {
                console.log(`[LLM Service] ${data}`);
                if (data.toString().includes('LLM model loaded successfully')) {
                    this.ready = true;
                    this.processPending();
                }
            });

            this.process.on('close', (code) => {
                console.log(`LLM Service exited with code ${code}`);
                this.process = null;
                this.ready = false;
            });

        } catch (err) {
            console.error('Failed to start LLM Service:', err);
        }
    }

    stop() {
        if (this.process) {
            this.process.kill();
            this.process = null;
            this.ready = false;
        }
    }

    handleOutput(line) {
        try {
            // Check if it's a REFINED response (flow refinement)
            if (line.startsWith('REFINED:')) {
                const refinedText = line.slice(8); // Remove "REFINED:" prefix
                const req = this.pendingRequests.shift();
                if (req && req.callback) {
                    req.callback(refinedText);
                }
                return;
            }

            // Check if it's JSON (status/check response)
            if (line.startsWith('{')) {
                const data = JSON.parse(line);
                if (data.ready !== undefined) this.ready = data.ready;
                // Handle callbacks if implemented
            } else {
                // Plain text response (Transformation result)
                // Find request waiting for response
                const req = this.pendingRequests.shift();
                if (req && req.callback) {
                    req.callback(line);
                }
            }
        } catch (e) {
            // If prompt response wasn't JSON, it might be the transformed text
            // (llm_service.py prints transformed text strictly to stdout)
            const req = this.pendingRequests.shift();
            if (req && req.callback) {
                req.callback(line);
            }
        }
    }

    transformText(text, style, callback) {
        if (!this.process) this.start();

        // Fallback if not ready?
        // User interface should check isReady()

        const cmd = `TRANSFORM:${style}:personal:${text}\n`;

        this.pendingRequests.push({ callback });
        this.process.stdin.write(cmd);
    }

    /**
     * Flow refine text - Wispr Flow-style cleanup
     * Removes filler words, fixes stuttering, adds natural punctuation
     * This is the "magic" that transforms messy speech into polished prose
     */
    flowRefine(text, callback) {
        if (!this.process) this.start();

        // Escape newlines in text for safe transmission
        const safeText = (text || '').replace(/\n/g, '\\n');
        const cmd = `FLOW_REFINE:${safeText}\n`;

        this.pendingRequests.push({
            callback,
            isFlowRefine: true
        });
        this.process.stdin.write(cmd);
    }

    processPending() {
        // Re-trigger any queued logic if necessary
    }
}

module.exports = new LLMManager();
