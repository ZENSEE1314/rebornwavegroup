// The lights the admin has added, which of them are in the current selection, and the colour / effect being sent to them.
// A Bluetooth adapter can only hold a handful of connections at once (about 6 on a phone, more on some computers), so the
// hub keeps at most `maxLive` open (least recently used closed first) and walks through the rest in turns: a colour reaches
// every selected light, just not at the same instant.
import { renderEffect, scaleRgb, type AppEffect } from "./effects";
import { PROFILES, stylesSharingConnection, type ProfileId, type Rgb } from "./protocols";

export const DEFAULT_MAX_LIVE = 6;
const MIN_MAX_LIVE = 2;
const MAX_MAX_LIVE = 20;
const FRAME_MS = 130;
const TEST_STEP_MS = 700;
const DEFAULT_BRIGHTNESS = 50;
const DEFAULT_SPEED = 50;
const DEFAULT_SENSITIVITY = 60;
const FALLBACK_BUILT_IN_COUNT = 20;
const TEST_COLOURS: Rgb[] = [{ r: 255, g: 0, b: 0 }, { r: 0, g: 255, b: 0 }, { r: 0, g: 0, b: 255 }];

/** One physical light's connection. The Bluetooth and demo versions both implement this. */
export interface LightLink {
  connect(): Promise<void>;
  write(frames: number[][]): Promise<void>;
  disconnect(): void;
  isLive(): boolean;
}

export interface LightInfo { id: string; name: string; profileId: ProfileId }

export type LightShown = { kind: "colour"; rgb: Rgb } | { kind: "off" } | { kind: "builtin"; index: number } | { kind: "music"; index: number } | null;

export interface LightView {
  id: string;
  name: string;
  group: string;
  profileId: ProfileId;
  /** Command styles this light can be switched between. */
  styles: { id: ProfileId; label: string }[];
  isSelected: boolean;
  isLive: boolean;
  failure: string;
  shown: LightShown;
  /** The light did not get the colour / effect that is on now (a command failed, or an older one is still showing). */
  isMissed: boolean;
}

export type Target = { kind: "all" } | { kind: "group"; group: string } | { kind: "selected" };

export interface Control {
  isOn: boolean;
  colour: Rgb;
  brightness: number;
  speed: number;
  effect: AppEffect | null;
  builtIn: number | null;
  music: number | null;
  sensitivity: number;
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
  /** Targeted lights with a microphone / music mode, and the highest music mode they all have (0 = none). */
  musicCount: number;
  musicLimit: number;
  maxLive: number;
  /** The light currently flashing its test colours, or "". */
  testingId: string;
  /** Lights that did not get what is on now. */
  missedCount: number;
}

interface Entry {
  info: LightInfo;
  link: LightLink;
  group: string;
  isSelected: boolean;
  failure: string;
  shown: LightShown;
  lastSent: string;
  /** The light was told to follow music and has not been told to stop yet. */
  isListening: boolean;
}

interface Send { frames: number[][]; shown: LightShown }

export interface HubOptions {
  now?: () => number;
  pause?: (ms: number) => Promise<void>;
  maxLive?: number;
}

const describe = (error: unknown) => (error instanceof Error ? error.message : String(error));
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(value)));

export class LightHub {
  private readonly entries = new Map<string, Entry>();
  private liveOrder: string[] = [];
  private target: Target = { kind: "all" };
  private control: Control = {
    isOn: true, colour: { r: 255, g: 255, b: 255 }, brightness: DEFAULT_BRIGHTNESS, speed: DEFAULT_SPEED,
    effect: null, builtIn: null, music: null, sensitivity: DEFAULT_SENSITIVITY,
  };
  private progress: { done: number; total: number } | null = null;
  private animatedIds: string[] = [];
  private testingId = "";
  private needsPowerOn = false;
  private maxLive: number;
  private readonly now: () => number;
  private readonly pause: (ms: number) => Promise<void>;
  private readonly listeners = new Set<() => void>();
  private view: HubView;
  private batchToken = 0;
  private connectQueue: Promise<unknown> = Promise.resolve();
  private effectTimer: ReturnType<typeof setInterval> | null = null;
  private effectStart = 0;
  private isFrameRunning = false;
  private isFlushing = false;
  private pendingJob: (() => Promise<void>) | null = null;

