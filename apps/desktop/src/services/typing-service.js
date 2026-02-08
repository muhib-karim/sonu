/**
 * Typing Service
 * Handles text injection into the active window
 */

const { clipboard } = require('electron');
const { execSync } = require('child_process');
const path = require('path');

class TypingService {
  constructor() {
    this.robot = null;
    this.robotType = null;
    this.lastTypedText = '';
    this.pendingTypingQueue = [];
    this.isTyping = false;
    this.initRobot();
  }

  initRobot() {
    const isTestMode = process.env.NODE_ENV === 'test' || process.env.E2E_TEST === '1';
    
    if (isTestMode) {
      console.log('Test mode: skipping robot libraries');
      return;
    }

    // Try nut-tree-fork/nut-js first (modern, well-maintained)
    try {
      const { keyboard, Key } = require('@nut-tree-fork/nut-js');
      this.robot = { keyboard, Key };
      this.robotType = 'nut-js';
      console.log('✓ @nut-tree-fork/nut-js loaded');
      return;
    } catch (e) {
      console.log('nut-js not available:', e.message);
    }

    // Fallback to robot-js
    try {
      this.robot = require('robot-js');
      this.robotType = 'robot-js';
      console.log('✓ robot-js loaded');
      return;
    } catch (e) {
      console.log('robot-js not available:', e.message);
    }

    // Fallback to robotjs
    try {
      this.robot = require('robotjs');
      this.robotType = 'robotjs';
      console.log('✓ robotjs loaded');
      return;
    } catch (e) {
      console.warn('⚠ No robot library available. Using clipboard fallback.');
      this.robot = null;
      this.robotType = null;
    }
  }

  async typeText(text, options = {}) {
    const { 
      incremental = false, 
      delay = 10, 
      useClipboard = false 
    } = options;

    if (!text || typeof text !== 'string') {
      console.warn('Invalid text provided to typeText');
      return;
    }

    // If no robot library available, use clipboard
    if (!this.robot) {
      this.typeViaClipboard(text);
      return;
    }

    if (incremental) {
      await this.typeIncremental(text, delay);
    } else {
      await this.typeFull(text, delay);
    }
  }

  async typeIncremental(fullText, delay = 10) {
    const lastText = this.lastTypedText;
    
    // Find what needs to be added
    let newText = '';
    if (fullText.startsWith(lastText)) {
      newText = fullText.slice(lastText.length);
    } else {
      // Text changed - type it all
      newText = fullText;
    }

    if (newText) {
      await this.typeCharacters(newText, delay);
      this.lastTypedText = fullText;
    }
  }

  async typeFull(text, delay = 10) {
    await this.typeCharacters(text, delay);
    this.lastTypedText = text;
  }

  async typeCharacters(text, delay) {
    if (this.robotType === 'nut-js') {
      await this.typeWithNutJs(text, delay);
    } else if (this.robotType === 'robot-js') {
      await this.typeWithRobotJs(text, delay);
    } else if (this.robotType === 'robotjs') {
      await this.typeWithRobotjs(text, delay);
    }
  }

  async typeWithNutJs(text, delay) {
    const { keyboard, Key } = this.robot;
    
    for (const char of text) {
      if (char === '\n') {
        await keyboard.type(Key.Return);
      } else if (char === '\t') {
        await keyboard.type(Key.Tab);
      } else if (char === ' ') {
        await keyboard.type(Key.Space);
      } else {
        await keyboard.type(char);
      }
      
      if (delay > 0) {
        await this.sleep(delay);
      }
    }
  }

  async typeWithRobotJs(text, delay) {
    // robot-js API
    for (const char of text) {
      this.robot.keyTap(char);
      if (delay > 0) {
        await this.sleep(delay);
      }
    }
  }

  async typeWithRobotjs(text, delay) {
    // robotjs API
    for (const char of text) {
      this.robot.keyTap(char);
      if (delay > 0) {
        await this.sleep(delay);
      }
    }
  }

  typeViaClipboard(text) {
    const originalClipboard = clipboard.readText();
    clipboard.writeText(text);
    
    try {
      // Use platform-specific paste command
      if (process.platform === 'darwin') {
        execSync('osascript -e \'tell application "System Events" to keystroke "v" using command down\'');
      } else if (process.platform === 'win32') {
        execSync('powershell -c "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys(\'^(v)\')"');
      } else {
        execSync('xdotool key ctrl+v');
      }
    } catch (e) {
      console.error('Clipboard paste failed:', e);
    }

    // Restore original clipboard after a delay
    setTimeout(() => {
      clipboard.writeText(originalClipboard);
    }, 100);
  }

  resetLastTyped() {
    this.lastTypedText = '';
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new TypingService();
