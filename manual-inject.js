// Manual injection script
// Run this in service worker console to inject addon into current ChatGPT tab

console.log('=== Manual Addon Injection ===');

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
    return;
  }
  
  console.log('🔄 Injecting addon...');
  
  try {
    // Force injection
    await loadAddonDynamically(tab.id, tab.url, true);
    console.log('✅ Injection complete!');
    
    // Verify injection
    setTimeout(async () => {
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            return {
              addonInjected: window.chatGPTAddonInjected,
              hasGenerator: typeof window.chatGPTImageGenerator !== 'undefined',
              hasQueue: typeof window.imageGenerationQueue !== 'undefined',
              componentCount: [
                window.chatGPTStateDetector,
                window.chatGPTController,
                window.chatGPTImageGenerator,
                window.imageGenerationQueue
              ].filter(x => x !== undefined).length
            };
          },
          world: 'MAIN'
        });
        
        if (results && results[0]) {
          console.log('📋 Verification:', results[0].result);
          if (results[0].result.componentCount > 0) {
            console.log('✅ Addon components loaded successfully!');
          }
        }
      } catch (error) {
        console.error('Verification failed:', error);
      }
    }, 1000);
    
  } catch (error) {
    console.error('❌ Injection failed:', error);
  }
});