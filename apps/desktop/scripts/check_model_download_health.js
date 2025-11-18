/**
 * Model Download Health Check Script
 * Checks if model download sources are accessible and healthy
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

const MODELS = ['tiny', 'base', 'small', 'medium', 'large'];
const HUGGINGFACE_BASE = 'https://huggingface.co';
const TIMEOUT = 10000; // 10 seconds

async function checkURL(url) {
  return new Promise((resolve) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = client.get(url, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'SONU-Model-Health-Check/1.0'
      }
    }, (res) => {
      resolve({
        accessible: res.statusCode >= 200 && res.statusCode < 400,
        statusCode: res.statusCode,
        status: res.statusMessage
      });
      res.destroy();
    });
    
    req.on('error', (error) => {
      resolve({
        accessible: false,
        error: error.message,
        statusCode: null
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        accessible: false,
        error: 'Request timeout',
        statusCode: null
      });
    });
    
    req.setTimeout(TIMEOUT);
  });
}

async function checkModelDownloadHealth() {
  console.log('🔍 Checking model download health...\n');
  
  const results = [];
  let allHealthy = true;
  
  for (const model of MODELS) {
    const modelUrl = `${HUGGINGFACE_BASE}/openai/whisper-${model}`;
    
    console.log(`Checking ${model}...`);
    const result = await checkURL(modelUrl);
    
    const health = {
      model,
      url: modelUrl,
      accessible: result.accessible,
      statusCode: result.statusCode,
      status: result.status || result.error || 'Unknown',
      healthy: result.accessible
    };
    
    results.push(health);
    
    if (!health.healthy) {
      allHealthy = false;
      console.log(`  ❌ ${model}: ${health.status}`);
    } else {
      console.log(`  ✅ ${model}: Accessible (${health.statusCode})`);
    }
  }
  
  console.log('\n📊 Summary:');
  const healthyCount = results.filter(r => r.healthy).length;
  console.log(`  Healthy: ${healthyCount}/${MODELS.length}`);
  console.log(`  Status: ${allHealthy ? '✅ All models accessible' : '⚠️  Some models inaccessible'}\n`);
  
  return {
    allHealthy,
    results,
    timestamp: new Date().toISOString()
  };
}

// Run if called directly
if (require.main === module) {
  checkModelDownloadHealth()
    .then((summary) => {
      process.exit(summary.allHealthy ? 0 : 1);
    })
    .catch((error) => {
      console.error('Error checking model health:', error);
      process.exit(1);
    });
}

module.exports = { checkModelDownloadHealth, checkURL };

