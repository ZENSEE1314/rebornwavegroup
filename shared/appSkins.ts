// The member-app designs a company can choose from (BridgeX › White label). The look of
// each one lives in client/src/skins.css under html[data-skin="<id>"]; the colours here
// only draw the small preview in the picker. `mode: "light"` designs (the industry styles:
// professional, beauty salon, retail shop, spa, restaurant) are light pages with dark text
// (html[data-skin-mode="light"]); `font` is a Google Fonts stylesheet loaded with the design.
export interface AppSkin {
  id: string;
  page: string;
  panel: string;
  edge: string;
  accent: string;
  accentSoft: string;
  radius: number;
  mode?: "dark" | "light";
  ink?: string;   // preview text colour (light designs)
  font?: string;  // Google Fonts css2 query, e.g. "family=Inter:wght@400;600;700"
  industry?: boolean;
}

export const DEFAULT_APP_SKIN = "royal";

export const APP_SKINS: AppSkin[] = [
  { id: "royal", page: "#0a0714", panel: "#1d1838", edge: "#5b3fa0", accent: "#f3b52f", accentSoft: "#ffe89a", radius: 10 },
  { id: "ocean", page: "#03101f", panel: "#0b2238", edge: "#1e6f93", accent: "#22d3ee", accentSoft: "#a5f3fc", radius: 16 },
  { id: "sunset", page: "#1a0b16", panel: "#2c1424", edge: "#8a3b4d", accent: "#ff7a3d", accentSoft: "#ffc29e", radius: 14 },
  { id: "emerald", page: "#04140f", panel: "#0b241b", edge: "#8c7a3f", accent: "#d4af37", accentSoft: "#f1dc8e", radius: 4 },
  { id: "mono", page: "#0b0b0c", panel: "#141416", edge: "#3a3a3f", accent: "#f5f5f5", accentSoft: "#ffffff", radius: 3 },
  { id: "sakura", page: "#1c0a17", panel: "#301226", edge: "#9c4673", accent: "#ff8fb8", accentSoft: "#ffd1e3", radius: 16 },
  { id: "cyber", page: "#030507", panel: "#080e12", edge: "#39ff14", accent: "#39ff14", accentSoft: "#b6ffa6", radius: 0 },
  { id: "coffee", page: "#17100b", panel: "#2a1d14", edge: "#6b4f3a", accent: "#d9a066", accentSoft: "#f3dcc0", radius: 7 },
  { id: "arctic", page: "#0b1422", panel: "#1b2a40", edge: "#7f9cc0", accent: "#9fd4ff", accentSoft: "#e3f3ff", radius: 9 },
  { id: "candy", page: "#1b1040", panel: "#2a1a5e", edge: "#000000", accent: "#ffd60a", accentSoft: "#fff3a6", radius: 7 },
  // Industry styles — light, each with its own lettering, shapes and menu.
  { id: "pro", industry: true, mode: "light", page: "#f4f6fa", panel: "#ffffff", edge: "#dfe4ec", accent: "#1d4ed8", accentSoft: "#1e3a8a", ink: "#0f172a", radius: 10,
    font: "family=Inter:wght@400;500;600;700;800" },
  { id: "salon", industry: true, mode: "light", page: "#fbf4f1", panel: "#ffffff", edge: "#efd9d3", accent: "#b76e79", accentSoft: "#8c4a55", ink: "#3d2a2d", radius: 22,
    font: "family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=Lato:wght@400;700;900" },
  { id: "retail", industry: true, mode: "light", page: "#f2f2f4", panel: "#ffffff", edge: "#e2e2e6", accent: "#e11d48", accentSoft: "#9f1239", ink: "#111114", radius: 6,
    font: "family=Montserrat:wght@500;700;800;900" },
  { id: "spa", industry: true, mode: "light", page: "#f2f5f0", panel: "#ffffff", edge: "#d9e4d6", accent: "#5b8a72", accentSoft: "#3c6450", ink: "#25332b", radius: 18,
    font: "family=Nunito:wght@400;600;700;800&family=Cormorant+Garamond:wght@500;600;700" },
  { id: "bistro", industry: true, mode: "light", page: "#faf5ec", panel: "#fffdf8", edge: "#e8dccb", accent: "#c2410c", accentSoft: "#8a2f0a", ink: "#2b1d12", radius: 12,
    font: "family=DM+Serif+Display&family=DM+Sans:wght@400;500;700" },
];

export function appSkin(id: unknown): AppSkin | undefined {
  return APP_SKINS.find((skin) => skin.id === id);
}

export function isAppSkin(id: unknown): id is string {
  return typeof id === "string" && APP_SKINS.some((skin) => skin.id === id);
}
