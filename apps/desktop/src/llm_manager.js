const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ============================================================================
// LIGHTWEIGHT RULE-BASED POST-PROCESSING (No LLM Required)
// ============================================================================

// Rule-based options (can be configured via settings)
let ruleOptions = {
    removeFillers: true,
    fixStuttering: true,
    addPunctuation: true,
    capitalize: true
};

/**
 * Update rule-based options from settings
 */
function setRuleOptions(options) {
    if (options) {
        if (options.pp_remove_fillers !== undefined) ruleOptions.removeFillers = options.pp_remove_fillers;
        if (options.pp_fix_stuttering !== undefined) ruleOptions.fixStuttering = options.pp_fix_stuttering;
        if (options.pp_punctuation !== undefined) ruleOptions.addPunctuation = options.pp_punctuation;
        if (options.pp_capitalize !== undefined) ruleOptions.capitalize = options.pp_capitalize;
    }
}

/**
 * Rule-based text cleanup - processes transcription without requiring LLM
 * Handles: capitalization, punctuation, filler word removal, basic formatting
 * Respects ruleOptions configuration
 */
function ruleBasedCleanup(text, options = null) {
    if (!text || typeof text !== 'string') return text;

    // Use provided options or global ruleOptions
    const opts = options || ruleOptions;

    let result = text.trim();

    // Remove common filler words (case-insensitive)
    if (opts.removeFillers !== false) {
        const fillerPatterns = [
            /\b(um+|uh+|uhm+|er+|err+|ah+|ahh+)\b/gi,
            /\b(like|you know|i mean|basically|actually|literally)\b(?=\s+(?:like|you know|i mean|basically|actually|literally|\s|,))/gi, // Only remove if repeated
            /\b(so+|well+)\b(?=\s*,?\s*(?:so|well|um|uh))/gi, // Remove repeated starters
        ];

        for (const pattern of fillerPatterns) {
            result = result.replace(pattern, '');
        }
    }

    // Clean up multiple spaces
    result = result.replace(/\s{2,}/g, ' ').trim();

    // Fix stuttering (e.g., "I I I want" -> "I want", "the the" -> "the")
    if (opts.fixStuttering !== false) {
        result = result.replace(/\b(\w+)\s+\1\b/gi, '$1');
    }

    // Capitalize first letter of sentences
    if (opts.capitalize !== false) {
        result = result.replace(/(^|[.!?]\s+)([a-z])/g, (match, prefix, letter) => {
            return prefix + letter.toUpperCase();
        });

        // Capitalize 'I' when standalone
        result = result.replace(/\bi\b/g, 'I');

        // Capitalize after period if missed
        result = result.replace(/\.\s+([a-z])/g, (match, letter) => '. ' + letter.toUpperCase());
    }

    // Add period at end if no punctuation
    if (opts.addPunctuation !== false) {
        if (result && !/[.!?]$/.test(result)) {
            result += '.';
        }

        // Fix common punctuation issues
        result = result.replace(/\s+([,.])/g, '$1'); // Remove space before comma/period
        result = result.replace(/([,.])\s*([,.])/g, '$1'); // Remove duplicate punctuation
        result = result.replace(/([.!?])\s*$/g, '$1'); // Ensure single punctuation at end
    }

    // Clean up any remaining multiple spaces
    result = result.replace(/\s{2,}/g, ' ').trim();

    return result;
}

/**
 * Advanced rule-based cleanup for transcription
 * Includes number handling, contractions, and question detection
 */
function advancedRuleBasedCleanup(text) {
    if (!text || typeof text !== 'string') return text;

    let result = ruleBasedCleanup(text);

    // Detect questions and fix punctuation
    const questionWords = ['what', 'where', 'when', 'why', 'how', 'who', 'which', 'whose', 'whom', 'is', 'are', 'was', 'were', 'do', 'does', 'did', 'can', 'could', 'would', 'should', 'will', 'shall', 'have', 'has', 'had'];
    const sentences = result.split(/(?<=[.!?])\s+/);

    result = sentences.map(sentence => {
        const trimmed = sentence.trim().toLowerCase();
        const firstWord = trimmed.split(/\s+/)[0];

        // If starts with question word and ends with period, change to question mark
        if (questionWords.includes(firstWord) && sentence.endsWith('.')) {
            return sentence.slice(0, -1) + '?';
        }
        return sentence;
    }).join(' ');

    // Handle common spoken number words (optional)
    // "one two three" -> kept as is (don't convert to digits for dictation)

    // Fix contractions spacing
    result = result.replace(/\s+'(s|t|re|ve|ll|d|m)\b/gi, "'$1");
    result = result.replace(/\s+n't\b/gi, "n't");

    return result;
}

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

        const pythonScript = path.join(__dirname, 'core', 'python', 'llm_service.py');
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
     *
     * Uses rule-based cleanup as fallback when LLM is not available
     */
    flowRefine(text, callback) {
        // If LLM process is not running or not ready, use rule-based cleanup
        if (!this.process || !this.ready) {
            console.log('[LLM Manager] Using rule-based cleanup (LLM not available)');
            const cleanedText = advancedRuleBasedCleanup(text);
            if (callback) {
                // Call async to match expected behavior
                setImmediate(() => callback(cleanedText));
            }
            return;
        }

        // Use LLM for more sophisticated refinement
        // Escape newlines in text for safe transmission
        const safeText = (text || '').replace(/\n/g, '\\n');
        const cmd = `FLOW_REFINE:${safeText}\n`;

        this.pendingRequests.push({
            callback,
            isFlowRefine: true
        });
        this.process.stdin.write(cmd);
    }

    /**
     * Quick rule-based cleanup - no LLM required
     * Use this for instant processing without waiting for LLM
     */
    quickCleanup(text) {
        return advancedRuleBasedCleanup(text);
    }

    processPending() {
        // Re-trigger any queued logic if necessary
    }
}

// Export both the manager instance and the rule-based functions
const llmManager = new LLMManager();

module.exports = llmManager;
module.exports.ruleBasedCleanup = ruleBasedCleanup;
module.exports.advancedRuleBasedCleanup = advancedRuleBasedCleanup;
module.exports.setRuleOptions = setRuleOptions;
