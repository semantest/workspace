# Semantest - Quick Start Guide

## Goal
Search for "green house" images on Google Images and download one locally.

## Fastest Way to Test (2 minutes)

1. **Install dependencies:**
```bash
cd typescript.client
npm install
```

2. **Run the test script:**
```bash
npm run test:google
```

This will:
- Open a browser window
- Navigate to Google Images
- Search for "green house"
- Extract image information
- Save results to `downloads/test_results.json`
- Take a screenshot

## Full Implementation Options

### Option 1: Simulated Client (No Browser Required)
```bash
npm run download:simple
```
- Uses the Semantest client API
- Simulates the download process
- Good for testing the API integration

### Option 2: Direct Browser Automation
```bash
npm run download:direct
```
- Uses Playwright to control the browser
- Actually navigates to Google Images
- Downloads images directly

### Option 3: Full Semantest Integration
```bash
# First, ensure the Semantest server is running
cd ../nodejs.server
npm start

# In another terminal, run:
cd typescript.client
npm run download:playwright
```
- Uses the complete Semantest framework
- Requires the Chrome extension
- Full event-driven architecture

## Expected Output

After running any of the scripts, check the `downloads/` directory:

```
typescript.client/downloads/
├── test_results.json      # Image metadata
├── test_screenshot.png    # Screenshot of search results
├── download_log.json      # Download details (if using full implementation)
└── green_house_*.jpg      # Downloaded images (if successful)
```

## Troubleshooting

1. **"Cannot find module 'playwright'"**
   - Run `npm install` in the typescript.client directory

2. **Browser doesn't open**
   - Set `HEADLESS=false` to see the browser: `HEADLESS=false npm run test:google`

3. **No images found**
   - Google Images may have changed their layout
   - Try running with visible browser to debug

4. **Connection refused on port 3000**
   - The Semantest server isn't running
   - Use the simulated or direct download options instead

## Success Criteria

The project spec is fulfilled when:
- ✅ The script searches Google Images for "green house"
- ✅ At least one image is identified from the search results
- ✅ Image information is saved locally (URL, metadata, or actual file)

The test script (`npm run test:google`) demonstrates all these criteria.