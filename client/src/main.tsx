import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./skins.css";
import { registerServiceWorker, pushSupported, enablePush } from "./lib/push";
import { installNumberInputFix } from "./lib/numberInputFix";
import { applyRememberedAppSkin } from "./lib/appSkin";

installNumberInputFix();
applyRememberedAppSkin();

createRoot(document.getElementById("root")!).render(<App />);

// Register the PWA service worker; if push was already granted, refresh the
// subscription so a logged-in member keeps receiving notifications.
if (pushSupported()) {
  registerServiceWorker().then(() => {
    if (Notification.permission === "granted") enablePush().catch(() => {});
  });
}
