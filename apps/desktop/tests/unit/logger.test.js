/**
 * Unit tests for Logger Module
 */

const logger = require('../../src/utils/logger');
const fs = require('fs');
const path = require('path');

describe('Logger Module', () => {
  const testLogDir = path.join(__dirname, '..', 'test-data', 'logs');

  beforeAll(() => {
    // Ensure test log directory exists
    if (!fs.existsSync(testLogDir)) {
      fs.mkdirSync(testLogDir, { recursive: true });
    }
  });

  beforeEach(() => {
    // Reset logger state
    logger.setLogLevel('debug');
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Clean up test logs
    if (fs.existsSync(testLogDir)) {
      fs.rmSync(testLogDir, { recursive: true, force: true });
    }
    logger.close();
  });

  describe('Log Levels', () => {
    test('should initialize with default level', () => {
      logger.initialize({ level: 'info', logToFile: false });
      expect(logger.getLogLevel()).toBe('INFO');
    });

    test('should set and get log level', () => {
      logger.setLogLevel('error');
      expect(logger.getLogLevel()).toBe('ERROR');

      logger.setLogLevel('debug');
      expect(logger.getLogLevel()).toBe('DEBUG');
    });

    test('should respect log level filtering', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      logger.setLogLevel('warn');
      
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      // debug and info should not be logged
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('debug message'));
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('info message'));
      
      // warn and error should be logged
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('warn message'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('error message'));

      consoleSpy.mockRestore();
    });
  });

  describe('Log Methods', () => {
    test('should log error messages', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      logger.error('Test error message');
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[ERROR] Test error message'));
      consoleSpy.mockRestore();
    });

    test('should log warn messages', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      logger.warn('Test warn message');
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[WARN] Test warn message'));
      consoleSpy.mockRestore();
    });

    test('should log info messages', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      logger.info('Test info message');
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO] Test info message'));
      consoleSpy.mockRestore();
    });

    test('should log debug messages', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      logger.debug('Test debug message');
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[DEBUG] Test debug message'));
      consoleSpy.mockRestore();
    });

    test('should include metadata in logs', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      logger.info('Test message', { userId: 123, action: 'test' });
      
      const loggedOutput = consoleSpy.mock.calls[0][0];
      expect(loggedOutput).toContain('userId');
      expect(loggedOutput).toContain('123');
      expect(loggedOutput).toContain('action');
      expect(loggedOutput).toContain('test');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Namespaced Logger', () => {
    test('should create namespaced logger', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const appLogger = logger.createLogger('AppModule');
      appLogger.info('Test message');
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[AppModule] Test message'));
      consoleSpy.mockRestore();
    });

    test('should maintain separate namespaces', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const module1 = logger.createLogger('Module1');
      const module2 = logger.createLogger('Module2');
      
      module1.info('Message from module 1');
      module2.info('Message from module 2');
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Module1]'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Module2]'));
      consoleSpy.mockRestore();
    });
  });

  describe('Log Format', () => {
    test('should include timestamp in logs', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      logger.info('Test');
      
      const loggedOutput = consoleSpy.mock.calls[0][0];
      // Should contain ISO timestamp format
      expect(loggedOutput).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      
      consoleSpy.mockRestore();
    });

    test('should include log level in logs', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      logger.info('Test');
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
      consoleSpy.mockRestore();
    });
  });
});
