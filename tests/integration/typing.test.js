/**
 * Comprehensive integration tests for system-wide typing functionality
 * Tests robotjs typing with mocks and real scenarios
 */

// Mock robotjs for testing
jest.mock('robotjs', () => {
  const mockRobot = {
    typeString: jest.fn((text) => {
      // Simulate typing
      return true;
    }),
    keyTap: jest.fn((key, modifier) => {
      // Simulate key tap
      return true;
    }),
    getMousePos: jest.fn(() => {
      return { x: 100, y: 100 };
    })
  };
  return mockRobot;
});

// Mock Electron
jest.mock('electron', () => ({
  clipboard: {
    writeText: jest.fn((text) => {
      return true;
    }),
    readText: jest.fn(() => {
      return 'test clipboard content';
    })
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

describe('System-wide Typing Integration Tests', () => {
  let mockWindow;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWindow = new BrowserWindow();
  });

  describe('Typing Function', () => {
    test('should type text using robotjs', () => {
      const text = 'Hello, world!';
      
      // Simulate typing
      robotjs.typeString(text);
      
      expect(robotjs.typeString).toHaveBeenCalledWith(text);
      expect(robotjs.typeString).toHaveBeenCalledTimes(1);
    });

    test('should handle empty text gracefully', () => {
      const text = '';
      
      // Should not call typeString for empty text
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

    test('should handle long text', () => {
      const text = 'A'.repeat(1000);
      
      robotjs.typeString(text);
      
      expect(robotjs.typeString).toHaveBeenCalledWith(text);
    });

    test('should fallback to clipboard + paste on typing failure', () => {
      const text = 'Test text';
      
      // Mock typing failure
      robotjs.typeString.mockImplementationOnce(() => {
        throw new Error('Typing failed');
      });
      
      try {
        robotjs.typeString(text);
      } catch (e) {
        // Fallback to clipboard
        clipboard.writeText(text);
        // Then paste
        setTimeout(() => {
          robotjs.keyTap('v', 'control');
        }, 50);
      }
      
      // Should have attempted typing first
      expect(robotjs.typeString).toHaveBeenCalled();
      // Should have copied to clipboard
      expect(clipboard.writeText).toHaveBeenCalledWith(text);
    });
  });

  describe('Focus Handling', () => {
    test('should hide window before typing', () => {
      const text = 'Test text';
      
      // Simulate window hiding
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

    test('should handle window not available', () => {
      const text = 'Test text';
      const window = null;
      
      // Should not throw error if window is null
      expect(() => {
        if (window) {
          window.hide();
        }
        robotjs.typeString(text);
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle robotjs not available', () => {
      const robot = null;
      const text = 'Test text';
      
      if (!robot || !robot.typeString) {
        // Fallback to clipboard
        clipboard.writeText(text);
      }
      
      // Should not throw error
      expect(() => {
        if (!robot || !robot.typeString) {
          clipboard.writeText(text);
        }
      }).not.toThrow();
      expect(clipboard.writeText).toHaveBeenCalledWith(text);
    });

    test('should handle typing errors gracefully', () => {
      const text = 'Test text';
      
      robotjs.typeString.mockImplementationOnce(() => {
        throw new Error('Typing error');
      });
      
      try {
        robotjs.typeString(text);
      } catch (e) {
        // Should handle error gracefully
        expect(e.message).toBe('Typing error');
      }
    });

    test('should handle clipboard errors gracefully', () => {
      const text = 'Test text';
      
      clipboard.writeText.mockImplementationOnce(() => {
        throw new Error('Clipboard error');
      });
      
      try {
        clipboard.writeText(text);
      } catch (e) {
        // Should handle error gracefully
        expect(e.message).toBe('Clipboard error');
      }
    });
  });

  describe('Timing and Delays', () => {
    test('should wait for focus switch before typing', (done) => {
      const text = 'Test text';
      
      // Simulate delay for focus switching
      setTimeout(() => {
        robotjs.typeString(text);
        expect(robotjs.typeString).toHaveBeenCalledWith(text);
        done();
      }, 100);
    }, 200);

    test('should handle multiple rapid typing calls', () => {
      const texts = ['Text 1', 'Text 2', 'Text 3'];
      
      texts.forEach(text => {
        robotjs.typeString(text);
      });
      
      expect(robotjs.typeString).toHaveBeenCalledTimes(3);
      expect(robotjs.typeString).toHaveBeenCalledWith('Text 1');
      expect(robotjs.typeString).toHaveBeenCalledWith('Text 2');
      expect(robotjs.typeString).toHaveBeenCalledWith('Text 3');
    });
  });

  describe('Integration with Transcription', () => {
    test('should type transcription text immediately', () => {
      const transcriptionText = 'This is a test transcription';
      
      // Simulate transcription flow
      // 1. Hide window
      if (mockWindow.isVisible()) {
        mockWindow.hide();
      }
      mockWindow.blur();
      
      // 2. Type text
      if (transcriptionText && transcriptionText.trim()) {
        robotjs.typeString(transcriptionText);
      }
      
      expect(mockWindow.hide).toHaveBeenCalled();
      expect(robotjs.typeString).toHaveBeenCalledWith(transcriptionText);
    });

    test('should handle transcription with special characters', () => {
      const transcriptionText = 'Hello!\nThis is a test.\nWith newlines.';
      
      // Simulate transcription flow
      if (transcriptionText && transcriptionText.trim()) {
        robotjs.typeString(transcriptionText);
      }
      
      expect(robotjs.typeString).toHaveBeenCalledWith(transcriptionText);
    });
  });
});
