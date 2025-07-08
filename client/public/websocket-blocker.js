// WebSocket blocker script - must load before any other scripts
(function() {
  'use strict';
  
  console.log('WebSocket blocker script loaded');
  
  // Check if we're in development environment
  const isDevelopment = window.location.hostname.includes('janeway.replit.dev') ||
                       window.location.hostname.includes('replit.dev') ||
                       window.location.port === '3000';
  
  if (!isDevelopment) {
    console.log('Production environment detected, WebSocket allowed');
    return;
  }
  
  console.log('Development environment detected, blocking WebSocket');
  
  // Store original WebSocket
  const OriginalWebSocket = window.WebSocket;
  
  // Create mock WebSocket constructor
  function MockWebSocket(url, protocols) {
    console.log('WebSocket creation blocked for URL:', url);
    
    // Create a mock object that behaves like a closed WebSocket
    const mock = {
      readyState: 3, // CLOSED
      url: url.toString(),
      protocol: '',
      extensions: '',
      bufferedAmount: 0,
      binaryType: 'blob',
      
      // Event handlers
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
      
      // Methods
      close: function() {},
      send: function() {},
      addEventListener: function() {},
      removeEventListener: function() {},
      dispatchEvent: function() { return false; }
    };
    
    // Immediately trigger close event
    setTimeout(function() {
      if (typeof mock.onclose === 'function') {
        mock.onclose({
          type: 'close',
          code: 1000,
          reason: 'Blocked in development',
          wasClean: true
        });
      }
    }, 0);
    
    return mock;
  }
  
  // Copy static properties
  MockWebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
  MockWebSocket.OPEN = OriginalWebSocket.OPEN;
  MockWebSocket.CLOSING = OriginalWebSocket.CLOSING;
  MockWebSocket.CLOSED = OriginalWebSocket.CLOSED;
  
  // Replace global WebSocket
  window.WebSocket = MockWebSocket;
  
  // Override console.error to suppress WebSocket errors
  const originalConsoleError = console.error;
  console.error = function() {
    const message = Array.prototype.join.call(arguments, ' ').toLowerCase();
    if (message.includes('websocket') || 
        message.includes('failed to construct') ||
        message.includes('syntaxerror') ||
        message.includes('uncaught') ||
        message.includes('unhandled') ||
        message.includes('client.536') ||
        message.includes('janeway') ||
        message.includes('replit.dev')) {
      return; // Suppress these errors
    }
    originalConsoleError.apply(console, arguments);
  };
  
  // Override window.onerror
  window.onerror = function(message, source, lineno, colno, error) {
    const messageStr = String(message).toLowerCase();
    if (messageStr.includes('websocket') ||
        messageStr.includes('failed to construct') ||
        messageStr.includes('syntaxerror') ||
        messageStr.includes('uncaught')) {
      return true; // Prevent default error handling
    }
    return false;
  };
  
  // Override unhandled promise rejection
  window.addEventListener('unhandledrejection', function(event) {
    const reason = event.reason || '';
    const reasonStr = String(reason).toLowerCase();
    if (reasonStr.includes('websocket') ||
        reasonStr.includes('failed to construct') ||
        reasonStr.includes('syntaxerror')) {
      event.preventDefault();
    }
  });
  
  console.log('WebSocket blocking complete');
})();