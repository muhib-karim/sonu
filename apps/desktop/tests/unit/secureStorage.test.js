/**
 * Unit tests for Secure Storage Module
 */

const secureStorage = require('../../src/utils/secureStorage');
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

describe('Secure Storage Module', () => {
  const testKey = 'test_api_key';
  const testValue = 'test-secret-value-12345';

  beforeAll(async () => {
    // Initialize secure storage
    await secureStorage.initialize();
  });

  beforeEach(async () => {
    // Clean up test key before each test
    await secureStorage.deletePassword(testKey);
  });

  afterAll(async () => {
    // Clean up after all tests
    await secureStorage.deletePassword(testKey);
  });

  describe('Password Storage', () => {
    test('should store and retrieve a password', async () => {
      const result = await secureStorage.setPassword(testKey, testValue);
      expect(result).toBe(true);

      const retrieved = await secureStorage.getPassword(testKey);
      expect(retrieved).toBe(testValue);
    });

    test('should return null for non-existent key', async () => {
      const retrieved = await secureStorage.getPassword('non-existent-key');
      expect(retrieved).toBeNull();
    });

    test('should update an existing password', async () => {
      const originalValue = 'original-value';
      const newValue = 'new-value';

      await secureStorage.setPassword(testKey, originalValue);
      await secureStorage.setPassword(testKey, newValue);

      const retrieved = await secureStorage.getPassword(testKey);
      expect(retrieved).toBe(newValue);
    });

    test('should delete a password', async () => {
      await secureStorage.setPassword(testKey, testValue);
      const result = await secureStorage.deletePassword(testKey);
      expect(result).toBe(true);

      const retrieved = await secureStorage.getPassword(testKey);
      expect(retrieved).toBeNull();
    });
  });

  describe('Multiple Keys', () => {
    test('should handle multiple keys independently', async () => {
      const key1 = 'key1';
      const key2 = 'key2';
      const value1 = 'value1';
      const value2 = 'value2';

      await secureStorage.setPassword(key1, value1);
      await secureStorage.setPassword(key2, value2);

      const retrieved1 = await secureStorage.getPassword(key1);
      const retrieved2 = await secureStorage.getPassword(key2);

      expect(retrieved1).toBe(value1);
      expect(retrieved2).toBe(value2);

      // Cleanup
      await secureStorage.deletePassword(key1);
      await secureStorage.deletePassword(key2);
    });
  });

  describe('Migration', () => {
    test('should migrate plaintext API keys from settings', async () => {
      const settings = {
        groq_api_key: 'groq-key-123',
        openai_api_key: 'openai-key-456',
        anthropic_api_key: 'anthropic-key-789',
        other_setting: 'should-remain'
      };

      const migratedSettings = await secureStorage.migratePlaintextKeys(settings);

      // Keys should be removed from settings
      expect(migratedSettings.groq_api_key).toBeUndefined();
      expect(migratedSettings.openai_api_key).toBeUndefined();
      expect(migratedSettings.anthropic_api_key).toBeUndefined();

      // Keys should be stored securely
      expect(await secureStorage.getPassword('groq_api_key')).toBe('groq-key-123');
      expect(await secureStorage.getPassword('openai_api_key')).toBe('openai-key-456');
      expect(await secureStorage.getPassword('anthropic_api_key')).toBe('anthropic-key-789');

      // Other settings should remain
      expect(migratedSettings.other_setting).toBe('should-remain');

      // Cleanup
      await secureStorage.deletePassword('groq_api_key');
      await secureStorage.deletePassword('openai_api_key');
      await secureStorage.deletePassword('anthropic_api_key');
    });

    test('should handle migration with no API keys', async () => {
      const settings = {
        other_setting: 'value'
      };

      const migratedSettings = await secureStorage.migratePlaintextKeys(settings);
      expect(migratedSettings).toEqual(settings);
    });
  });
});
