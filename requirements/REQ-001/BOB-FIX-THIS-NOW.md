# 🚨 BOB - IMMEDIATE ACTION REQUIRED

## YOUR Task 1: Fix generate-image.sh

### THE BUG (Found by Carol):
The script fails with: `Error: Cannot find module 'ws'`

### THE FIX:
Edit `/home/chous/work/semantest/generate-image.sh`

Find around line 180 where it runs the Node.js script.

ADD this line BEFORE the node execution:
```bash
export NODE_PATH="/home/chous/work/semantest/sdk/server/node_modules:$NODE_PATH"
```

### SPECIFIC CHANGE:
Look for something like:
```bash
node "$TEMP_SCRIPT"
```

Change it to:
```bash
export NODE_PATH="/home/chous/work/semantest/sdk/server/node_modules:$NODE_PATH"
node "$TEMP_SCRIPT"
```

### Or even better, run from the correct directory:
```bash
cd "$SCRIPT_DIR/sdk/server"
NODE_PATH="./node_modules:$NODE_PATH" node "$TEMP_SCRIPT"
```

## THIS IS YOUR TASK 1!
- You do NOT need Emma for this
- You do NOT need to wait for anyone
- Carol already tested and found the issue
- Just fix the NODE_PATH and commit

## Test After Fix:
```bash
./generate-image.sh "test prompt"
```

It should connect to the WebSocket server without module errors.

## Bob, please fix this NOW. The entire project is waiting on this simple fix!