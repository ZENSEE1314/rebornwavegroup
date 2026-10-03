// The member-app designs a company can choose from (BridgeX › White label). The look of
// each one lives in client/src/skins.css under html[data-skin="<id>"]; the colours here
// only draw the small preview in the picker.
export interface AppSkin {
  id: string;
  page: string;
  panel: string;
  edge: string;
  accent: string;
  accentSoft: string;
  radius: number;
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
];

export function isAppSkin(id: unknown): id is string {
  return typeof id === "string" && APP_SKINS.some((skin) => skin.id === id);
}
