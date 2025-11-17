# Quick Cloud Testing Setup (5 Minutes) ⚡

Get visual testing working in 5 minutes with Firebase Test Lab.

## Step 1: Create Firebase Project (2 min)

1. Go to https://console.firebase.google.com
2. Click **"Add project"**
3. Name: `sonu-testing` (or any name)
4. Click **Continue** → **Continue** → **Create project**
5. Wait for setup to complete

## Step 2: Get Service Account (1 min)

1. In Firebase Console, click **⚙️ Settings** → **Project settings**
2. Go to **Service accounts** tab
3. Click **"Generate new private key"**
4. Click **"Generate key"** in the popup
5. **Download the JSON file** (save it!)

## Step 3: Add to GitHub (2 min)

1. Go to: https://github.com/muhib-karim/sonu/settings/secrets/actions
2. Click **"New repository secret"**
3. Name: `FIREBASE_SERVICE_ACCOUNT`
4. Value: **Open the JSON file you downloaded, copy ALL content, paste here**
5. Click **"Add secret"**

## Step 4: Run Test (1 min)

1. Go to: https://github.com/muhib-karim/sonu/actions
2. Find **"Android Cloud Visual Testing"**
3. Click **"Run workflow"** (top right)
4. Select `firebase` as test type
5. Click **"Run workflow"**

## Step 5: View Results (Wait 10-15 min)

1. Wait for workflow to complete (green checkmark)
2. Click on the workflow run
3. Scroll to **Artifacts** section
4. Download **"firebase-screenshots-videos"**
5. Extract ZIP file
6. **View your app screenshots and videos!** 🎉

## Also View in Firebase Console

1. Go to: https://console.firebase.google.com
2. Select your project
3. Click **Test Lab** (left sidebar)
4. See all test runs with screenshots/videos

## That's It! 🎊

You now have cloud-based visual testing set up. No powerful laptop needed!

---

**Need help?** Check `CLOUD_VISUAL_TESTING_SETUP.md` for detailed instructions.

