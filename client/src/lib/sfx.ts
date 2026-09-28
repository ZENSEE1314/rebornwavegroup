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

// Red Light, Green Light: the doll's chant ("mu-gung-hwa kkot-chi pi-eot-seum-ni-da",
// a traditional Korean children's rhyme) played as a music-box melody that is
// stretched to fit exactly the green-light time. If the venue uploads its own
// track to /rlgl-bgm.mp3 it is used instead, sped up/slowed to fit.
const CHANT: [number, number][] = [ // [MIDI note, beats]
  [76, 1], [76, 1], [79, 1.5], [76, 1], [76, 1], [74, 1], [76, 1], [79, 1], [81, 1], [79, 2],
];
let bgmOk: boolean | null = null;
function checkBgm() { if (bgmOk !== null) return; bgmOk = false; fetch("/rlgl-bgm.mp3", { method: "HEAD" }).then((r) => { bgmOk = r.ok && (r.headers.get("content-type") || "").includes("audio"); }).catch(() => {}); }
function playChant(seconds: number): () => void {
  checkBgm();
  if (muted || seconds <= 0.4) return () => {};
  if (bgmOk) {
    const a = new Audio("/rlgl-bgm.mp3"); let stopped = false;
    a.onloadedmetadata = () => { if (stopped) return; a.playbackRate = Math.max(0.5, Math.min(2.5, (a.duration || seconds) / seconds)); a.play().catch(() => {}); };
    a.load();
    return () => { stopped = true; try { a.pause(); } catch {} };
  }
  const c = ac(); if (!c) return () => {};
  const bus = c.createGain(); bus.gain.value = 0.9; bus.connect(c.destination);
  const beats = CHANT.reduce((n, [, b]) => n + b, 0);
  const beat = (seconds * 0.94) / beats; // finish just before the doll turns
  let t = c.currentTime + 0.03;
  for (const [midi, b] of CHANT) {
    const f = 440 * Math.pow(2, (midi - 69) / 12), d = Math.max(0.12, b * beat * 0.92);
    for (const [mul, type, vol] of [[1, "triangle", 0.22], [2, "sine", 0.06]] as const) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = f * mul; o.connect(g); g.connect(bus);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.start(t); o.stop(t + d + 0.05);
    }
    t += b * beat;
  }
  return () => { try { bus.gain.cancelScheduledValues(c.currentTime); bus.gain.setValueAtTime(0, c.currentTime); bus.disconnect(); } catch {} };
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
  dollChant(seconds: number) { return playChant(seconds); },
  dollTurn() { noise(0.35, 0.18); tone(220, 0.35, "sawtooth", 0.14, 0.05); tone(1400, 0.08, "square", 0.12, 0.42); tone(1400, 0.08, "square", 0.12, 0.56); },
  eliminated() { noise(0.25, 0.35); tone(90, 0.4, "sawtooth", 0.3, 0.02); },
  setMuted(m: boolean) { muted = m; try { localStorage.setItem("rw_sfx_off", m ? "1" : "0"); } catch {} if (!m) ac(); },
  isMuted() { return muted; },
};
