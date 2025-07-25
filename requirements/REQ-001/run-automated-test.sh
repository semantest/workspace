#!/bin/bash
# Automated Extension Testing Script
# Launches Chrome with Semantest extension and runs automated tests

echo "🧪 Semantest Automated Extension Testing"
echo "========================================"
echo ""

# Check if server is running
echo "Checking if Semantest server is running..."
if curl -s http://localhost:8080/health > /dev/null; then
    echo "✅ Server is running"
else
    echo "❌ Server is not running. Please start it with ./start-server.sh"
    exit 1
fi

# Check if extension is built
EXTENSION_PATH="/home/chous/work/semantest/extension.chrome/build"
if [ ! -d "$EXTENSION_PATH" ]; then
    echo "❌ Extension not found at $EXTENSION_PATH"
    echo "Please build the extension first"
    exit 1
fi

echo "✅ Extension found at $EXTENSION_PATH"
echo ""

# Install dependencies if needed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed"
    exit 1
fi

# Check if playwright is installed
if [ ! -d "node_modules/playwright" ]; then
    echo "📦 Installing Playwright..."
    npm install playwright
fi

# Run the automated test
echo "🚀 Starting automated test..."
echo ""
node automated-extension-test.js

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 All tests passed! Extension is working correctly!"
    echo ""
    echo "Next steps:"
    echo "1. Run bulk-test-10.sh for production testing"
    echo "2. Monitor WebSocket events during batch generation"
    echo "3. Scale up to 50, then 200 images"
else
    echo ""
    echo "⚠️ Some tests failed. Please check the results above."
    echo ""
    echo "Common issues:"
    echo "1. Extension might need WebSocket format fix (lowercase 'event')"
    echo "2. ChatGPT might have changed their UI selectors"
    echo "3. Extension button might not be injected properly"
fi