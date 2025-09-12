#!/usr/bin/env bash
echo "[$(date)] Test hook executed" >> /tmp/test-hook.log
echo "CLAUDE_PROJECT_DIR: $CLAUDE_PROJECT_DIR" >> /tmp/test-hook.log
echo "All env vars:" >> /tmp/test-hook.log
env | grep CLAUDE >> /tmp/test-hook.log
echo "---" >> /tmp/test-hook.log