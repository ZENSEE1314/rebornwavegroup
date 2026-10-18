import { useEffect, useState } from "react";
import NearbyDevices, { type NearbyDevice } from "@/components/NearbyDevices";
import { Copy, Monitor, Plus, QrCode, Sparkles, Trash2 } from "lucide-react";
import { qrSvgNow } from "@/lib/qr-download";
import { useTranslation } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { rememberedTenantSlug } from "@/hooks/useTenantBrand";

type TvView = "overlay" | "queue" | "gifts" | "off";
interface Screen { id: string; token: string; name: string; view: TvView; tables: string[]; online?: number }

const VIEWS: TvView[] = ["overlay", "queue", "gifts", "off"];
const DEFAULT_MAX_SCREENS = 12;
const NOTICE_MS = 4000;
const OVERLAY_APP_URL = "https://github.com/ZENSEE1314/rebornwavegroup/releases/download/tv-overlay-latest/reborn-tv-overlay.apk"; // built by GitHub from tv-overlay/
const card = "rounded-2xl bg-white/5 border border-white/10 p-4";
const field = "min-w-0 px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400/60";
const button = "inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-lg text-xs font-semibold bg-white/5 text-white/80 border border-white/10 disabled:opacity-40";

// On the shared platform host a company is told apart by ?tenant=<slug>, which the TV page remembers before it loads data.
const tvAddress = (token: string) => {
  const slug = rememberedTenantSlug();
  return `${window.location.origin}/tv/${token}${slug ? `?tenant=${encodeURIComponent(slug)}` : ""}`;
};
const tablesText = (tables: string[]) => tables.join(", ");

