# Firebase Setup Clarification

## For GitHub Actions (What You Need)

**You DON'T need the Firebase Admin SDK code!** 

The GitHub Actions workflow uses the service account JSON directly. Here's what you actually need:

### Step 1: Get Service Account JSON

1. Go to https://console.firebase.google.com
2. Select your project
3. Click **⚙️ Settings** → **Project settings**
4. Go to **Service accounts** tab
5. Click **"Generate new private key"**
6. Download the JSON file

### Step 2: Add to GitHub Secrets

1. Go to: https://github.com/muhib-karim/sonu/settings/secrets/actions
2. Click **"New repository secret"**
3. Name: `FIREBASE_SERVICE_ACCOUNT`
4. Value: **Copy the ENTIRE content of the JSON file** (not the code you showed)
5. Click **"Add secret"**

### That's It!

The workflow will automatically use this JSON to authenticate with Firebase Test Lab. No code needed!

## If You Want to Use Firebase Admin SDK Locally

If you want to use Firebase Admin SDK in your own scripts (not required for GitHub Actions), here's how:

### Install Firebase Admin SDK

```bash
npm install firebase-admin
```

### Use in Your Code

```javascript
const admin = require("firebase-admin");

// Load service account from file
const serviceAccount = require("./path/to/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Now you can use Firebase Admin SDK
// For example, to interact with Firestore, Realtime Database, etc.
```

### Or Use Environment Variable (Better for Security)

```javascript
const admin = require("firebase-admin");

// Load from environment variable (GitHub Secrets style)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
```

## For GitHub Actions Workflow

The workflow file (`.github/workflows/android-cloud-visual.yml`) already handles authentication like this:

```yaml
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    credentials_json: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
```

This automatically uses the JSON you added to GitHub Secrets. No code needed!

## Summary

- **For GitHub Actions**: Just add the JSON to Secrets, no code needed ✅
- **For Local Scripts**: Use the Admin SDK code you showed (optional) 📝
- **For Testing**: The workflow handles everything automatically 🚀

## Quick Checklist

- [ ] Create Firebase project
- [ ] Download service account JSON
- [ ] Add JSON to GitHub Secrets as `FIREBASE_SERVICE_ACCOUNT`
- [ ] Run workflow - it will work automatically!

No Firebase Admin SDK code needed for the GitHub Actions workflow! 🎉

