import { useEffect, useState } from "react";

const BEEP_HZ = [988, 1319]; // two high notes in a row: cuts through a noisy venue better than one low beep
const BEEP_SECONDS = 0.35;
const BEEP_LOUDNESS = 1; // the loudest the speaker allows
const FLASH_CLASS = "rw-alarm-flash";
const FLASH_MS = 700;
const READY_CHECK_MS = 1000;

let audio: AudioContext | null = null;

function audioContext(): AudioContext | null {
  try {
    audio = audio ?? new (window.AudioContext || (window as any).webkitAudioContext)();
    return audio;
  } catch { return null; }
}

// A browser only lets a page make sound (and, on Android, vibrate) after the person has touched it once; this is called from that first touch.
export function unlockAlarm() {
  void audioContext()?.resume();
  try { navigator.vibrate?.(1); } catch { /* this phone cannot vibrate */ }
}

export const canVibrate = () => typeof navigator !== "undefined" && "vibrate" in navigator;

const isAlarmReady = () => audio?.state === "running";

function beep() {
  const context = audioContext();
  if (!context) return;
  void context.resume();
  BEEP_HZ.forEach((hz, index) => {
    const start = context.currentTime + index * BEEP_SECONDS;
    const tone = context.createOscillator();
    const volume = context.createGain();
    tone.type = "square";
    tone.frequency.value = hz;
    volume.gain.setValueAtTime(BEEP_LOUDNESS, start);
    volume.gain.exponentialRampToValueAtTime(0.001, start + BEEP_SECONDS);
    tone.connect(volume).connect(context.destination);
    tone.start(start);
    tone.stop(start + BEEP_SECONDS);
  });
}

// The screen edge flashes with every ring: a phone that cannot vibrate (iPhone) or is on silent still shows it.
function flash() {
  const root = document.documentElement;
  root.classList.remove(FLASH_CLASS);
  void root.offsetWidth;
  root.classList.add(FLASH_CLASS);
  setTimeout(() => root.classList.remove(FLASH_CLASS), FLASH_MS);
}

export function ringAlarm(vibration: number[]) {
  try { navigator.vibrate?.(vibration); } catch { /* this phone cannot vibrate */ }
  beep();
  flash();
}

export function stopAlarm() {
  try { navigator.vibrate?.(0); } catch { /* this phone cannot vibrate */ }
}

// True once the page has been touched, so sound and vibration are allowed; any touch or key unlocks it.
export function useAlarmReady(isEnabled: boolean): boolean {
  const [isReady, setIsReady] = useState(isAlarmReady());
  useEffect(() => {
    if (!isEnabled || isReady) return;
    const unlock = () => { unlockAlarm(); setIsReady(isAlarmReady()); };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    const timer = setInterval(() => setIsReady(isAlarmReady()), READY_CHECK_MS);
    return () => { window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); clearInterval(timer); };
  }, [isEnabled, isReady]);
  return isReady;
}
