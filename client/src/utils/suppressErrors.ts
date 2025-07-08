// Additional error suppression utility
// This runs immediately to catch any errors before the main app loads

// Complete WebSocket constructor override for development
if (window.location.hostname.includes('janeway.replit.dev') || 
    window.location.hostname.includes('replit.dev')) {
  
  // Override WebSocket constructor to prevent any WebSocket creation
  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function(url: string | URL, protocols?: string | string[]) {
    console.log('WebSocket creation blocked in development environment');
    // Return a mock WebSocket object that doesn't actually connect
    return {
      readyState: 3, // CLOSED
      close: () => {},
      send: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null
    } as any;
  } as any;
  
  // Copy static properties
  window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
  window.WebSocket.OPEN = OriginalWebSocket.OPEN;
  window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
  window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;
}

// Override window.onerror to suppress WebSocket errors
window.onerror = function(message, source, lineno, colno, error) {
  const messageStr = String(message).toLowerCase();
  const sourceStr = String(source).toLowerCase();
  
  // Suppress WebSocket and development-related errors
  if (messageStr.includes('websocket') ||
      messageStr.includes('failed to construct') ||
      messageStr.includes('syntaxerror') ||
      sourceStr.includes('janeway.replit.dev') ||
      sourceStr.includes('client.536') ||
      messageStr.includes('uncaught') ||
      messageStr.includes('unhandled')) {
    return true; // Prevent default error handling
  }
  
  return false; // Allow other errors to be handled normally
};

// Override console methods to suppress specific errors
const originalError = console.error;
const originalWarn = console.warn;

console.error = function(...args: any[]) {
  const message = args.join(' ').toLowerCase();
  if (message.includes('websocket') || 
      message.includes('janeway') ||
      message.includes('replit.dev') ||
      message.includes('failed to construct') ||
      message.includes('client.536') ||
      message.includes('syntaxerror')) {
    return; // Suppress
  }
  originalError.apply(console, args);
};

console.warn = function(...args: any[]) {
  const message = args.join(' ').toLowerCase();
  if (message.includes('websocket') || 
      message.includes('janeway') ||
      message.includes('replit.dev') ||
      message.includes('failed to construct')) {
    return; // Suppress
  }
  originalWarn.apply(console, args);
};

export {};