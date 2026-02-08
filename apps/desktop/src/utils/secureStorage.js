/**
 * Secure Key Storage Module
 * 
 * Uses the OS keychain (via keytar) to securely store sensitive data like API keys.
 * Falls back to file-based storage with basic obfuscation if keytar is not available.
 * 
 * @module secureStorage
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const SERVICE_NAME = 'sonu-voice-typing';
const ACCOUNT_NAME = 'api-keys';

let keytar = null;
let fallbackKey = null;

/**
 * Initialize the secure storage module
 * @returns {Promise<void>}
 */
async function initialize() {
  try {
    keytar = require('keytar');
    console.log('[SecureStorage] Using OS keychain via keytar');
  } catch (e) {
    console.warn('[SecureStorage] keytar not available, using fallback storage');
    keytar = null;
    await initializeFallback();
  }
}

/**
 * Initialize fallback encryption key
 * @returns {Promise<void>}
 */
async function initializeFallback() {
  const keyPath = path.join(app.getPath('userData'), '.secure-key');
  
  try {
    if (fs.existsSync(keyPath)) {
      fallbackKey = fs.readFileSync(keyPath, 'hex');
    } else {
      // Generate a random key
      fallbackKey = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(keyPath, fallbackKey, { mode: 0o600 }); // Restrict permissions
    }
  } catch (e) {
    console.error('[SecureStorage] Failed to initialize fallback:', e);
    // Last resort: derive from machine-specific data
    const machineId = require('os').hostname() + require('os').userInfo().username;
    fallbackKey = crypto.createHash('sha256').update(machineId).digest('hex');
  }
}

/**
 * Encrypt data using AES-256-GCM
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted data (hex encoded)
 */
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(fallbackKey, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt data using AES-256-GCM
 * @param {string} encryptedData - Hex encoded encrypted data
 * @returns {string} - Decrypted plain text
 */
function decrypt(encryptedData) {
  const parts = encryptedData.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted data format');
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(fallbackKey, 'hex'), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Store a password/key securely
 * @param {string} key - The key identifier (e.g., 'groq_api_key')
 * @param {string} value - The value to store
 * @returns {Promise<boolean>} - Success status
 */
async function setPassword(key, value) {
  try {
    if (keytar) {
      await keytar.setPassword(SERVICE_NAME, key, value);
    } else {
      const storagePath = path.join(app.getPath('userData'), 'secure-storage.json');
      let data = {};
      
      if (fs.existsSync(storagePath)) {
        const encrypted = fs.readFileSync(storagePath, 'utf8');
        try {
          const decrypted = decrypt(encrypted);
          data = JSON.parse(decrypted);
        } catch (e) {
          console.warn('[SecureStorage] Failed to decrypt existing storage, starting fresh');
          data = {};
        }
      }
      
      data[key] = value;
      const encrypted = encrypt(JSON.stringify(data));
      fs.writeFileSync(storagePath, encrypted, { mode: 0o600 });
    }
    return true;
  } catch (e) {
    console.error('[SecureStorage] Failed to store password:', e);
    return false;
  }
}

/**
 * Retrieve a stored password/key
 * @param {string} key - The key identifier
 * @returns {Promise<string|null>} - The stored value or null
 */
async function getPassword(key) {
  try {
    if (keytar) {
      return await keytar.getPassword(SERVICE_NAME, key);
    } else {
      const storagePath = path.join(app.getPath('userData'), 'secure-storage.json');
      
      if (!fs.existsSync(storagePath)) {
        return null;
      }
      
      const encrypted = fs.readFileSync(storagePath, 'utf8');
      const decrypted = decrypt(encrypted);
      const data = JSON.parse(decrypted);
      return data[key] || null;
    }
  } catch (e) {
    console.error('[SecureStorage] Failed to retrieve password:', e);
    return null;
  }
}

/**
 * Delete a stored password/key
 * @param {string} key - The key identifier
 * @returns {Promise<boolean>} - Success status
 */
async function deletePassword(key) {
  try {
    if (keytar) {
      return await keytar.deletePassword(SERVICE_NAME, key);
    } else {
      const storagePath = path.join(app.getPath('userData'), 'secure-storage.json');
      
      if (!fs.existsSync(storagePath)) {
        return true;
      }
      
      const encrypted = fs.readFileSync(storagePath, 'utf8');
      const decrypted = decrypt(encrypted);
      const data = JSON.parse(decrypted);
      delete data[key];
      
      const newEncrypted = encrypt(JSON.stringify(data));
      fs.writeFileSync(storagePath, newEncrypted, { mode: 0o600 });
      return true;
    }
  } catch (e) {
    console.error('[SecureStorage] Failed to delete password:', e);
    return false;
  }
}

/**
 * Get all stored credentials
 * @returns {Promise<Array<{account: string, password: string}>>}
 */
async function getCredentials() {
  try {
    if (keytar) {
      return await keytar.findCredentials(SERVICE_NAME);
    } else {
      const storagePath = path.join(app.getPath('userData'), 'secure-storage.json');
      
      if (!fs.existsSync(storagePath)) {
        return [];
      }
      
      const encrypted = fs.readFileSync(storagePath, 'utf8');
      const decrypted = decrypt(encrypted);
      const data = JSON.parse(decrypted);
      
      return Object.entries(data).map(([account, password]) => ({
        account,
        password
      }));
    }
  } catch (e) {
    console.error('[SecureStorage] Failed to get credentials:', e);
    return [];
  }
}

/**
 * Migrate existing plaintext API keys to secure storage
 * @param {Object} settings - Current settings object
 * @returns {Promise<Object>} - Settings with API keys removed
 */
async function migratePlaintextKeys(settings) {
  const migratedSettings = { ...settings };
  const keysToMigrate = ['groq_api_key', 'openai_api_key', 'anthropic_api_key'];
  
  for (const key of keysToMigrate) {
    if (migratedSettings[key]) {
      console.log(`[SecureStorage] Migrating ${key} to secure storage`);
      await setPassword(key, migratedSettings[key]);
      delete migratedSettings[key];
    }
  }
  
  return migratedSettings;
}

module.exports = {
  initialize,
  setPassword,
  getPassword,
  deletePassword,
  getCredentials,
  migratePlaintextKeys
};
