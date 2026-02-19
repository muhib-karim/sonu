/**
 * Validation Module
 * 
 * Provides input validation for IPC parameters, paths, and user inputs
 * to prevent injection attacks and ensure data integrity.
 * 
 * @module validation
 */

const path = require('path');
const { ERROR_CODES } = require('../config/constants');

// Valid model IDs (whitelist)
const VALID_MODELS = [
  'tiny', 'tiny.en', 'base', 'base.en', 'small', 'small.en',
  'medium', 'medium.en', 'large-v1', 'large-v2', 'large-v3',
  'parakeet-tdt-0.6b-v3'
];

// Valid language codes
const VALID_LANGUAGES = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ru', 'ja',
  'zh', 'ko', 'ar', 'hi', 'tr', 'vi', 'th', 'id', 'cs', 'el',
  'sv', 'hu', 'ro', 'da', 'fi', 'no', 'uk', 'he', 'auto'
];

// Valid style/persona names
const VALID_STYLES = [
  'neutral', 'professional', 'casual', 'formal', 'technical',
  'excited', 'very_casual'
];

// Valid IPC channel names
const VALID_CHANNELS = [
  'settings:get', 'settings:set', 'recording:toggle', 'recording:status',
  'window:show', 'window:hide', 'typing:type', 'models:list',
  'models:download', 'history:get', 'history:clear'
];

// Path traversal patterns to block
const DANGEROUS_PATH_PATTERNS = [
  /\.\./,                    // Directory traversal
  /[\x00-\x1f]/,             // Control characters
  /\/etc\/passwd/i,          // System files
  /\/etc\/shadow/i,
  /\/etc\/hosts/i,
  /C:\\Windows\\System32/i,  // Windows system
  /\.exe$/i,                // Executables
  /\.bat$/i,
  /\.cmd$/i,
  /\.sh$/i
];

/**
 * Validation result object
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {string} [error] - Error message if invalid
 * @property {string} [code] - Error code
 */

/**
 * Validate a model ID
 * @param {string} modelId - Model identifier
 * @returns {ValidationResult}
 */
function validateModelId(modelId) {
  if (!modelId || typeof modelId !== 'string') {
    return {
      valid: false,
      error: 'Model ID is required',
      code: ERROR_CODES.MODEL_LOAD_FAILED
    };
  }

  // Check whitelist
  if (!VALID_MODELS.includes(modelId)) {
    return {
      valid: false,
      error: `Invalid model ID: ${modelId}`,
      code: ERROR_CODES.MODEL_LOAD_FAILED
    };
  }

  // Check for injection attempts
  if (DANGEROUS_PATH_PATTERNS.some(pattern => pattern.test(modelId))) {
    return {
      valid: false,
      error: 'Model ID contains invalid characters',
      code: ERROR_CODES.MODEL_LOAD_FAILED
    };
  }

  return { valid: true };
}

/**
 * Validate a file path for safety
 * @param {string} filePath - File path to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.allowAbsolute - Allow absolute paths
 * @param {Array<string>} options.allowedExtensions - Allowed file extensions
 * @returns {ValidationResult}
 */
function validatePath(filePath, options = {}) {
  const { allowAbsolute = false, allowedExtensions = [] } = options;

  if (!filePath || typeof filePath !== 'string') {
    return {
      valid: false,
      error: 'Path is required',
      code: 'INVALID_PATH'
    };
  }

  // Normalize path
  const normalized = path.normalize(filePath);

  // Check for directory traversal
  if (DANGEROUS_PATH_PATTERNS.some(pattern => pattern.test(normalized))) {
    return {
      valid: false,
      error: 'Path contains invalid characters or patterns',
      code: 'PATH_TRAVERSAL_DETECTED'
    };
  }

  // Check if absolute paths are allowed
  if (path.isAbsolute(normalized) && !allowAbsolute) {
    return {
      valid: false,
      error: 'Absolute paths are not allowed',
      code: 'ABSOLUTE_PATH_NOT_ALLOWED'
    };
  }

  // Check extension
  if (allowedExtensions.length > 0) {
    const ext = path.extname(normalized).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return {
        valid: false,
        error: `Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`,
        code: 'INVALID_EXTENSION'
      };
    }
  }

  return { valid: true, normalizedPath: normalized };
}

/**
 * Validate IPC channel name
 * @param {string} channel - Channel name
 * @returns {ValidationResult}
 */
function validateChannel(channel) {
  if (!channel || typeof channel !== 'string') {
    return {
      valid: false,
      error: 'Channel name is required',
      code: 'INVALID_CHANNEL'
    };
  }

  if (!VALID_CHANNELS.includes(channel)) {
    return {
      valid: false,
      error: `Invalid channel: ${channel}`,
      code: 'INVALID_CHANNEL'
    };
  }

  return { valid: true };
}

/**
 * Validate settings object
 * @param {Object} settings - Settings to validate
 * @returns {ValidationResult}
 */
function validateSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    return {
      valid: false,
      error: 'Settings must be an object',
      code: 'INVALID_SETTINGS'
    };
  }

  const errors = [];

  // Validate hotkeys (basic format check)
  if (settings.holdHotkey) {
    if (typeof settings.holdHotkey !== 'string' || settings.holdHotkey.length > 100) {
      errors.push('Invalid hold hotkey format');
    }
  }

  if (settings.toggleHotkey) {
    if (typeof settings.toggleHotkey !== 'string' || settings.toggleHotkey.length > 100) {
      errors.push('Invalid toggle hotkey format');
    }
  }

  // Validate model ID
  if (settings.activeModel) {
    const modelValidation = validateModelId(settings.activeModel);
    if (!modelValidation.valid) {
      errors.push(modelValidation.error);
    }
  }

  // Validate language
  if (settings.language && !VALID_LANGUAGES.includes(settings.language)) {
    errors.push(`Invalid language: ${settings.language}`);
  }

  // Validate style
  if (settings.activeStyle && !VALID_STYLES.includes(settings.activeStyle)) {
    errors.push(`Invalid style: ${settings.activeStyle}`);
  }

  // Validate numeric ranges
  if (settings.cpuThreads !== undefined) {
    const threads = parseInt(settings.cpuThreads, 10);
    if (isNaN(threads) || threads < 1 || threads > 16) {
      errors.push('CPU threads must be between 1 and 16');
    }
  }

  if (settings.beamSize !== undefined) {
    const beam = parseInt(settings.beamSize, 10);
    if (isNaN(beam) || beam < 1 || beam > 10) {
      errors.push('Beam size must be between 1 and 10');
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      error: errors.join('; '),
      code: 'INVALID_SETTINGS'
    };
  }

  return { valid: true };
}

/**
 * Validate dictionary word
 * @param {string} word - Word to validate
 * @returns {ValidationResult}
 */
function validateDictionaryWord(word) {
  if (!word || typeof word !== 'string') {
    return {
      valid: false,
      error: 'Word is required',
      code: 'INVALID_WORD'
    };
  }

  // Limit length
  if (word.length > 100) {
    return {
      valid: false,
      error: 'Word too long (max 100 characters)',
      code: 'WORD_TOO_LONG'
    };
  }

  // Check for injection patterns
  if (/[<>"'&;|$`]/.test(word)) {
    return {
      valid: false,
      error: 'Word contains invalid characters',
      code: 'INVALID_WORD'
    };
  }

  return { valid: true };
}

/**
 * Validate snippet
 * @param {Object} snippet - Snippet object
 * @returns {ValidationResult}
 */
function validateSnippet(snippet) {
  if (!snippet || typeof snippet !== 'object') {
    return {
      valid: false,
      error: 'Snippet must be an object',
      code: 'INVALID_SNIPPET'
    };
  }

  const errors = [];

  if (!snippet.abbreviation || typeof snippet.abbreviation !== 'string') {
    errors.push('Abbreviation is required');
  } else if (snippet.abbreviation.length > 50) {
    errors.push('Abbreviation too long');
  } else if (/[<>"'&;|$`\s]/.test(snippet.abbreviation)) {
    errors.push('Abbreviation contains invalid characters');
  }

  if (!snippet.text || typeof snippet.text !== 'string') {
    errors.push('Snippet text is required');
  } else if (snippet.text.length > 10000) {
    errors.push('Snippet text too long (max 10000 characters)');
  }

  if (errors.length > 0) {
    return {
      valid: false,
      error: errors.join('; '),
      code: 'INVALID_SNIPPET'
    };
  }

  return { valid: true };
}

/**
 * Sanitize string input
 * @param {string} input - Input string
 * @returns {string} Sanitized string
 */
function sanitizeString(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove control characters and trim
  return input
    .replace(/[\x00-\x1f\x7f-\x9f]/g, '')
    .trim();
}

/**
 * Validate and sanitize IPC parameters
 * @param {string} channel - IPC channel
 * @param {Array} args - Arguments
 * @returns {Object} Validation result with sanitized args
 */
function validateIPCParams(channel, args = []) {
  // Validate channel
  const channelValidation = validateChannel(channel);
  if (!channelValidation.valid) {
    return { valid: false, error: channelValidation.error };
  }

  // Sanitize arguments
  const sanitized = args.map(arg => {
    if (typeof arg === 'string') {
      return sanitizeString(arg);
    }
    if (typeof arg === 'object' && arg !== null) {
      // Deep sanitize object
      return JSON.parse(JSON.stringify(arg, (key, value) => {
        if (typeof value === 'string') {
          return sanitizeString(value);
        }
        return value;
      }));
    }
    return arg;
  });

  return { valid: true, sanitizedArgs: sanitized };
}

module.exports = {
  VALID_MODELS,
  VALID_LANGUAGES,
  VALID_STYLES,
  VALID_CHANNELS,
  validateModelId,
  validatePath,
  validateChannel,
  validateSettings,
  validateDictionaryWord,
  validateSnippet,
  sanitizeString,
  validateIPCParams
};
