// Diagnostic script to check ChatGPT addon state
// Run this in the ChatGPT tab console

console.log('=== ChatGPT Addon Diagnostic ===');

// 1. Check if addon is injected
console.log('\n1. Addon Injection Status:');
console.log('   chatGPTAddonInjected:', window.chatGPTAddonInjected);
console.log('   chatgptAddon object:', typeof window.chatgptAddon);

// 2. Check bridge
console.log('\n2. Bridge Status:');
console.log('   semantestBridge:', typeof window.semantestBridge);
console.log('   __semantestBridgeInjected:', window.__semantestBridgeInjected);

// 3. Check addon components
console.log('\n3. Addon Components:');
const components = {
  'chatGPTStateDetector': window.chatGPTStateDetector,
  'chatGPTController': window.chatGPTController,
  'chatGPTButtonClicker': window.chatGPTButtonClicker,
  'chatGPTDirectSend': window.chatGPTDirectSend,
  'chatGPTImageGenerator': window.chatGPTImageGenerator,
  'chatGPTImageDownloader': window.chatGPTImageDownloader,
  'imageGenerationQueue': window.imageGenerationQueue
};

for (const [name, component] of Object.entries(components)) {
  console.log(`   ${name}:`, component ? '✅ Loaded' : '❌ Missing');
}

// 4. Check event listeners
console.log('\n4. Event Listeners:');
// Check if we can see any semantest-message listeners
const listeners = window.getEventListeners ? window.getEventListeners(window) : 'Cannot check (getEventListeners not available)';
console.log('   Window event listeners:', listeners);

// 5. Try to manually dispatch an event
console.log('\n5. Manual Event Test:');
console.log('   Dispatching test event...');

window.dispatchEvent(new CustomEvent('semantest-message', {
  detail: {
    type: 'test',
    payload: {
      message: 'Manual diagnostic test'
    }
  }
}));

console.log('   Event dispatched. Check if addon logged anything above.');

// 6. Check if we can generate an image manually
console.log('\n6. Manual Image Generation Test:');
if (window.chatGPTImageGenerator) {
  console.log('   Image generator is available');
  console.log('   To test manually, run:');
  console.log('   window.chatGPTImageGenerator.generateImage("test prompt")');
} else {
  console.log('   ❌ Image generator not available');
}

// 7. Try to find the message input
console.log('\n7. UI Elements Check:');
const messageInput = document.querySelector('textarea[data-id="root"]') || 
                    document.querySelector('#prompt-textarea') ||
                    document.querySelector('textarea');
console.log('   Message input found:', messageInput ? '✅' : '❌');

// 8. Check if addon initialization ran
console.log('\n8. Initialization Check:');
console.log('   Look for "ChatGPT Addon initialization complete" in console above');

console.log('\n=== End Diagnostic ===');