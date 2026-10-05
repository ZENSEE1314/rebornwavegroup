import { useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { loadFont } from "@/lib/appSkin";
import { APP_FONTS, APP_PALETTES, APP_SKINS, CUSTOM_PALETTE, DEFAULT_CUSTOM_COLOURS, appPalette, appSkin, paletteFor, type AppColours, type AppSkin } from "@shared/appSkins";

interface PreviewColours {
  page: string;
  panel: string;
  edge: string;
  accent: string;
  accentSoft: string;
}

const PREVIEW_EDGE_ALPHA = "66"; // hex alpha for the card outline drawn in the accent colour

// A dark design is drawn in the colour being chosen; a light industry design in its own
// (with the admin's own main colour, when "Own colours" is chosen).
function previewColours(skin: AppSkin, paletteId: string | null, own: AppColours): PreviewColours {
  if (paletteId === CUSTOM_PALETTE) {
    if (skin.mode === "light") return { ...skin, accent: own.accent, accentSoft: own.accent };
    return { page: own.page, panel: own.panel, edge: own.accent + PREVIEW_EDGE_ALPHA, accent: own.accent, accentSoft: own.second };
  }
  const palette = skin.mode === "light" ? undefined : appPalette(paletteId || skin.palette);
  if (!palette) return skin;
  return { page: palette.page, panel: palette.panel, edge: palette.accent + PREVIEW_EDGE_ALPHA, accent: palette.accent, accentSoft: palette.accentSoft };
}

// Shared by BridgeX › White label and the app's own Admin › Settings. Two choices: the
// design (ten shapes + five light industry styles), each drawn as a small phone, and the
// colour (ten), which every dark design can wear.
const COLOUR_FIELDS: (keyof AppColours)[] = ["page", "panel", "accent", "second"];

export function AppSkinPicker({ value, onChange, palette, onPaletteChange, colours, onColoursChange, font, onFontChange, note }: {
  value: string; onChange: (id: string) => void; palette: string; onPaletteChange: (id: string) => void;
  colours?: AppColours | null; onColoursChange?: (colours: AppColours) => void;
  font?: string; onFontChange?: (id: string) => void; note?: string;
}) {
  const { t } = useTranslation();
  const colour = paletteFor(value, palette);
  const isLight = appSkin(value)?.mode === "light";
  const isCustom = palette === CUSTOM_PALETTE;
  const own = colours || DEFAULT_CUSTOM_COLOURS;
  // A light design keeps its own colours unless the admin picks "Own colours" (main colour only).
  const ownColours = isLight && !isCustom;
  // Light designs keep their pale page and cards, so only the main colour is offered there.
  const fields = isLight ? COLOUR_FIELDS.filter((field) => field === "accent") : COLOUR_FIELDS;
  // The lettering choices are shown in their own font.
  useEffect(() => { if (onFontChange) for (const option of APP_FONTS) loadFont(`app-font-${option.id}`, option.css); }, [!!onFontChange]);
  return (
    <div className="mt-5">
      <p className="text-sm font-bold text-white">{t("admin.bx.skin.title")}</p>
      <p className="mt-1 text-xs text-slate-400">{t("admin.bx.skin.hint")}</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {APP_SKINS.map((skin) => {
          const look = previewColours(skin, palette || null, own);
          return (
            <button key={skin.id} type="button" aria-pressed={value === skin.id} onClick={() => onChange(skin.id)} className={`rounded-2xl border p-2 text-left ${value === skin.id ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-white/5"}`}>
              <div className="flex h-36 flex-col gap-1.5 overflow-hidden rounded-xl p-2" style={{ background: look.page }}>
                <div className="flex items-center justify-between"><span className="h-2 w-10 rounded-full" style={{ background: look.accentSoft }} /><span className="h-2.5 w-6 rounded-full" style={{ background: look.accent }} /></div>
                <div className="flex-1 p-2" style={{ background: look.panel, border: `1px solid ${look.edge}`, borderRadius: skin.radius }}>
                  <span className="block text-[10px] font-bold" style={{ color: skin.ink || look.accentSoft }}>{t("admin.bx.skin.sample")}</span>
                  <span className={`mt-1.5 block h-1.5 w-3/4 rounded-full ${skin.mode === "light" ? "bg-black/15" : "bg-white/25"}`} />
                  <span className={`mt-1 block h-1.5 w-1/2 rounded-full ${skin.mode === "light" ? "bg-black/10" : "bg-white/15"}`} />
                  <span className="mt-2 block h-4 w-14" style={{ background: look.accent, borderRadius: skin.radius }} />
                </div>
                <div className="flex justify-around">{[0, 1, 2, 3].map((slot) => <span key={slot} className="h-3 w-5" style={{ background: slot === 1 ? look.accent : look.panel, border: `1px solid ${look.edge}`, borderRadius: Math.min(skin.radius, 6) }} />)}</div>
              </div>
              <span className="mt-2 block text-xs font-bold text-white">{t(`admin.bx.skin.${skin.id}`)}</span>
              <span className="block text-[11px] leading-snug text-slate-400">{t(`admin.bx.skin.${skin.id}.d`)}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-sm font-bold text-white">{t("admin.bx.palette.title")}</p>
      <p className="mt-1 text-xs text-slate-400">{ownColours ? t("admin.bx.palette.ownColours") : t("admin.bx.palette.hint")}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {APP_PALETTES.map((option) => (
          <button key={option.id} type="button" disabled={isLight} aria-pressed={colour === option.id} onClick={() => onPaletteChange(option.id)} className={`flex items-center gap-2 rounded-xl border p-2 text-left disabled:pointer-events-none disabled:opacity-40 ${colour === option.id ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-white/5"}`}>
            <span className="flex h-8 w-12 shrink-0 overflow-hidden rounded-lg border border-white/15" aria-hidden="true">
              <span className="flex-1" style={{ background: option.page }} />
              <span className="flex-1" style={{ background: option.panel }} />
              <span className="flex-1" style={{ background: option.accent }} />
              <span className="flex-1" style={{ background: option.second }} />
            </span>
            <span className="min-w-0 truncate text-xs font-bold text-white">{t(`admin.bx.palette.${option.id}`)}</span>
          </button>
        ))}
        {onColoursChange && (
          <button type="button" aria-pressed={isCustom} onClick={() => { onPaletteChange(CUSTOM_PALETTE); if (!colours) onColoursChange(own); }} className={`flex items-center gap-2 rounded-xl border p-2 text-left ${isCustom ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-white/5"}`}>
            <span className="h-8 w-12 shrink-0 rounded-lg border border-white/15" style={{ background: "conic-gradient(#f43f5e, #f59e0b, #22c55e, #06b6d4, #6366f1, #d946ef, #f43f5e)" }} aria-hidden="true" />
            <span className="min-w-0 truncate text-xs font-bold text-white">{t("admin.bx.palette.custom")}</span>
          </button>
        )}
      </div>
      {isLight && <p className="mt-2 text-[11px] text-slate-500">{t("admin.bx.palette.lightCustom")}</p>}

      {isCustom && onColoursChange && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {fields.map((field) => (
            <label key={field} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2">
              <input type="color" value={own[field]} onChange={(e) => onColoursChange({ ...own, [field]: e.target.value })} className="h-9 w-11 shrink-0 cursor-pointer rounded-lg border border-white/15 bg-transparent p-0.5" />
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-white">{t(`admin.bx.colour.${field}`)}</span>
                <span className="block font-mono text-[11px] uppercase text-slate-400">{own[field]}</span>
              </span>
            </label>
          ))}
        </div>
      )}

      {onFontChange && (
        <>
          <p className="mt-5 text-sm font-bold text-white">{t("admin.bx.font.title")}</p>
          <p className="mt-1 text-xs text-slate-400">{t("admin.bx.font.hint")}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {[{ id: "", family: "inherit" }, ...APP_FONTS].map((option) => (
              <button key={option.id || "own"} type="button" aria-pressed={(font || "") === option.id} onClick={() => onFontChange(option.id)} className={`rounded-xl border p-2 text-left ${(font || "") === option.id ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-white/5"}`}>
                <span className="block text-lg font-bold leading-tight text-white" style={{ fontFamily: option.family }}>Aa 中</span>
                <span className="block truncate text-[11px] text-slate-400">{t(`admin.bx.font.${option.id || "own"}`)}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <p className="mt-2 text-[11px] text-slate-500">{note ?? t("admin.bx.skin.saveNote")}</p>
    </div>
  );
}
