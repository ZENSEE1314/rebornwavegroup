import { DEFAULT_APP_PALETTE, DEFAULT_APP_SKIN, appSkin, isAppSkin, paletteFor } from "@shared/appSkins";

const SKIN_KEY = "bridgexAppSkin";
const PALETTE_KEY = "bridgexAppPalette";

// Puts the company's chosen design and colour on <html> (see client/src/skins.css) and
// remembers them, so the next visit starts in that look before the company's details have loaded.
export function applyAppSkin(skin: string, palette = "") {
  const id = isAppSkin(skin) ? skin : DEFAULT_APP_SKIN;
  const colour = paletteFor(id, palette);
  const html = document.documentElement;
  // Royal in gold is the app as written (index.css): no attributes at all.
  const isOriginalLook = id === DEFAULT_APP_SKIN && colour === DEFAULT_APP_PALETTE;
  if (isOriginalLook) delete html.dataset.skin; else html.dataset.skin = id;
  if (isOriginalLook || !colour) delete html.dataset.palette; else html.dataset.palette = colour;
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
  try { localStorage.setItem(SKIN_KEY, id); localStorage.setItem(PALETTE_KEY, colour || ""); } catch {}
}

export function applyRememberedAppSkin() {
  try { applyAppSkin(localStorage.getItem(SKIN_KEY) || DEFAULT_APP_SKIN, localStorage.getItem(PALETTE_KEY) || ""); } catch {}
}
