import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Bluetooth, Plus, Power, Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { APP_EFFECTS, hsvToRgb, rgbToHsv } from "@/lib/lights/effects";
import { LightHub, MAX_LIVE_LIGHTS, type LightShown, type Target } from "@/lib/lights/hub";
import { createDemoLight } from "@/lib/lights/demo";
import { UnsupportedLightError, isBluetoothSupported, pairBluetoothLight } from "@/lib/lights/bluetooth";
import type { Rgb } from "@/lib/lights/protocols";

const WHEEL_SIZE = 240;
const WHEEL_EDGE_SOFTNESS = 0.015;
const CUSTOM_SLOTS = 6;
const CUSTOM_STORAGE_KEY = "lights.customColours";
const DEMO_COUNTS = [8, 24, 60];
const PRESETS: Rgb[] = [
  { r: 255, g: 0, b: 0 }, { r: 0, g: 255, b: 0 }, { r: 0, g: 0, b: 255 },
  { r: 255, g: 255, b: 255 }, { r: 255, g: 255, b: 0 }, { r: 255, g: 0, b: 255 },
];

const card = "rounded-2xl bg-white/5 border border-white/10 p-4";
const field = "min-w-0 px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400/60";
const chip = (isActive: boolean) => `min-h-[44px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap ${isActive ? "bg-amber-400 text-black" : "bg-white/5 text-white/70 border border-white/10"}`;

const css = ({ r, g, b }: Rgb) => `rgb(${r}, ${g}, ${b})`;
const toHex = ({ r, g, b }: Rgb) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
const fromHex = (hex: string): Rgb => ({ r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) });
const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value) || 0));

function loadCustomColours(): (string | null)[] {
  try {
    const stored = JSON.parse(localStorage.getItem(CUSTOM_STORAGE_KEY) || "[]");
    return Array.from({ length: CUSTOM_SLOTS }, (_, i) => (typeof stored[i] === "string" && /^#[0-9a-f]{6}$/i.test(stored[i]) ? stored[i] : null));
  } catch {
    return Array(CUSTOM_SLOTS).fill(null); // storage blocked or unreadable: start empty
  }
}

function Dot({ shown }: { shown: LightShown }) {
  const style = !shown ? { background: "transparent" }
    : shown.kind === "colour" ? { background: css(shown.rgb) }
    : shown.kind === "off" ? { background: "#111" }
    : { background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" };
  return <span className="inline-block w-5 h-5 rounded-full border border-white/30 shrink-0" style={style} />;
}

function ColourWheel({ colour, onChange, label }: { colour: Rgb; onChange: (rgb: Rgb) => void; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const size = Math.round(WHEEL_SIZE * (window.devicePixelRatio || 1));
    canvas.width = size;
    canvas.height = size;
    const image = context.createImageData(size, size);
    const radius = size / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x + 0.5 - radius;
        const dy = y + 0.5 - radius;
        const distance = Math.hypot(dx, dy) / radius;
        if (distance > 1) continue;
        const { r, g, b } = hsvToRgb((Math.atan2(dy, dx) * 180) / Math.PI, distance, 1);
        const i = (y * size + x) * 4;
        image.data[i] = r; image.data[i + 1] = g; image.data[i + 2] = b;
        image.data[i + 3] = distance > 1 - WHEEL_EDGE_SOFTNESS ? Math.round(((1 - distance) / WHEEL_EDGE_SOFTNESS) * 255) : 255;
      }
    }
    context.putImageData(image, 0, 0);
  }, []);

  const pick = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const radius = box.width / 2;
    const dx = event.clientX - box.left - radius;
    const dy = event.clientY - box.top - radius;
    onChange(hsvToRgb((Math.atan2(dy, dx) * 180) / Math.PI, Math.min(1, Math.hypot(dx, dy) / radius), 1));
  };

  const { h, s } = rgbToHsv(colour);
  const angle = (h * Math.PI) / 180;
  return (
    <div
      role="group" aria-label={label}
      className="relative mx-auto touch-none select-none cursor-crosshair"
      style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}
      onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); pick(event); }}
      onPointerMove={(event) => { if (event.buttons) pick(event); }}
    >
      <canvas ref={canvasRef} style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }} />
      <span
        className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-2 border-white shadow pointer-events-none"
        style={{ left: `${50 + Math.cos(angle) * s * 50}%`, top: `${50 + Math.sin(angle) * s * 50}%`, background: css(colour) }}
      />
    </div>
  );
}

