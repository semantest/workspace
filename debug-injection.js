// Debug script to check injection status
// Run this in the service worker console

console.log('=== Injection Debug ===');

// Check extension state
console.log('\n1. Extension State:');
console.log('   Active:', extensionState.isActive);
console.log('   WS Connected:', extensionState.wsConnected);
console.log('   Injected tabs:', extensionState.injectedTabs.size);

// List injected tabs
if (extensionState.injectedTabs.size > 0) {
  console.log('\n   Injected tab IDs:');
  for (const [tabId, timestamp] of extensionState.injectedTabs) {
    console.log(`   - Tab ${tabId}: injected ${Date.now() - timestamp}ms ago`);
  }
}

// Find ChatGPT tabs
console.log('\n2. Finding ChatGPT tabs...');
chrome.tabs.query({url: ['*://chat.openai.com/*', '*://chatgpt.com/*']}, async (tabs) => {
  console.log(`   Found ${tabs.length} ChatGPT tabs`);
  
  if (tabs.length === 0) {
    console.log('   ❌ No ChatGPT tabs open');
    return;
  }
  
  for (const tab of tabs) {
    console.log(`\n   Tab ${tab.id}:`);
    console.log(`   - URL: ${tab.url}`);
    console.log(`   - Active: ${tab.active}`);
    console.log(`   - Status: ${tab.status}`);
    
    // Check if addon is injected
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          return {
            addonInjected: window.chatGPTAddonInjected,
            bridgeInjected: window.__semantestBridgeInjected,
            hasGenerator: typeof window.chatGPTImageGenerator !== 'undefined',
            hasQueue: typeof window.imageGenerationQueue !== 'undefined',
            hasBridge: typeof window.semantestBridge !== 'undefined'
          };
        },
        world: 'MAIN'
      });
      
      if (results && results[0]) {
        console.log('   - Injection status:', results[0].result);
      }
    } catch (error) {
      console.log('   - Check failed:', error.message);
    }
    
    // Try to inject if not already injected
    const isInjected = extensionState.injectedTabs.has(tab.id);
    if (!isInjected) {
      console.log('   - Not injected, attempting injection...');
      try {
        await loadAddonDynamically(tab.id, tab.url, true);
        console.log('   - ✅ Injection completed');
      } catch (error) {
        console.log('   - ❌ Injection failed:', error.message);
      }
    } else {
      console.log('   - Already marked as injected');
    }
  }
});

// Check WebSocket connection
console.log('\n3. WebSocket Status:');
if (wsHandler && wsHandler.ws) {
  console.log('   State:', wsHandler.ws.readyState);
  console.log('   URL:', wsHandler.serverUrl);
  console.log('   Connected:', wsHandler.ws.readyState === WebSocket.OPEN);
} else {
  console.log('   ❌ WebSocket handler not initialized');
}

console.log('\n=== End Debug ===');