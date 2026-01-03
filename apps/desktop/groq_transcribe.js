/**
 * Groq Whisper API Integration for SONU
 * Provides instant transcription using Groq's Whisper Large V3 model
 * Free tier: 20,000 audio seconds/day
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Load API key from .env file
function loadApiKey() {
  const envPath = path.join(__dirname, 'data', '.env');
  try {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/GROQ_API_KEY=(.+)/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  } catch (e) {
    console.error('Error loading Groq API key:', e.message);
  }
  return null;
}

// Save API key to .env file
function saveApiKey(apiKey) {
  const envPath = path.join(__dirname, 'data', '.env');
  try {
    const dataDir = path.dirname(envPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(envPath, `GROQ_API_KEY=${apiKey}\n`, 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving Groq API key:', e.message);
    return false;
  }
}

// Check if Groq is configured and enabled
function isGroqEnabled() {
  const settingsPath = path.join(__dirname, 'data', 'settings.json');
  try {
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      return settings.transcription_engine === 'groq' && !!loadApiKey();
    }
  } catch (e) {
    console.error('Error checking Groq status:', e.message);
  }
  return false;
}

// Transcribe audio file using Groq Whisper API
async function transcribeWithGroq(audioFilePath, language = null) {
  const apiKey = loadApiKey();
  if (!apiKey) {
    throw new Error('Groq API key not configured');
  }

  const startTime = Date.now();
  console.log(`[GROQ] Starting transcription | file: ${audioFilePath}`);

  return new Promise((resolve, reject) => {
    // Read audio file
    const audioData = fs.readFileSync(audioFilePath);
    const fileName = path.basename(audioFilePath);
    
    // Build multipart form data manually (no external dependency)
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
    
    let body = '';
    
    // Add file field
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
    body += `Content-Type: audio/wav\r\n\r\n`;
    
    // Add model field
    const modelPart = `--${boundary}\r\n`;
    const modelDisp = `Content-Disposition: form-data; name="model"\r\n\r\n`;
    const modelValue = `whisper-large-v3\r\n`;
    
    // Add language field if specified
    let langPart = '';
    if (language) {
      langPart = `--${boundary}\r\n`;
      langPart += `Content-Disposition: form-data; name="language"\r\n\r\n`;
      langPart += `${language}\r\n`;
    }
    
    // Add response_format field
    const formatPart = `--${boundary}\r\n`;
    const formatDisp = `Content-Disposition: form-data; name="response_format"\r\n\r\n`;
    const formatValue = `json\r\n`;
    
    const ending = `--${boundary}--\r\n`;
    
    // Build buffer
    const parts = [
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: audio/wav\r\n\r\n`),
      audioData,
      Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-large-v3\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\njson\r\n`)
    ];
    
    if (language) {
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n${language}\r\n`));
    }
    
    parts.push(Buffer.from(`--${boundary}--\r\n`));
    
    const requestBody = Buffer.concat(parts);
    
    const options = {
      hostname: 'api.groq.com',
      port: 443,
      path: '/openai/v1/audio/transcriptions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': requestBody.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const duration = Date.now() - startTime;
        console.log(`[GROQ] Response received | duration: ${duration}ms | status: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(data);
            console.log(`[GROQ] Transcription successful | text length: ${result.text?.length || 0}`);
            resolve({
              success: true,
              text: result.text || '',
              duration: duration,
              model: 'whisper-large-v3'
            });
          } catch (e) {
            console.error('[GROQ] JSON parse error:', e.message);
            reject(new Error('Failed to parse Groq response'));
          }
        } else if (res.statusCode === 401) {
          console.error('[GROQ] Authentication failed - invalid API key');
          reject(new Error('Invalid Groq API key'));
        } else if (res.statusCode === 429) {
          console.error('[GROQ] Rate limit exceeded');
          reject(new Error('Groq rate limit exceeded - try again later or use local transcription'));
        } else {
          console.error(`[GROQ] API error: ${res.statusCode} - ${data}`);
          reject(new Error(`Groq API error: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (e) => {
      console.error('[GROQ] Request error:', e.message);
      reject(new Error(`Groq request failed: ${e.message}`));
    });

    req.write(requestBody);
    req.end();
  });
}

// Validate API key by making a test request
async function validateApiKey(apiKey) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.groq.com',
      port: 443,
      path: '/openai/v1/models',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        resolve({ valid: true });
      } else if (res.statusCode === 401) {
        resolve({ valid: false, error: 'Invalid API key' });
      } else {
        resolve({ valid: false, error: `HTTP ${res.statusCode}` });
      }
    });

    req.on('error', (e) => {
      resolve({ valid: false, error: e.message });
    });

    req.end();
  });
}

// Get Groq status (key configured, valid, etc.)
async function getGroqStatus() {
  const apiKey = loadApiKey();
  if (!apiKey) {
    return {
      configured: false,
      valid: false,
      enabled: false,
      message: 'API key not configured'
    };
  }

  const validation = await validateApiKey(apiKey);
  const enabled = isGroqEnabled();

  return {
    configured: true,
    valid: validation.valid,
    enabled: enabled,
    message: validation.valid ? 'Ready' : validation.error,
    keyPreview: apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4)
  };
}

module.exports = {
  loadApiKey,
  saveApiKey,
  isGroqEnabled,
  transcribeWithGroq,
  validateApiKey,
  getGroqStatus
};
