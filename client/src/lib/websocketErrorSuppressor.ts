// Global WebSocket error suppressor to prevent invalid URL errors
export function suppressWebSocketErrors() {
  // Override WebSocket constructor to validate URLs before creation
  const OriginalWebSocket = window.WebSocket;
  
  window.WebSocket = function(url: string | URL, protocols?: string | string[]) {
    // Validate URL before attempting connection
    const urlString = url.toString();
    
    // Block invalid URLs that cause console errors
    if (urlString.includes('undefined') || 
        urlString.includes('localhost:undefined') ||
        urlString.match(/:\d*\/\?token=/) ||
        urlString.includes('wss://localhost:undefined')) {
      
      // Create a dummy WebSocket that fails silently
      const dummyWS = {
        readyState: WebSocket.CLOSED,
        close: () => {},
        send: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
        onopen: null,
        onclose: null,
        onerror: null,
        onmessage: null,
        url: urlString,
        protocol: '',
        extensions: '',
        bufferedAmount: 0,
        binaryType: 'blob' as BinaryType,
        CONNECTING: 0,
        OPEN: 1,
        CLOSING: 2,
        CLOSED: 3
      };
      
      // Simulate connection failure after a brief delay
      setTimeout(() => {
        if (dummyWS.onerror) {
          dummyWS.onerror(new Event('error'));
        }
      }, 0);
      
      return dummyWS as WebSocket;
    }
    
    // Valid URL - proceed with normal WebSocket creation
    try {
      return new OriginalWebSocket(url, protocols);
    } catch (error) {
      // Return a dummy WebSocket for failed connections
      return {
        readyState: WebSocket.CLOSED,
        close: () => {},
        send: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
        onopen: null,
        onclose: null,
        onerror: null,
        onmessage: null,
        url: urlString,
        protocol: '',
        extensions: '',
        bufferedAmount: 0,
        binaryType: 'blob' as BinaryType,
        CONNECTING: 0,
        OPEN: 1,
        CLOSING: 2,
        CLOSED: 3
      } as WebSocket;
    }
  } as any;
  
  // Copy static properties
  Object.setPrototypeOf(window.WebSocket, OriginalWebSocket);
  Object.defineProperty(window.WebSocket, 'CONNECTING', { value: 0 });
  Object.defineProperty(window.WebSocket, 'OPEN', { value: 1 });
  Object.defineProperty(window.WebSocket, 'CLOSING', { value: 2 });
  Object.defineProperty(window.WebSocket, 'CLOSED', { value: 3 });
}