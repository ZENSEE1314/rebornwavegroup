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

// ── Doluruu (pet care) + gift sounds ──
// A slide from one pitch to another (chirps, boings, "nom").
function glide(f0: number, f1: number, dur: number, type: OscillatorType = "sine", vol = 0.2, delay = 0) {
  const c = ac(); if (!c || muted) return;
  const o = c.createOscillator(); const g = c.createGain(); const t = c.currentTime + delay;
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  o.connect(g); g.connect(c.destination);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t); o.stop(t + dur + 0.03);
}
// Filtered noise burst (scrubbing, whooshes, crowds).
function band(dur: number, freq: number, vol = 0.15, delay = 0, q = 1.5) {
  const c = ac(); if (!c || muted) return;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate); const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / d.length);
  const src = c.createBufferSource(); const f = c.createBiquadFilter(); const g = c.createGain();
  src.buffer = buf; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(c.destination); src.start(c.currentTime + delay);
}
// A cute baby-dino roar: a wobbly chirp that rises then falls.
function dinoRoar(delay = 0) {
  glide(320, 620, 0.16, "sawtooth", 0.12, delay); glide(620, 260, 0.32, "sawtooth", 0.12, delay + 0.15);
  glide(640, 1240, 0.16, "sine", 0.06, delay); band(0.4, 900, 0.06, delay, 0.8);
}
// Cartoon voice line: the phone's speech voice, pitched up, in the app's language.
const VOICE_LANG: Record<string, string> = { en: "en-US", zh: "zh-CN", id: "id-ID" };
function say(text: string, lang: string, pitch = 1.9, rate = 1.05) {
  if (muted) return;
  try {
    const synth = window.speechSynthesis; if (!synth) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = VOICE_LANG[lang] || "en-US"; u.pitch = pitch; u.rate = rate; u.volume = 1;
    const v = synth.getVoices().find((x) => x.lang.toLowerCase().startsWith(u.lang.slice(0, 2).toLowerCase()));
    if (v) u.voice = v;
    synth.cancel(); synth.speak(u);
  } catch {}
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
  // Pet care
  lightSwitch() { tone(1800, 0.02, "square", 0.14); tone(900, 0.03, "square", 0.1, 0.03); }, // click-clack
  yummy() { // nom nom nom + happy "mmm!"
    [0, 0.17, 0.34].forEach((d) => { glide(300, 180, 0.09, "square", 0.12, d); band(0.06, 1800, 0.08, d + 0.02); });
    glide(520, 780, 0.22, "triangle", 0.16, 0.56); glide(780, 660, 0.18, "triangle", 0.12, 0.78);
  },
  scrub() { // bath: scrubbing brush + popping bubbles
    for (let i = 0; i < 8; i++) band(0.09, 2600 + (i % 2) * 900, 0.14, i * 0.1, 2);
    for (let i = 0; i < 6; i++) glide(900 + Math.random() * 700, 1800 + Math.random() * 800, 0.06, "sine", 0.1, 0.25 + i * 0.13);
  },
  playFun() { // boing! + giggle
    glide(180, 720, 0.25, "triangle", 0.18); glide(720, 300, 0.2, "triangle", 0.12, 0.24);
    [880, 990, 880, 1100, 990].forEach((f, i) => tone(f, 0.07, "square", 0.08, 0.5 + i * 0.08));
  },
  sweetDreams(text: string, lang: string) { // music-box lullaby + yawn, then "sweet dreams"
    glide(560, 220, 0.6, "sawtooth", 0.07); // yawn
    [72, 76, 79, 76, 74, 72, 67, 72].forEach((m, i) => tone(440 * Math.pow(2, (m - 69) / 12), 0.42, "sine", 0.12, 0.55 + i * 0.3));
    setTimeout(() => say(text, lang, 1.7, 0.85), 700);
  },
  wakeUp() { [523, 659, 784].forEach((f, i) => tone(f, 0.12, "triangle", 0.16, i * 0.08)); dinoRoar(0.3); },
  poke() { glide(500, 900, 0.1, "sine", 0.14); },
  welcome(text: string, lang: string) { dinoRoar(); setTimeout(() => say(text, lang), 600); },
  // Gifts: each kind has its own sound
  gift(kind: string) {
    switch (kind) {
      case "car": // engine rev + zoom past + horn
        glide(60, 240, 0.9, "sawtooth", 0.14); glide(240, 90, 0.5, "sawtooth", 0.12, 0.9); band(0.8, 700, 0.1, 0.6, 0.7);
        tone(440, 0.18, "square", 0.12, 1.45); tone(554, 0.18, "square", 0.1, 1.45); break;
      case "fireworks": // launch whistles + bangs + crackle
        for (let i = 0; i < 3; i++) { glide(600, 2200, 0.45, "sine", 0.08, i * 0.5); band(0.45, 200, 0.4, i * 0.5 + 0.45, 0.6); for (let k = 0; k < 6; k++) band(0.03, 4000, 0.12, i * 0.5 + 0.6 + k * 0.05, 3); }
        break;
      case "crown": // royal fanfare
        [[523, 0], [523, 0.12], [659, 0.24], [784, 0.42], [1046, 0.62]].forEach(([f, d]) => { tone(f, 0.3, "sawtooth", 0.1, d); tone(f * 2, 0.3, "triangle", 0.05, d); });
        break;
      case "diamonds": // sparkling chimes
        for (let i = 0; i < 10; i++) tone(1800 + Math.random() * 1600, 0.35, "sine", 0.08, i * 0.08);
        break;
      case "rose": case "flower": // soft harp
        [60, 64, 67, 72, 76].forEach((m, i) => tone(440 * Math.pow(2, (m - 69) / 12), 0.6, "triangle", 0.12, i * 0.09)); break;
      case "heart": // heartbeat + chime
        [0, 0.18, 0.7, 0.88].forEach((d) => tone(70, 0.14, "sine", 0.4, d)); tone(1320, 0.5, "sine", 0.1, 1.2); break;
      case "drink": // pour + clink + fizz
        band(0.6, 600, 0.14, 0, 0.8); tone(2600, 0.25, "sine", 0.12, 0.65); tone(3300, 0.2, "sine", 0.08, 0.67); for (let i = 0; i < 8; i++) band(0.03, 5000, 0.06, 0.9 + i * 0.05, 3); break;
      case "cake": // party horn + "yay"
        glide(300, 520, 0.35, "sawtooth", 0.12); [784, 988, 1175].forEach((f, i) => tone(f, 0.18, "triangle", 0.14, 0.4 + i * 0.1)); break;
      case "teddy": case "pet": // squeaky toy
        glide(900, 1400, 0.12, "square", 0.1); glide(1400, 900, 0.12, "square", 0.08, 0.14); break;
      case "rocket": case "plane": // lift off
        band(1.2, 300, 0.25, 0, 0.5); glide(200, 1600, 1.2, "sawtooth", 0.08); break;
      case "money": // cash register
        tone(2200, 0.06, "square", 0.1); tone(2900, 0.3, "sine", 0.14, 0.08); for (let i = 0; i < 5; i++) tone(1300 + i * 120, 0.05, "triangle", 0.1, 0.4 + i * 0.05); break;
      default: // magic sparkle
        [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.18, "triangle", 0.16, i * 0.07)); tone(2093, 0.4, "sine", 0.08, 0.3);
    }
  },
  setMuted(m: boolean) { muted = m; try { localStorage.setItem("rw_sfx_off", m ? "1" : "0"); } catch {} if (!m) ac(); },
  isMuted() { return muted; },
};
