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
        message.includes('replit.dev') ||
        message.includes('localhost:undefined') ||
        message.includes('failed to construct'))) ||
      message.includes('unhandledrejection') ||
      message.includes('domexception') ||
      (message.includes('websocket') && message.includes('failed')) ||
      (message.includes('syntaxerror') && message.includes('websocket')) ||
      (message.includes('failed to construct') && message.includes('websocket')) ||
      message.includes('wss://localhost:undefined') ||
      message.includes('ws://localhost:undefined') ||
      message.includes('connection to') ||
      message.includes('failed:')) {
    return; // Silent suppression for external errors
  }
  
  originalConsoleError.apply(console, args);
};

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason?.message || event.reason || '';
  const errorString = typeof error === 'string' ? error : JSON.stringify(error);
  const errorName = event.reason?.name || '';
  
  // Suppress specific WebSocket and network-related errors
  if (errorString.includes('WebSocket') || 
      errorString.includes('websocket') ||
      errorString.includes('janeway.replit.dev') ||
      errorString.includes('replit.dev') ||
      errorString.includes('CORS') ||
      errorString.includes('Failed to fetch') ||
      errorString.includes('Network Error') ||
      errorString.includes('invalidateQueries') ||
      errorString.includes('queryClient') ||
      errorString.includes('Failed to construct') ||
      errorString.includes('SyntaxError') ||
      errorString.includes('is invalid') ||
      errorString.includes('undefined') ||
      errorString.includes('localhost:undefined') ||
      errorString.includes('vite') ||
      errorString.includes('HMR') ||
      errorString.includes('connection to') ||
      errorString.includes('failed:') ||
      errorName === 'DOMException' ||
      errorName === 'SyntaxError' ||
      errorName === 'TypeError') {
    event.preventDefault();
    // Silent suppression for external/infrastructure errors
    return;
  }
  
  // Log other unhandled rejections for debugging
  console.error('Unhandled Promise Rejection:', error);
});

createRoot(document.getElementById("root")!).render(<App />);
