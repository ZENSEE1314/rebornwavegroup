import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress specific WebSocket and unhandled rejection errors from external services
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const message = args.join(' ').toLowerCase();
  
  // Filter out specific external WebSocket errors and unhandled rejections
  if ((message.includes('websocket connection to') && 
       (message.includes('janeway.replit.dev') || 
        message.includes('localhost:undefined') ||
        message.includes('failed to construct'))) ||
      message.includes('unhandledrejection') ||
      (message.includes('websocket') && message.includes('failed'))) {
    return; // Silent suppression for external errors
  }
  
  originalConsoleError.apply(console, args);
};

// Also suppress unhandled promise rejections related to WebSocket
const originalUnhandledRejection = window.addEventListener;
window.addEventListener = function(type: string, listener: any, options?: any) {
  if (type === 'unhandledrejection') {
    const wrappedListener = (event: any) => {
      const error = event.reason?.message || event.reason || '';
      if (typeof error === 'string' && 
          (error.includes('WebSocket') || 
           error.includes('websocket') ||
           error.includes('janeway.replit.dev'))) {
        event.preventDefault();
        return;
      }
      return listener(event);
    };
    return originalUnhandledRejection.call(this, type, wrappedListener, options);
  }
  return originalUnhandledRejection.call(this, type, listener, options);
};

createRoot(document.getElementById("root")!).render(<App />);
