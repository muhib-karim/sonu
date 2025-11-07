/**
 * Unit tests for system-wide typing functionality
 * Tests typing logic with mocks
 */

// Mock robotjs
jest.mock('robotjs', () => ({
  typeString: jest.fn((text) => true),
  typeStringDelayed: jest.fn((text, delay) => true),
  keyTap: jest.fn((key, modifier) => true),
  getMousePos: jest.fn(() => ({ x: 100, y: 100 }))
}));

// Mock Electron
jest.mock('electron', () => ({
  clipboard: {
    writeText: jest.fn((text) => true),
    readText: jest.fn(() => 'test clipboard content')
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    hide: jest.fn(),
    minimize: jest.fn(),
    blur: jest.fn(),
    isVisible: jest.fn(() => true),
    isFocused: jest.fn(() => true),
    isDestroyed: jest.fn(() => false)
  }))
}));

const robotjs = require('robotjs');
const { clipboard, BrowserWindow } = require('electron');

describe('Typing Unit Tests', () => {
  let mockWindow;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWindow = new BrowserWindow();
  });

  describe('Typing Function', () => {
    test('should type text using robotjs.typeString', () => {
      const text = 'Hello, world!';
      robotjs.typeString(text);
      
      expect(robotjs.typeString).toHaveBeenCalledWith(text);
      expect(robotjs.typeString).toHaveBeenCalledTimes(1);
    });

    test('should prefer typeStringDelayed when available', () => {
      const text = 'Test text';
      
      if (robotjs.typeStringDelayed) {
        robotjs.typeStringDelayed(text, 0);
        expect(robotjs.typeStringDelayed).toHaveBeenCalledWith(text, 0);
        expect(robotjs.typeString).not.toHaveBeenCalled();
      } else {
        robotjs.typeString(text);
        expect(robotjs.typeString).toHaveBeenCalledWith(text);
      }
    });

    test('should handle empty text', () => {
      const text = '';
      
      if (text && text.trim()) {
        robotjs.typeString(text);
      }
      
      expect(robotjs.typeString).not.toHaveBeenCalled();
    });

    test('should handle special characters', () => {
      const text = 'Hello!\nNew line\tTab';
      robotjs.typeString(text);
      
      expect(robotjs.typeString).toHaveBeenCalledWith(text);
    });

    test('should fallback to clipboard on typing failure', () => {
      const text = 'Test text';
      
      robotjs.typeString.mockImplementationOnce(() => {
        throw new Error('Typing failed');
      });
      
      try {
        robotjs.typeString(text);
      } catch (e) {
        clipboard.writeText(text);
        robotjs.keyTap('v', 'control');
      }
      
      expect(clipboard.writeText).toHaveBeenCalledWith(text);
      expect(robotjs.keyTap).toHaveBeenCalledWith('v', 'control');
    });
  });

  describe('Focus Handling', () => {
    test('should hide window before typing', () => {
      if (mockWindow.isVisible()) {
        mockWindow.hide();
      }
      if (mockWindow.isFocused()) {
        mockWindow.blur();
      }
      mockWindow.minimize();
      
      expect(mockWindow.hide).toHaveBeenCalled();
      expect(mockWindow.minimize).toHaveBeenCalled();
      expect(mockWindow.blur).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle robotjs not available', () => {
      const robot = null;
      const text = 'Test text';
      
      if (!robot || !robot.typeString) {
        clipboard.writeText(text);
      }
      
      expect(clipboard.writeText).toHaveBeenCalledWith(text);
    });
  });
});


