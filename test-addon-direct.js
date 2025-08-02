// Test script to directly trigger addon functionality
// Run this in ChatGPT tab console after reloading extension

console.log('=== Direct Addon Test ===');

// 1. Check if addon components are loaded
console.log('\n1. Checking addon components...');
const hasGenerator = typeof window.chatGPTImageGenerator !== 'undefined';
const hasQueue = typeof window.imageGenerationQueue !== 'undefined';
console.log('   Image Generator:', hasGenerator ? '✅' : '❌');
console.log('   Queue Manager:', hasQueue ? '✅' : '❌');

if (!hasGenerator && !hasQueue) {
  console.error('❌ Addon components not loaded! Try reloading the extension and this tab.');
  console.log('\nTo fix:');
  console.log('1. Reload extension in chrome://extensions/');
  console.log('2. Reload this ChatGPT tab');
  console.log('3. Wait 3 seconds and run this script again');
} else {
  // 2. Simulate the event that should come from WebSocket
  console.log('\n2. Simulating WebSocket event...');
  
  const testEvent = new CustomEvent('semantest-message', {
    detail: {
      type: 'websocket:message',
      payload: {
        type: 'semantest/custom/image/download/requested',
        payload: {
          prompt: 'DIRECT TEST: a beautiful mountain landscape at sunset',
          metadata: {
            requestId: 'direct-test-' + Date.now(),
            downloadFolder: '/home/user/Downloads',
            filename: 'direct-test-mountain.png',
            timestamp: Date.now()
          }
        }
      }
    }
  });
  
  console.log('   Dispatching event with prompt:', testEvent.detail.payload.payload.prompt);
  window.dispatchEvent(testEvent);
  
  console.log('\n3. Check the results:');
  console.log('   - The prompt should appear in the input field');
  console.log('   - Image generation should start');
  console.log('   - Check console for addon response messages');
  
  // 3. Alternative: Direct generation test
  console.log('\n4. Alternative - Direct generation:');
  if (window.chatGPTImageGenerator) {
    console.log('   To manually trigger generation, run:');
    console.log('   window.chatGPTImageGenerator.generateImage("your prompt here")');
  }
  
  // 4. Check queue status
  if (window.imageGenerationQueue) {
    console.log('\n5. Queue Status:');
    console.log('   Queue size:', window.imageGenerationQueue.queue?.length || 0);
    console.log('   Is processing:', window.imageGenerationQueue.isProcessing || false);
  }
}

console.log('\n=== End Test ===');