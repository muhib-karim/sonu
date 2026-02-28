/**
 * Hotkey Manager Module
 * Manages global hotkey registration and recording state
 */

const { globalShortcut } = require('electron');

class HotkeyManager {
  constructor(options = {}) {
    this.settings = options.settings || {};
    this.logger = options.logger || null;
    this.onToggleRecording = options.onToggleRecording || (() => {});
    this.onStartHoldRecording = options.onStartHoldRecording || (() => {});
    this.onStopHoldRecording = options.onStopHoldRecording || (() => {});
    this.onSendHotkeyRegistered = options.onSendHotkeyRegistered || (() => {});
    this.onSendHotkeyError = options.onSendHotkeyError || (() => {});
    
    this.holdKeyReleaseTimer = null;
    this.holdKeyPressCount = 0;
    this.HOLD_KEY_RELEASE_DELAY = 150; // ms
    this.isRecording = false;
    this.isHoldKeyPressed = false;
  }

  /**
   * Normalize hotkey input to Electron accelerator format
   */
  normalizeHotkey(input) {
    if (!input) return 'CommandOrControl+Shift+Space';
    let parts = input.split('+').map(p => p.trim().toLowerCase());
    const mapped = parts.map(p => {
      if (p === 'ctrl' || p === 'control') return 'CommandOrControl';
      if (p === 'win' || p === 'super' || p === 'windows') return 'Super';
      if (p === 'alt' || p === 'option') return 'Alt';
      if (p === 'shift') return 'Shift';
      if (p === 'space') return 'Space';
      return p.charAt(0).toUpperCase() + p.slice(1);
    });
    return mapped.join('+');
  }

  /**
   * Convert Electron accelerator to Python keyboard combo string
   */
  electronToPythonCombo(accelerator) {
    if (!accelerator) return 'ctrl+shift+space';
    const parts = accelerator.split('+');
    const mapped = parts.map(p => {
      const s = p.toLowerCase();
      if (s.includes('commandorcontrol')) return 'ctrl';
      if (s === 'cmd' || s === 'ctrl') return 'ctrl';
      if (s === 'alt' || s === 'option') return 'alt';
      if (s === 'shift') return 'shift';
      if (s === 'super') return 'win';
      if (s === 'space') return 'space';
      return s; // letters/numbers
    });
    return mapped.join('+');
  }

  /**
   * Register all global hotkeys
   */
  registerHotkeys() {
    globalShortcut.unregisterAll();
    
    const holdAcc = this.settings.holdHotkey || 'CommandOrControl+Super+Space';
    const toggleAcc = this.settings.toggleHotkey || 'CommandOrControl+Shift+Space';

    console.log(`[HOTKEYS] Registering hold hotkey: ${holdAcc}`);
    console.log(`[HOTKEYS] Registering toggle hotkey: ${toggleAcc}`);

    // Reset debounce tracking
    this.holdKeyPressCount = 0;
    this.holdKeyReleaseTimer = null;

    // Register hold hotkey
    const regHold = globalShortcut.register(holdAcc, () => {
      this.handleHoldHotkeyPress();
    });

    if (!regHold) {
      console.error(`[HOTKEYS] ✗ Failed to register hold hotkey: ${holdAcc}`);
      this.onSendHotkeyError(holdAcc);
    } else {
      console.log(`[HOTKEYS] ✓ Hold hotkey registered successfully: ${holdAcc}`);
      this.onSendHotkeyRegistered(holdAcc);
    }

    // Register toggle hotkey
    const regToggle = globalShortcut.register(toggleAcc, () => {
      console.log(`[HOTKEYS] Toggle hotkey triggered!`);
      this.onToggleRecording();
    });

    if (!regToggle) {
      console.error(`[HOTKEYS] ✗ Failed to register toggle hotkey: ${toggleAcc}`);
      this.onSendHotkeyError(toggleAcc);
    } else {
      console.log(`[HOTKEYS] ✓ Toggle hotkey registered successfully: ${toggleAcc}`);
      this.onSendHotkeyRegistered(toggleAcc);
    }

    return { holdRegistered: regHold, toggleRegistered: regToggle };
  }

  /**
   * Handle hold hotkey press (with timer-based release detection)
   */
  handleHoldHotkeyPress() {
    this.holdKeyPressCount++;
    const currentPressCount = this.holdKeyPressCount;

    // Clear any existing release timer - key is still being pressed
    if (this.holdKeyReleaseTimer) {
      clearTimeout(this.holdKeyReleaseTimer);
      this.holdKeyReleaseTimer = null;
    }

    // If not recording yet, start recording (only on first press)
    if (!this.isRecording && !this.isHoldKeyPressed) {
      console.log(`[HOTKEYS] Hold hotkey pressed - starting recording`);
      this.isHoldKeyPressed = true;
      this.isRecording = true;
      this.onStartHoldRecording();
    }

    // Set a timer to detect when key is released (stops firing)
    this.holdKeyReleaseTimer = setTimeout(() => {
      // Only trigger release if no new press events came in
      if (currentPressCount === this.holdKeyPressCount && this.isHoldKeyPressed) {
        console.log(`[HOTKEYS] Hold hotkey released - stopping recording`);
        this.isHoldKeyPressed = false;
        this.isRecording = false;
        this.onStopHoldRecording();
        this.holdKeyPressCount = 0; // Reset counter
      }
      this.holdKeyReleaseTimer = null;
    }, this.HOLD_KEY_RELEASE_DELAY);
  }

  /**
   * Set recording state
   */
  setRecordingState(isRecording) {
    this.isRecording = isRecording;
  }

  /**
   * Get recording state
   */
  getRecordingState() {
    return {
      isRecording: this.isRecording,
      isHoldKeyPressed: this.isHoldKeyPressed
    };
  }

  /**
   * Unregister all hotkeys
   */
  unregisterAll() {
    globalShortcut.unregisterAll();
    if (this.holdKeyReleaseTimer) {
      clearTimeout(this.holdKeyReleaseTimer);
      this.holdKeyReleaseTimer = null;
    }
  }

  /**
   * Pause hotkeys (for capture mode)
   */
  pauseHotkeys() {
    this.unregisterAll();
  }

  /**
   * Resume hotkeys after pause
   */
  resumeHotkeys() {
    this.registerHotkeys();
  }

  /**
   * Register additional global shortcut
   */
  registerShortcut(accelerator, callback) {
    try {
      return globalShortcut.register(accelerator, callback);
    } catch (e) {
      console.warn(`Failed to register shortcut ${accelerator}:`, e);
      return false;
    }
  }

  /**
   * Update settings reference
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Cleanup on quit
   */
  destroy() {
    this.unregisterAll();
  }
}

module.exports = HotkeyManager;
