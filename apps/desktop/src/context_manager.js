/**
 * Context Manager for SONU
 * Detects active window and application to enable "Chameleon Mode"
 * Uses @paymoapp/active-window for reliable cross-platform detection
 */

let activeWindow = null;
try {
    activeWindow = require('@paymoapp/active-window');
    activeWindow.initialize();
} catch (e) {
    console.warn('Failed to initialize active-window:', e.message);
    // Fallback mock
    activeWindow = {
        getActiveWindow: () => null,
        initialize: () => {}
    };
}

class ContextManager {
    constructor() {
        this.isTracking = false;
        this.intervalId = null;
        this.lastApp = null;
        this.lastTitle = null;
        this.listeners = [];
        this.checkInterval = 1000; // 1 second
        this.autoStyleEnabled = true; // Enable auto style switching by default

        // Known application categories
        this.categories = {
            coding: ['code', 'visual studio', 'intellij', 'pycharm', 'webstorm', 'sublime', 'vim', 'notepad++'],
            browser: ['chrome', 'firefox', 'edge', 'brave', 'opera', 'safari'],
            chat: ['slack', 'discord', 'teams', 'whatsapp', 'telegram', 'signal', 'messenger'],
            email: ['outlook', 'thunderbird', 'mail'],
            document: ['word', 'docs', 'writer', 'notion', 'obsidian', 'evernote']
        };

        // Category to style mapping for smart context switching
        this.categoryStyles = {
            coding: { style: 'technical', flowRefinement: true },
            browser: { style: 'neutral', flowRefinement: true },
            chat: { style: 'casual', flowRefinement: false },
            email: { style: 'professional', flowRefinement: true },
            document: { style: 'formal', flowRefinement: true },
            general: { style: 'neutral', flowRefinement: true }
        };

        // Initialize native module (moved to top try/catch)
    }
    
    /**
     * Start tracking active window changes
     */
    start() {
        if (this.isTracking) return;
        
        this.isTracking = true;
        this.intervalId = setInterval(() => this.checkActiveWindow(), this.checkInterval);
        console.log('[ContextManager] Tracking started');
    }
    
    /**
     * Stop tracking
     */
    stop() {
        if (!this.isTracking) return;
        
        this.isTracking = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        console.log('[ContextManager] Tracking stopped');
    }
    
    /**
     * Check current active window and notify listeners if changed
     */
    checkActiveWindow() {
        try {
            const window = activeWindow.getActiveWindow();
            
            if (!window) return;
            
            // Detect change
            if (window.application !== this.lastApp || window.title !== this.lastTitle) {
                this.lastApp = window.application;
                this.lastTitle = window.title;
                
                const context = this.analyzeContext(window);
                this.notifyListeners(context);
            }
        } catch (err) {
            console.error('[ContextManager] Error getting active window:', err);
        }
    }
    
    /**
     * Analyze window info to determine category/profile
     */
    analyzeContext(window) {
        const appName = window.application.toLowerCase();
        const title = window.title.toLowerCase();

        let category = 'general';

        // Determine category
        for (const [cat, keywords] of Object.entries(this.categories)) {
            if (keywords.some(k => appName.includes(k))) {
                category = cat;
                break;
            }
        }

        // Get recommended style for this category
        const styleConfig = this.getStyleForCategory(category);

        return {
            app: window.application,
            title: window.title,
            pid: window.pid,
            category: category,
            recommendedStyle: styleConfig.style,
            flowRefinement: styleConfig.flowRefinement,
            timestamp: Date.now()
        };
    }

    /**
     * Get recommended style configuration for a category
     * @param {string} category
     * @returns {object} Style configuration with style and flowRefinement
     */
    getStyleForCategory(category) {
        return this.categoryStyles[category] || this.categoryStyles.general;
    }

    /**
     * Enable or disable automatic style switching
     * @param {boolean} enabled
     */
    setAutoStyleEnabled(enabled) {
        this.autoStyleEnabled = enabled;
        console.log(`[ContextManager] Auto style switching ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Check if auto style switching is enabled
     * @returns {boolean}
     */
    isAutoStyleEnabled() {
        return this.autoStyleEnabled;
    }

    /**
     * Get the current context without triggering listeners
     * @returns {object|null} Current context or null if not available
     */
    getCurrentContext() {
        try {
            const window = activeWindow.getActiveWindow();
            if (!window) {
                return {
                    app: 'unknown',
                    title: '',
                    category: 'general',
                    recommendedStyle: 'neutral',
                    flowRefinement: true,
                    timestamp: Date.now()
                };
            }
            return this.analyzeContext(window);
        } catch (err) {
            console.error('[ContextManager] Error getting current context:', err);
            return {
                app: 'unknown',
                title: '',
                category: 'general',
                recommendedStyle: 'neutral',
                flowRefinement: true,
                timestamp: Date.now()
            };
        }
    }
    
    /**
     * Add a listener for context changes
     * @param {Function} callback 
     */
    addListener(callback) {
        this.listeners.push(callback);
    }
    
    /**
     * Remove a listener
     * @param {Function} callback 
     */
    removeListener(callback) {
        this.listeners = this.listeners.filter(cb => cb !== callback);
    }
    
    /**
     * Notify all listeners
     */
    notifyListeners(context) {
        this.listeners.forEach(cb => {
            try {
                cb(context);
            } catch (err) {
                console.error('[ContextManager] Listener error:', err);
            }
        });
    }
}

module.exports = new ContextManager();
