// Red Light, Green Light: was a tap made while the light was RED? A tap is judged by when the player made it (the phone reports how long ago),
// not by when the message reached the server, so a slow connection never gets a player who stopped in time eliminated.
export const RL_GRACE_MS = 800; // time to see the red light and stop (the picture also reaches the phone a moment late)
export const RL_MAX_TAP_AGE_MS = 2000; // how old a tap the phone may report

export interface RedLightState { light: "green" | "red"; lightAt: number; lastRed?: { from: number; to: number }; startAt: number }

/** When the tap was made, from the time it arrived and how long ago the phone says it happened. */
export const tappedAtOf = (arrivedAt: number, agoMs: number) => arrivedAt - Math.min(RL_MAX_TAP_AGE_MS, Math.max(0, Number.isFinite(agoMs) ? agoMs : 0));

/** True when the tap was before the walk began, or on red after the grace (now, or in the red that has just ended). */
export function isTapOnRed(state: RedLightState, tappedAt: number): boolean {
  if (tappedAt < state.startAt) return true;
  if (state.light === "red") return tappedAt - state.lightAt > RL_GRACE_MS;
  return !!state.lastRed && tappedAt >= state.lastRed.from + RL_GRACE_MS && tappedAt < state.lastRed.to;
}
