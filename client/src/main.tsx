import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress specific WebSocket errors from external services
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const message = args.join(' ').toLowerCase();
  
  // Filter out specific external WebSocket errors
  if (message.includes('websocket connection to') && 
      (message.includes('janeway.replit.dev') || 
       message.includes('localhost:undefined') ||
       message.includes('failed to construct'))) {
    return; // Silent suppression for external errors
  }
  
  originalConsoleError.apply(console, args);
};

createRoot(document.getElementById("root")!).render(<App />);
