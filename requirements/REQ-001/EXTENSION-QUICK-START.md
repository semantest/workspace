# 🚨 EXTENSION DEVELOPER - QUICK START GUIDE

**YOUR WINDOW**: 7  
**YOUR TASKS**: 6 & 7  
**STATUS**: URGENT - BLOCKING FRONTEND & QA

## 🎯 Task 6: Extension Health Module (2 hours)

**File**: `/home/chous/work/semantest/extension.chrome/popup.js`

**What to implement**:
```javascript
// Add to popup.js
async function checkChatGPTTabs() {
    const tabs = await chrome.tabs.query({url: "https://chatgpt.com/*"});
    return {
        healthy: tabs.length > 0,
        tabCount: tabs.length,
        tabIds: tabs.map(t => t.id)
    };
}

// Poll server health
async function checkServerHealth() {
    try {
        const response = await fetch('http://localhost:8080/health');
        return await response.json();
    } catch (e) {
        return { healthy: false, error: e.message };
    }
}
```

## 🎯 Task 7: Addon Health Check (2 hours)

**File**: `/home/chous/work/semantest/chatgpt.com/addon.js`

**What to implement**:
```javascript
// Add to addon.js
function checkLoginStatus() {
    // Check if user is logged in
    const loggedIn = document.querySelector('[data-testid="profile-button"]') !== null;
    
    // Send status to extension
    chrome.runtime.sendMessage({
        type: 'ADDON_HEALTH',
        data: {
            healthy: loggedIn,
            url: window.location.href,
            timestamp: Date.now()
        }
    });
}

// Monitor login state changes
const observer = new MutationObserver(checkLoginStatus);
observer.observe(document.body, { childList: true, subtree: true });
```

## 🔥 IMMEDIATE ACTIONS

1. **Start with Task 6** - Extension health module
2. **Test with server** - http://localhost:8080/health is READY
3. **Update popup UI** - Show health status visually
4. **Then do Task 7** - Addon login detection
5. **Test together** - Ensure both layers work

## ✅ Definition of Done

- [ ] Extension detects ChatGPT tabs
- [ ] Extension polls server /health endpoint
- [ ] Addon detects login status
- [ ] Status communicated between addon↔extension
- [ ] Visual indicators in popup
- [ ] Error handling implemented

## 📞 Need Help?

- Backend APIs: COMPLETE and READY
- Server health endpoint: http://localhost:8080/health
- PM is in Window 0
- Scribe documenting in Window 6

**PLEASE START NOW! Frontend and QA are waiting on you!**