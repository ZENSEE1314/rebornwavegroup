import { CUSTOM_PALETTE, DEFAULT_APP_PALETTE, DEFAULT_CUSTOM_COLOURS, DEFAULT_APP_SKIN, appFont, appFontHeading, appSkin, cleanAppColours, isAppFont, isAppSkin, paletteFor, type AppColours } from "@shared/appSkins";

const SKIN_KEY = "bridgexAppSkin";
const PALETTE_KEY = "bridgexAppPalette";
const LOOK_KEY = "bridgexAppLook";

// What the admin set on top of a design: their own colours (palette "custom") and lettering.
export interface AppLook {
  colours?: AppColours | null;
  font?: string;
}

// Variables written on <html style> for own colours / lettering; cleared when not used.
const LOOK_VARS = ["--pc-bg0", "--pc-bg1", "--pc-s1", "--pc-s2", "--pc-a", "--pc-a2", "--pc-b", "--pc-ink", "--pc-deep", "--sk-a", "--sk-a2", "--sk-ink", "--sk-deep", "--sk-font", "--sk-head-font"];

const DARK_TEXT = "#111111";
const LIGHT_TEXT = "#ffffff";
const LIGHT_BACKGROUND_LUMINANCE = 0.45; // above this, text on the colour is dark

function luminance(hex: string): number {
  const channel = (start: number) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

// Text that reads on a button of this colour.
export function textOn(hex: string): string {
  return luminance(hex) > LIGHT_BACKGROUND_LUMINANCE ? DARK_TEXT : LIGHT_TEXT;
}

export function loadFont(id: string, css: string) {
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id; link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?${css}&display=swap`;
  document.head.appendChild(link);
}

// Puts the company's chosen design and colour on <html> (see client/src/skins.css) and
// remembers them, so the next visit starts in that look before the company's details have loaded.
export function applyAppSkin(skin: string, palette = "", look: AppLook = {}) {
  const id = isAppSkin(skin) ? skin : DEFAULT_APP_SKIN;
  const colour = paletteFor(id, palette);
  const def = appSkin(id);
  const html = document.documentElement;
  const own = palette === CUSTOM_PALETTE ? (cleanAppColours(look.colours) || DEFAULT_CUSTOM_COLOURS) : null;
  const font = isAppFont(look.font) ? appFont(look.font) : undefined;
  // Royal in gold is the app as written (index.css): no attributes at all.
  const isOriginalLook = id === DEFAULT_APP_SKIN && colour === DEFAULT_APP_PALETTE && !font;
  if (isOriginalLook) delete html.dataset.skin; else html.dataset.skin = id;
  if (isOriginalLook || !colour) delete html.dataset.palette; else html.dataset.palette = colour;
  // Light designs (industry styles) restyle the dark app's text, cards and fields too.
  if (def?.mode === "light") html.dataset.skinMode = "light"; else delete html.dataset.skinMode;

  for (const name of LOOK_VARS) html.style.removeProperty(name);
  if (own && def?.mode !== "light") {
    // A dark design builds every --sk-* value from these (html[data-palette] in skins.css).
    const set = (name: string, value: string) => html.style.setProperty(name, value);
    set("--pc-bg0", own.page);
    set("--pc-bg1", `color-mix(in srgb, ${own.page} 78%, ${own.accent})`);
    set("--pc-s1", own.panel);
    set("--pc-s2", `color-mix(in srgb, ${own.panel} 65%, ${own.page})`);
    set("--pc-a", own.accent);
    set("--pc-a2", `color-mix(in srgb, ${own.accent} 45%, #ffffff)`);
    set("--pc-b", own.second);
    set("--pc-ink", textOn(own.accent));
    set("--pc-deep", `color-mix(in srgb, ${own.accent} 60%, #000000)`);
  } else if (own) {
    // A light design keeps its page and cards; the main colour paints its buttons and links.
    html.style.setProperty("--sk-a", own.accent);
    html.style.setProperty("--sk-a2", `color-mix(in srgb, ${own.accent} 80%, #000000)`);
    html.style.setProperty("--sk-deep", `color-mix(in srgb, ${own.accent} 65%, #000000)`);
    html.style.setProperty("--sk-ink", textOn(own.accent));
  }
  if (font) {
    html.style.setProperty("--sk-font", font.family);
    html.style.setProperty("--sk-head-font", appFontHeading(font.id) || font.family);
    loadFont(`app-font-${font.id}`, font.css);
  }

  // The design's own lettering, loaded only when that design is used.
  if (def?.font && !font) loadFont(`skin-font-${id}`, def.font);
  try {
    localStorage.setItem(SKIN_KEY, id);
    localStorage.setItem(PALETTE_KEY, palette === CUSTOM_PALETTE ? CUSTOM_PALETTE : colour || "");
    localStorage.setItem(LOOK_KEY, JSON.stringify({ colours: own, font: font?.id || "" }));
  } catch {}
}

export function applyRememberedAppSkin() {
  try {
    let look: AppLook = {};
    try { look = JSON.parse(localStorage.getItem(LOOK_KEY) || "{}") || {}; } catch {}
    applyAppSkin(localStorage.getItem(SKIN_KEY) || DEFAULT_APP_SKIN, localStorage.getItem(PALETTE_KEY) || "", look);
  } catch {}
}
