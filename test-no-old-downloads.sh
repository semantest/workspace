#!/bin/bash
# Test to verify old images aren't downloaded when generating new ones

echo "🧪 Testing that old images are NOT downloaded..."
echo ""
echo "Prerequisites:"
echo "1. Make sure ChatGPT has at least one old image in the conversation"
echo "2. Reload the extension if you just made changes"
echo ""
echo "Press Enter to continue..."
read

# Generate a new image with a unique filename
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
CUSTOM_NAME="test-no-old-download-${TIMESTAMP}.png"

echo "🎨 Generating new image with filename: $CUSTOM_NAME"
echo ""

# Run the generate-image script
./generate-image.sh "A colorful abstract pattern with geometric shapes" ~/Pictures "$CUSTOM_NAME"

echo ""
echo "✅ Test complete! Check:"
echo "1. Only ONE image should have been downloaded (the new one)"
echo "2. The filename should be: $CUSTOM_NAME"
echo "3. Old images from the conversation should NOT have been downloaded"
echo ""
echo "Look in ~/Pictures and verify you only see the new image file."