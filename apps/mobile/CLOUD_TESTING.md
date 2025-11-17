# Cloud Testing Setup for Android

This document explains how the Android app is tested in the cloud using GitHub Actions.

## Overview

The Android app is automatically built and tested in the cloud whenever:
- Code is pushed to `mobile-v4` or `main` branches
- Pull requests are created
- Workflow is manually triggered

## GitHub Actions Workflow

The workflow (`.github/workflows/android-test.yml`) performs:

### 1. Build Job (`build-and-test`)
- ✅ Checks out code with submodules (whisper.cpp)
- ✅ Sets up JDK 17 and Android SDK
- ✅ Builds Debug APK
- ✅ Builds Release APK (unsigned)
- ✅ Runs unit tests
- ✅ Runs instrumented tests on Android emulator
- ✅ Uploads APKs as artifacts
- ✅ Uploads test results

### 2. Firebase Test Lab Job (`firebase-test-lab`)
- ✅ Runs on real devices in Google Cloud
- ✅ Only runs on manual dispatch or tags (to save quota)
- ✅ Requires Firebase service account secret

## Artifacts

After each run, you can download:
- **Debug APK**: `debug-apk` artifact
- **Release APK**: `release-apk` artifact (if build succeeds)
- **Test Results**: `test-results` artifact (XML format)
- **Build Logs**: `build-logs` artifact (on failure)

## Viewing Results

1. Go to your GitHub repository
2. Click **Actions** tab
3. Select the workflow run
4. Click on **build-and-test** job
5. Scroll down to **Artifacts** section
6. Download the APK or test results

## Manual Testing

To manually trigger a test run:

1. Go to **Actions** → **Android Build & Test**
2. Click **Run workflow**
3. Select branch and click **Run workflow**

## Firebase Test Lab Setup (Optional)

To enable Firebase Test Lab testing:

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Test Lab API
3. Create a service account:
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download the JSON file
4. Add secret to GitHub:
   - Go to Repository → Settings → Secrets and variables → Actions
   - Add new secret: `FIREBASE_SERVICE_ACCOUNT`
   - Paste the entire JSON content
5. (Optional) Add bucket name: `FIREBASE_TEST_LAB_BUCKET`

## Test Execution

### Unit Tests
- Run automatically on every push/PR
- Tests JNI bridge functionality
- Tests model management
- Tests audio recording logic

### Instrumented Tests
- Run on Android emulator (API 34)
- Tests full app integration
- Requires emulator to be running
- May take 10-20 minutes

## Troubleshooting

### Build Fails
- Check workflow logs for error messages
- Verify submodule is initialized
- Check Android SDK setup
- Verify Gradle wrapper exists

### Tests Fail
- Check test logs in artifacts
- Verify model files are available (for integration tests)
- Check emulator logs

### APK Not Generated
- Check build logs
- Verify all dependencies are resolved
- Check NDK/CMake setup

## Local Testing

To test locally before pushing:

```bash
cd apps/mobile/android

# Build
./gradlew assembleDebug

# Run unit tests
./gradlew test

# Run instrumented tests (requires emulator)
./gradlew connectedAndroidTest
```

## Performance

- **Build time**: ~10-15 minutes
- **Test time**: ~5-10 minutes
- **Total**: ~15-25 minutes per run

## Cost

- **GitHub Actions**: Free for public repos, 2000 minutes/month for private
- **Firebase Test Lab**: Free tier includes 15 tests/day

## Next Steps

1. Monitor workflow runs in Actions tab
2. Review test results
3. Download and test APKs on physical devices
4. Set up Firebase Test Lab for real device testing (optional)

