import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  // Prevent all unhandled rejections from showing in console during development
  event.preventDefault();
});

createRoot(document.getElementById("root")!).render(<App />);
