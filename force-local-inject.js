// Force local addon injection
// Run this in service worker console

console.log('=== Force Local Injection ===');

// Find active ChatGPT tab
chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
  if (tabs.length === 0) {
    console.error('No active tab found');
    return;
  }
  
  const tab = tabs[0];
  console.log(`Active tab: ${tab.id} - ${tab.url}`);
  
  // Check if it's a ChatGPT tab
  if (!tab.url || (!tab.url.includes('chat.openai.com') && !tab.url.includes('chatgpt.com'))) {
    console.error('Active tab is not ChatGPT');
    console.log('Please switch to a ChatGPT tab and run this again');
    return;
  }
  
  console.log('🔄 Injecting local addon directly...');
  
  try {
    // Clear injection tracking
    extensionState.injectedTabs.delete(tab.id);
    
    // Call the local injection function directly
    await injectLocalAddon(tab.id);
    
    console.log('✅ Local injection complete!');
    
    // Verify what was injected
    setTimeout(async () => {
      try {
        // Check ISOLATED world (bridge)
        const bridgeCheck = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => window.__semantestBridgeInjected,
          world: 'ISOLATED'
        });
        
        console.log('Bridge injected:', bridgeCheck[0]?.result);
        
        // Check MAIN world (addon)
        const addonCheck = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => ({
            addonInjected: window.chatGPTAddonInjected,
            components: {
              stateDetector: !!window.chatGPTStateDetector,
              controller: !!window.chatGPTController,
              generator: !!window.chatGPTImageGenerator,
              downloader: !!window.chatGPTImageDownloader,
              queue: !!window.imageGenerationQueue,
              bridge: !!window.semantestBridge
            }
          }),
          world: 'MAIN'
        });
        
        console.log('Addon status:', addonCheck[0]?.result);
        
        // Send a test ping
        try {
          const pingResponse = await chrome.tabs.sendMessage(tab.id, { type: 'ping' });
          console.log('Ping response:', pingResponse);
        } catch (e) {
          console.log('Ping failed:', e.message);
        }
        
      } catch (error) {
        console.error('Verification error:', error);
      }
    }, 1000);
    
  } catch (error) {
    console.error('❌ Injection failed:', error);
    console.log('Error details:', error.stack);
  }
});

console.log('\nTip: If injection fails, check:');
console.log('1. Extension has access to file:// URLs if testing locally');
console.log('2. ChatGPT tab is fully loaded');
console.log('3. No other extensions are interfering');