# QA Immediate Testing Guide - REQ-001

## 🚨 START TESTING NOW - Don't Wait!

### Why Test Now?
- Backend is 100% complete
- Basic functionality can be tested
- Early issue detection helps developers
- Real-world testing reveals actual problems

## Test 1: Basic Image Generation
```bash
cd /home/chous/work/semantest
./generate-image.sh "a beautiful sunset over mountains"
```

**Expected Results**:
- Script should check if server is running
- If not running, should attempt to start it
- Should trigger image generation
- Should download image to ~/Downloads/

**Document**:
- Does the script run?
- Any errors?
- What actually happens?

## Test 2: Server Health Check
```bash
# Direct health check
curl http://localhost:8080/health
```

**Expected**: JSON response with browser health status

## Test 3: Manual Server Start
```bash
cd /home/chous/work/semantest/sdk/server
npm run dev
```

**Then in another terminal**:
```bash
curl http://localhost:8080/health
```

## Test 4: WebSocket Connection
```bash
# Check if WebSocket server is running
nc -z localhost 8080
```

## What to Document

### For Each Test:
1. **Command Run**: Exact command used
2. **Actual Output**: Copy/paste actual output
3. **Expected vs Actual**: What should happen vs what did
4. **Error Messages**: Full error text
5. **Workarounds**: Any fixes you tried

### Example Report:
```
Test: Basic Image Generation
Command: ./generate-image.sh "test prompt"
Result: FAILED - Script not found
Error: bash: ./generate-image.sh: No such file or directory
Action: Need to check if script exists or needs creation
```

## Priority Tests RIGHT NOW

1. **Does generate-image.sh exist?**
   ```bash
   ls -la /home/chous/work/semantest/generate-image.sh
   ```

2. **Is the server running?**
   ```bash
   ps aux | grep "node.*server"
   ```

3. **Can we start the server?**
   ```bash
   cd /home/chous/work/semantest/sdk/server && npm run dev
   ```

4. **Does /health endpoint work?**
   ```bash
   curl http://localhost:8080/health
   ```

## Report Format

Create `/requirements/REQ-001/real-test-results.md` with:
- Timestamp
- Test performed
- Actual results
- Issues found
- Recommendations

**START NOW! Don't wait for perfect conditions - test what exists!**