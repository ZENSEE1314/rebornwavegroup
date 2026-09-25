import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker, pushSupported, enablePush } from "./lib/push";

createRoot(document.getElementById("root")!).render(<App />);

// Register the PWA service worker; if push was already granted, refresh the
// subscription so a logged-in member keeps receiving notifications.
if (pushSupported()) {
  registerServiceWorker().then(() => {
    if (Notification.permission === "granted") enablePush().catch(() => {});
  });
}
