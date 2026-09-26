// Lightweight synthesized sound effects (Web Audio API) — no audio files.
// Every sound is triggered by a user tap or an SSE update, so the audio
// context resumes fine under mobile autoplay rules.
let ctx: AudioContext | null = null;
let muted = false;
try { muted = localStorage.getItem("rw_sfx_off") === "1"; } catch {}

function ac(): AudioContext | null {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
  } catch { ctx = null; }
  return ctx;
}
function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.2, delay = 0) {
  const c = ac(); if (!c || muted) return;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.value = freq;
  const t = c.currentTime + delay;
  o.connect(g); g.connect(c.destination);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t); o.stop(t + dur + 0.03);
}
function noise(dur: number, vol = 0.15, delay = 0) {
  const c = ac(); if (!c || muted) return;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource(); const g = c.createGain();
  src.buffer = buf; g.gain.value = vol; src.connect(g); g.connect(c.destination);
  src.start(c.currentTime + delay);
}

export const sfx = {
  click() { tone(620, 0.06, "triangle", 0.16); },
  tap() { tone(280 + Math.random() * 220, 0.05, "square", 0.12); },
  coin() { tone(880, 0.05, "triangle", 0.14); tone(1320, 0.06, "triangle", 0.12, 0.03); },
  flip() { tone(520, 0.05, "triangle", 0.15); tone(720, 0.05, "triangle", 0.12, 0.04); },
  roll() { for (let i = 0; i < 6; i++) noise(0.05, 0.12, i * 0.06); },
  spin() { for (let i = 0; i < 16; i++) tone(500, 0.04, "square", 0.08, i * (0.08 + i * 0.012)); }, // decelerating ticks
  ding() { tone(880, 0.3, "sine", 0.25); tone(1320, 0.3, "sine", 0.14, 0.02); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, "triangle", 0.22, i * 0.09)); },
  lose() { [420, 330, 250].forEach((f, i) => tone(f, 0.28, "sawtooth", 0.2, i * 0.13)); },
  wolf() { tone(180, 0.45, "sawtooth", 0.26); tone(130, 0.55, "sawtooth", 0.2, 0.12); },
  laugh() { [660, 560, 660, 520, 620, 460].forEach((f, i) => tone(f, 0.1, "square", 0.16, i * 0.11)); },
  witch() { [520, 470, 540, 430, 500, 380, 300].forEach((f, i) => tone(f, 0.14, "sawtooth", 0.16, i * 0.12)); tone(160, 0.7, "sine", 0.12, 0.15); },
  rankUp() { [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.16, "triangle", 0.22, i * 0.08)); },
  rankDown() { [520, 400, 300].forEach((f, i) => tone(f, 0.22, "sawtooth", 0.2, i * 0.1)); },
  tick() { tone(1000, 0.03, "square", 0.1); },
  setMuted(m: boolean) { muted = m; try { localStorage.setItem("rw_sfx_off", m ? "1" : "0"); } catch {} if (!m) ac(); },
  isMuted() { return muted; },
};
