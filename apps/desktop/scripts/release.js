/**
 * Automated Release Script
 * Bumps version, builds installer, creates git tag, and pushes to GitHub
 * 
 * Usage: node scripts/release.js [patch|minor|major]
 * Example: node scripts/release.js patch
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PACKAGE_JSON_PATH = path.join(__dirname, '..', 'package.json');
const ROOT_DIR = path.join(__dirname, '..', '..', '..');

function getCurrentVersion() {
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  return packageJson.version;
}

function bumpVersion(type = 'patch') {
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  const [major, minor, patch] = packageJson.version.split('.').map(Number);
  
  let newVersion;
  switch (type) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
    default:
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }
  
  packageJson.version = newVersion;
  fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
  
  return newVersion;
}

function buildInstaller() {
  console.log('📦 Building Windows installer...');
  try {
    execSync('npm run build', { 
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });
    console.log('✅ Build completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    return false;
  }
}

function createGitTag(version) {
  console.log(`🏷️  Creating git tag v${version}...`);
  try {
    execSync(`git add ${PACKAGE_JSON_PATH}`, { cwd: ROOT_DIR });
    execSync(`git commit -m "Bump version to ${version}"`, { cwd: ROOT_DIR });
    execSync(`git tag -a v${version} -m "Release version ${version}"`, { cwd: ROOT_DIR });
    console.log('✅ Git tag created successfully!');
    return true;
  } catch (error) {
    console.error('❌ Failed to create git tag:', error.message);
    return false;
  }
}

function pushToGitHub(version) {
  console.log('🚀 Pushing to GitHub...');
  try {
    execSync('git push', { cwd: ROOT_DIR, stdio: 'inherit' });
    execSync(`git push origin v${version}`, { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log('✅ Pushed to GitHub successfully!');
    console.log(`\n🎉 Release v${version} is being built automatically via GitHub Actions!`);
    console.log(`📦 Check: https://github.com/muhib-karim/sonu/releases`);
    return true;
  } catch (error) {
    console.error('❌ Failed to push to GitHub:', error.message);
    return false;
  }
}

function main() {
  const versionType = process.argv[2] || 'patch';
  
  if (!['patch', 'minor', 'major'].includes(versionType)) {
    console.error('❌ Invalid version type. Use: patch, minor, or major');
    process.exit(1);
  }
  
  console.log('🚀 Starting automated release process...\n');
  
  const currentVersion = getCurrentVersion();
  console.log(`📌 Current version: ${currentVersion}`);
  
  const newVersion = bumpVersion(versionType);
  console.log(`📌 New version: ${newVersion}\n`);
  
  // Ask user if they want to build locally (optional)
  console.log('💡 Note: Building locally requires admin privileges.');
  console.log('💡 You can skip local build and let GitHub Actions build it automatically.\n');
  
  // For now, we'll skip local build and just create the tag
  // GitHub Actions will handle the build
  console.log('⏭️  Skipping local build - GitHub Actions will build automatically\n');
  
  if (!createGitTag(newVersion)) {
    console.error('❌ Release process failed at git tag creation');
    process.exit(1);
  }
  
  if (!pushToGitHub(newVersion)) {
    console.error('❌ Release process failed at GitHub push');
    process.exit(1);
  }
  
  console.log('\n✅ Release process completed!');
  console.log(`\n📋 Next steps:`);
  console.log(`   1. GitHub Actions will automatically build the installer`);
  console.log(`   2. The release will be created at: https://github.com/muhib-karim/sonu/releases`);
  console.log(`   3. Monitor the build at: https://github.com/muhib-karim/sonu/actions`);
}

if (require.main === module) {
  main();
}

module.exports = { bumpVersion, getCurrentVersion };

