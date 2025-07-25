#!/bin/bash
# Script to commit with proper GPG setup

# Export GPG TTY
export GPG_TTY=$(tty)

# Navigate to extension directory
cd /home/chous/work/semantest/extension.chrome

# Check current status
echo "Current git status:"
git status --short

# Stage the changes
git add src/background/service-worker.js
git add DOWNLOAD_FLOW_IMPLEMENTATION.md

# Show what we're about to commit
echo -e "\nFiles to be committed:"
git diff --cached --name-only

# Set the GPG key explicitly for this commit
git -c user.signingkey=C147FF53CA252C1EEAA532A19CAA936FF8B44AC3 commit -S -m "🚀 Implement imageDownloadRequested flow

- Add SEND_DOWNLOAD_REQUEST handler in service worker
- Implement handleDownloadRequest method
- Connect popup UI to WebSocket download requests
- Follow Derek's event structure specification
- Complete download flow implementation

Ready for testing with backend server!"

echo -e "\n✅ Commit attempted with GPG signing"