  constructor(options: HubOptions = {}) {
    this.now = options.now ?? (() => performance.now());
    this.pause = options.pause ?? ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
    this.maxLive = clamp(options.maxLive ?? DEFAULT_MAX_LIVE, MIN_MAX_LIVE, MAX_MAX_LIVE);
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
    this.entries.set(info.id, { info, link, group: "", isSelected: false, failure: "", shown: null, lastSent: "", isListening: false });
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

  /** The name the admin gave a light (saved on the phone with the light). */
  rename(id: string, name: string) {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.info = { ...entry.info, name: name.slice(0, 40) };
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

  /** Switches a light to another command style, as long as it speaks on the same Bluetooth characteristic. */
  setStyle(id: string, profileId: ProfileId) {
    const entry = this.entries.get(id);
    const next = PROFILES[profileId];
    if (!entry || !next || !stylesSharingConnection(PROFILES[entry.info.profileId]).includes(next)) return;
    entry.info = { ...entry.info, profileId };
    entry.lastSent = "";
    this.emit();
  }

  /** How many Bluetooth connections to hold open at once. Raise it if the adapter copes (some computers do). */
  setMaxLive(count: number) {
    this.maxLive = clamp(count, MIN_MAX_LIVE, MAX_MAX_LIVE);
    while (this.liveOrder.length > this.maxLive) this.entries.get(this.liveOrder.shift()!)?.link.disconnect();
    this.emit();
  }

  /** Flashes red, green and blue on one light so the admin can see whether its command style is the right one. */
  async testLight(id: string) {
    const entry = this.entries.get(id);
    if (!entry) return;
    this.stopEffect();
    this.testingId = id;
    this.emit();
    try {
      for (let i = 0; i < TEST_COLOURS.length; i++) {
        const profile = PROFILES[entry.info.profileId];
        const colour = TEST_COLOURS[i];
        const frames = this.leaveMusic(entry, i === 0 ? [profile.power(true), profile.colour(colour)] : [profile.colour(colour)]);
        await this.writeOne(id, { frames, shown: { kind: "colour", rgb: colour } });
        await this.pause(TEST_STEP_MS);
      }
      const profile = PROFILES[entry.info.profileId];
      await this.writeOne(id, { frames: [profile.colour(this.scaledColour())], shown: this.shownColour() });
    } finally {
      this.testingId = "";
      this.emit();
    }
  }

  // ---- controls ----

  async setPower(isOn: boolean) {
    this.stopEffect();
    this.control = { ...this.control, isOn, builtIn: null, music: null };
    this.needsPowerOn = !isOn;
    this.emit();
    await this.sendBatch(this.targetIds(), (entry) => ({
      frames: this.leaveMusic(entry, [PROFILES[entry.info.profileId].power(isOn)]),
      shown: isOn ? this.shownColour() : { kind: "off" },
    }));
    if (isOn) this.needsPowerOn = false;
  }

  setColour(colour: Rgb): Promise<void> {
    this.stopEffect();
    this.control = { ...this.control, colour, isOn: true, builtIn: null, music: null };
    this.emit();
    return this.flush(() => this.sendColourNow());
  }

  setBrightness(brightness: number): Promise<void> {
    this.control = { ...this.control, brightness };
    this.emit();
    // A running app effect picks the new brightness up on its next frame; a light's own built-in or music effect cannot be dimmed.
    const isFixed = this.control.effect || this.control.builtIn !== null || this.control.music !== null;
    return isFixed ? Promise.resolve() : this.flush(() => this.sendColourNow());
  }

  setSpeed(speed: number) {
    this.control = { ...this.control, speed };
    this.emit();
  }

  startEffect(effect: AppEffect) {
    this.stopEffect();
    this.control = { ...this.control, effect, isOn: true, builtIn: null, music: null };
    this.effectStart = this.now();
    this.effectTimer = setInterval(() => this.runFrame(), FRAME_MS);
    this.emit();
    this.runFrame();
  }

  async playBuiltIn(index: number) {
    this.stopEffect();
    this.control = { ...this.control, builtIn: index, isOn: true, music: null };
    this.emit();
    await this.sendBatch(this.targetIds(), (entry) => ({
      frames: this.leaveMusic(entry, PROFILES[entry.info.profileId].builtIn(index, this.control.speed)),
      shown: { kind: "builtin", index },
    }));
  }

  /** Turns on the lights' own microphone mode: they follow the music on their own, with no phone connection needed afterwards. */
  async playMusic(index: number) {
    this.stopEffect();
    this.control = { ...this.control, music: index, builtIn: null, isOn: true };
    this.emit();
    const ids = this.targetIds().filter((id) => !!PROFILES[this.entries.get(id)!.info.profileId].music);
    await this.sendBatch(ids, (entry) => {
      const music = PROFILES[entry.info.profileId].music!;
      entry.isListening = true;
      return { frames: [music.enable(true), music.mode(index), music.sensitivity(this.control.sensitivity)], shown: { kind: "music", index } };
    });
  }

  stopMusic(): Promise<void> {
    this.control = { ...this.control, music: null };
    this.emit();
    return this.flush(() => this.sendColourNow());
  }

  setSensitivity(sensitivity: number): Promise<void> {
    this.control = { ...this.control, sensitivity };
    this.emit();
    return this.control.music === null ? Promise.resolve() : this.flush(() => this.sendSensitivityNow());
  }

  /** Sends what is on now again to the lights that missed it (out of range, dropped, or still showing an older colour). */
  async resendMissed() {
    const ids = Array.from(this.entries.values()).filter((entry) => this.isMissed(entry)).map((entry) => entry.info.id);
    if (!ids.length) return;
    const { control } = this;
    await this.sendBatch(ids, (entry) => {
      const profile = PROFILES[entry.info.profileId];
      if (!control.isOn) return { frames: this.leaveMusic(entry, [profile.power(false)]), shown: { kind: "off" } };
      if (control.builtIn !== null) return { frames: this.leaveMusic(entry, profile.builtIn(control.builtIn, control.speed)), shown: { kind: "builtin", index: control.builtIn } };
      return { frames: this.leaveMusic(entry, [profile.power(true), profile.colour(this.scaledColour())]), shown: this.shownColour() };
    });
  }

  // What every light should be showing now; running effects and music are not checked (they move all the time).
  private wantedShown(): LightShown | undefined {
    const { control } = this;
    if (control.effect || control.music !== null) return undefined;
    if (!control.isOn) return { kind: "off" };
    if (control.builtIn !== null) return { kind: "builtin", index: control.builtIn };
    return this.shownColour();
  }

  private isMissed(entry: Entry): boolean {
    if (entry.failure) return true;
    const want = this.wantedShown();
    const shown = entry.shown;
    if (!want || !shown) return false;
    if (shown.kind !== want.kind) return true;
    if (shown.kind === "colour" && want.kind === "colour") return shown.rgb.r !== want.rgb.r || shown.rgb.g !== want.rgb.g || shown.rgb.b !== want.rgb.b;
    if (shown.kind === "builtin" && want.kind === "builtin") return shown.index !== want.index;
    return false;
  }

  /** Draws one frame of the running app effect at `time` seconds. Public so tests can step time themselves. */
  async renderFrame(time: number) {
    const effect = this.control.effect;
    if (!effect) return;
    const ids = this.targetIds();
    const isLive = (id: string) => !!this.entries.get(id)?.link.isLive();
    // Lights that are already connected go first: only a handful can be animated at once.
    const animated = [...ids.filter(isLive), ...ids.filter((id) => !isLive(id))].slice(0, this.maxLive);
    this.animatedIds = animated;
    await Promise.all(animated.map((id, index) => {
      const entry = this.entries.get(id)!;
      const rgb = scaleRgb(
        renderEffect(effect, { time, index, count: animated.length, base: this.control.colour, speed: this.control.speed }),
        this.control.brightness / 100,
      );
      const key = `${rgb.r},${rgb.g},${rgb.b}`;
      if (entry.lastSent === key && entry.link.isLive() && !entry.isListening) return undefined;
      return this.writeOne(id, { frames: this.leaveMusic(entry, [PROFILES[entry.info.profileId].colour(rgb)]), shown: { kind: "colour", rgb } }, key);
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

  // Values arrive many times a second while a slider or the wheel is dragged: send one batch at a time, then only the latest.
  private async flush(job: () => Promise<void>) {
    this.pendingJob = job;
    if (this.isFlushing) return;
    this.isFlushing = true;
    try {
      while (this.pendingJob) {
        const run = this.pendingJob;
        this.pendingJob = null;
        await run();
      }
    } finally {
      this.isFlushing = false;
    }
  }

  private async sendColourNow() {
    const rgb = this.scaledColour();
    const withPower = this.needsPowerOn;
    await this.sendBatch(this.targetIds(), (entry) => {
      const profile = PROFILES[entry.info.profileId];
      return { frames: this.leaveMusic(entry, withPower ? [profile.power(true), profile.colour(rgb)] : [profile.colour(rgb)]), shown: { kind: "colour", rgb } };
    });
    this.needsPowerOn = false;
  }

  private async sendSensitivityNow() {
    const ids = this.targetIds().filter((id) => !!PROFILES[this.entries.get(id)!.info.profileId].music);
    await this.sendBatch(ids, (entry) => ({
      frames: [PROFILES[entry.info.profileId].music!.sensitivity(this.control.sensitivity)],
      shown: entry.shown,
    }));
  }

  // A light that was following music has to be told to stop before it will show a colour or effect again.
  private leaveMusic(entry: Entry, frames: number[][]): number[][] {
    const music = PROFILES[entry.info.profileId].music;
    if (!entry.isListening || !music) return frames;
    entry.isListening = false;
    return [music.enable(false), ...frames];
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
    while (this.liveOrder.length >= this.maxLive) {
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

  private scaledColour(): Rgb {
    return scaleRgb(this.control.colour, this.control.brightness / 100);
  }

  private shownColour(): LightShown {
    return { kind: "colour", rgb: this.scaledColour() };
  }

  private emit() {
    this.view = this.build();
    this.listeners.forEach((listener) => listener());
  }

  private build(): HubView {
    const entries = Array.from(this.entries.values());
    const targeted = this.targetIds().map((id) => this.entries.get(id)!);
    const musical = targeted.filter((entry) => PROFILES[entry.info.profileId].music);
    return {
      lights: entries.map((entry) => ({
        id: entry.info.id, name: entry.info.name, group: entry.group, profileId: entry.info.profileId,
        styles: stylesSharingConnection(PROFILES[entry.info.profileId]).map(({ id: styleId, label }) => ({ id: styleId, label })),
        isSelected: entry.isSelected, isLive: entry.link.isLive(), failure: entry.failure, shown: entry.shown, isMissed: this.isMissed(entry),
      })),
      groups: Array.from(new Set(entries.map((entry) => entry.group).filter(Boolean))).sort(),
      target: this.target,
      targetCount: targeted.length,
      control: this.control,
      progress: this.progress,
      animatedCount: this.control.effect ? this.animatedIds.length : 0,
      builtInLimit: targeted.length ? Math.min(...targeted.map((entry) => PROFILES[entry.info.profileId].builtInCount)) : FALLBACK_BUILT_IN_COUNT,
      musicCount: musical.length,
      musicLimit: musical.length ? Math.min(...musical.map((entry) => PROFILES[entry.info.profileId].music!.modeCount)) : 0,
      maxLive: this.maxLive,
      testingId: this.testingId,
      missedCount: entries.filter((entry) => this.isMissed(entry)).length,
    };
  }
}
