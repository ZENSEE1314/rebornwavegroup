import { useTranslation } from "@/lib/i18n";
import { APP_SKINS } from "@shared/appSkins";

// Shared by BridgeX › White label and the app's own Admin › Settings.
// The app designs (ten looks + five light industry styles), each drawn as a small phone so the admin sees what they are choosing.
export function AppSkinPicker({ value, onChange, note }: { value: string; onChange: (id: string) => void; note?: string }) {
  const { t } = useTranslation();
  return (
    <div className="mt-5">
      <p className="text-sm font-bold text-white">{t("admin.bx.skin.title")}</p>
      <p className="mt-1 text-xs text-slate-400">{t("admin.bx.skin.hint")}</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {APP_SKINS.map((skin) => (
          <button key={skin.id} type="button" aria-pressed={value === skin.id} onClick={() => onChange(skin.id)} className={`rounded-2xl border p-2 text-left ${value === skin.id ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-white/5"}`}>
            <div className="flex h-36 flex-col gap-1.5 overflow-hidden rounded-xl p-2" style={{ background: skin.page }}>
              <div className="flex items-center justify-between"><span className="h-2 w-10 rounded-full" style={{ background: skin.accentSoft }} /><span className="h-2.5 w-6 rounded-full" style={{ background: skin.accent }} /></div>
              <div className="flex-1 p-2" style={{ background: skin.panel, border: `1px solid ${skin.edge}`, borderRadius: skin.radius }}>
                <span className="block text-[10px] font-bold" style={{ color: skin.ink || skin.accentSoft }}>{t("admin.bx.skin.sample")}</span>
                <span className={`mt-1.5 block h-1.5 w-3/4 rounded-full ${skin.mode === "light" ? "bg-black/15" : "bg-white/25"}`} />
                <span className={`mt-1 block h-1.5 w-1/2 rounded-full ${skin.mode === "light" ? "bg-black/10" : "bg-white/15"}`} />
                <span className="mt-2 block h-4 w-14" style={{ background: skin.accent, borderRadius: skin.radius }} />
              </div>
              <div className="flex justify-around">{[0, 1, 2, 3].map((slot) => <span key={slot} className="h-3 w-5" style={{ background: slot === 1 ? skin.accent : skin.panel, border: `1px solid ${skin.edge}`, borderRadius: Math.min(skin.radius, 6) }} />)}</div>
            </div>
            <span className="mt-2 block text-xs font-bold text-white">{t(`admin.bx.skin.${skin.id}`)}</span>
            <span className="block text-[11px] leading-snug text-slate-400">{t(`admin.bx.skin.${skin.id}.d`)}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">{note ?? t("admin.bx.skin.saveNote")}</p>
    </div>
  );
}
