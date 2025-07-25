#!/bin/bash

# Fix chrome.runtime.onMessage issues in addon files

echo "🔧 Fixing chrome.runtime.onMessage in addon files..."

# Files to fix
FILES=(
  "src/addons/chatgpt/state-detector.js"
  "src/addons/chatgpt/controller.js"
  "src/addons/chatgpt/button-clicker.js"
  "src/addons/chatgpt/direct-send.js"
  "src/addons/chatgpt/image-generator.js"
)

cd extension.chrome

for file in "${FILES[@]}"; do
  echo "Fixing $file..."
  
  # Create a temporary file with the chrome.runtime.onMessage code commented out
  sed -i.bak '/chrome\.runtime\.onMessage\.addListener/,/^});/s/^/\/\/ /' "$file"
  
  # Add a comment explaining why
  sed -i '0,/chrome\.runtime\.onMessage\.addListener/{s/chrome\.runtime\.onMessage\.addListener/Note: chrome.runtime not available in MAIN world\n\/\/ &/}' "$file"
done

echo "✅ Fixed all addon files"
echo "🗑️  Cleaning up backup files..."
rm -f src/addons/chatgpt/*.bak

echo "✅ Done!"