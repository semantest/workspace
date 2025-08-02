// Fix for queue manager detection
// This code updates the canProcess function to properly detect ChatGPT readiness

// Check current state
console.log('=== Checking ChatGPT Ready State ===');

// Find the textarea
const textarea = document.querySelector('textarea#prompt-textarea') || 
                 document.querySelector('textarea[data-id="root"]') ||
                 document.querySelector('textarea');

console.log('Textarea found:', !!textarea);

// Find send button with multiple strategies
const findSendButton = () => {
  // Strategy 1: Look for button with send SVG icon
  const buttons = document.querySelectorAll('button');
  for (const btn of buttons) {
    // Skip if disabled
    if (btn.disabled) continue;
    
    // Check for send icon (arrow)
    const svg = btn.querySelector('svg');
    if (svg) {
      const path = svg.querySelector('path');
      if (path && path.getAttribute('d') && path.getAttribute('d').includes('M')) {
        // Check if it's near the textarea
        const form = textarea?.closest('form');
        if (form && form.contains(btn)) {
          return btn;
        }
      }
    }
  }
  
  // Strategy 2: Button by position (last button in form)
  const form = textarea?.closest('form');
  if (form) {
    const formButtons = form.querySelectorAll('button:not([disabled])');
    if (formButtons.length > 0) {
      return formButtons[formButtons.length - 1];
    }
  }
  
  // Strategy 3: Button by aria-label
  return document.querySelector('button[aria-label*="Send" i]:not([disabled])');
};

const sendButton = findSendButton();
console.log('Send button found:', !!sendButton);

if (sendButton) {
  console.log('Send button details:', {
    disabled: sendButton.disabled,
    ariaLabel: sendButton.getAttribute('aria-label'),
    hasIcon: !!sendButton.querySelector('svg')
  });
}

// Alternative: Check if we can type in the textarea
const canType = textarea && !textarea.disabled && !textarea.readOnly;
console.log('Can type in textarea:', canType);

// The real check: ChatGPT is ready if we can type
console.log('\n✅ ChatGPT is ready:', canType);

// Fix for the queue manager
console.log('\n📝 To fix the queue manager, update canProcess() to:');
console.log(`
canProcess() {
  // Simply check if we can type in the main textarea
  const textarea = document.querySelector('textarea#prompt-textarea') || 
                   document.querySelector('textarea[data-id="root"]') ||
                   document.querySelector('textarea');
  
  return textarea && !textarea.disabled && !textarea.readOnly;
}
`);

// Test the queue processing
if (window.imageGenerationQueue) {
  console.log('\n🔄 Testing queue...');
  console.log('Queue length:', window.imageGenerationQueue.queue.length);
  console.log('Is processing:', window.imageGenerationQueue.isProcessing);
  console.log('Can process:', window.imageGenerationQueue.canProcess());
  
  // Try to trigger processing
  if (window.imageGenerationQueue.queue.length > 0 && !window.imageGenerationQueue.isProcessing) {
    console.log('🚀 Triggering queue processing...');
    window.imageGenerationQueue.processNext();
  }
}