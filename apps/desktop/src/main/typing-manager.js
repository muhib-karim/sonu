/**
 * Typing Manager Module
 * Manages auto-typing functionality with robot automation libraries
 */

const { clipboard } = require('electron');

class TypingManager {
  constructor(options = {}) {
    this.logger = options.logger || null;
    this.isTestMode = options.isTestMode || false;
    
    // Robot automation library instances
    this.nutKeyboard = null;
    this.robot = null;
    this.robotType = null; // 'nut-js', 'robot-js', 'robotjs', or null
    
    // Typing state tracking
    this.lastTypedText = '';
    this.pendingTypingQueue = [];
    this.sessionStats = {
      wordsTyped: 0,
      charsTyped: 0,
      transcriptionCount: 0,
      sessionStartTime: Date.now(),
      wpmHistory: [],
      lastTranscriptionTime: 0
    };

    // Voice trigger patterns for snippet activation
    this.SNIPPET_TRIGGER_PATTERNS = [
      /^insert\s+(.+)$/i,           // "insert [snippet name]"
      /^paste\s+(.+)$/i,            // "paste [snippet name]"
      /^use\s+(.+)\s+snippet$/i,    // "use [name] snippet"
      /^add\s+my\s+(.+)$/i,         // "add my [signature/address/etc]"
      /^put\s+(.+)$/i,              // "put [snippet name]"
    ];

    this.initializeRobot();
  }

  /**
   * Initialize robot automation library
   */
  initializeRobot() {
    if (this.isTestMode) {
      console.log('Test mode detected: skipping robot libraries for E2E stability');
      return;
    }

    // First try nut-tree-fork/nut-js (modern, well-maintained)
    try {
      const { keyboard, Key: NutKey } = require('@nut-tree-fork/nut-js');
      this.nutKeyboard = keyboard;
      this.robot = { nutKeyboard: keyboard, NutKey };
      this.robotType = 'nut-js';
      console.log('✓ @nut-tree-fork/nut-js loaded successfully');
      return;
    } catch (e0) {
      console.log('nut-js not available:', e0.message);
    }

    // Fallback to robot-js
    try {
      this.robot = require('robot-js');
      this.robotType = 'robot-js';
      console.log('✓ robot-js loaded successfully');
      return;
    } catch (e1) {
      console.log('robot-js not available:', e1.message);
    }

    // Fallback to robotjs
    try {
      this.robot = require('robotjs');
      this.robotType = 'robotjs';
      console.log('✓ robotjs loaded successfully');
      return;
    } catch (e2) {
      this.robot = null;
      this.robotType = null;
      console.warn('⚠ robot automation library not available; auto-typing disabled.');
      console.warn('Text will be copied to clipboard instead.');
    }
  }

  /**
   * Type text using available robot library
   */
  typeString(text) {
    const startTime = Date.now();

    if (!text || text.trim() === '') {
      if (this.logger) this.logger.typing('Empty text, skipping');
      return false;
    }

    if (this.logger) {
      this.logger.typing('Starting typing', {
        textLength: text.length,
        preview: text.substring(0, 50),
        robotType: this.robotType,
        robotAvailable: !!this.robot
      });
    }

    // Try nut-js first (clipboard + paste method)
    if (this.robotType === 'nut-js' && this.nutKeyboard) {
      return this.typeWithNutJS(text, startTime);
    }

    // Try robotjs clipboard+paste method
    if (this.robot && this.robot.keyTap) {
      return this.typeWithRobotJS(text, startTime);
    }

    // Fallback to robot-js
    if (this.robot && this.robotType === 'robot-js' && this.robot.Keyboard && this.robot.Keyboard.typeString) {
      return this.typeWithRobotJS(text, startTime);
    }

    // Fallback to typeStringDelayed
    if (this.robot && this.robotType === 'robotjs' && this.robot.typeStringDelayed && text.length < 10) {
      return this.typeWithDelayed(text, startTime);
    }

    // Final fallback: Clipboard only
    return this.fallbackToClipboard(text);
  }

