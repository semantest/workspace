// Clean injection script that avoids duplicate injections
// Run in service worker console

console.log('=== Clean Addon Injection ===');

chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
  if (!tabs[0]) {
    console.error('No active tab');
    return;
  }
  
  const tab = tabs[0];
  if (!tab.url?.includes('chat')) {
    console.error('Not a ChatGPT tab');
    return;
  }
  
  console.log(`Injecting into tab ${tab.id}`);
  
  try {
    // Step 1: Clear tracking
    extensionState.injectedTabs.delete(tab.id);
    
    // Step 2: Check current state
    const currentState = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        bridge: window.semantestBridge?._initialized,
        addon: window.chatGPTAddonInjected,
        components: {
          generator: !!window.chatGPTImageGenerator,
          queue: !!window.imageGenerationQueue
        }
      }),
      world: 'MAIN'
    });
    
    console.log('Current state:', currentState[0]?.result);
    
    // Step 3: Inject bridge if needed
    if (!currentState[0]?.result?.bridge) {
      console.log('Injecting bridge...');
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/content/chatgpt-bridge.js'],
        world: 'ISOLATED'
      });
      
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/content/bridge-helper.js'],
        world: 'MAIN'
      });
    }
    
    // Step 4: Force re-inject addon (will be wrapped in IIFE)
    console.log('Injecting addon files...');
    
    // Mark as injected first
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => { window.chatGPTAddonInjected = true; },
      world: 'MAIN'
    });
    
    // Inject files
    const files = [
      'src/addons/chatgpt/state-detector.js',
      'src/addons/chatgpt/controller.js',
      'src/addons/chatgpt/button-clicker.js',
      'src/addons/chatgpt/direct-send.js',
      'src/addons/chatgpt/image-generator.js',
      'src/addons/chatgpt/image-downloader.js',
      'src/addons/chatgpt/queue-manager.js',
      'src/addons/chatgpt/index.js'
    ];
    
    for (const file of files) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: [file],
          world: 'MAIN'
        });
        console.log(`✅ ${file.split('/').pop()}`);
      } catch (e) {
        console.error(`❌ Failed: ${file}`, e.message);
      }
    }
    
    extensionState.injectedTabs.set(tab.id, Date.now());
    console.log('\n✅ Injection complete!');
    
    // Step 5: Verify
    setTimeout(async () => {
      const finalState = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => ({
          bridge: !!window.semantestBridge,
          addon: !!window.chatGPTAddonInjected,
          generator: !!window.chatGPTImageGenerator,
          queue: !!window.imageGenerationQueue,
          ready: window.imageGenerationQueue?.canProcess?.() || false
        }),
        world: 'MAIN'
      });
      
      console.log('\nFinal state:', finalState[0]?.result);
      
      if (finalState[0]?.result?.generator && finalState[0]?.result?.queue) {
        console.log('✅ Addon is ready for image generation!');
      }
    }, 1000);
    
  } catch (error) {
    console.error('Injection error:', error);
  }
});