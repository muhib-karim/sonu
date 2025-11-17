# Visual Testing Guide - See Your App Running

This guide explains how to see your Android app running visually, either through screenshots/videos or by downloading and running the APK.

## Current Setup

### What You Get Now

1. **APK Download**: After each workflow run, you can download the built APK
2. **Screenshots**: The visual workflow (`android-test-visual.yml`) captures screenshots
3. **Test Results**: See if tests pass/fail

### Limitations

- **Headless Emulator**: The standard workflow runs tests on a headless emulator (no visual interface)
- **No Live Viewing**: You can't watch the app run in real-time through GitHub Actions

## Option 1: Download APK and Run Locally (Recommended)

### Steps

1. **Download APK from GitHub**:
   - Go to your repository → **Actions** tab
   - Click on a workflow run
   - Scroll to **Artifacts** section
   - Download `debug-apk`

2. **Install on Your Phone**:
   - Transfer APK to your Android device
   - Enable "Install from Unknown Sources" in Settings
   - Tap the APK file to install
   - Launch the app

3. **Or Use Android Emulator Locally**:
   - Install Android Studio
   - Create an emulator
   - Drag and drop the APK onto the emulator
   - Or use: `adb install app-debug.apk`

## Option 2: Use Visual Workflow (Screenshots)

The `android-test-visual.yml` workflow captures screenshots of your app running.

### How It Works

1. Builds the APK
2. Launches app on emulator
3. Takes multiple screenshots
4. Uploads screenshots as artifacts

### View Screenshots

1. Go to **Actions** → **Android Build & Visual Test**
2. Click on a workflow run
3. Download `app-screenshots` artifact
4. View PNG files showing your app

## Option 3: Firebase Test Lab (Best for Visual Testing)

Firebase Test Lab provides:
- ✅ Screenshots at key moments
- ✅ Video recordings of test runs
- ✅ Real device testing
- ✅ Multiple device configurations

### Setup

1. **Create Firebase Project**:
   - Go to https://console.firebase.google.com
   - Create new project or use existing

2. **Enable Test Lab**:
   - Go to **Test Lab** in Firebase Console
   - Enable API if prompted

3. **Create Service Account**:
   - Go to **Project Settings** → **Service Accounts**
   - Click **Generate new private key**
   - Download JSON file

4. **Add to GitHub Secrets**:
   - Go to your repo → **Settings** → **Secrets and variables** → **Actions**
   - Add secret: `FIREBASE_SERVICE_ACCOUNT`
   - Paste entire JSON content
   - (Optional) Add `FIREBASE_TEST_LAB_BUCKET` with your bucket name

5. **View Results**:
   - Go to Firebase Console → **Test Lab**
   - See test runs with screenshots and videos
   - Or download from GitHub artifacts

## Option 4: BrowserStack / AWS Device Farm

### BrowserStack App Live
- **Free Trial**: 100 minutes
- **Features**: Real devices, live viewing, screenshots, videos
- **Setup**: Sign up at https://www.browserstack.com/app-live

### AWS Device Farm
- **Pay-per-use**: ~$0.17 per device minute
- **Features**: Real devices, screenshots, videos
- **Setup**: AWS account required

## Option 5: Local Emulator with ADB (Advanced)

If you have Android Studio installed locally:

```bash
# Start emulator
emulator -avd YourAVDName

# Install APK
adb install app-debug.apk

# Launch app
adb shell am start -n com.sonu/.MainActivity

# Take screenshot
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png

# Record video
adb shell screenrecord --time-limit 30 /sdcard/demo.mp4
adb pull /sdcard/demo.mp4
```

## Quick Comparison

| Method | Visual | Real-time | Cost | Setup |
|--------|--------|-----------|------|-------|
| Download APK | ✅ | ✅ | Free | Easy |
| Screenshots Workflow | ✅ | ❌ | Free | Easy |
| Firebase Test Lab | ✅ | ❌ | Free tier | Medium |
| BrowserStack | ✅ | ✅ | Free trial | Easy |
| Local Emulator | ✅ | ✅ | Free | Medium |

## Recommended Workflow

1. **For Quick Testing**: Download APK and install on your phone
2. **For CI/CD Screenshots**: Use the visual workflow
3. **For Comprehensive Testing**: Set up Firebase Test Lab
4. **For Live Viewing**: Use BrowserStack or local emulator

## Next Steps

1. **Try the Visual Workflow**:
   - It's already set up in `.github/workflows/android-test-visual.yml`
   - Manually trigger it: **Actions** → **Android Build & Visual Test** → **Run workflow**

2. **Set Up Firebase Test Lab** (Optional):
   - Follow setup steps above
   - Get screenshots and videos automatically

3. **Download and Test Locally**:
   - Easiest way to see your app running
   - Full control and real-time interaction

## Troubleshooting

### Screenshots Are Black
- Emulator might not have display enabled
- Check workflow logs for errors
- Try Firebase Test Lab instead

### APK Won't Install
- Check Android version compatibility (minSdk 24)
- Enable "Install from Unknown Sources"
- Check device storage space

### Firebase Test Lab Not Working
- Verify service account JSON is correct
- Check Test Lab API is enabled
- Verify bucket permissions

