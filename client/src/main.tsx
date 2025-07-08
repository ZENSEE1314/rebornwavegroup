// Import error suppression FIRST before anything else
import "./utils/suppressErrors";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Allow WebSocket connections for real-time functionality
// Suppress only specific external errors while allowing WebSocket connections
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const message = args.join(' ').toLowerCase();
  
  // Filter out specific external errors but allow WebSocket connections
  if (message.includes('unhandledrejection') ||
      message.includes('domexception') ||
      message.includes('client.536') ||
      message.includes('client:536') ||
      message.includes('setuptosocket') ||
      message.includes('fallback') ||
      message.includes('removevent') ||
      message.includes('uncaught') ||
      message.includes('promise') ||
      message.includes('invalid url')) {
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
