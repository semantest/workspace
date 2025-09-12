// Test script to run in ChatGPT browser console
// This tests if the content script is working properly

// Function to test prompt typing
function testPromptTyping(prompt) {
  console.log('🧪 Testing prompt typing...');
  
  // Find the textarea
  const textarea = document.querySelector('textarea[placeholder*="Message"]') || 
                  document.querySelector('#prompt-textarea') ||
                  document.querySelector('textarea');
  
  if (!textarea) {
    console.error('❌ Could not find ChatGPT textarea');
    return false;
  }
  
  console.log('✅ Found textarea');
  
  // Clear and type the prompt
  textarea.focus();
  textarea.value = '';
  
  // Type character by character
  let index = 0;
  const typeChar = () => {
    if (index < prompt.length) {
      textarea.value += prompt[index];
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      index++;
      setTimeout(typeChar, 50);
    } else {
      console.log('✅ Prompt typed successfully');
      findSendButton();
    }
  };
  
  typeChar();
  
  function findSendButton() {
    // Find the send button
    const sendButton = document.querySelector('button[data-testid="send-button"]') ||
                      document.querySelector('button[aria-label*="Send"]') ||
                      Array.from(document.querySelectorAll('button')).find(btn => {
                        const svg = btn.querySelector('svg');
                        return svg && !btn.disabled && btn.offsetParent !== null;
                      });
    
    if (sendButton && !sendButton.disabled) {
      console.log('✅ Send button found and active');
      console.log('💡 To send: sendButton.click()');
      return true;
    } else {
      console.error('❌ Send button not found or disabled');
      return false;
    }
  }
  
  return true;
}

// Test if extension is loaded
function testExtension() {
  console.log('🧪 Testing Semantest extension...');
  
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    console.log('✅ Chrome runtime available');
    
    // Try to send a message to the extension
    try {
      chrome.runtime.sendMessage({
        action: 'CHECK_STATUS'
      }, (response) => {
        if (response) {
          console.log('✅ Extension responded:', response);
        } else {
          console.log('⚠️ No response from extension');
        }
      });
    } catch (error) {
      console.error('❌ Error communicating with extension:', error);
    }
  } else {
    console.error('❌ Chrome runtime not available');
  }
}

// Manual test instructions
console.log(`
╔════════════════════════════════════════════════════════════╗
║                SEMANTEST CONTENT SCRIPT TEST               ║
╚════════════════════════════════════════════════════════════╝

To test the content script functionality:

1. Test extension communication:
   testExtension()

2. Test prompt typing (without sending):
   testPromptTyping("Test prompt from console")

3. Check if content script is loaded:
   Look for: "🚀 Semantest Content Script loaded on ChatGPT"
   in the console when the page loads

4. To manually trigger image generation:
   chrome.runtime.sendMessage({
     type: 'ImageGenerationRequestedEvent',
     payload: {
       prompt: 'A beautiful sunset',
       outputPath: 'sunset.png',
       downloadFolder: './downloads'
     }
   })

═══════════════════════════════════════════════════════════════
`);

// Export functions to window for easy testing
window.testPromptTyping = testPromptTyping;
window.testExtension = testExtension;