// The lights the admin has added, which of them are in the current selection, and the colour / effect being sent to them.
// A phone can only hold about six Bluetooth connections at once, so the hub keeps at most MAX_LIVE_LIGHTS open (least recently
// used closed first) and walks through the rest in turn: a colour reaches every selected light, just not at the same instant.
import { renderEffect, scaleRgb, type AppEffect } from "./effects";
import { PROFILES, type ProfileId, type Rgb } from "./protocols";

export const MAX_LIVE_LIGHTS = 6;
const FRAME_MS = 130;
const DEFAULT_BRIGHTNESS = 50;
const DEFAULT_SPEED = 50;
const FALLBACK_BUILT_IN_COUNT = 20;

/** One physical light's connection. The Bluetooth and demo versions both implement this. */
export interface LightLink {
  connect(): Promise<void>;
  write(frames: number[][]): Promise<void>;
  disconnect(): void;
  isLive(): boolean;
}

export interface LightInfo { id: string; name: string; profileId: ProfileId }

export type LightShown = { kind: "colour"; rgb: Rgb } | { kind: "off" } | { kind: "builtin"; index: number } | null;

export interface LightView {
  id: string;
  name: string;
  group: string;
  profileId: ProfileId;
  isSelected: boolean;
  isLive: boolean;
  failure: string;
  shown: LightShown;
}

export type Target = { kind: "all" } | { kind: "group"; group: string } | { kind: "selected" };

export interface Control {
  isOn: boolean;
  colour: Rgb;
  brightness: number;
  speed: number;
  effect: AppEffect | null;
  builtIn: number | null;
}

export interface HubView {
  lights: LightView[];
  groups: string[];
  target: Target;
  targetCount: number;
  control: Control;
  progress: { done: number; total: number } | null;
  /** How many lights the running app effect is actually moving (capped by the live-connection limit). */
  animatedCount: number;
  /** Highest built-in effect number every targeted light has. */
  builtInLimit: number;
}

interface Entry {
  info: LightInfo;
  link: LightLink;
  group: string;
  isSelected: boolean;
  failure: string;
  shown: LightShown;
  lastSent: string;
}

interface Send { frames: number[][]; shown: LightShown }

const describe = (error: unknown) => (error instanceof Error ? error.message : String(error));

export class LightHub {
  private readonly entries = new Map<string, Entry>();
  private liveOrder: string[] = [];
  private target: Target = { kind: "all" };
  private control: Control = { isOn: true, colour: { r: 255, g: 255, b: 255 }, brightness: DEFAULT_BRIGHTNESS, speed: DEFAULT_SPEED, effect: null, builtIn: null };
  private progress: { done: number; total: number } | null = null;
  private animatedIds: string[] = [];
  private needsPowerOn = false;
  private readonly listeners = new Set<() => void>();
  private view: HubView;
  private batchToken = 0;
  private connectQueue: Promise<unknown> = Promise.resolve();
  private effectTimer: ReturnType<typeof setInterval> | null = null;
  private effectStart = 0;
  private isFrameRunning = false;
  private isFlushing = false;
  private isDirty = false;