  /**
   * Type using nut-js (preferred method)
   */
  typeWithNutJS(text, startTime) {
    try {
      clipboard.writeText(text);
      if (this.logger) this.logger.typing('Text copied to clipboard', { duration_ms: Date.now() - startTime });

      process.nextTick(async () => {
        try {
          const { Key: NutKey } = require('@nut-tree-fork/nut-js');
          await this.nutKeyboard.pressKey(NutKey.LeftControl);
          await this.nutKeyboard.pressKey(NutKey.V);
          await this.nutKeyboard.releaseKey(NutKey.V);
          await this.nutKeyboard.releaseKey(NutKey.LeftControl);

          const totalTime = Date.now() - startTime;
          if (this.logger) this.logger.typing('✓ Pasted instantly with nut-js Ctrl+V', { total_duration_ms: totalTime });
          console.log(`✓ Typed instantly in ${totalTime}ms (nut-js clipboard method)`);
        } catch (pasteErr) {
          if (this.logger) this.logger.typingError('nut-js paste failed', pasteErr);
          console.warn('Text is in clipboard, use Ctrl+V manually:', pasteErr.message);
        }
      });
      return true;
    } catch (clipErr) {
      if (this.logger) this.logger.typingError('Clipboard failed', clipErr);
      console.error('Failed to copy to clipboard:', clipErr);
      return this.fallbackToClipboard(text);
    }
  }

  /**
   * Type using robotjs
   */
  typeWithRobotJS(text, startTime) {
    try {
      clipboard.writeText(text);
      if (this.logger) this.logger.typing('Text copied to clipboard', { duration_ms: Date.now() - startTime });

      process.nextTick(() => {
        try {
          this.robot.keyTap('v', 'control');
          const totalTime = Date.now() - startTime;
          if (this.logger) this.logger.typing('✓ Pasted instantly with Ctrl+V', { total_duration_ms: totalTime });
          console.log(`✓ Typed instantly in ${totalTime}ms (clipboard method)`);
        } catch (pasteErr) {
          if (this.logger) this.logger.typingError('Paste failed', pasteErr);
          console.warn('Text is in clipboard, use Ctrl+V manually');
        }
      });
      return true;
    } catch (clipErr) {
      if (this.logger) this.logger.typingError('Clipboard failed', clipErr);
      console.error('Failed to copy to clipboard:', clipErr);
      return this.fallbackToClipboard(text);
    }
  }

  /**
   * Type using robot-js library
   */
  typeWithRobotJSLegacy(text, startTime) {
    process.nextTick(() => {
      try {
        this.robot.Keyboard.typeString(text);
        const totalTime = Date.now() - startTime;
        if (this.logger) this.logger.typing('✓ Typed with robot-js', { total_duration_ms: totalTime });
        console.log(`✓ Typed successfully in ${totalTime}ms`);
      } catch (e) {
        if (this.logger) this.logger.typingError('robot-js.Keyboard.typeString failed', e);
      }
    });
    return true;
  }

  /**
   * Type using delayed method (fallback)
   */
  typeWithDelayed(text, startTime) {
    process.nextTick(() => {
      try {
        this.robot.typeStringDelayed(text, 0);
        const totalTime = Date.now() - startTime;
        if (this.logger) this.logger.typing('✓ Typed with robotjs.typeStringDelayed (0ms)', { total_duration_ms: totalTime });
        console.log(`✓ Typed successfully in ${totalTime}ms`);
      } catch (e) {
        if (this.logger) this.logger.typingError('robotjs.typeStringDelayed failed', e);
      }
    });
    return true;
  }

  /**
   * Fallback to clipboard only
   */
  fallbackToClipboard(text) {
    try {
      clipboard.writeText(text);
      if (this.logger) this.logger.typing('Text copied to clipboard (fallback)');
      console.log('Text copied to clipboard (use Ctrl+V to paste)');
      return true;
    } catch (clipErr) {
      if (this.logger) this.logger.typingError('All typing methods failed', clipErr);
      console.error('Failed to copy to clipboard:', clipErr);
      return false;
    }
  }

  /**
   * Type incremental text (only new words)
   */
  typeIncremental(newText, isPartial = false) {
    if (!newText || !newText.trim()) return '';

    let textToType = '';

    if (this.lastTypedText && newText.startsWith(this.lastTypedText)) {
      // New text extends what we've already typed - type only the delta
      textToType = newText.slice(this.lastTypedText.length);
    } else if (this.lastTypedText && newText.length > this.lastTypedText.length) {
      // Text has grown - find the longest common prefix
      let commonLength = 0;
      const minLen = Math.min(this.lastTypedText.length, newText.length);
      for (let i = 0; i < minLen && this.lastTypedText[i] === newText[i]; i++) {
        commonLength = i + 1;
      }
      textToType = newText.slice(commonLength);
    } else if (!this.lastTypedText || !newText.includes(this.lastTypedText)) {
      // Completely new text or doesn't match
      if (isPartial && this.lastTypedText) {
        const lastSpaceIndex = this.lastTypedText.lastIndexOf(' ');
        if (lastSpaceIndex > 0 && newText.includes(this.lastTypedText.substring(0, lastSpaceIndex + 1))) {
          textToType = newText.slice(lastSpaceIndex + 1);
        } else {
          textToType = newText;
          this.lastTypedText = '';
        }
      } else {
        textToType = newText;
      }
    }

    // Type immediately if there's new text to type
    if (textToType && textToType.trim().length > 0) {
      this.typeString(textToType);
      this.lastTypedText = newText;
    }

    return textToType;
  }

