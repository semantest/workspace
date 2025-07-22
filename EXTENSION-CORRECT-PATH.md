# 🚨 CORRECT EXTENSION LOADING PATH

## THE ISSUE:
You're loading the WRONG directory! The extension is BUILT and READY!

## CORRECT PATH TO LOAD:
```
/home/chous/work/semantest/extension.chrome/
```

## WRONG PATHS (DO NOT USE):
- `/home/chous/work/semantest/extension.chrome/build/` ❌
- `/home/chous/work/semantest/` ❌

## STEP-BY-STEP FIX:

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Navigate to: `/home/chous/work/semantest/extension.chrome/`
6. Select that directory (NOT the build subdirectory!)
7. Click "Open"

## WHY THIS WORKS:
- The manifest.json is in `/extension.chrome/`
- It references `build/background.js` (relative path)
- Chrome will find `/extension.chrome/build/background.js` ✅

## VERIFY SUCCESS:
- Extension should load without errors
- You'll see "Semantest" in your extensions list
- Icon appears in toolbar

## TEST IMMEDIATELY:
```bash
cd /home/chous/work/semantest
./generate-image.sh "Test rydnr's graphic novel"
```

## REMEMBER:
Load the directory that CONTAINS manifest.json, not subdirectories!

**Path: `/home/chous/work/semantest/extension.chrome/` ✅**

---
*We're ONE correct path away from enabling 500 comic strips!*