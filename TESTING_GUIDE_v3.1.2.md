# Testing Guide for SONU v3.1.2

## What Was Fixed

### ✅ 1. Model Size Corrections
- **Small model**: Now correctly shows 466 MB (was showing 244 MB)
- **Medium model**: Now correctly shows 1530 MB (was showing 769 MB)
- **Large model**: Added with correct size 3100 MB (was missing)

### ✅ 2. Import Model Button Restored
- "📂 Import Model File..." button is back
- Allows importing locally downloaded .bin, .ggml, or .gguf files

### ✅ 3. Download Verification Added
- Now shows: "Downloaded: X MB / Y MB"
- Provides real-time byte-level feedback
- Confirms downloads are actually happening (not simulated)

### ✅ 4. UI Consistency
- All sizes match across dropdown, active model card, and download progress
- Section renamed to "Download or Import Model" for clarity

---

## How to Test

### Test 1: Verify Model Sizes in Dropdown
**Expected Result**: All sizes should match the fixes

1. Open SONU
2. Click Settings (gear icon)
3. Click "Model Selector"
4. Check dropdown options:
   - ✅ Tiny (75 MB) - Fastest
   - ✅ Base (142 MB) - Balanced
   - ✅ **Small (466 MB)** - Good accuracy
   - ✅ **Medium (1530 MB)** - High accuracy
   - ✅ **Large (3100 MB)** - Best (requires powerful hardware)

**Pass Criteria**: All sizes match the list above

---

### Test 2: Verify Import Button is Present
**Expected Result**: Import button should be visible

1. Go to Settings → Model Selector
2. Look for "📂 Import Model File..." button
3. It should be next to "Download & Apply" button

**Pass Criteria**: Import button is visible

---

### Test 3: Download Model with Progress Verification
**Expected Result**: Should show actual bytes downloaded

1. Go to Settings → Model Selector
2. Select "**Tiny (75 MB)**" from dropdown (smallest for quick test)
3. Click "Download & Apply"
4. Observe the progress display:
   - Progress bar should fill (0% → 100%)
   - Speed should show (e.g., "2.5 MB/s")
   - **NEW**: Should show "Downloaded: X.X MB / 75.0 MB"
5. Wait for completion

**Pass Criteria**: 
- Download completes successfully
- "Downloaded" line shows increasing MB values
- Final size matches expected (75 MB for tiny)
- Active Model Card updates to "TINY (75 MB) ✓ Ready"

**What to Look For**:
- Is the "Downloaded: X MB / Y MB" line visible?
- Do the numbers increase realistically?
- Does it reach the expected total (75 MB)?

---

### Test 4: Test a Larger Model Download
**Expected Result**: Should correctly handle large files

**ONLY IF YOU HAVE TIME AND BANDWIDTH**:
1. Select "Small (466 MB)" from dropdown
2. Note the size shown: Should say **466 MB** (not 244 MB)
3. Click "Download & Apply"
4. Watch for:
   - "Downloaded: X MB / **466.0 MB**"
   - Progress should accurately reflect 466 MB total
5. Let it complete or cancel after verifying the total MB is correct

**Pass Criteria**:
- Total shows as 466 MB (not 244 MB)
- Download progress counts toward 466 MB

---

### Test 5: Import Model Button Functionality
**Expected Result**: File dialog should open

1. Click "📂 Import Model File..."
2. File dialog should open
3. Cancel the dialog (or select a .bin file if you have one)

**Pass Criteria**:
- File dialog opens
- Can select .bin, .ggml, or .gguf files
- If a valid model is imported, it becomes active

---

### Test 6: Press-and-Hold First Launch
**Expected Result**: Should not beep on first attempt

1. **Fresh launch**: Close app completely, restart
2. Wait 10 seconds for model to load
3. Look at Active Model Card:
   - Should show "⏳ Loading..." initially
   - Then change to "✓ Ready"
4. Only after "✓ Ready" appears, try press-and-hold dictation
5. Speak: "Testing first launch"

**Pass Criteria**:
- No beeping if you wait for "✓ Ready"
- If you try before ready, should show warning: "⏳ Model still loading, please wait..."
- Dictation works smoothly after ready state

---

### Test 7: Multi-Launch Issue
**Expected Result**: Only ONE app window should open

1. Close all SONU windows
2. Start SONU fresh
3. Count how many SONU windows open

**Pass Criteria**:
- Only 1 SONU window opens
- No duplicate windows
- No auto-relaunch behavior

**Current Status**: App started with 5 Electron processes (normal - 1 main + 4 helpers)

---

## Issues to Report

If you encounter any of these, please let me know:

- [ ] Model sizes still incorrect in dropdown
- [ ] Import button missing
- [ ] "Downloaded: X MB / Y MB" not showing during download
- [ ] Download progress appears simulated (numbers don't change)
- [ ] Download completes but final size doesn't match expected
- [ ] App launches multiple windows
- [ ] Press-and-hold beeps on first try (even after waiting for "✓ Ready")
- [ ] Large model (3100 MB) download fails

---

## Quick Test (Recommended)

**Fastest way to verify all fixes**:

1. ✅ Open Settings → Model Selector
2. ✅ Verify dropdown shows: Small (466 MB), Medium (1530 MB), Large (3100 MB)
3. ✅ Verify "📂 Import Model File..." button is present
4. ✅ Download Tiny model (75 MB) and watch for "Downloaded: X MB / 75.0 MB"
5. ✅ Wait for "✓ Ready" in Active Model Card before trying dictation
6. ✅ Test press-and-hold dictation

**If all 6 checks pass**: Everything is working! 🎉

---

## Log Locations

If issues occur, check logs at:
- **App Logs**: `C:\Users\Muhib\AppData\Roaming\sonu\logs\`
  - `download-2025-11-07.log` - Download events
  - `typing-2025-11-07.log` - Typing events
  - `whisper-2025-11-07.log` - Whisper model events
  - `main-2025-11-07.log` - General app events

- **Session Logs**: `C:\Users\Muhib\Desktop\Sonu\logs\session-*\`
  - `app-output.log` - Console output from current session

---

## Known Limitations

1. **Large model downloads**: May take 10-30 minutes depending on connection speed (3.1 GB file)
2. **Medium model**: ~1.5 GB, may take 5-15 minutes
3. **First model load**: Takes 5-10 seconds for the model to load into memory after app start

---

## Success Metrics

**All fixes successful if**:
- ✅ Model sizes in dropdown are accurate (466 MB, 1530 MB, 3100 MB)
- ✅ Import button is functional
- ✅ Download shows real bytes: "Downloaded: X MB / Y MB"
- ✅ Only one app window opens
- ✅ First dictation works without beeping (after waiting for "✓ Ready")

---

## Next Steps After Testing

Once you've tested and confirmed:
1. Report any remaining issues
2. I can implement the pending features:
   - Auto-select better models based on hardware
   - Clean up unused models
   - Log versioning (keep last 2 sessions)