export default function TvPanel() {
  const { t } = useTranslation();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [max, setMax] = useState(DEFAULT_MAX_SCREENS);
  const [tableDrafts, setTableDrafts] = useState<Record<string, string>>({});
  const [qrFor, setQrFor] = useState<string | null>(null); // the TV whose address QR is open
  const [codes, setCodes] = useState<Record<string, string>>({}); // the code typed for each TV screen
  const [isDirty, setIsDirty] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState<{ isError: boolean; text: string } | null>(null);

  const say = (text: string, isError = false) => {
    setNotice({ isError, text });
    window.setTimeout(() => setNotice(null), NOTICE_MS);
  };

  const load = async () => {
    try {
      const data = await (await apiRequest("GET", "/api/reborn/admin/tv")).json();
      setScreens(data.screens);
      setMax(data.max);
      setTableDrafts(Object.fromEntries(data.screens.map((screen: Screen) => [screen.id, tablesText(screen.tables)])));
    } catch (error) {
      say(t("admin.tv.failed", { error: errorText(error) }), true);
    }
  };

  useEffect(() => { void load(); }, []);

  const change = (id: string, patch: Partial<Screen>) => {
    setScreens((current) => current.map((screen) => (screen.id === id ? { ...screen, ...patch } : screen)));
    setIsDirty(true);
  };

  const addScreen = (found?: NearbyDevice) => {
    const id = `new-${Date.now()}`;
    setScreens((current) => [...current, { id, token: "", name: found?.name || `TV ${current.length + 1}`, view: "overlay", tables: [] }]);
    setTableDrafts((current) => ({ ...current, [id]: "" }));
    setIsDirty(true);
  };

  const removeScreen = (id: string) => {
    setScreens((current) => current.filter((screen) => screen.id !== id));
    setIsDirty(true);
  };

  const makeAllLike = (source: Screen) => {
    setScreens((current) => current.map((screen) => ({ ...screen, view: source.view, tables: source.tables })));
    setTableDrafts((current) => Object.fromEntries(Object.keys(current).map((id) => [id, tableDrafts[source.id] ?? ""])));
    setIsDirty(true);
  };

  const save = async () => {
    setIsBusy(true);
    try {
      // The table box is free text; the server reads it as a list ("3, 4, 5") and drops repeats.
      const body = { screens: screens.map((screen) => ({ ...screen, id: screen.id.startsWith("new-") ? undefined : screen.id, tables: tableDrafts[screen.id] ?? "" })) };
      const data = await (await apiRequest("PUT", "/api/reborn/admin/tv", body)).json();
      setScreens(data.screens);
      setTableDrafts(Object.fromEntries(data.screens.map((screen: Screen) => [screen.id, tablesText(screen.tables)])));
      setIsDirty(false);
      say(t("admin.tv.saved"));
    } catch (error) {
      say(t("admin.tv.failed", { error: errorText(error) }), true);
    } finally {
      setIsBusy(false);
    }
  };

  const testGift = async (screen: Screen) => {
    try {
      const data = await (await apiRequest("POST", "/api/reborn/admin/tv/test-gift", { token: screen.token })).json();
      if (!data.shown) say(t("admin.tv.testNoGifts"), true);
      else if (!data.delivered) say(t("admin.tv.testNobody"), true);
      else say(t("admin.tv.testSent"));
    } catch (error) {
      say(t("admin.tv.failed", { error: errorText(error) }), true);
    }
  };

  // The code a waiting TV shows (it opened /tv): the TV then opens this screen's page by itself.
  const linkByCode = async (screen: Screen) => {
    try {
      await apiRequest("POST", "/api/reborn/admin/tv/pair", { code: codes[screen.id] ?? "", screenId: screen.id });
      setCodes((current) => ({ ...current, [screen.id]: "" }));
      say(t("admin.tv.codeDone"));
    } catch (error) { say(errorText(error), true); }
  };

  const copyAddress = async (screen: Screen) => {
    try {
      await navigator.clipboard.writeText(tvAddress(screen.token));
      say(t("admin.tv.copied"));
    } catch {
      say(tvAddress(screen.token)); // clipboard blocked: show the address so it can be copied by hand
    }
  };

  return (
    <div className="space-y-4">
      <NearbyDevices kind="tv" onAdd={addScreen} />
      <div className={card}>
        <h3 className="font-bold mb-1">{t("admin.tv.overlayTitle")}</h3>
        <p className="text-[11px] text-white/60">{t("admin.tv.overlayIntro")}</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-[11px] text-white/60">
          <li>{t("admin.tv.overlay1")} <a href={OVERLAY_APP_URL} className="break-all text-cyan-200" target="_blank" rel="noopener noreferrer">{OVERLAY_APP_URL}</a></li>
          <li>{t("admin.tv.overlay2")}</li>
          <li>{t("admin.tv.overlay3")}</li>
        </ol>
        <a href={OVERLAY_APP_URL} className={button + " mt-3 inline-flex"}>⬇ {t("admin.tv.overlayDownload")}</a>
      </div>
      <div className={card}>
        <h3 className="font-bold mb-1 flex items-center gap-2"><Monitor className="w-4 h-4 text-cyan-300" /> {t("admin.tv.title")}</h3>
        <p className="text-[11px] text-white/50 mb-2">{t("admin.tv.intro")}</p>
        <p className="text-[11px] text-white/50 mb-3">{t("admin.tv.help")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => addScreen()} disabled={screens.length >= max} className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg font-bold text-black text-sm bg-amber-400 disabled:opacity-40"><Plus className="w-4 h-4" /> {t("admin.tv.add")}</button>
          <span className="text-[11px] text-white/40">{t("admin.tv.limit", { n: max })}</span>
        </div>
      </div>

      {screens.length === 0 && <p className="text-xs text-white/50">{t("admin.tv.none")}</p>}

      {screens.map((screen) => (
        <div key={screen.id} className={card}>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-white/60 grow basis-40">{t("admin.tv.name")}
              <input value={screen.name} maxLength={40} onChange={(event) => change(screen.id, { name: event.target.value })} className={field} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/60 grow basis-64">{t("admin.tv.view")}
              <select value={screen.view} onChange={(event) => change(screen.id, { view: event.target.value as TvView })} className={field}>
                {VIEWS.map((view) => <option key={view} value={view}>{t(`admin.tv.view.${view}`)}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/60 grow basis-40">{t("admin.tv.tables")}
              <input value={tableDrafts[screen.id] ?? ""} placeholder={t("admin.tv.tablesPh")} onChange={(event) => { setTableDrafts((current) => ({ ...current, [screen.id]: event.target.value })); setIsDirty(true); }} className={field} />
            </label>
          </div>

          <div className="mt-3 text-[11px] text-white/50">
            {screen.token
              ? <>
                  <span className="text-white/60">{t("admin.tv.address")}: </span>
                  <code className="break-all text-cyan-200">{tvAddress(screen.token)}</code>
                  <span className="ml-2">· {screen.online ? t("admin.tv.online", { n: screen.online }) : t("admin.tv.offline")}</span>
                </>
              : t("admin.tv.saveFirst")}
          </div>

          {screen.token && (
            <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-semibold text-white/80">{t("admin.tv.codeTitle")}</p>
              <p className="mt-1 text-[11px] text-white/50">{t("admin.tv.codeHint", { addr: `${window.location.origin}/tv` })}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <input inputMode="numeric" maxLength={7} value={codes[screen.id] ?? ""} placeholder={t("admin.tv.codePh")} onChange={(event) => setCodes((current) => ({ ...current, [screen.id]: event.target.value.replace(/[^0-9]/g, "").slice(0, 6) }))} className={field + " w-40 tracking-widest"} />
                <button type="button" onClick={() => void linkByCode(screen)} disabled={(codes[screen.id] ?? "").length !== 6} className={button}>{t("admin.tv.codeLink")}</button>
              </div>
            </div>
          )}

          {screen.token && qrFor === screen.id && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="w-40 rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: qrSvgNow(tvAddress(screen.token)) }} />
              <p className="grow basis-48 text-[11px] text-white/60">{t("admin.tv.qrHint")}</p>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {screen.token && <button type="button" onClick={() => copyAddress(screen)} className={button}><Copy className="w-4 h-4" /> {t("admin.tv.copy")}</button>}
            {screen.token && <button type="button" onClick={() => setQrFor((current) => (current === screen.id ? null : screen.id))} className={button}><QrCode className="w-4 h-4" /> {qrFor === screen.id ? t("admin.tv.hideQr") : t("admin.tv.showQr")}</button>}
            {screen.token && <button type="button" onClick={() => testGift(screen)} disabled={isDirty} className={button}><Sparkles className="w-4 h-4" /> {t("admin.tv.testGift")}</button>}
            {screens.length > 1 && <button type="button" onClick={() => makeAllLike(screen)} className={button}>{t("admin.tv.copyToAll")}</button>}
            <button type="button" onClick={() => removeScreen(screen.id)} className={button + " text-red-200"}><Trash2 className="w-4 h-4" /> {t("admin.tv.remove")}</button>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={!isDirty || isBusy} className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-lg font-bold text-black text-sm bg-amber-400 disabled:opacity-40">{t("admin.tv.save")}</button>
        {isDirty && <span className="text-[11px] text-amber-200">{t("admin.tv.unsaved")}</span>}
        {notice && <span role={notice.isError ? "alert" : "status"} className={`text-xs ${notice.isError ? "text-red-300" : "text-emerald-300"}`}>{notice.text}</span>}
      </div>
    </div>
  );
}

function errorText(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).replace(/^\d{3}:\s*/, "");
}
