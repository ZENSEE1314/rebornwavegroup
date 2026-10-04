import { DEFAULT_APP_SKIN, appSkin, isAppSkin } from "@shared/appSkins";

const SKIN_KEY = "bridgexAppSkin";

// Puts the company's chosen design on <html> (see client/src/skins.css) and remembers it,
// so the next visit starts in that design before the company's details have loaded.
export function applyAppSkin(skin: string) {
  const id = isAppSkin(skin) ? skin : DEFAULT_APP_SKIN;
  const html = document.documentElement;
  if (id === DEFAULT_APP_SKIN) delete html.dataset.skin;
  else html.dataset.skin = id;
  const def = appSkin(id);
  // Light designs (industry styles) restyle the dark app's text, cards and fields too.
  if (def?.mode === "light") html.dataset.skinMode = "light"; else delete html.dataset.skinMode;
  // The design's own lettering, loaded only when that design is used.
  if (def?.font && !document.getElementById(`skin-font-${id}`)) {
    const link = document.createElement("link");
    link.id = `skin-font-${id}`; link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${def.font}&display=swap`;
    document.head.appendChild(link);
  }
  try { localStorage.setItem(SKIN_KEY, id); } catch {}
}

export function applyRememberedAppSkin() {
  try { applyAppSkin(localStorage.getItem(SKIN_KEY) || DEFAULT_APP_SKIN); } catch {}
}
