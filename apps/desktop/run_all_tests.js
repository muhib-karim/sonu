/**
 * Automated Test Runner for SONU
 * Runs all tests: unit, integration, and E2E
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const testsDir = path.join(__dirname, 'tests');

console.log('🧪 Starting comprehensive test suite for SONU...\n');

// Ensure test dependencies are installed
console.log('📦 Checking test dependencies...');
try {
  process.chdir(testsDir);
  if (!fs.existsSync(path.join(testsDir, 'node_modules'))) {
    console.log('Installing test dependencies...');
    execSync('npm install', { stdio: 'inherit' });
  }
} catch (e) {
  console.error('Error installing test dependencies:', e.message);
  process.exit(1);
}

// Run tests in sequence
const testSuites = [
  { name: 'Unit Tests', command: 'npm run test:unit' },
  { name: 'Integration Tests', command: 'npm run test:integration' },
  { name: 'E2E Tests - Basic', command: 'npm run test:e2e' },
  { name: 'E2E Tests - Complete Functionality', command: 'npm run test:e2e:complete' }
];

let allPassed = true;
const results = [];

for (const suite of testSuites) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${suite.name}`);
  console.log('='.repeat(60));
  
  try {
    execSync(suite.command, { 
      stdio: 'inherit',
      cwd: testsDir,
      env: { ...process.env, NODE_ENV: 'test' }
    });
    results.push({ suite: suite.name, status: 'PASSED' });
    console.log(`✅ ${suite.name} PASSED\n`);
  } catch (e) {
    results.push({ suite: suite.name, status: 'FAILED', error: e.message });
    console.error(`❌ ${suite.name} FAILED: ${e.message}\n`);
    allPassed = false;
  }
}

// Print summary
console.log('\n' + '='.repeat(60));
console.log('TEST SUMMARY');
console.log('='.repeat(60));
results.forEach(result => {
  const icon = result.status === 'PASSED' ? '✅' : '❌';
  console.log(`${icon} ${result.suite}: ${result.status}`);
});
console.log('='.repeat(60));

if (allPassed) {
  console.log('\n🎉 All tests passed!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review the output above.');
  process.exit(1);
}

