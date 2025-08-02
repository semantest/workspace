#!/bin/bash

# Quick build script for development
# This bundles all files together without webpack for testing

echo "🔨 Building Semantest for ChatGPT (dev mode)..."

# Create dist directory
mkdir -p dist
mkdir -p dist/assets

# Copy manifest
cp manifest.json dist/

# Copy popup files
cp src/popup/popup.html dist/
cp src/popup/popup.css dist/

# Bundle JavaScript files (simple concatenation for dev)
echo "// Semantest for ChatGPT - Background Bundle" > dist/background.js
cat src/background/service-worker.js >> dist/background.js

echo "// Semantest for ChatGPT - Content Bundle" > dist/content.js
cat src/content/content-script.js >> dist/content.js

echo "// Semantest for ChatGPT - Addon Bundle" > dist/addon.js
echo "(function() {" >> dist/addon.js
cat src/addon/bridge-helper.js >> dist/addon.js
echo "" >> dist/addon.js
cat src/addon/state-detector.js >> dist/addon.js
echo "" >> dist/addon.js
cat src/addon/controller.js >> dist/addon.js
echo "" >> dist/addon.js
cat src/addon/button-clicker.js >> dist/addon.js
echo "" >> dist/addon.js
cat src/addon/direct-send.js >> dist/addon.js
echo "" >> dist/addon.js
cat src/addon/image-generator.js >> dist/addon.js
echo "" >> dist/addon.js
cat src/addon/image-downloader.js >> dist/addon.js
echo "" >> dist/addon.js
cat src/addon/queue-manager.js >> dist/addon.js
echo "" >> dist/addon.js
cat src/addon/index.js >> dist/addon.js
echo "})();" >> dist/addon.js

echo "// Semantest for ChatGPT - Popup Bundle" > dist/popup.js
cat src/popup/popup.js >> dist/popup.js

# Create placeholder icons if they don't exist
if [ ! -f "assets/icon128.png" ]; then
    echo "Creating placeholder icons..."
    # Create simple 1x1 pixel PNGs as placeholders
    for size in 16 32 48 128; do
        # Create a minimal PNG file (1x1 pixel, blue)
        printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x00\x00\x00\x00IEND\xaeB`\x82' > assets/icon${size}.png
    done
fi

# Copy assets
cp -r assets dist/

echo "✅ Build complete!"
echo ""
echo "To load the extension:"
echo "1. Open chrome://extensions"
echo "2. Enable Developer mode"
echo "3. Click 'Load unpacked'"
echo "4. Select the 'dist' folder"
echo ""
echo "Note: This is a simple dev build. For production, run 'npm run build'"