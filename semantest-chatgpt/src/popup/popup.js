/**
 * Semantest for ChatGPT - Popup Script
 */

// DOM elements
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const wsIndicator = document.getElementById('ws-indicator');
const wsText = document.getElementById('ws-text');
const wsReconnectBtn = document.getElementById('ws-reconnect');
const testImageBtn = document.getElementById('test-image');
const reloadAddonBtn = document.getElementById('reload-addon');

// Check extension status
async function checkStatus() {
  try {
    // Check if we're on a ChatGPT tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    const isChatGPT = currentTab.url && (
      currentTab.url.includes('chat.openai.com') || 
      currentTab.url.includes('chatgpt.com')
    );

    if (isChatGPT) {
      statusIndicator.classList.add('active');
      statusText.textContent = 'Active on ChatGPT';
      
      // Enable action buttons
      testImageBtn.disabled = false;
      reloadAddonBtn.disabled = false;
    } else {
      statusIndicator.classList.remove('active');
      statusText.textContent = 'Navigate to ChatGPT';
      
      // Disable action buttons
      testImageBtn.disabled = true;
      reloadAddonBtn.disabled = true;
    }

    // Check WebSocket status
    const wsStatus = await chrome.runtime.sendMessage({ type: 'WEBSOCKET_STATUS' });
    if (wsStatus.connected) {
      wsIndicator.classList.add('connected');
      wsText.textContent = 'Connected';
      wsReconnectBtn.textContent = 'Connected';
      wsReconnectBtn.disabled = true;
    } else {
      wsIndicator.classList.remove('connected');
      wsText.textContent = 'Disconnected';
      wsReconnectBtn.textContent = 'Reconnect';
      wsReconnectBtn.disabled = false;
    }
  } catch (error) {
    console.error('Error checking status:', error);
    statusText.textContent = 'Error';
  }
}

// WebSocket reconnect
wsReconnectBtn.addEventListener('click', async () => {
  wsReconnectBtn.disabled = true;
  wsReconnectBtn.textContent = 'Connecting...';
  
  try {
    await chrome.runtime.sendMessage({ type: 'WEBSOCKET_CONNECT' });
    setTimeout(checkStatus, 1000);
  } catch (error) {
    console.error('Error reconnecting:', error);
    wsReconnectBtn.disabled = false;
    wsReconnectBtn.textContent = 'Reconnect';
  }
});

// Test image generation
testImageBtn.addEventListener('click', async () => {
  testImageBtn.disabled = true;
  testImageBtn.textContent = 'Sending...';
  
  try {
    // Send test image request via service worker
    await chrome.runtime.sendMessage({
      type: 'addon:response',
      data: {
        type: 'semantest/custom/image/download/requested',
        payload: {
          text: 'A beautiful sunset over mountains',
          metadata: {
            source: 'popup-test',
            timestamp: Date.now()
          }
        }
      }
    });
    
    testImageBtn.textContent = 'Request Sent!';
    setTimeout(() => {
      testImageBtn.textContent = 'Test Image Generation';
      testImageBtn.disabled = false;
    }, 2000);
  } catch (error) {
    console.error('Error sending test:', error);
    testImageBtn.textContent = 'Error';
    setTimeout(() => {
      testImageBtn.textContent = 'Test Image Generation';
      testImageBtn.disabled = false;
    }, 2000);
  }
});

// Reload addon
reloadAddonBtn.addEventListener('click', async () => {
  reloadAddonBtn.disabled = true;
  reloadAddonBtn.textContent = 'Reloading...';
  
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      await chrome.tabs.reload(tabs[0].id);
      window.close();
    }
  } catch (error) {
    console.error('Error reloading:', error);
    reloadAddonBtn.textContent = 'Error';
    setTimeout(() => {
      reloadAddonBtn.textContent = 'Reload Addon';
      reloadAddonBtn.disabled = false;
    }, 2000);
  }
});

// Initial check
checkStatus();

// Refresh status every 2 seconds
setInterval(checkStatus, 2000);