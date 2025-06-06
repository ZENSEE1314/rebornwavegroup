import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { suppressWebSocketErrors } from "./lib/websocketErrorSuppressor";

// Suppress invalid WebSocket connection errors
suppressWebSocketErrors();

createRoot(document.getElementById("root")!).render(<App />);
