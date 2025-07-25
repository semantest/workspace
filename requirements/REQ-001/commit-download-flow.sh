#!/bin/bash
# Script to commit the download flow implementation

cd /home/chous/work/semantest/extension.chrome

# Stage the changes
git add src/background/service-worker.js
git add DOWNLOAD_FLOW_IMPLEMENTATION.md

# Commit with TDD emoji and GPG signature
git commit -S -m "🚀 Implement imageDownloadRequested flow

- Add SEND_DOWNLOAD_REQUEST handler in service worker
- Implement handleDownloadRequest method
- Connect popup UI to WebSocket download requests
- Follow Derek's event structure specification
- Complete download flow implementation

Ready for testing with backend server!"

echo "✅ Download flow implementation committed!"