#!/bin/bash

# Semantest System Startup Script
# Run this after reboot to start all necessary services

echo "🚀 Starting Semantest System..."

# 1. Start the polling server
echo "📡 Starting polling server..."
node nodejs.server/semantest-polling-server.js > /tmp/polling-server.log 2>&1 &
SERVER_PID=$!
echo "✅ Polling server started (PID: $SERVER_PID)"

# 2. Wait for server to be ready
sleep 2

# 3. Check server health
curl -s http://localhost:8080/health > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Server is healthy and ready"
else
    echo "⚠️ Server may not be ready yet"
fi

echo ""
echo "📌 System is ready! Next steps:"
echo "1. Make sure the Chrome extension is installed and enabled"
echo "2. Open a ChatGPT tab at https://chatgpt.com"
echo "3. Send a test event:"
echo "   node send-image-request.js \"Your prompt\" output.png"
echo ""
echo "To monitor the server logs:"
echo "   tail -f /tmp/polling-server.log"
echo ""
echo "To stop the server:"
echo "   pkill -f semantest-polling-server"