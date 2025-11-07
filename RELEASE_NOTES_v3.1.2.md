# SONU v3.1.2 Release Notes

**Release Date**: November 7, 2025
**Type**: Bug Fix Release

---

## 🐛 Bug Fixes

### Model Download & Import

#### Fixed Incorrect Model Sizes
- **Small model**: Corrected from 244 MB to **466 MB** (actual size)
- **Medium model**: Corrected from 769 MB to **1530 MB** (actual size)  
- **Large model**: Added with correct size **3100 MB** (was completely missing)

**Impact**: Users now see accurate file sizes before downloading, matching the actual download size. No more confusion about mismatched sizes.

#### Restored Import Model Button
- Re-added "📂 Import Model File..." button that was accidentally removed in v3.1.1
- Allows users to import locally downloaded models (.bin, .ggml, .gguf formats)
- Useful fallback when automatic downloads fail

**Impact**: Users can now manually download models from Hugging Face and import them into SONU.

#### Added Download Verification
- New real-time byte counter: "Downloaded: X MB / Y MB"
- Shows actual bytes being downloaded vs expected total
- Provides confidence that downloads are real, not simulated

**Impact**: Users can now verify downloads are actually happening and see progress in MB, not just percentages.

#### Improved UI Labels
- Section renamed from "Download New Model" to "Download or Import Model"
- Clearer indication that both options are available

---

## 🎯 Improvements

### Consistency
- All model sizes now match across:
  - Dropdown menu
  - Active Model Card
  - Download progress display
  - Backend definitions

### User Experience
- More transparent download process
- Better feedback during model downloads
- Restored lost functionality (import button)

---

## 📋 Files Modified

- `main.js` - Updated MODEL_DEFINITIONS with correct sizes, added large model, enhanced progress data
- `index.html` - Fixed dropdown sizes, added import button, added progress details element
- `renderer.js` - Enhanced download progress display with byte-level feedback
- `package.json` - Version bump to 3.1.2

---

## 🧪 Testing

### Tested Scenarios
1. ✅ Model sizes in dropdown match actual file sizes
2. ✅ Import button is visible and functional
3. ✅ Download progress shows "Downloaded: X MB / Y MB"
4. ✅ Tiny model download works (75 MB)
5. ✅ App starts without multiple windows

### User Testing Required
- Download of small model (466 MB) - verify size displays correctly
- Download of medium model (1530 MB) - verify can complete
- Download of large model (3100 MB) - verify can complete (optional, requires bandwidth)
- Import functionality with manually downloaded .bin file

---

## 🔍 Known Issues

### Under Investigation
- **Auto-launch behavior**: Some users report app launching 3 times
  - Current status: App shows 5 Electron processes (normal for 1 main + 4 helpers)
  - Needs user confirmation if multiple windows are opening

### Workarounds
- If multiple instances: Kill all Electron processes before starting: `taskkill /F /IM electron.exe`

---

## 📝 Upgrade Notes

### From v3.1.1 to v3.1.2
- No breaking changes
- No settings migration required
- Existing models remain compatible
- Simply restart the app to get new UI

### Model Re-downloads
- NOT required - existing models work fine
- Size corrections only affect UI display and new downloads
- If you have the "small" model, it's already 466 MB (was just displayed wrong as 244 MB)

---

## 🎯 What's Next?

### Planned for v3.1.3
- Auto-select best model based on system hardware
- Clean up unused models to save disk space
- Log versioning (keep last 2 sessions, auto-delete old logs)

### Future Enhancements
- Download resume capability (partial downloads)
- Mirror selection (choose download source)
- Model performance benchmarking

---

## 📊 Version History

### v3.1.2 (Current)
- Fixed model size mismatches
- Restored import button
- Added download byte verification

### v3.1.1
- Fixed first-launch beeping issue
- Improved model selector UI
- Added comprehensive logging system
- Active model status display

### v3.1.0
- Speed improvements for typing (clipboard + Ctrl+V)
- Enhanced logging categories
- Async model loading

### v3.0.0
- Initial stable release with Electron + Whisper AI

---

## 🙏 Credits

**Reported By**: User testing and feedback
**Fixed By**: Development team
**Testing**: Ongoing

---

## 📞 Support

If you encounter issues:
1. Check `C:\Users\Muhib\AppData\Roaming\sonu\logs\` for detailed logs
2. Report issues with:
   - App version (3.1.2)
   - Steps to reproduce
   - Log files (if available)
3. Use the testing guide (`TESTING_GUIDE_v3.1.2.md`) for verification

---

**Full Changelog**: See `FIXES_v3.1.2.md` for technical details

