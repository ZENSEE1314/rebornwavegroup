import { DEFAULT_APP_SKIN, isAppSkin } from "@shared/appSkins";

const SKIN_KEY = "bridgexAppSkin";

// Puts the company's chosen design on <html> (see client/src/skins.css) and remembers it,
// so the next visit starts in that design before the company's details have loaded.
export function applyAppSkin(skin: string) {
  const id = isAppSkin(skin) ? skin : DEFAULT_APP_SKIN;
  if (id === DEFAULT_APP_SKIN) delete document.documentElement.dataset.skin;
  else document.documentElement.dataset.skin = id;
  try { localStorage.setItem(SKIN_KEY, id); } catch {}
}

export function applyRememberedAppSkin() {
  try { applyAppSkin(localStorage.getItem(SKIN_KEY) || DEFAULT_APP_SKIN); } catch {}
}
