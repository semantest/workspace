#!/bin/bash
# Test script for custom filename feature

# Generate a unique filename
CUSTOM_NAME="test-image-$(date +%Y%m%d-%H%M%S).png"

echo "🎨 Testing image generation with custom filename: $CUSTOM_NAME"
echo ""

# Run the generate-image script with custom filename
./generate-image.sh "A beautiful sunset over mountains with vibrant colors" ~/Pictures "$CUSTOM_NAME"

echo ""
echo "✅ Check your ~/Pictures directory for: $CUSTOM_NAME"
echo ""
echo "📝 If the image downloaded with a timestamp name instead of '$CUSTOM_NAME',"
echo "   then the custom filename feature needs further debugging."