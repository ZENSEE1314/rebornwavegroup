// The overlay of gift effects on the karaoke box (native code in mobile/modules/tv-overlay, Android): the website asks for it through
// window.__rebornOverlay. Missing in an older app build, so it is looked up, never assumed.
import { requireOptionalNativeModule } from "expo";

interface TvOverlayNative {
  canDraw(): boolean;
  isRunning(): boolean;
  savedUrl(): string;
  openPermission(): void;
  start(url: string): void;
  stop(): void;
}

export interface OverlayStatus { canDraw: boolean; running: boolean; url: string }

const native = requireOptionalNativeModule<TvOverlayNative>("TvOverlay");

export function overlayAction(action: string, url: string): OverlayStatus | true {
  if (!native) throw new Error("This app version cannot show the overlay yet. Install the latest Reborn app.");
  if (action === "permission") native.openPermission();
  else if (action === "start") native.start(url);
  else if (action === "stop") native.stop();
  return action === "status" ? { canDraw: native.canDraw(), running: native.isRunning(), url: native.savedUrl() } : true;
}