  /**
   * Backspace already typed text
   */
  backspace(count) {
    if (!this.robot || !this.robotType || count <= 0) return;

    try {
      for (let i = 0; i < count; i++) {
        if (this.robotType === 'robot-js') {
          const key = this.robot.Key.Backspace;
          this.robot.Keyboard.click(key);
        } else if (this.robotType === 'robotjs') {
          this.robot.keyTap('backspace');
        }
      }
    } catch (e) {
      console.error('Error backspacing:', e);
    }
  }

  /**
   * Correct already typed text with refined version
   */
  correctTypedText(originalTyped, refinedText) {
    if (!this.robot || !this.robotType) return;
    if (originalTyped === refinedText) return;

    try {
      const backspaceCount = originalTyped.length;
      this.backspace(backspaceCount);

      setTimeout(() => {
        this.typeString(refinedText);
        console.log(`✓ Corrected text: "${originalTyped}" → "${refinedText}"`);
      }, 50);
    } catch (e) {
      console.error('Error correcting text:', e);
    }
  }

  /**
   * Track transcription for WPM calculation
   */
  trackTranscription(text) {
    if (!text || typeof text !== 'string') return;

    const now = Date.now();
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const chars = text.length;

    this.sessionStats.wordsTyped += words;
    this.sessionStats.charsTyped += chars;
    this.sessionStats.transcriptionCount++;

    // Calculate instantaneous WPM
    if (this.sessionStats.lastTranscriptionTime > 0) {
      const timeDiffMs = now - this.sessionStats.lastTranscriptionTime;
      if (timeDiffMs > 0 && timeDiffMs < 60000) {
        const instantWPM = (words / timeDiffMs) * 60000;
        this.sessionStats.wpmHistory.push({ wpm: instantWPM, time: now });

        // Keep last 20 WPM measurements
        if (this.sessionStats.wpmHistory.length > 20) {
          this.sessionStats.wpmHistory.shift();
        }
      }
    }

    this.sessionStats.lastTranscriptionTime = now;
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    const sessionDuration = (Date.now() - this.sessionStats.sessionStartTime) / 60000;

    // Calculate average WPM from history
    let avgWPM = 0;
    if (this.sessionStats.wpmHistory.length > 0) {
      const sum = this.sessionStats.wpmHistory.reduce((acc, item) => acc + item.wpm, 0);
      avgWPM = Math.round(sum / this.sessionStats.wpmHistory.length);
    }

    // Calculate session WPM
    const sessionWPM = sessionDuration > 0
      ? Math.round(this.sessionStats.wordsTyped / sessionDuration)
      : 0;

    return {
      instantWPM: avgWPM,
      sessionWPM: sessionWPM,
      wordsTyped: this.sessionStats.wordsTyped,
      charsTyped: this.sessionStats.charsTyped,
      transcriptionCount: this.sessionStats.transcriptionCount,
      sessionDuration: Math.round(sessionDuration * 10) / 10
    };
  }

  /**
   * Reset session statistics
   */
  resetSessionStats() {
    this.sessionStats = {
      wordsTyped: 0,
      charsTyped: 0,
      transcriptionCount: 0,
      sessionStartTime: Date.now(),
      wpmHistory: [],
      lastTranscriptionTime: 0
    };
  }

  /**
   * Reset last typed text (for new recording session)
   */
  resetLastTyped() {
    this.lastTypedText = '';
  }

  /**
   * Get last typed text
   */
  getLastTyped() {
    return this.lastTypedText;
  }

  /**
   * Set last typed text
   */
  setLastTyped(text) {
    this.lastTypedText = text;
  }

  /**
   * Get robot type
   */
  getRobotType() {
    return this.robotType;
  }

  /**
   * Check if robot is available
   */
  isRobotAvailable() {
    return this.robot !== null && this.robotType !== null;
  }
}

module.exports = TypingManager;