  constructor(private readonly now: () => number = () => performance.now()) {
    this.view = this.build();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  getSnapshot = () => this.view;

  dispose() {
    this.stopEffect();
    this.batchToken++;
    this.listeners.clear();
    this.entries.forEach((entry) => entry.link.disconnect());
  }

  // ---- lights ----

  /** Adds a light; returns false when it was already in the list. */
  addLight(info: LightInfo, link: LightLink): boolean {
    if (this.entries.has(info.id)) return false;
    this.entries.set(info.id, { info, link, group: "", isSelected: false, failure: "", shown: null, lastSent: "" });
    if (link.isLive()) this.touch(info.id);
    this.emit();
    return true;
  }

  removeLight(id: string) {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.link.disconnect();
    this.entries.delete(id);
    this.liveOrder = this.liveOrder.filter((liveId) => liveId !== id);
    this.emit();
  }

  setGroup(id: string, group: string) {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.group = group.trim();
    this.emit();
  }

  toggleSelected(id: string) {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.isSelected = !entry.isSelected;
    this.emit();
  }

  setTarget(target: Target) {
    this.target = target;
    this.emit();
  }

  // ---- controls ----

  async setPower(isOn: boolean) {
    this.stopEffect();
    this.control = { ...this.control, isOn, builtIn: null };
    this.needsPowerOn = !isOn;
    this.emit();
    await this.sendBatch(this.targetIds(), (entry) => ({
      frames: [PROFILES[entry.info.profileId].power(isOn)],
      shown: isOn ? this.shownColour() : { kind: "off" },
    }));
    if (isOn) this.needsPowerOn = false;
  }

  setColour(colour: Rgb): Promise<void> {
    this.stopEffect();
    this.control = { ...this.control, colour, isOn: true, builtIn: null };
    this.emit();
    return this.flushColour();
  }

  setBrightness(brightness: number): Promise<void> {
    this.control = { ...this.control, brightness };
    this.emit();
    // A running app effect picks the new brightness up on its next frame; a light's own built-in effect cannot be dimmed.
    return this.control.effect || this.control.builtIn !== null ? Promise.resolve() : this.flushColour();
  }

  setSpeed(speed: number) {
    this.control = { ...this.control, speed };
    this.emit();
  }

  startEffect(effect: AppEffect) {
    this.stopEffect();
    this.control = { ...this.control, effect, isOn: true, builtIn: null };
    this.effectStart = this.now();
    this.effectTimer = setInterval(() => this.runFrame(), FRAME_MS);
    this.emit();
    this.runFrame();
  }

  async playBuiltIn(index: number) {
    this.stopEffect();
    this.control = { ...this.control, builtIn: index, isOn: true };
    this.emit();
    await this.sendBatch(this.targetIds(), (entry) => ({
      frames: PROFILES[entry.info.profileId].builtIn(index, this.control.speed),
      shown: { kind: "builtin", index },
    }));
  }

  /** Draws one frame of the running app effect at `time` seconds. Public so tests can step time themselves. */
  async renderFrame(time: number) {
    const effect = this.control.effect;
    if (!effect) return;
    const ids = this.targetIds();
    const isLive = (id: string) => !!this.entries.get(id)?.link.isLive();
    // Lights that are already connected go first: a phone can only animate about six at once.
    const animated = [...ids.filter(isLive), ...ids.filter((id) => !isLive(id))].slice(0, MAX_LIVE_LIGHTS);
    this.animatedIds = animated;
    await Promise.all(animated.map((id, index) => {
      const entry = this.entries.get(id)!;
      const rgb = scaleRgb(
        renderEffect(effect, { time, index, count: animated.length, base: this.control.colour, speed: this.control.speed }),
        this.control.brightness / 100,
      );
      const key = `${rgb.r},${rgb.g},${rgb.b}`;
      if (entry.lastSent === key && entry.link.isLive()) return undefined;
      return this.writeOne(id, { frames: [PROFILES[entry.info.profileId].colour(rgb)], shown: { kind: "colour", rgb } }, key);
    }));
    this.emit();
  }

  // ---- sending ----

  private runFrame() {
    if (this.isFrameRunning) return; // the previous frame is still on its way: skip rather than pile up
    this.isFrameRunning = true;
    this.renderFrame((this.now() - this.effectStart) / 1000).finally(() => { this.isFrameRunning = false; });
  }

  private stopEffect() {
    if (this.effectTimer) clearInterval(this.effectTimer);
    this.effectTimer = null;
    this.animatedIds = [];
    this.control = { ...this.control, effect: null };
  }

  // Colour changes arrive many times a second while the wheel is dragged: send one batch at a time, then the latest value.
  private async flushColour() {
    if (this.isFlushing) { this.isDirty = true; return; }
    this.isFlushing = true;
    try {
      do {
        this.isDirty = false;
        const rgb = scaleRgb(this.control.colour, this.control.brightness / 100);
        const withPower = this.needsPowerOn;
        await this.sendBatch(this.targetIds(), (entry) => {
          const profile = PROFILES[entry.info.profileId];
          return { frames: withPower ? [profile.power(true), profile.colour(rgb)] : [profile.colour(rgb)], shown: { kind: "colour", rgb } };
        });
        this.needsPowerOn = false;
      } while (this.isDirty);
    } finally {
      this.isFlushing = false;
    }
  }

  private async sendBatch(ids: string[], build: (entry: Entry) => Send) {
    const token = ++this.batchToken;
    const live = ids.filter((id) => this.entries.get(id)?.link.isLive());
    const cold = ids.filter((id) => !live.includes(id));
    this.progress = ids.length ? { done: 0, total: ids.length } : null;
    this.emit();
    const done = () => {
      if (!this.progress || token !== this.batchToken) return;
      this.progress = { ...this.progress, done: this.progress.done + 1 };
      this.emit();
    };
    await Promise.all(live.map(async (id) => { await this.writeOne(id, build(this.entries.get(id)!)); done(); }));
    for (const id of cold) {
      if (token !== this.batchToken) break; // a newer command replaced this one
      const entry = this.entries.get(id);
      if (entry) await this.writeOne(id, build(entry));
      done();
    }
    if (token === this.batchToken) { this.progress = null; this.emit(); }
  }

  private async writeOne(id: string, send: Send, tracked = "") {
    const entry = this.entries.get(id);
    if (!entry) return;
    try {
      await this.ensureLive(entry);
      await entry.link.write(send.frames);
      entry.failure = "";
      entry.shown = send.shown;
      entry.lastSent = tracked;
    } catch (error) {
      entry.failure = describe(error);
      entry.lastSent = "";
      this.liveOrder = this.liveOrder.filter((liveId) => liveId !== id);
      entry.link.disconnect();
    }
  }

  private async ensureLive(entry: Entry) {
    if (!entry.link.isLive()) {
      await this.serialise(async () => {
        if (entry.link.isLive()) return;
        this.makeRoomFor(entry.info.id);
        await entry.link.connect();
      });
    }
    this.touch(entry.info.id);
  }

  // Phones struggle when several connections open at once, so connecting is strictly one at a time.
  private serialise<T>(job: () => Promise<T>): Promise<T> {
    const run = this.connectQueue.then(() => job());
    this.connectQueue = run.catch(() => undefined);
    return run;
  }

  private makeRoomFor(id: string) {
    this.liveOrder = this.liveOrder.filter((liveId) => liveId !== id && this.entries.get(liveId)?.link.isLive());
    while (this.liveOrder.length >= MAX_LIVE_LIGHTS) {
      const oldest = this.liveOrder.shift()!;
      this.entries.get(oldest)?.link.disconnect();
    }
  }

  private touch(id: string) {
    this.liveOrder = [...this.liveOrder.filter((liveId) => liveId !== id), id];
  }

  // ---- view ----

  private targetIds(): string[] {
    const all = Array.from(this.entries.values());
    const { target } = this;
    const picked = target.kind === "all" ? all
      : target.kind === "group" ? all.filter((entry) => entry.group === target.group)
      : all.filter((entry) => entry.isSelected);
    return picked.map((entry) => entry.info.id);
  }

  private shownColour(): LightShown {
    return { kind: "colour", rgb: scaleRgb(this.control.colour, this.control.brightness / 100) };
  }

  private emit() {
    this.view = this.build();
    this.listeners.forEach((listener) => listener());
  }

  private build(): HubView {
    const entries = Array.from(this.entries.values());
    const targeted = this.targetIds().map((id) => this.entries.get(id)!);
    return {
      lights: entries.map((entry) => ({
        id: entry.info.id, name: entry.info.name, group: entry.group, profileId: entry.info.profileId,
        isSelected: entry.isSelected, isLive: entry.link.isLive(), failure: entry.failure, shown: entry.shown,
      })),
      groups: Array.from(new Set(entries.map((entry) => entry.group).filter(Boolean))).sort(),
      target: this.target,
      targetCount: targeted.length,
      control: this.control,
      progress: this.progress,
      animatedCount: this.control.effect ? this.animatedIds.length : 0,
      builtInLimit: targeted.length ? Math.min(...targeted.map((entry) => PROFILES[entry.info.profileId].builtInCount)) : FALLBACK_BUILT_IN_COUNT,
    };
  }
}
