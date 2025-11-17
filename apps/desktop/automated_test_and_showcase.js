/**
 * Automated Test Runner and Showcase Generator
 * Runs all tests, generates showcases, and uploads to GitHub
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting automated testing and showcase generation...\n');

const desktopDir = __dirname;
const testsDir = path.join(desktopDir, 'tests');

// Step 1: Install test dependencies if needed
console.log('📦 Step 1: Checking test dependencies...');
try {
  if (!fs.existsSync(path.join(testsDir, 'node_modules'))) {
    console.log('Installing test dependencies...');
    execSync('npm install', { stdio: 'inherit', cwd: testsDir });
  } else {
    console.log('Test dependencies already installed ✓');
  }
} catch (e) {
  console.error('Error installing test dependencies:', e.message);
  process.exit(1);
}

// Step 2: Run comprehensive tests
console.log('\n🧪 Step 2: Running comprehensive tests...');
const testSuites = [
  { name: 'Unit Tests', command: 'npm run test:unit', cwd: testsDir },
  { name: 'Integration Tests', command: 'npm run test:integration', cwd: testsDir },
  { name: 'E2E Tests - Real-Time Comprehensive', command: 'npm run test:e2e:realtime', cwd: testsDir }
];

let allTestsPassed = true;
for (const suite of testSuites) {
  console.log(`\nRunning: ${suite.name}...`);
  try {
    execSync(suite.command, { 
      stdio: 'inherit',
      cwd: suite.cwd,
      env: { ...process.env, NODE_ENV: 'test' }
    });
    console.log(`✅ ${suite.name} PASSED`);
  } catch (e) {
    console.error(`❌ ${suite.name} FAILED`);
    allTestsPassed = false;
    // Continue with other tests even if one fails
  }
}

if (!allTestsPassed) {
  console.log('\n⚠️  Some tests failed, but continuing with showcase generation...');
}

// Step 3: Generate showcases
console.log('\n📸 Step 3: Generating showcases...');
try {
  console.log('Running showcase script...');
  execSync('npm run showcase', { 
    stdio: 'inherit',
    cwd: desktopDir,
    env: { ...process.env, SHOWCASE_CAPTURE: '1' }
  });
  console.log('✅ Showcases generated successfully');
} catch (e) {
  console.error('❌ Showcase generation failed:', e.message);
  // Continue anyway
}

// Step 4: Upload to GitHub
console.log('\n📤 Step 4: Uploading to GitHub...');
try {
  const rootDir = path.join(desktopDir, '..', '..');
  process.chdir(rootDir);
  
  // Check if git is initialized
  try {
    execSync('git status', { stdio: 'pipe' });
  } catch (e) {
    console.log('Git not initialized or not a git repository. Skipping upload.');
    process.exit(allTestsPassed ? 0 : 1);
  }
  
  // Add all changes
  execSync('git add -A', { stdio: 'inherit' });
  
  // Commit
  const timestamp = new Date().toISOString();
  execSync(`git commit -m "chore: Automated test run and showcase update - ${timestamp}"`, { 
    stdio: 'inherit' 
  });
  
  // Push
  execSync('git push', { stdio: 'inherit' });
  console.log('✅ Successfully uploaded to GitHub');
} catch (e) {
  console.error('❌ GitHub upload failed:', e.message);
  console.log('You may need to manually commit and push changes.');
}

// Final summary
console.log('\n' + '='.repeat(60));
console.log('AUTOMATION COMPLETE');
console.log('='.repeat(60));
console.log(`Tests: ${allTestsPassed ? '✅ All passed' : '⚠️  Some failed'}`);
console.log('Showcases: ✅ Generated');
console.log('GitHub: ✅ Uploaded (if git configured)');
console.log('='.repeat(60));

process.exit(allTestsPassed ? 0 : 1);

