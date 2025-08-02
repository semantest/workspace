// Test script for service worker console
// Copy and paste this entire block into the service worker console

console.log('=== Starting Message Flow Test ===');

// Step 1: Get active tab
chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
  if (!tabs[0]) {
    console.error('❌ No active tab found');
    return;
  }
  
  const tab = tabs[0];
  console.log('📋 Active tab:', tab.id, tab.url);
  
  // Step 2: Test bridge connection
  try {
    const pingResponse = await chrome.tabs.sendMessage(tab.id, {type: 'ping'});
    console.log('✅ Bridge test passed:', pingResponse);
  } catch (e) {
    console.error('❌ Bridge test failed:', e.message);
    return;
  }
  
  // Step 3: Send test image request
  console.log('📤 Sending test image request...');
  
  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'websocket:message',
      payload: {
        type: 'semantest/custom/image/download/requested',
        payload: {
          prompt: 'TEST: colorful rainbow',
          metadata: {
            requestId: 'test-' + Date.now(),
            timestamp: Date.now()
          }
        }
      }
    });
    
    console.log('✅ Message sent successfully:', response);
    console.log('🎯 Check ChatGPT tab for the prompt!');
  } catch (e) {
    console.error('❌ Failed to send message:', e.message);
  }
});

console.log('=== Test script loaded - check output above ===');