export default function LightsPanel() {
  const { t } = useTranslation();
  const [hub] = useState(() => new LightHub());
  const view = useSyncExternalStore(hub.subscribe, hub.getSnapshot);
  const [tab, setTab] = useState<"colour" | "effects">("colour");
  const [notice, setNotice] = useState<{ isError: boolean; text: string } | null>(null);
  const [isPairing, setIsPairing] = useState(false);
  const [demoCount, setDemoCount] = useState(DEMO_COUNTS[0]);
  const [customColours, setCustomColours] = useState<(string | null)[]>(loadCustomColours);
  const canBluetooth = isBluetoothSupported();
  const { control } = view;

  useEffect(() => () => hub.dispose(), [hub]);

  const addLight = async () => {
    setNotice({ isError: false, text: t("admin.lt.pairing") });
    setIsPairing(true);
    try {
      const paired = await pairBluetoothLight();
      if (!paired) { setNotice(null); return; }
      hub.addLight(paired.info, paired.link);
      setNotice({ isError: false, text: t("admin.lt.paired", { name: paired.info.name }) });
    } catch (error) {
      const text = error instanceof UnsupportedLightError
        ? `${t("admin.lt.unsupported", { name: error.deviceName || "?" })}${error.knownServices.length ? ` (${error.knownServices.join(", ")})` : ""}`
        : t("admin.lt.pairFailed", { error: error instanceof Error ? error.message : String(error) });
      setNotice({ isError: true, text });
    } finally {
      setIsPairing(false);
    }
  };

  const addDemoLights = () => {
    const existing = view.lights.filter((light) => light.id.startsWith("demo-")).length;
    for (let i = 1; i <= demoCount; i++) {
      const demo = createDemoLight(existing + i);
      hub.addLight(demo.info, demo.link);
    }
    setNotice(null);
  };

  const saveCustom = (slot: number, value: string | null) => {
    const next = customColours.map((existing, i) => (i === slot ? value : existing));
    setCustomColours(next);
    try { localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(next)); } catch { /* private mode: the colours last for this visit only */ }
  };

  const isTarget = (target: Target) => JSON.stringify(view.target) === JSON.stringify(target);
  const selectedCount = view.lights.filter((light) => light.isSelected).length;
  const isLimited = !!control.effect && view.targetCount > view.animatedCount;

  return (
    <div className="space-y-4">
      <div className={card}>
        <h3 className="font-bold mb-1 flex items-center gap-2"><Bluetooth className="w-4 h-4 text-cyan-300" /> {t("admin.lt.title")}</h3>
        <p className="text-[11px] text-white/50 mb-3">{t("admin.lt.intro", { n: MAX_LIVE_LIGHTS })}</p>
        {!canBluetooth && <p className="text-xs text-amber-200 mb-3">{t("admin.lt.notSupported")}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={addLight} disabled={!canBluetooth || isPairing} className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg font-bold text-black text-sm bg-amber-400 disabled:opacity-40"><Plus className="w-4 h-4" /> {t("admin.lt.addLight")}</button>
          <select aria-label={t("admin.lt.demoCount")} value={demoCount} onChange={(event) => setDemoCount(Number(event.target.value))} className={field + " min-h-[44px]"}>
            {DEMO_COUNTS.map((count) => <option key={count} value={count}>{count}</option>)}
          </select>
          <button type="button" onClick={addDemoLights} className={chip(false)}>{t("admin.lt.addDemo", { n: demoCount })}</button>
        </div>
        {notice && <p role="status" className={`mt-3 text-xs ${notice.isError ? "text-red-300" : "text-white/70"}`}>{notice.text}</p>}
      </div>

      {view.lights.length === 0 ? (
        <p className="text-sm text-white/50 text-center py-6">{t("admin.lt.noLights")}</p>
      ) : (
        <>
          <div className={card}>
            <p className="text-xs text-white/60 mb-2">{t("admin.lt.target")}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => hub.setTarget({ kind: "all" })} className={chip(isTarget({ kind: "all" }))}>{t("admin.lt.all", { n: view.lights.length })}</button>
              {view.groups.map((group) => (
                <button key={group} type="button" onClick={() => hub.setTarget({ kind: "group", group })} className={chip(isTarget({ kind: "group", group }))}>{group}</button>
              ))}
              <button type="button" onClick={() => hub.setTarget({ kind: "selected" })} className={chip(isTarget({ kind: "selected" }))}>{t("admin.lt.selected", { n: selectedCount })}</button>
            </div>
            <p className="text-[11px] text-white/50 mt-2">{t("admin.lt.targetNote", { n: view.targetCount })}</p>
            {view.progress && (
              <div className="mt-2" role="status">
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-cyan-400 transition-all" style={{ width: `${(view.progress.done / view.progress.total) * 100}%` }} /></div>
                <p className="text-[11px] text-cyan-200 mt-1">{t("admin.lt.sending", { done: view.progress.done, total: view.progress.total })}</p>
              </div>
            )}
          </div>

          <div className={card}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-2">
                <button type="button" onClick={() => setTab("colour")} className={chip(tab === "colour")}>{t("admin.lt.colour")}</button>
                <button type="button" onClick={() => setTab("effects")} className={chip(tab === "effects")}>{t("admin.lt.effects")}</button>
              </div>
              <button type="button" onClick={() => hub.setPower(!control.isOn)} aria-label={t("admin.lt.power")} aria-pressed={control.isOn}
                className={`w-11 h-11 p-0 rounded-full border-2 flex items-center justify-center ${control.isOn ? "border-cyan-300 text-cyan-300" : "border-white/30 text-white/40"}`}><Power className="w-5 h-5" /></button>
            </div>

            {tab === "colour" ? (
              <div className="space-y-4">
                <ColourWheel colour={control.colour} onChange={(rgb) => hub.setColour(rgb)} label={t("admin.lt.wheel")} />
                <div className="flex gap-2">
                  {(["r", "g", "b"] as const).map((channel) => (
                    <label key={channel} className="flex-1 min-w-0 text-xs text-white/60 uppercase">{channel}
                      <input type="number" min={0} max={255} inputMode="numeric" value={control.colour[channel]}
                        onChange={(event) => hub.setColour({ ...control.colour, [channel]: clampChannel(Number(event.target.value)) })} className={field + " w-full mt-1 normal-case"} />
                    </label>
                  ))}
                </div>
                <label className="block text-xs text-white/60">{t("admin.lt.brightness", { n: control.brightness })}
                  <input type="range" min={0} max={100} value={control.brightness} onChange={(event) => hub.setBrightness(Number(event.target.value))} className="w-full mt-1 accent-amber-400" />
                </label>
                <div>
                  <p className="text-xs text-white/60 mb-2">{t("admin.lt.presets")}</p>
                  <div className="grid grid-cols-6 gap-2">
                    {PRESETS.map((preset) => <button key={toHex(preset)} type="button" aria-label={toHex(preset)} onClick={() => hub.setColour(preset)} className="h-11 rounded-lg border border-white/20" style={{ background: css(preset) }} />)}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-white/60 mb-2">{t("admin.lt.custom")}</p>
                  <div className="grid grid-cols-6 gap-2">
                    {customColours.map((saved, slot) => saved ? (
                      <div key={slot} className="relative">
                        <button type="button" aria-label={saved} onClick={() => hub.setColour(fromHex(saved))} className="w-full h-11 rounded-lg border border-white/20" style={{ background: saved }} />
                        <button type="button" aria-label={t("admin.lt.clearColour")} onClick={() => saveCustom(slot, null)} className="absolute -top-1.5 -right-1.5 w-5 h-5 min-h-0 p-0 rounded-full bg-black/80 border border-white/40 text-[10px] leading-none text-white">×</button>
                      </div>
                    ) : (
                      <button key={slot} type="button" aria-label={t("admin.lt.saveColour")} onClick={() => saveCustom(slot, toHex(control.colour))} className="h-11 p-0 rounded-lg border border-dashed border-white/30 text-white/60 flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="block text-xs text-white/60">{t("admin.lt.speed", { n: control.speed })}
                  <input type="range" min={1} max={100} value={control.speed} onChange={(event) => hub.setSpeed(Number(event.target.value))} className="w-full mt-1 accent-amber-400" />
                </label>
                <div className="flex flex-wrap gap-2">
                  {APP_EFFECTS.map((effect) => <button key={effect} type="button" onClick={() => hub.startEffect(effect)} className={chip(control.effect === effect)}>{t("admin.lt.fx." + effect)}</button>)}
                  {control.effect && <button type="button" onClick={() => hub.setColour(control.colour)} className={chip(false)}>{t("admin.lt.fxStop")}</button>}
                </div>
                {control.effect === "strobe" && <p className="text-[11px] text-amber-200">{t("admin.lt.flashWarning")}</p>}
                {isLimited && <p className="text-[11px] text-amber-200">{t("admin.lt.fxLimited", { moved: view.animatedCount, total: view.targetCount })}</p>}
                <div>
                  <p className="text-xs text-white/60">{t("admin.lt.builtIn")}</p>
                  <p className="text-[11px] text-white/40 mb-2">{t("admin.lt.builtInNote")}</p>
                  <div className="grid grid-cols-7 gap-1.5">
                    {Array.from({ length: view.builtInLimit }, (_, i) => i + 1).map((index) => (
                      <button key={index} type="button" aria-label={t("admin.lt.play", { n: index })} onClick={() => hub.playBuiltIn(index)} className={chip(control.builtIn === index) + " px-0"}>{index}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={card + " space-y-2"}>
            <datalist id="light-groups">{view.groups.map((group) => <option key={group} value={group} />)}</datalist>
            {view.lights.map((light) => (
              <div key={light.id} className="flex items-center gap-2">
                <input type="checkbox" checked={light.isSelected} onChange={() => hub.toggleSelected(light.id)} aria-label={t("admin.lt.tick", { name: light.name })} className="w-5 h-5 accent-amber-400 shrink-0" />
                <Dot shown={light.shown} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{light.name}</p>
                  <p className={`text-[11px] truncate ${light.failure ? "text-red-300" : "text-white/40"}`}>{light.failure || (light.isLive ? t("admin.lt.live") : t("admin.lt.idle"))}</p>
                </div>
                <input list="light-groups" value={light.group} onChange={(event) => hub.setGroup(light.id, event.target.value)} placeholder={t("admin.lt.groupPh")} aria-label={t("admin.lt.group")} className={field + " w-28"} />
                <button type="button" onClick={() => hub.removeLight(light.id)} aria-label={t("admin.lt.remove")} className="w-9 h-9 p-0 flex items-center justify-center shrink-0 text-white/50 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
