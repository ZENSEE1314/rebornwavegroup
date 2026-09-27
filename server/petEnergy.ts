// Pet energy regenerates on its own clock (pets.last_energy_update), separate
// from the hunger/joy/clean decay clock, so frequent background updates never
// swallow it. Awake and resting: +5 every hour. Sleeping: +5 every 10 minutes.
// Only feed/play/clean spend energy.
export const ENERGY_STEP = 5;
export const AWAKE_STEP_MIN = 60;
export const SLEEP_STEP_MIN = 10;

// Whole steps elapsed since `anchor` are added; the leftover time carries over.
export function accrueEnergy(energy: number, sleeping: boolean, anchor: Date | string | null | undefined, now = new Date()) {
  const e0 = Math.max(0, Math.min(100, Math.round(energy ?? 0)));
  if (!anchor || e0 >= 100) return { energy: e0, anchor: now }; // nothing to bank when full
  const from = new Date(anchor).getTime();
  const stepMs = (sleeping ? SLEEP_STEP_MIN : AWAKE_STEP_MIN) * 60_000;
  const steps = Math.floor(Math.max(0, now.getTime() - from) / stepMs);
  if (steps <= 0) return { energy: e0, anchor: new Date(from) };
  const e = Math.min(100, e0 + steps * ENERGY_STEP);
  return { energy: e, anchor: e >= 100 ? now : new Date(from + steps * stepMs) };
}
