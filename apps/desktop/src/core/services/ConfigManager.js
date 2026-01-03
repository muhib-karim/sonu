const fs = require('fs');
const path = require('path');

/**
 * ConfigManager - Handles application settings and persistence.
 */
class ConfigManager {
    constructor(configPath) {
        this.configPath = configPath;
        this.config = this.loadDefaultConfig();
        this.load();
    }

    loadDefaultConfig() {
        return {
            activeModel: 'distil-small.en',
            language: 'en',
            autoDetectLanguage: true,
            hotkey: 'Ctrl+Shift+Space',
            mode: 'HOLD',
            theme: 'dark',
            volume_mute_enabled: true,
            continuous_dictation: false,
            low_latency: true,
            noise_reduction: false
        };
    }

    load() {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf8');
                const loaded = JSON.parse(data);
                // Merge with defaults to ensure all keys exist
                this.config = { ...this.config, ...loaded };
            } else {
                this.save();
            }
        } catch (e) {
            console.error('[ConfigManager] Failed to load config:', e);
            // Keep defaults if load fails
        }
    }

    save() {
        try {
            const dir = path.dirname(this.configPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 4));
        } catch (e) {
            console.error('[ConfigManager] Failed to save config:', e);
        }
    }

    get(key) {
        return this.config[key];
    }

    set(key, value) {
        this.config[key] = value;
        this.save();
    }

    getAll() {
        return { ...this.config };
    }
}

module.exports = ConfigManager;
