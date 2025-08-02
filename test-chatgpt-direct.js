// Direct test for ChatGPT addon - paste this in service worker console

console.log('=== ChatGPT Direct Test ===');

// Find ALL ChatGPT tabs
chrome.tabs.query({url: ['*://chat.openai.com/*', '*://chatgpt.com/*']}, async (tabs) => {
  console.log(`Found ${tabs.length} ChatGPT tabs`);
  
  if (tabs.length === 0) {
    console.error('❌ No ChatGPT tabs found. Please open https://chat.openai.com');
    return;
  }
  
  // List all ChatGPT tabs
  tabs.forEach((tab, index) => {
    console.log(`Tab ${index + 1}: ID=${tab.id}, Active=${tab.active}, URL=${tab.url}`);
  });
  
  // Use first ChatGPT tab (or active one if available)
  const targetTab = tabs.find(t => t.active) || tabs[0];
  console.log(`\n🎯 Using tab ${targetTab.id}: ${targetTab.url}`);
  
  // Test 1: Bridge ping
  console.log('\n--- Test 1: Bridge Connection ---');
  try {
    const pingResponse = await chrome.tabs.sendMessage(targetTab.id, {type: 'ping'});
    console.log('✅ Bridge is active:', pingResponse);
  } catch (e) {
    console.error('❌ Bridge error:', e.message);
    console.log('Try reloading the ChatGPT tab');
    return;
  }
  
  // Test 2: Send image request
  console.log('\n--- Test 2: Image Generation Request ---');
  const testPayload = {
    type: 'websocket:message',
    payload: {
      type: 'semantest/custom/image/download/requested',
      payload: {
        prompt: 'DIRECT TEST: a beautiful red rose',
        metadata: {
          requestId: 'direct-test-' + Date.now(),
          downloadFolder: '/home/user/Downloads',
          filename: 'direct-test.png',
          timestamp: Date.now()
        }
      }
    }
  };
  
  try {
    console.log('📤 Sending to tab:', testPayload);
    const response = await chrome.tabs.sendMessage(targetTab.id, testPayload);
    console.log('✅ Addon response:', response);
    console.log('\n🎯 SUCCESS! Check the ChatGPT tab - the prompt should appear!');
  } catch (e) {
    console.error('❌ Failed to send:', e.message);
  }
  
  // Test 3: Check addon components
  console.log('\n--- Test 3: Check Addon Components ---');
  try {
    const result = await chrome.scripting.executeScript({
      target: { tabId: targetTab.id },
      func: () => {
        return {
          components: {
            bridge: typeof window.semantestBridge,
            queue: typeof window.imageGenerationQueue,
            generator: typeof window.chatGPTImageGenerator,
            controller: typeof window.chatGPTController
          },
          listeners: {
            hasEventListener: typeof window.addEventListener === 'function',
            customEvents: window._semantestListeners || 'not tracked'
          }
        };
      },
      world: 'MAIN'
    });
    
    console.log('Addon components:', result[0].result);
  } catch (e) {
    console.error('Failed to check components:', e);
  }
});

console.log('=== Test started - check output above ===');