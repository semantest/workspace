#!/usr/bin/env bash
# Debug version of blocker detection hook

# Log all environment variables
echo "=== BLOCKER DETECTION DEBUG ===" >> /tmp/blocker-debug.log
echo "Date: $(date)" >> /tmp/blocker-debug.log
echo "SESSION_NAME: ${CLAUDE_SESSION:-not set}" >> /tmp/blocker-debug.log
echo "WINDOW_INDEX: ${CLAUDE_WINDOW:-not set}" >> /tmp/blocker-debug.log
echo "AGENT_NAME: ${CLAUDE_AGENT_NAME:-not set}" >> /tmp/blocker-debug.log
echo "RESPONSE length: ${#CLAUDE_RESPONSE}" >> /tmp/blocker-debug.log
echo "First 100 chars of RESPONSE: ${CLAUDE_RESPONSE:0:100}" >> /tmp/blocker-debug.log
echo "PATH: $PATH" >> /tmp/blocker-debug.log
echo "PWD: $PWD" >> /tmp/blocker-debug.log
echo "---" >> /tmp/blocker-debug.log

# Call the real script
/home/chous/work/semantest/.claude/hooks/blocker-detection.sh

# Log exit status
echo "Exit status: $?" >> /tmp/blocker-debug.log
echo "===" >> /tmp/blocker-debug.log