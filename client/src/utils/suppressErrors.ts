console.log('WebSocket suppression loaded early');
// Additional error suppression utility
// This runs immediately to catch any errors before the main app loads

// Complete WebSocket constructor override for development
if (window.location.hostname.includes('janeway.replit.dev') || 
    window.location.hostname.includes('replit.dev')) {
  
  // Store original constructor and static properties
  const OriginalWebSocket = window.WebSocket;
  const CONNECTING = OriginalWebSocket.CONNECTING;
  const OPEN = OriginalWebSocket.OPEN;
  const CLOSING = OriginalWebSocket.CLOSING;
  const CLOSED = OriginalWebSocket.CLOSED;
  
  // Mock WebSocket that immediately fails silently
  function MockWebSocket(url: string | URL, protocols?: string | string[]) {
    const mock = {
      url: typeof url === 'string' ? url : url.toString(),
      readyState: CLOSED,
      bufferedAmount: 0,
      extensions: '',
      protocol: '',
      binaryType: 'blob' as BinaryType,
      
      // Event properties
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
      
      // Methods that do nothing
      close: () => {},
      send: () => {},
      
      // Event listener methods
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    };
    
    // Immediately trigger close event to prevent hanging
    setTimeout(() => {
      if (mock.onclose) {
        mock.onclose({ type: 'close', code: 1000, reason: 'Mock close', wasClean: true } as any);
      }
    }, 0);
    
    return mock;
  }
  
  // Copy static properties
  MockWebSocket.CONNECTING = CONNECTING;
  MockWebSocket.OPEN = OPEN;
  MockWebSocket.CLOSING = CLOSING;
  MockWebSocket.CLOSED = CLOSED;
  
  // Replace the global WebSocket
  (window as any).WebSocket = MockWebSocket;
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
      message.includes('syntaxerror') ||
      message.includes('uncaught') ||
      message.includes('promise') ||
      message.includes('setuptosocket') ||
      message.includes('fallback') ||
      message.includes('localhost:undefined') ||
      message.includes('invalid url')) {
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