// Quick fix for ChatGPT input field detection
// Run this in ChatGPT console to test

console.log('=== ChatGPT Input Field Test ===');

// Find all potential input fields
const selectors = [
  'textarea#prompt-textarea',
  'div#prompt-textarea',
  'textarea[data-id="root"]',
  'div[contenteditable="true"]',
  'textarea[placeholder*="Message" i]',
  'textarea[placeholder*="Send" i]',
  'textarea[placeholder*="Type" i]',
  'textarea',
  '[contenteditable="true"]'
];

console.log('\nSearching for input fields...');
for (const selector of selectors) {
  const elements = document.querySelectorAll(selector);
  if (elements.length > 0) {
    console.log(`✅ Found ${elements.length} elements matching: ${selector}`);
    elements.forEach((el, index) => {
      console.log(`   [${index}]`, {
        tag: el.tagName,
        id: el.id,
        class: el.className,
        placeholder: el.placeholder,
        visible: el.offsetParent !== null
      });
    });
  }
}

// Find the actual input being used
console.log('\n🎯 Most likely input field:');
const mainInput = document.querySelector('textarea#prompt-textarea') || 
                  document.querySelector('div#prompt-textarea') ||
                  document.querySelector('textarea[data-id="root"]') ||
                  document.querySelector('textarea');

if (mainInput) {
  console.log('Found:', {
    selector: mainInput.tagName + (mainInput.id ? '#' + mainInput.id : ''),
    visible: mainInput.offsetParent !== null,
    placeholder: mainInput.placeholder
  });
  
  // Test setting value
  console.log('\n📝 Testing input...');
  mainInput.focus();
  
  if (mainInput.tagName === 'TEXTAREA') {
    mainInput.value = 'TEST: Create an image of a sunset';
    mainInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('✅ Set textarea value');
  } else if (mainInput.contentEditable === 'true') {
    mainInput.textContent = 'TEST: Create an image of a sunset';
    mainInput.dispatchEvent(new InputEvent('input', { 
      bubbles: true, 
      data: 'TEST: Create an image of a sunset'
    }));
    console.log('✅ Set contenteditable text');
  }
  
  // Find send button
  console.log('\n🔍 Looking for send button...');
  const buttons = document.querySelectorAll('button');
  const sendButton = Array.from(buttons).find(btn => {
    const ariaLabel = btn.getAttribute('aria-label') || '';
    const disabled = btn.disabled;
    const svg = btn.querySelector('svg');
    return !disabled && (
      ariaLabel.includes('Send') ||
      ariaLabel.includes('submit') ||
      (svg && btn.closest('form'))
    );
  });
  
  if (sendButton) {
    console.log('✅ Found send button:', {
      ariaLabel: sendButton.getAttribute('aria-label'),
      disabled: sendButton.disabled
    });
  } else {
    console.log('❌ Send button not found');
  }
} else {
  console.log('❌ No input field found!');
}

console.log('\n=== End Test ===');