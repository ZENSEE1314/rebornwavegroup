// Movement the app itself drives, frame by frame: each effect says what colour light number `index` should show at `time`.
import type { Rgb } from "./protocols";

export const APP_EFFECTS = ["rainbow", "breathe", "strobe", "chase", "twinkle"] as const;
export type AppEffect = (typeof APP_EFFECTS)[number];

export interface EffectFrame {
  /** Seconds since the effect started. */
  time: number;
  /** This light's place among the animated lights, 0-based. */
  index: number;
  count: number;
  base: Rgb;
  /** 1-100. */
  speed: number;
}

const DEGREES = 360;
const MIN_RATE = 0.2;
const RATE_RANGE = 2.8;
// Fast flashing can trigger seizures in people sensitive to it; the common guideline is to stay at or below 3 flashes a second.
const MIN_FLASHES_PER_SECOND = 0.5;
const MAX_FLASHES_PER_SECOND = 3;
const BREATHE_FLOOR = 0.08;
const CHASE_FLOOR = 0.04;
const CHASE_MIN_TAIL = 1.5;

const OFF: Rgb = { r: 0, g: 0, b: 0 };

export function scaleRgb({ r, g, b }: Rgb, factor: number): Rgb {
  const f = Math.max(0, Math.min(1, factor));
  return { r: Math.round(r * f), g: Math.round(g * f), b: Math.round(b * f) };
}

export function hsvToRgb(hue: number, saturation: number, value: number): Rgb {
  const h = ((hue % DEGREES) + DEGREES) % DEGREES / 60;
  const c = value * saturation;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = value - c;
  const [r, g, b] = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

export function rgbToHsv({ r, g, b }: Rgb): { h: number; s: number; v: number } {
  const [red, green, blue] = [r / 255, g / 255, b / 255];
  const max = Math.max(red, green, blue);
  const delta = max - Math.min(red, green, blue);
  let h = 0;
  if (delta > 0) {
    if (max === red) h = ((green - blue) / delta) % 6;
    else if (max === green) h = (blue - red) / delta + 2;
    else h = (red - green) / delta + 4;
    h *= 60;
    if (h < 0) h += DEGREES;
  }
  return { h, s: max === 0 ? 0 : delta / max, v: max };
}

const rateOf = (speed: number) => MIN_RATE + (Math.max(1, Math.min(100, speed)) / 100) * RATE_RANGE;

// A cheap integer hash: the same (light, moment) always gives the same sparkle, so no per-light state is needed.
function sparkle(index: number, slot: number): number {
  let h = Math.imul(index + 1, 374761393) ^ Math.imul(slot + 1, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export function renderEffect(effect: AppEffect, frame: EffectFrame): Rgb {
  const { time, index, count, base, speed } = frame;
  const rate = rateOf(speed);
  switch (effect) {
    case "rainbow":
      return hsvToRgb(time * rate * 60 + (index / Math.max(1, count)) * DEGREES, 1, 1);
    case "breathe": {
      const wave = 0.5 - 0.5 * Math.cos(2 * Math.PI * time * rate * 0.5);
      return scaleRgb(base, BREATHE_FLOOR + (1 - BREATHE_FLOOR) * wave);
    }
    case "strobe": {
      const flashes = MIN_FLASHES_PER_SECOND + (Math.max(1, Math.min(100, speed)) / 100) * (MAX_FLASHES_PER_SECOND - MIN_FLASHES_PER_SECOND);
      return Math.floor(time * flashes * 2) % 2 === 0 ? base : OFF;
    }
    case "chase": {
      const head = (time * rate * 2) % Math.max(1, count);
      const gap = Math.abs(index - head);
      const distance = Math.min(gap, count - gap);
      const tail = Math.max(CHASE_MIN_TAIL, count / 5);
      return scaleRgb(base, Math.max(CHASE_FLOOR, Math.pow(Math.max(0, 1 - distance / tail), 1.5)));
    }
    case "twinkle":
      return scaleRgb(base, Math.pow(sparkle(index, Math.floor(time * rate * 2)), 2));
  }
}
