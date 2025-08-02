/**
 * Bridge Helper for MAIN world
 * Enables communication between addon and extension
 */

(function() {
  // Check if already initialized
  if (window.semantestBridge && window.semantestBridge._initialized) {
    console.log('🌉 Bridge helper already initialized');
    return;
  }

  window.semantestBridge = {
    _initialized: true,
    sendToExtension: function(message) {
      // Send message back to content script
      window.dispatchEvent(new CustomEvent('semantest-response', {
        detail: message
      }));
    }
  };

  // Watch for messages from content script via DOM mutations
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && 
          mutation.attributeName === 'data-message-ready' &&
          mutation.target.getAttribute('data-message-ready') === 'true') {
        
        try {
          const message = JSON.parse(mutation.target.textContent);
          console.log('🌉 Bridge received message:', message);
          
          // Dispatch to addon
          window.dispatchEvent(new CustomEvent('semantest-message', {
            detail: message
          }));
          
          // Clean up
          mutation.target.remove();
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      }
    });
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    attributes: true,
    attributeFilter: ['data-message-ready'],
    subtree: true
  });

  console.log('🌉 Bridge helper ready');
})();