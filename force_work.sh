#!/usr/bin/env bash
# Force the team to actually work by giving them exact code to write

echo "🚨 FORCING TEAM TO WORK - GIVING EXACT TASKS"

# Wences - Force idle detection implementation
tmux send-keys -t chatgpt-dev-team:2 "Write code to detect ChatGPT idle state using MutationObserver on textarea and button elements" C-m
sleep 2

# Fran - Force WebSocket implementation  
tmux send-keys -t chatgpt-dev-team:3 "Write WebSocket server code: const WebSocket = require('ws'); const wss = new WebSocket.Server({ port: 8081 });" C-m
sleep 2

# Elena - Force CLI implementation
tmux send-keys -t chatgpt-dev-team:4 "Write CLI code: const axios = require('axios'); function sendEvent(domain, prompt, outputPath) { /* send to server */ }" C-m
sleep 2

# Check windows
for i in 2 3 4; do
    echo "Window $i status:"
    tmux capture-pane -t chatgpt-dev-team:$i -p | tail -3
    echo "---"
done