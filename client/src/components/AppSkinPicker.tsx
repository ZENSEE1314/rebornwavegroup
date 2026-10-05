import { useTranslation } from "@/lib/i18n";
import { APP_PALETTES, APP_SKINS, appPalette, appSkin, paletteFor, type AppSkin } from "@shared/appSkins";

interface PreviewColours {
  page: string;
  panel: string;
  edge: string;
  accent: string;
  accentSoft: string;
}

const PREVIEW_EDGE_ALPHA = "66"; // hex alpha for the card outline drawn in the accent colour

// A dark design is drawn in the colour being chosen; a light industry design in its own.
function previewColours(skin: AppSkin, paletteId: string | null): PreviewColours {
  const palette = skin.mode === "light" ? undefined : appPalette(paletteId || skin.palette);
  if (!palette) return skin;
  return { page: palette.page, panel: palette.panel, edge: palette.accent + PREVIEW_EDGE_ALPHA, accent: palette.accent, accentSoft: palette.accentSoft };
}

// Shared by BridgeX › White label and the app's own Admin › Settings. Two choices: the
// design (ten shapes + five light industry styles), each drawn as a small phone, and the
// colour (ten), which every dark design can wear.
export function AppSkinPicker({ value, onChange, palette, onPaletteChange, note }: {
  value: string; onChange: (id: string) => void; palette: string; onPaletteChange: (id: string) => void; note?: string;
}) {
  const { t } = useTranslation();
  const colour = paletteFor(value, palette);
  const ownColours = appSkin(value)?.mode === "light";
  return (
    <div className="mt-5">
      <p className="text-sm font-bold text-white">{t("admin.bx.skin.title")}</p>
      <p className="mt-1 text-xs text-slate-400">{t("admin.bx.skin.hint")}</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {APP_SKINS.map((skin) => {
          const look = previewColours(skin, palette || null);
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
      <div className={`mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5 ${ownColours ? "pointer-events-none opacity-40" : ""}`}>
        {APP_PALETTES.map((option) => (
          <button key={option.id} type="button" disabled={ownColours} aria-pressed={colour === option.id} onClick={() => onPaletteChange(option.id)} className={`flex items-center gap-2 rounded-xl border p-2 text-left ${colour === option.id ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-white/5"}`}>
            <span className="flex h-8 w-12 shrink-0 overflow-hidden rounded-lg border border-white/15" aria-hidden="true">
              <span className="flex-1" style={{ background: option.page }} />
              <span className="flex-1" style={{ background: option.panel }} />
              <span className="flex-1" style={{ background: option.accent }} />
              <span className="flex-1" style={{ background: option.second }} />
            </span>
            <span className="min-w-0 truncate text-xs font-bold text-white">{t(`admin.bx.palette.${option.id}`)}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">{note ?? t("admin.bx.skin.saveNote")}</p>
    </div>
  );
}
