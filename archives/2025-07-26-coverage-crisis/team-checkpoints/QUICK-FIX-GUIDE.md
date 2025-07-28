# 🚀 Quick Fix Guide

## The Issue
The extension was clicking the wrong button - the "Choose tool" button instead of the send button.

## Fixed Now
1. Updated button detection to skip `system-hint-button`
2. Added better send button detection logic
3. Created simpler test function

## Test Steps

### 1. Reload Extension
- Go to `chrome://extensions`
- Click reload on Semantest
- Refresh ChatGPT tab

### 2. Enable Image Mode First
Manually click Tools icon → "Create image"

### 3. Test Simple Image Generation
```javascript
// Once in image mode, use the simple test:
window.simpleImageTest("A pixel art robot")
```

This will:
- Enter your prompt
- Find the correct send button (not the tool button)
- Click it to generate the image

### 4. Debug Button Detection
```javascript
// See all buttons in the form
const form = document.querySelector('form');
const buttons = form.querySelectorAll('button');
buttons.forEach((btn, idx) => {
  console.log(`Button ${idx}:`, {
    id: btn.id,
    ariaLabel: btn.getAttribute('aria-label'),
    hasSvg: btn.querySelector('svg') !== null
  });
});
```

## Expected Button IDs
- ❌ `system-hint-button` - Choose tool button (skip this)
- ❌ `upload-file-btn` - Upload button (skip this)
- ✅ The send button (usually no ID, but has an SVG arrow)

## Full Automated Test
```javascript
// First enable image mode manually, then:
async function fullTest() {
  // Check if in image mode
  const placeholder = document.querySelector('#prompt-textarea')?.getAttribute('placeholder');
  if (!placeholder?.includes('image')) {
    console.log('Please enable image mode first!');
    return;
  }
  
  // Generate image
  await window.simpleImageTest("A beautiful sunset");
}

fullTest();
```

The key fix was to properly identify and skip the "Choose tool" button (`system-hint-button`) that was being clicked by mistake.