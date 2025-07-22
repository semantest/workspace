# ✅ E2E Test Checklist - REQ-001 FINAL VERIFICATION

## Prerequisites (MUST HAVE ALL):
- [ ] Chrome/Chromium browser open
- [ ] Logged into ChatGPT.com
- [ ] Extension installed (chrome://extensions/)
- [ ] Extension shows in toolbar
- [ ] Server running (or will auto-start)

## Installation Verification:
- [ ] Go to: chrome://extensions/
- [ ] See "Semantest" or "ChatGPT Extension" in list
- [ ] Status shows "Enabled"
- [ ] No errors displayed
- [ ] Extension ID visible (needed for server)

## Extension Health Check:
- [ ] Click extension icon in toolbar
- [ ] Popup opens successfully
- [ ] Health status shows (green = good)
- [ ] No console errors

## ChatGPT Integration Check:
- [ ] Navigate to https://chat.openai.com
- [ ] Open DevTools (F12)
- [ ] Go to Console tab
- [ ] See: "ChatGPT Controller loaded" or similar
- [ ] No errors about missing scripts

## E2E Flow Test:
1. [ ] Open terminal
2. [ ] Navigate to: `/home/chous/work/semantest`
3. [ ] Run: `./generate-image.sh "Test image of a sunset"`
4. [ ] Observe:
   - [ ] "Checking if Semantest server is running..."
   - [ ] "Connected to Semantest server"
   - [ ] "Sending ImageRequestReceived event..."
   - [ ] NO TIMEOUT! (Should complete in <5 seconds)
5. [ ] Check ~/Downloads folder
   - [ ] New image file appeared
   - [ ] Filename contains timestamp
   - [ ] Image is valid/viewable

## Success Criteria:
- ✅ Script completes without timeout
- ✅ Image downloaded to ~/Downloads
- ✅ Console shows success messages
- ✅ No errors in any component

## If Test Fails:

### Timeout After 30 Seconds:
- Extension not installed/loaded
- Extension not active on ChatGPT tab
- Refresh ChatGPT tab and retry

### Connection Refused:
- Server not running
- Check server logs: `/tmp/semantest-server.log`

### No Image Downloaded:
- Check extension permissions
- Check Downloads folder permissions
- Check extension popup for errors

## Final Verification:
Once all checks pass, REQ-001 can be marked complete with confidence!

**Remember: No E2E test = No completion!** 🎯