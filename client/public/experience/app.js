// Reborn Wave — immersive scroll-driven 3D tower experience.
// One continuous WebGL world: arrival → lift portal → 1F KTV Lounge & game house →
// 2F Private KTV & beauty → 3F VIP (Gold members) → 4F Pet cafe → 5F Live rooftop →
// convergence + CTA.
// Scroll maps to a master timeline (smoothed, Lenis-style); each segment owns a
// Catmull-Rom camera path, and a gold "lift" flash hides the cut between floors.
import * as THREE from "three";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// ── Config ─────────────────────────────────────────────────────────────────
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const MOBILE = matchMedia("(max-width: 760px)").matches;
const PORTRAIT = () => innerWidth / innerHeight < 0.85;
const SMOOTHING = 5.5;          // higher = snappier scroll follow
const FLASH_HALF_WIDTH = 0.018; // portal flash window around each segment boundary
const BEAT_FADE = 0.014;        // overlay fade width in progress units

const HEX = { night0: 0x0a0714, night1: 0x120b20, night2: 0x1a1030, gold: 0xdcb45a, goldHi: 0xf0d787 };
const GOLD_CSS = ["#c9a84c", "#f0d787"];

// Segments of the master timeline. Floors are stacked far apart in Y so each
// world is isolated; the flash covers the camera cut between them.
const SEGS = [
  { id: "arrival", a: 0.00, b: 0.10, y: 0, fog: 0x0b0716, label: "" },
  { id: "ktv", a: 0.10, b: 0.21, y: 200, floor: 1, word: "LOUNGE", mirror: false, accent: 0xc04dff, accent2: 0xff4fa3, fog: 0x12071d, label: "1F" },
  { id: "private", a: 0.21, b: 0.31, y: 300, floor: 2, word: "PRIVATE", mirror: true, accent: 0x8a3dff, accent2: 0xdcb45a, fog: 0x0e0716, label: "2F" },
  { id: "vip", a: 0.31, b: 0.41, y: 400, floor: 3, word: "VIP", mirror: false, accent: 0xf0d787, accent2: 0xc98b3c, fog: 0x140e07, label: "3F" },
  { id: "pet", a: 0.41, b: 0.52, y: 500, floor: 4, word: "PET CAFE", mirror: true, accent: 0xffb35c, accent2: 0x2fae9e, fog: 0x130d0a, label: "4F" },
  { id: "live", a: 0.52, b: 0.62, y: 600, floor: 5, word: "LIVE", mirror: false, accent: 0xff5a5f, accent2: 0x4fc3ff, fog: 0x10050b, label: "5F" },
  { id: "blindbox", a: 0.62, b: 0.72, y: 700, accent: 0xff9db0, accent2: 0xc7b3ff, fog: 0x120a18, label: "BOX" },
  { id: "demo", a: 0.72, b: 0.80, y: 800, accent: 0x7a4dff, accent2: 0xdcb45a, fog: 0x0b0716, label: "DEMO" },
  { id: "location", a: 0.80, b: 0.90, y: 900, accent: 0x2fae9e, accent2: 0xdcb45a, fog: 0x08121a, label: "VISIT" },
  { id: "finale", a: 0.90, b: 1.00, y: 1100, fog: 0x0a0714, label: "★" },
];
const segById = (id) => SEGS.find((s) => s.id === id);

// Venue facts shown on the location stage (mirrors landing page + booking hours).
const VENUE = {
  name: "Reborn Wave",
  lines: ["Ruko Oceanic Bliss, Blok A No. 51", "Jl. Pasir Putih Harbourfront – Batam Centre", "Sadai, Bengkong, Batam 29444"],
  hours: ["Sun–Thu  5pm – 2am", "Fri–Sat  5pm – 3am"],
};

// ── Utils ──────────────────────────────────────────────────────────────────
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const rand = (a, b) => a + Math.random() * (b - a);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ── Renderer / scene ───────────────────────────────────────────────────────
const canvas = document.getElementById("gl");
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE, powerPreference: "high-performance" });
} catch (e) {
  document.body.classList.add("static");
  document.getElementById("loader").classList.add("done");
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.5 : 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(HEX.night0);
scene.fog = new THREE.Fog(HEX.night0, 28, 110);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(PORTRAIT() ? 62 : 45, innerWidth / innerHeight, 0.1, 400);
scene.add(new THREE.HemisphereLight(0x8c6cff, 0x1a0d05, 0.9));
const key = new THREE.DirectionalLight(0xfff0d0, 1.6);
scene.add(key, key.target);

// ── Materials ──────────────────────────────────────────────────────────────
const M = {
  gold: new THREE.MeshStandardMaterial({ color: 0xdcb45a, metalness: 1, roughness: 0.24, emissive: 0x2b1b00, emissiveIntensity: 0.45 }),
  goldSoft: new THREE.MeshStandardMaterial({ color: 0xc9a84c, metalness: 0.85, roughness: 0.42 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x1a1030, metalness: 0.92, roughness: 0.12 }),
  night: new THREE.MeshStandardMaterial({ color: 0x160d26, metalness: 0.5, roughness: 0.45 }),
  floor: new THREE.MeshStandardMaterial({ color: 0x0d0917, metalness: 0.75, roughness: 0.3 }),
  velvet: new THREE.MeshStandardMaterial({ color: 0x3a1455, metalness: 0.05, roughness: 0.95 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.06, flatShading: true }),
  lineGold: new THREE.LineBasicMaterial({ color: HEX.goldHi, transparent: true, opacity: 0.85 }),
};
function wordMaterial(accent) {
  const m = M.gold.clone();
  m.color.set(0xd9a640);
  m.roughness = 0.3;
  m.emissive = new THREE.Color(0x3a2400).lerp(new THREE.Color(accent), 0.15).multiplyScalar(0.6);
  m.emissiveIntensity = 1;
  return m;
}

// ── Loading ────────────────────────────────────────────────────────────────
const loaderEl = document.getElementById("loader");
const loadbar = document.getElementById("loadbar");
const manager = new THREE.LoadingManager();
manager.onProgress = (_u, loaded, total) => { loadbar.style.width = `${Math.round((loaded / total) * 100)}%`; };
const texLoader = new THREE.TextureLoader(manager);
const loadTex = (url) => { const t = texLoader.load(url); t.colorSpace = THREE.SRGBColorSpace; return t; };

let font;
const IMG = {};

async function loadAll() {
  const imgs = ["boy", "female"];
  const [f, ...tex] = await Promise.all([
    new FontLoader(manager).loadAsync("./vendor/fonts/helvetiker_bold.typeface.json"),
    ...imgs.map((n) => texLoader.loadAsync(`./img/doluruu-${n}.png`)),
    document.fonts ? document.fonts.load("800 64px Montserrat").catch(() => {}) : null,
    document.fonts ? document.fonts.load("800 64px Cinzel").catch(() => {}) : null,
  ]);
  font = f;
  imgs.forEach((n, i) => { tex[i].colorSpace = THREE.SRGBColorSpace; tex[i].anisotropy = 8; IMG[n] = tex[i]; });
  IMG.blindbox = loadTex("./img/blindbox.jpeg");
  for (const n of ["intro", "ktv", "sing", "vip", "live", "demo"]) IMG[`poster_${n}`] = loadTex(`./media/${n}.jpg`);
}

// Doluruu = the brand's own artwork, placed in the world as a camera-facing
// sprite (feet on the ground) with a soft contact shadow.
const billboards = [];
function makeDoluruu(imgKey, height) {
  const tex = IMG[imgKey];
  const aspect = tex.image ? tex.image.width / tex.image.height : 1;
  const grp = new THREE.Group();
  const geo = new THREE.PlaneGeometry(height * aspect, height); geo.translate(0, height / 2, 0);
  const sprite = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.04, toneMapped: false }));
  grp.add(sprite);
  const shadow = glowPlane(0x000000, height * aspect * 0.9, height * 0.28, 0.55);
  shadow.material.blending = THREE.NormalBlending; shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02;
  grp.add(shadow);
  grp.userData.sprite = sprite;
  billboards.push(sprite);
  return grp;
}

// Emoji drawn to a transparent canvas and stood up as a camera-facing sprite.
function emojiSprite(emoji, height) {
  const tex = canvasTexture(256, 256, (x, W, H) => {
    x.font = `${H * 0.8}px ${EMOJI_FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(emoji, W / 2, H * 0.54);
  });
  const geo = new THREE.PlaneGeometry(height, height); geo.translate(0, height / 2, 0);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.05, toneMapped: false }));
  billboards.push(mesh);
  return mesh;
}

// ── Builders ───────────────────────────────────────────────────────────────
const anims = [];     // { zone, fn(time, dt, localT) }
const screens = [];   // { mesh, name, zone, video }
const zones = [];     // THREE.Group per segment
const converge = [];  // finale convergence items

function word(text, size, mat, maxW = Infinity) {
  const g = new TextGeometry(text, { font, size, depth: size * 0.28, curveSegments: 8, bevelEnabled: true, bevelThickness: size * 0.045, bevelSize: size * 0.028, bevelSegments: 3 });
  g.computeBoundingBox();
  const bb = g.boundingBox;
  g.translate(-(bb.max.x + bb.min.x) / 2, -bb.min.y, -(bb.max.z + bb.min.z) / 2);
  const mesh = new THREE.Mesh(g, mat);
  const w = bb.max.x - bb.min.x;
  if (w > maxW) mesh.scale.setScalar(maxW / w);
  return mesh;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function goldGrad(ctx, x0, x1) { const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, GOLD_CSS[0]); g.addColorStop(0.55, GOLD_CSS[1]); g.addColorStop(1, GOLD_CSS[0]); return g; }
const EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';

function canvasTexture(wPx, hPx, draw) {
  const c = document.createElement("canvas");
  c.width = Math.min(2048, Math.round(wPx)); c.height = Math.min(2048, Math.round(hPx));
  draw(c.getContext("2d"), c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

// Flat card (plane) with an optional gold frame and additive glow behind.
function card(w, h, draw, { frame = true, glow = null, pxPerUnit = 220 } = {}) {
  const grp = new THREE.Group();
  const tex = canvasTexture(w * pxPerUnit, h * pxPerUnit, draw);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
  grp.add(face);
  if (frame) {
    const fr = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.1, h + 0.1), new THREE.MeshBasicMaterial({ color: HEX.gold, toneMapped: false }));
    fr.position.z = -0.012; grp.add(fr);
  }
  if (glow != null) { const gl = glowPlane(glow, w * 1.9, h * 1.9, 0.55); gl.position.z = -0.06; grp.add(gl); }
  grp.userData.face = face;
  return grp;
}

let GLOW_TEX;
function glowPlane(color, w, h, opacity = 0.6) {
  if (!GLOW_TEX) GLOW_TEX = canvasTexture(256, 256, (x, W, H) => {
    const g = x.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, "rgba(255,255,255,.35)"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
    map: GLOW_TEX, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
}

// Dark info panel: eyebrow + title + lines, gold border, optional big icon.
function drawPanel({ eyebrow = "", title = "", lines = [], icon = "", accent = "#f0d787" }) {
  return (x, W, H) => {
    const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "rgba(28,16,48,.96)"); bg.addColorStop(1, "rgba(12,8,22,.96)");
    rr(x, 4, 4, W - 8, H - 8, H * 0.08); x.fillStyle = bg; x.fill();
    x.lineWidth = Math.max(3, W * 0.006); x.strokeStyle = goldGrad(x, 0, W); x.stroke();
    let y = H * 0.18; const pad = W * 0.08;
    if (icon) { x.font = `${H * 0.22}px ${EMOJI_FONT}`; x.textBaseline = "top"; x.fillText(icon, pad, y - H * 0.06); y += H * 0.22; }
    x.textBaseline = "alphabetic";
    if (eyebrow) { x.fillStyle = accent; x.font = `600 ${H * 0.07}px Montserrat`; x.fillText(eyebrow.toUpperCase().split("").join(String.fromCharCode(8202)), pad, y + H * 0.06); y += H * 0.12; }
    if (title) { x.fillStyle = "#fbf6ea"; x.font = `800 ${H * 0.13}px Montserrat`; wrap(x, title, pad, y + H * 0.1, W - pad * 2, H * 0.14); y += H * 0.18 * Math.ceil(x.measureText(title).width / (W - pad * 2)); }
    x.fillStyle = "rgba(251,246,234,.74)"; x.font = `500 ${H * 0.065}px Montserrat`;
    for (const l of lines) { y += H * 0.1; x.fillText(l, pad, y + H * 0.06); }
  };
}
function wrap(x, text, px, py, maxW, lh) {
  const words = text.split(" "); let line = "", yy = py;
  for (const w of words) { const test = line ? line + " " + w : w; if (x.measureText(test).width > maxW && line) { x.fillText(line, px, yy); line = w; yy += lh; } else line = test; }
  x.fillText(line, px, yy);
}
function drawQuote(quote, sub) {
  return (x, W, H) => {
    rr(x, 4, 4, W - 8, H - 8, 24); x.fillStyle = "rgba(14,9,26,.94)"; x.fill();
    x.lineWidth = 4; x.strokeStyle = goldGrad(x, 0, W); x.stroke();
    x.fillStyle = goldGrad(x, 0, W); x.font = `800 ${H * 0.2}px Cinzel`; x.fillText("“", W * 0.07, H * 0.3);
    x.fillStyle = "#fbf6ea"; x.font = `800 ${H * 0.11}px Montserrat`; wrap(x, quote, W * 0.08, H * 0.45, W * 0.84, H * 0.13);
    x.fillStyle = "#f0d787"; x.font = `600 ${H * 0.055}px Montserrat`; x.fillText(sub, W * 0.08, H * 0.88);
  };
}
function drawIcon(icon, label) {
  return (x, W, H) => {
    rr(x, 4, 4, W - 8, H - 8, W * 0.18); x.fillStyle = "rgba(18,11,32,.92)"; x.fill();
    x.lineWidth = 5; x.strokeStyle = goldGrad(x, 0, W); x.stroke();
    x.textAlign = "center"; x.textBaseline = "middle";
    x.font = `${H * 0.42}px ${EMOJI_FONT}`; x.fillText(icon, W / 2, H * 0.42);
    x.fillStyle = "#f0d787"; x.font = `700 ${H * 0.12}px Montserrat`; x.fillText(label.toUpperCase(), W / 2, H * 0.8);
  };
}
function drawMemberCard(tier) {
  return (x, W, H) => {
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#f7e3a4"); g.addColorStop(0.45, "#c9a84c"); g.addColorStop(1, "#8a6a22");
    rr(x, 0, 0, W, H, H * 0.1); x.fillStyle = g; x.fill();
    x.fillStyle = "rgba(255,255,255,.18)"; x.beginPath(); x.ellipse(W * 0.8, H * 0.1, W * 0.5, H * 0.35, -0.4, 0, Math.PI * 2); x.fill();
    x.fillStyle = "#1a1030"; x.font = `800 ${H * 0.12}px Cinzel`; x.fillText("REBORN WAVE", W * 0.07, H * 0.2);
    rr(x, W * 0.07, H * 0.34, W * 0.13, H * 0.2, 8); x.fillStyle = "#e9d08a"; x.fill(); x.strokeStyle = "#8a6a22"; x.lineWidth = 3; x.stroke();
    x.fillStyle = "#1a1030"; x.font = `700 ${H * 0.085}px Montserrat`; x.fillText("•••• •••• •••• 2026", W * 0.07, H * 0.72);
    x.font = `800 ${H * 0.1}px Montserrat`; x.fillText(tier, W * 0.07, H * 0.9);
    x.textAlign = "right"; x.font = `600 ${H * 0.07}px Montserrat`; x.fillText("MEMBER", W * 0.93, H * 0.9);
  };
}

// Floating video screen that streams a venue clip (poster until playing).
function videoScreen(name, w, accent, zone) {
  const h = (w * 9) / 16;
  const grp = new THREE.Group();
  const v = document.createElement("video");
  Object.assign(v, { src: `./media/${name}.mp4`, muted: true, loop: true, playsInline: true, preload: "none", crossOrigin: "anonymous" });
  v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
  const vt = new THREE.VideoTexture(v); vt.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: IMG[`poster_${name}`], toneMapped: false });
  v.addEventListener("playing", () => { mat.map = vt; mat.needsUpdate = true; }, { once: true });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.16, h + 0.16), new THREE.MeshBasicMaterial({ color: HEX.gold, toneMapped: false }));
  frame.position.z = -0.015;
  const back = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, h + 0.3, 0.12), M.night);
  back.position.z = -0.09;
  const gl = glowPlane(accent, w * 1.8, h * 2.1, 0.5); gl.position.z = -0.2;
  grp.add(gl, back, frame, face);
  face.userData.screen = { name };
  screens.push({ mesh: face, name, zone, video: v });
  return grp;
}

let DOT_TEX;
function dotTexture() {
  return DOT_TEX ||= canvasTexture(64, 64, (x, W) => {
    const g = x.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.45, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, W, W);
  });
}

function dust(zone, color, count, box) {
  const n = MOBILE ? Math.round(count * 0.45) : count;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = rand(box[0], box[1]); pos[i * 3 + 1] = rand(box[2], box[3]); pos[i * 3 + 2] = rand(box[4], box[5]);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color, size: 0.16, map: dotTexture(), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  anims.push({ zone, fn: (t) => { if (!REDUCED) p.rotation.y = Math.sin(t * 0.05) * 0.08; } });
  return p;
}

function ground(Y, accent) {
  const grp = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.CircleGeometry(70, 72), M.floor);
  floor.rotation.x = -Math.PI / 2; floor.position.y = Y; grp.add(floor);
  for (const [r, o] of [[9, 0.5], [17, 0.32], [27, 0.2], [40, 0.12]]) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.06, 128), new THREE.MeshBasicMaterial({ color: HEX.goldHi, transparent: true, opacity: o, toneMapped: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(0, Y + 0.01, -18); grp.add(ring);
  }
  const pool = glowPlane(accent, 50, 50, 0.22); pool.rotation.x = -Math.PI / 2; pool.position.set(0, Y + 0.02, -20); grp.add(pool);
  return grp;
}

function accentLight(color, x, y, z, intensity = 90) {
  const l = new THREE.PointLight(color, intensity, 38, 1.6); l.position.set(x, y, z); return l;
}

// ── Zone: ARRIVAL ──────────────────────────────────────────────────────────
function buildArrival() {
  const Z = new THREE.Group(); const zi = zones.length; zones.push(Z); scene.add(Z);
  Z.add(ground(0, 0x6b3dff));

  // Tower monolith with gold edges, floor bands and labels
  const tower = new THREE.Group(); tower.position.set(0, 0, -14); Z.add(tower);
  const body = new THREE.Mesh(new THREE.BoxGeometry(7, 44, 7), M.glass); body.position.y = 22; tower.add(body);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), M.lineGold); edges.position.y = 22; tower.add(edges);
  const floorNames = ["KTV LOUNGE", "PRIVATE KTV", "VIP", "PET CAFE", "LIVE"];
  for (let i = 0; i < 5; i++) {
    const y = 8 + i * 7;
    const band = new THREE.Mesh(new THREE.BoxGeometry(7.12, 0.07, 7.12), M.gold); band.position.y = y; tower.add(band);
    const lab = card(3.6, 0.6, (x, W, H) => {
      const txt = `${i + 1}F  ·  ${floorNames[i]}`;
      let fs = H * 0.6;
      x.font = `800 ${fs}px Montserrat`;
      while (x.measureText(txt).width > W - 16) { fs *= 0.92; x.font = `800 ${fs}px Montserrat`; }
      x.fillStyle = goldGrad(x, 0, W); x.textBaseline = "middle";
      x.fillText(txt, 8, H / 2);
    }, { frame: false });
    lab.position.set(-1.4, y + 0.55, 3.52); tower.add(lab);
    const win = glowPlane(new THREE.Color(SEGS[i + 1].accent), 6, 5, 0.25); win.position.set(0, y + 3.2, 3.53); tower.add(win);
  }
  const crown = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.5, 7.4), M.gold); crown.position.y = 44.2; tower.add(crown);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(3.2, 30, 32, 1, true), new THREE.MeshBasicMaterial({ color: HEX.goldHi, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  beam.position.y = 59; beam.rotation.x = Math.PI; tower.add(beam);

  // Golden lift: glowing interior + sliding doors + frame
  const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 4.4), new THREE.MeshBasicMaterial({ color: 0xffe6a8, toneMapped: false }));
  doorGlow.position.set(0, 2.2, -10.48); Z.add(doorGlow);
  const spill = glowPlane(0xffd27a, 9, 7, 0.55); spill.position.set(0, 2.4, -10.4); Z.add(spill);
  const doorMat = new THREE.MeshStandardMaterial({ color: 0xd9b45c, metalness: 1, roughness: 0.32 });
  const doorL = new THREE.Mesh(new THREE.BoxGeometry(1.3, 4.4, 0.1), doorMat); doorL.position.set(-0.65, 2.2, -10.43); Z.add(doorL);
  const doorR = doorL.clone(); doorR.position.x = 0.65; Z.add(doorR);
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.9, 4.7, 0.2)), M.lineGold);
  frame.position.set(0, 2.35, -10.4); Z.add(frame);
  const itCard = card(2.6, 0.9, drawIcon("💻", "IT · the app"), { glow: 0x6b3dff, pxPerUnit: 200 });
  itCard.position.set(0, 5.4, -10.35); itCard.scale.set(0.9, 0.9, 0.9);
  // wide label instead of square icon card
  Z.add(itCard);

  // 5-in-1 pillars (IT is the lift itself — the app is the portal)
  const pillars = [["💄", "Beauty", -9.5, -2], ["🍸", "F&B", -6, -7.5], ["🎮", "Gaming", 6, -7.5], ["🎤", "KTV", 9.5, -2]];
  for (const [ic, lb, x, z] of pillars) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 4.2, 24), M.gold); p.position.set(x, 2.1, z); Z.add(p);
    const c = card(1.6, 1.6, drawIcon(ic, lb), { frame: false, glow: 0xdcb45a, pxPerUnit: 200 });
    c.position.set(x, 5.3, z); c.lookAt(0, 5.3, 24); Z.add(c);
    const base = glowPlane(0xdcb45a, 3, 3, 0.4); base.rotation.x = -Math.PI / 2; base.position.set(x, 0.03, z); Z.add(base);
    anims.push({ zone: zi, fn: (t) => { if (!REDUCED) c.position.y = 5.3 + Math.sin(t * 1.2 + x) * 0.12; } });
  }

  // Doluruu waits by the lift, then walks in
  const d = makeDoluruu("boy", 3.1); d.position.set(2.5, 0, -7.4); Z.add(d);
  anims.push({ zone: zi, fn: (t, dt, lt) => {
    const walk = smooth(clamp((lt - 0.55) / 0.35));
    d.position.x = lerp(2.5, 0.3, walk); d.position.z = lerp(-7.4, -9.9, walk);
    d.userData.sprite.position.y = REDUCED ? 0 : (walk > 0.02 && walk < 0.99 ? Math.abs(Math.sin(t * 9)) * 0.14 : Math.abs(Math.sin(t * 2.2)) * 0.05);
    d.visible = lt < 0.93;
    const open = smooth(clamp((lt - 0.42) / 0.3));
    doorL.position.x = -0.65 - open * 1.3; doorR.position.x = 0.65 + open * 1.3;
  } });

  Z.add(accentLight(0xffd27a, 0, 3, -6, 60), accentLight(0x7a4dff, -10, 6, 4, 70), accentLight(0xc04dff, 10, 6, 4, 70));
  Z.add(dust(zi, HEX.goldHi, 380, [-30, 30, 0.3, 20, -30, 30]));
}

// ── Zone: FLOOR (shared shell + per-floor dressing) ────────────────────────
function buildFloor(seg, dress) {
  const Z = new THREE.Group(); const zi = zones.length; zones.push(Z); scene.add(Z);
  const Y = seg.y, m = seg.mirror ? -1 : 1;
  Z.add(ground(Y, seg.accent));
  const w = word(seg.word, 4.3, wordMaterial(seg.accent), 14);
  w.position.set(0, Y + 1.1, 0);
  if (PORTRAIT()) w.scale.multiplyScalar(0.62);
  Z.add(w);
  const under = glowPlane(seg.accent, 22, 10, 0.35); under.position.set(0, Y + 3, -1.5); Z.add(under);
  anims.push({ zone: zi, fn: (t) => { if (!REDUCED) w.position.y = Y + 1.1 + Math.sin(t * 0.7) * 0.08; } });
  Z.add(accentLight(seg.accent, m * -7, Y + 5, -14), accentLight(seg.accent2, m * 7, Y + 5, -26), accentLight(seg.accent, 0, Y + 7, -42, 70));
  Z.add(dust(zi, seg.accent, 320, [-18, 18, Y + 0.4, Y + 14, -50, 14]));
  const ctx = { Z, zi, Y, m, seg, videoX: m * -8, clusterX: m * 8, videoRot: m * 0.67, clusterRot: m * -0.74 };
  dress(ctx);
  return Z;
}
const place = (obj, x, y, z, ry = 0) => { obj.position.set(x, y, z); obj.rotation.y = ry; return obj; };

function monolith(ctx, x, z, quote, sub, w = 4.6, h = 3) {
  const slab = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, h + 2.4, 0.5), M.night);
  place(slab, x, ctx.Y + (h + 2.4) / 2, z); ctx.Z.add(slab);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(slab.geometry), M.lineGold); edge.position.copy(slab.position); ctx.Z.add(edge);
  const c = card(w, h, drawQuote(quote, sub), { frame: false, glow: ctx.seg.accent });
  place(c, x, ctx.Y + (h + 2.4) / 2 + 0.3, z + 0.27); ctx.Z.add(c);
  return c;
}

// 1F — open KTV lounge + game house: KOS (earn K-GOLD), tokens, spin, blind box,
// arcade games, pool and darts. The whole party floor.
function dressKTV(ctx) {
  const { Z, zi, Y, seg } = ctx;
  Z.add(place(videoScreen("ktv", 6.4, seg.accent, zi), ctx.videoX, Y + 3.4, -17, ctx.videoRot));
  Z.add(place(videoScreen("sing", 5.4, seg.accent2, zi), ctx.clusterX, Y + 3.6, -27, ctx.clusterRot));
  const board = card(2.8, 3.4, drawPanel({ eyebrow: "Kings of Singers", title: "KOS board", lines: ["#1  🎤  Weekly champion", "#2  🎤  Runner-up", "#3  🎤  Rising star", "Sing live · earn K-GOLD"], accent: "#ff4fa3" }), { glow: seg.accent2 });
  Z.add(place(board, ctx.clusterX + 0.6, Y + 3.2, -22.5, ctx.clusterRot));
  // Disco ball
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 2), M.chrome); ball.position.set(0, Y + 10.5, -15); Z.add(ball);
  const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 6), M.goldSoft); wire.position.set(0, Y + 14.9, -15); Z.add(wire);
  const sparkle = glowPlane(0xffffff, 7, 7, 0.35); sparkle.position.set(0, Y + 10.5, -15.2); Z.add(sparkle);
  anims.push({ zone: zi, fn: (t) => { if (!REDUCED) { ball.rotation.y = t * 0.45; sparkle.material.opacity = 0.25 + Math.abs(Math.sin(t * 3)) * 0.2; } } });
  // Floating microphones
  for (let i = 0; i < 6; i++) {
    const mic = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.9, 16), M.night); handle.position.y = -0.45; mic.add(handle);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 16), M.goldSoft); mic.add(head);
    const side = i % 2 ? 1 : -1;
    mic.position.set(side * rand(3, 6.5), Y + rand(2.4, 6), -4 - i * 5); mic.rotation.z = side * -0.5;
    Z.add(mic);
    const ph = rand(0, 6);
    anims.push({ zone: zi, fn: (t) => { if (!REDUCED) { mic.rotation.y = t * 0.6 + ph; mic.position.y += Math.sin(t * 1.4 + ph) * 0.0025; } } });
  }
  // Game house arcade: the app's games, floating above the lounge video
  [["🧱", "Tower Stack"], ["🎲", "789 Dice"], ["🔢", "Guess the Number"], ["⏱️", "Stop at 1:00"]].forEach(([ic, name], i) => {
    const c = card(1.7, 1.7, drawIcon(ic, name), { frame: false, glow: seg.accent2, pxPerUnit: 200 });
    Z.add(place(c, ctx.videoX + (i - 1.5) * 1.9 * -ctx.m * 0.5, Y + 6.6 + (i % 2) * 0.5, -15 - i * 1.4, ctx.videoRot));
    anims.push({ zone: zi, fn: (t) => { if (!REDUCED) c.position.y = Y + 6.6 + (i % 2) * 0.5 + Math.sin(t * 1.3 + i) * 0.14; } });
  });
  // Pool table
  const pool = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.24, 2.7), M.goldSoft); rim.position.y = 0.95; pool.add(rim);
  const felt = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.1, 2.3), new THREE.MeshStandardMaterial({ color: 0x0f6b4a, roughness: 0.9 })); felt.position.y = 1.1; pool.add(felt);
  for (const [lx, lz] of [[-1.9, -1], [1.9, -1], [-1.9, 1], [1.9, 1]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.85, 12), M.night); leg.position.set(lx, 0.42, lz); pool.add(leg);
  }
  const ballCols = [0xffffff, 0xf2c230, 0x1f4fd1, 0xd6302b, 0x6a2c8f, 0xf07a1c, 0x1e8f4a, 0x111111];
  ballCols.forEach((c, i) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshStandardMaterial({ color: c, roughness: 0.2 }));
    b.position.set(i === 0 ? -1.2 : 0.6 + (i % 3) * 0.18, 1.24, i === 0 ? 0 : ((i % 4) - 1.5) * 0.19); pool.add(b);
  });
  const lamp = glowPlane(0xfff0c0, 4.4, 2.6, 0.35); lamp.rotation.x = -Math.PI / 2; lamp.position.y = 1.17; pool.add(lamp);
  Z.add(place(pool, ctx.videoX * 0.55, Y, -27, 0.2 * ctx.m));
  // Darts board
  const darts = card(2.2, 2.2, (x, W) => {
    const cx = W / 2, R = W * 0.47;
    x.fillStyle = "#111"; x.beginPath(); x.arc(cx, cx, R, 0, Math.PI * 2); x.fill();
    for (let s = 0; s < 20; s++) {
      const a0 = (s / 20) * Math.PI * 2 - Math.PI / 20, a1 = a0 + Math.PI / 10;
      for (const [r0, r1, even, odd] of [[0.15, 0.95, "#f3e6c4", "#1a1a1a"], [0.55, 0.62, "#d6302b", "#1e8f4a"], [0.88, 0.95, "#d6302b", "#1e8f4a"]]) {
        x.fillStyle = s % 2 ? odd : even; x.beginPath(); x.arc(cx, cx, R * r1, a0, a1); x.arc(cx, cx, R * r0, a1, a0, true); x.fill();
      }
    }
    x.fillStyle = "#1e8f4a"; x.beginPath(); x.arc(cx, cx, R * 0.1, 0, Math.PI * 2); x.fill();
    x.fillStyle = "#d6302b"; x.beginPath(); x.arc(cx, cx, R * 0.05, 0, Math.PI * 2); x.fill();
  }, { frame: false, glow: seg.accent2 });
  Z.add(place(darts, ctx.clusterX * 1.2, Y + 3, -33, ctx.clusterRot));
  const sign = card(4.4, 0.9, (x, W, H) => { x.fillStyle = goldGrad(x, 0, W); x.font = `800 ${H * 0.46}px Montserrat`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("GAME HOUSE · POOL · DARTS", W / 2, H / 2); }, { frame: false, glow: seg.accent });
  Z.add(place(sign, ctx.videoX * 0.55, Y + 4.2, -28, 0.2 * ctx.m));
  // Blind boxes live here too
  const eggGeo = new THREE.SphereGeometry(0.45, 24, 18); eggGeo.scale(1, 1.3, 1);
  const bandGeo = new THREE.TorusGeometry(0.46, 0.035, 8, 32);
  const eggCols = [0xff9db0, 0x7fe0d2, 0xffe08a, 0xc7b3ff, 0xffb27a];
  for (let i = 0; i < (MOBILE ? 5 : 9); i++) {
    const egg = new THREE.Group();
    egg.add(new THREE.Mesh(eggGeo, new THREE.MeshStandardMaterial({ color: eggCols[i % 5], roughness: 0.35, metalness: 0.1 })));
    const band = new THREE.Mesh(bandGeo, M.gold); band.rotation.x = Math.PI / 2; egg.add(band);
    const side = i % 2 ? 1 : -1;
    egg.position.set(side * rand(3, 6.5), Y + rand(1.5, 6.5), rand(-6, -38)); Z.add(egg);
    const ph = rand(0, 6);
    anims.push({ zone: zi, fn: (t) => { if (!REDUCED) { egg.rotation.y = t * 0.6 + ph; egg.position.y += Math.sin(t * 1.5 + ph) * 0.003; } } });
  }
  const box = card(2.2, 2.2, (x, W, H) => { x.fillStyle = "#1a1030"; x.fillRect(0, 0, W, H); }, { glow: seg.accent2 });
  const boxImg = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1), new THREE.MeshBasicMaterial({ map: IMG.blindbox, toneMapped: false }));
  boxImg.position.z = 0.02; box.add(boxImg);
  Z.add(place(box, ctx.clusterX * 0.8, Y + 1.6, -37, ctx.clusterRot));
  // Member economy: all earned and spent on 1F
  [["TOKENS", "Earn daily", -6.2], ["K-GOLD", "Win at KOS", 0], ["SPIN", "Win prizes", 6.2]].forEach(([wtxt, sub, x]) => {
    const ped = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.8, 1.6), M.night); ped.position.set(x, Y + 0.4, -47); Z.add(ped);
    const wd = word(wtxt, 1.15, wordMaterial(seg.accent), 4.2); wd.position.set(x, Y + 0.85, -47); Z.add(wd);
    const cap = card(3.6, 0.6, (c2, W, H) => { c2.fillStyle = "#f0d787"; c2.font = `700 ${H * 0.55}px Montserrat`; c2.textAlign = "center"; c2.textBaseline = "middle"; c2.fillText(sub.toUpperCase(), W / 2, H / 2); }, { frame: false });
    cap.position.set(x, Y + 0.4, -46.15); Z.add(cap);
  });
}

// A lit glass room pod whose front faces the floor's centre line.
function roomPod(ctx, eyebrow, title, x, z, glow) {
  const { Z, Y } = ctx;
  const pod = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.4, 3.2), M.glass); shell.position.y = 1.7; pod.add(shell);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(shell.geometry), M.lineGold); edges.position.y = 1.7; pod.add(edges);
  const hex = `#${new THREE.Color(glow).getHexString()}`;
  const front = card(3.4, 3.2, (x, W, H) => {
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, hex); g.addColorStop(0.55, "rgba(40,16,60,1)"); g.addColorStop(1, "#0d0917");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    rr(x, W * 0.22, H * 0.3, W * 0.56, H * 0.3, 10); x.fillStyle = "rgba(255,240,210,.9)"; x.fill(); // karaoke screen
    x.fillStyle = "#3a1455"; rr(x, W * 0.12, H * 0.74, W * 0.76, H * 0.16, 18); x.fill(); // sofa
    x.fillStyle = "#fbf6ea"; x.font = `800 ${H * 0.11}px Montserrat`; x.fillText(title, W * 0.08, H * 0.18);
    x.fillStyle = "#f0d787"; x.font = `600 ${H * 0.055}px Montserrat`; x.fillText(eyebrow.toUpperCase(), W * 0.08, H * 0.07 + H * 0.02);
  }, { glow });
  front.position.set(0, 1.7, 1.62); pod.add(front);
  place(pod, x, Y, z, -Math.sign(x) * Math.PI / 2);
  Z.add(pod);
  return pod;
}

// 2F — four private KTV rooms + beauty (facial & hair salon).
function dressPrivate(ctx) {
  const { Z, zi, Y, seg } = ctx;
  Z.add(place(videoScreen("intro", 6.6, seg.accent, zi), ctx.videoX, Y + 3.4, -17, ctx.videoRot));
  // Four rooms: two past the video, two on the near cluster side
  [[ctx.clusterX * 1.2, -9], [ctx.clusterX * 1.2, -16], [ctx.videoX * 1.2, -25], [ctx.videoX * 1.2, -32]]
    .forEach(([x, z], i) => roomPod(ctx, "Private KTV", `Room ${i + 1}`, x, z, i % 2 ? seg.accent : 0xc04dff));
  // Beauty corner (where the camera turns during the beauty beat): mirror + chair + cards
  const bx = ctx.clusterX, bRot = ctx.clusterRot;
  const mirror = card(2, 2.8, (x, W, H) => {
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#d9dbe6"); g.addColorStop(0.5, "#8d90a3"); g.addColorStop(1, "#c7c9d6");
    rr(x, 0, 0, W, H, W * 0.5); x.fillStyle = g; x.fill();
  }, { glow: 0xffd9ec });
  Z.add(place(mirror, bx * 1.2, Y + 2.6, -32, bRot));
  const chair = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.5, 20), M.gold); base.position.y = 0.25; chair.add(base);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 1.1), M.velvet); seat.position.y = 0.7; chair.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.3, 0.25), M.velvet); back.position.set(0, 1.4, -0.45); chair.add(back);
  Z.add(place(chair, bx * 0.95, Y, -31, bRot + Math.PI));
  [["💆", "Facial", "Skin treatments & facials"], ["💇", "Hair salon", "Cut, colour & styling"]].forEach(([ic, t, l], i) => {
    const c = card(2.6, 2.1, drawPanel({ eyebrow: "2F · Beauty", icon: ic, title: t, lines: [l], accent: "#ffb3d9" }), { glow: 0xff7ac0 });
    Z.add(place(c, bx + i * 0.6 * ctx.m, Y + 2.6 + i * 1.6, -24 - i * 1.8, bRot));
    anims.push({ zone: zi, fn: (t2) => { if (!REDUCED) c.position.y = Y + 2.6 + i * 1.6 + Math.sin(t2 + i) * 0.1; } });
  });
  // 5-IN-1 monument
  const mono = word("5-IN-1", 2.6, wordMaterial(seg.accent), 14); mono.position.set(0, Y + 1.2, -47); Z.add(mono);
  const cap = card(9, 1.1, (x, W, H) => { x.fillStyle = "#f0d787"; x.font = `700 ${H * 0.42}px Montserrat`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("BEAUTY  ·  F&B  ·  GAMING  ·  KTV  ·  IT", W / 2, H / 2); }, { frame: false });
  cap.position.set(0, Y + 0.6, -46.2); Z.add(cap);
}

// 3F — private VIP KTV rooms for Gold tier members, by invitation.
function dressVIP(ctx) {
  const { Z, zi, Y, seg } = ctx;
  Z.add(place(videoScreen("vip", 6.4, seg.accent, zi), ctx.videoX, Y + 3.4, -17, ctx.videoRot));
  const gold = card(3.6, 2.25, drawMemberCard("GOLD TIER"), { frame: false, glow: 0xf0d787 });
  Z.add(place(gold, ctx.clusterX, Y + 4.2, -19, ctx.clusterRot));
  anims.push({ zone: zi, fn: (t) => { if (!REDUCED) { gold.rotation.z = Math.sin(t * 0.8) * 0.05; gold.position.y = Y + 4.2 + Math.sin(t) * 0.12; } } });
  // Mirrored gold pillars
  for (const z of [-6, -16, -26, -36]) for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 9, 32), M.gold); p.position.set(s * 6.8, Y + 4.5, z); Z.add(p);
  }
  roomPod(ctx, "Gold members", "VIP Room", ctx.clusterX * 1.25, -27, 0xf0d787);
  roomPod(ctx, "Gold members", "VIP Room", ctx.clusterX * 1.25, -34, 0xc98b3c);
  [["GOLD", "Gold tier only", -6.2], ["PRIORITY", "VIP room booking", 0], ["INVITE", "Members only", 6.2]].forEach(([wtxt, sub, x]) => {
    const ped = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.8, 1.6), M.night); ped.position.set(x, Y + 0.4, -47); Z.add(ped);
    const wd = word(wtxt, 1.15, wordMaterial(seg.accent), 4.2); wd.position.set(x, Y + 0.85, -47); Z.add(wd);
    const cap = card(3.6, 0.6, (c2, W, H) => { c2.fillStyle = "#f0d787"; c2.font = `700 ${H * 0.55}px Montserrat`; c2.textAlign = "center"; c2.textBaseline = "middle"; c2.fillText(sub.toUpperCase(), W / 2, H / 2); }, { frame: false });
    cap.position.set(x, Y + 0.4, -46.15); Z.add(cap);
  });
  monolith(ctx, ctx.videoX * 0.62, -35, "Private VIP rooms. Gold members only.", "3F VIP · BY INVITATION", 4.2, 2.6);
}

// 4F — pet cafe & restaurant: our pets, food, kids and families.
function dressPet(ctx) {
  const { Z, zi, Y, seg } = ctx;
  // Meet the pets
  [["🐿️", "Sugar gliders"], ["🐱", "Cats"], ["🐍", "Snakes"], ["🐹", "Guinea pigs"]].forEach(([ic, name], i) => {
    const c = card(2, 2, drawIcon(ic, name), { frame: false, glow: seg.accent2, pxPerUnit: 200 });
    Z.add(place(c, ctx.clusterX + i * 0.5 * ctx.m, Y + 2.8 + (i % 2) * 0.9, -14 - i * 3.4, ctx.clusterRot));
    anims.push({ zone: zi, fn: (t) => { if (!REDUCED) c.position.y = Y + 2.8 + (i % 2) * 0.9 + Math.sin(t * 1.3 + i) * 0.12; } });
  });
  // Food, kids & family
  [["☕", "Cafe", "Coffee, tea & sweet treats"], ["🍽️", "Restaurant", "Proper meals made to share"], ["👨‍👩‍👧", "Kids & family", "Family tables, kid-friendly"]].forEach(([ic, t, l], i) => {
    const c = card(2.6, 2.1, drawPanel({ eyebrow: "4F · Pet cafe", icon: ic, title: t, lines: [l], accent: "#ffcf8a" }), { glow: seg.accent });
    Z.add(place(c, ctx.videoX + i * 0.5 * -ctx.m, Y + 2.8 + i * 1.3, -15 - i * 3.2, ctx.videoRot));
    anims.push({ zone: zi, fn: (t2) => { if (!REDUCED) c.position.y = Y + 2.8 + i * 1.3 + Math.sin(t2 + i) * 0.1; } });
  });
  // Cafe tables with chairs and cups
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.6 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xf3e6c4, roughness: 0.5 });
  const tables = [[-4.5, -9], [4.5, -12], [-6, -21], [5.5, -25], [-3.5, -33], [3.8, -38]];
  for (const [x, z] of tables) {
    const tb = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.08, 28), wood); top.position.y = 1; tb.add(top);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.3, 1, 12), M.goldSoft); leg.position.y = 0.5; tb.add(leg);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.6, 16), M.velvet); stool.position.set(Math.cos(a) * 1.4, 0.3, Math.sin(a) * 1.4); tb.add(stool);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.16, 12), cream); cup.position.set(Math.cos(a) * 0.5, 1.12, Math.sin(a) * 0.5); tb.add(cup);
    }
    const warm = glowPlane(seg.accent, 3.2, 3.2, 0.3); warm.rotation.x = -Math.PI / 2; warm.position.y = 0.03; tb.add(warm);
    Z.add(place(tb, x, Y, z));
  }
  // Kids' ball pit
  const pit = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.7, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0x2fae9e, roughness: 0.6, side: THREE.DoubleSide })); wall.position.y = 0.35; pit.add(wall);
  const nBalls = MOBILE ? 60 : 140;
  const balls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshStandardMaterial({ roughness: 0.4 }), nBalls);
  const bm = new THREE.Matrix4(); const bcols = [0xff5a5f, 0xffd23f, 0x4fc3ff, 0x7ee081, 0xff9db0].map((c) => new THREE.Color(c));
  for (let i = 0; i < nBalls; i++) { const r = Math.sqrt(Math.random()) * 2.2, a = rand(0, Math.PI * 2); bm.setPosition(Math.cos(a) * r, rand(0.15, 0.6), Math.sin(a) * r); balls.setMatrixAt(i, bm); balls.setColorAt(i, bcols[i % 5]); }
  pit.add(balls);
  Z.add(place(pit, ctx.clusterX * 0.9, Y, -41));
  // Pets roaming the cafe
  const cat = emojiSprite("🐈", 0.9); cat.position.set(-4.5, Y, -10.4); Z.add(cat);
  const pig = emojiSprite("🐹", 0.6); pig.position.set(4.5, Y, -13.3); Z.add(pig);
  const snake = emojiSprite("🐍", 0.9); snake.position.set(-3.5, Y + 1.04, -33); Z.add(snake);
  const glider = emojiSprite("🐿️", 0.8); Z.add(glider);
  anims.push({ zone: zi, fn: (t) => {
    if (REDUCED) { glider.position.set(0, Y + 5, -20); return; }
    cat.position.x = -4.5 + Math.sin(t * 0.5) * 2.2;
    pig.position.y = Y + Math.abs(Math.sin(t * 3)) * 0.15;
    snake.rotation.z = Math.sin(t * 1.4) * 0.08;
    const g = (t * 0.12) % 1;
    glider.position.set(lerp(-9, 9, g), Y + 6.5 - Math.sin(g * Math.PI) * 2.5, -18 - g * 8);
  } });
  // Menu board at the end of the floor
  const menu = card(6.4, 3.6, drawPanel({ eyebrow: "4F · Pet cafe & restaurant", title: "Pets, food & family", lines: ["☕  Coffee, tea & treats", "🍽️  Meals to share", "🐾  Meet our pets"], accent: "#ffcf8a" }), { glow: seg.accent });
  Z.add(place(menu, 0, Y + 3, -47));
  const back = glowPlane(seg.accent2, 14, 10, 0.25); back.position.set(0, Y + 3, -48); Z.add(back);
}

function dressLive(ctx) {
  const { Z, zi, Y, seg } = ctx;
  // Stage + truss + giant screen
  const stage = new THREE.Mesh(new THREE.BoxGeometry(20, 1.2, 9), M.night); stage.position.set(0, Y + 0.6, -44); Z.add(stage);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(20.1, 0.08, 0.1), M.gold); trim.position.set(0, Y + 1.2, -39.5); Z.add(trim);
  for (const s of [-1, 1]) { const tower = new THREE.Mesh(new THREE.BoxGeometry(0.5, 14, 0.5), M.goldSoft); tower.position.set(s * 9.5, Y + 7, -44); Z.add(tower); }
  const top = new THREE.Mesh(new THREE.BoxGeometry(19.5, 0.5, 0.5), M.goldSoft); top.position.set(0, Y + 14, -44); Z.add(top);
  Z.add(place(videoScreen("live", 14, seg.accent, zi), 0, Y + 7.2, -48.3));
  // Sweeping light beams
  const beamMat = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  for (let i = 0; i < 6; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.4, 24, 24, 1, true), beamMat(i % 2 ? seg.accent2 : seg.accent));
    cone.geometry.translate(0, -12, 0);
    const pivot = new THREE.Group(); pivot.position.set(-7.5 + i * 3, Y + 13.8, -43.5); pivot.add(cone); Z.add(pivot);
    const ph = i * 0.9;
    anims.push({ zone: zi, fn: (t) => { pivot.rotation.x = REDUCED ? 0.5 : 0.55 + Math.sin(t * 0.9 + ph) * 0.35; pivot.rotation.z = REDUCED ? 0 : Math.sin(t * 0.6 + ph) * 0.45; } });
  }
  // Crowd (instanced) — the camera flies over it
  const n = MOBILE ? 90 : 240;
  const crowd = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.26, 0.9, 4, 8), new THREE.MeshStandardMaterial({ color: 0x2a1845, roughness: 0.8, emissive: 0x120828 }), n);
  const seeds = []; const mtx = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    const s = { x: rand(-9, 9), z: rand(-37, -12), h: rand(0.9, 1.25), ph: rand(0, 6) }; seeds.push(s);
    mtx.makeScale(1, s.h, 1).setPosition(s.x, Y + 0.75 * s.h, s.z); crowd.setMatrixAt(i, mtx);
  }
  Z.add(crowd);
  anims.push({ zone: zi, fn: (t) => {
    if (REDUCED) return;
    for (let i = 0; i < n; i++) { const s = seeds[i]; mtx.makeScale(1, s.h, 1).setPosition(s.x, Y + 0.75 * s.h + Math.abs(Math.sin(t * 5 + s.ph)) * 0.25, s.z); crowd.setMatrixAt(i, mtx); }
    crowd.instanceMatrix.needsUpdate = true;
  } });
  // Confetti
  const cn = MOBILE ? 160 : 420; const cpos = new Float32Array(cn * 3); const ccol = new Float32Array(cn * 3);
  const palette = [new THREE.Color(0xf0d787), new THREE.Color(0xff5a5f), new THREE.Color(0x4fc3ff), new THREE.Color(0xff9db0)];
  for (let i = 0; i < cn; i++) { cpos.set([rand(-10, 10), Y + rand(1, 15), rand(-44, -8)], i * 3); const c = palette[i % 4]; ccol.set([c.r, c.g, c.b], i * 3); }
  const cg = new THREE.BufferGeometry(); cg.setAttribute("position", new THREE.BufferAttribute(cpos, 3)); cg.setAttribute("color", new THREE.BufferAttribute(ccol, 3));
  const conf = new THREE.Points(cg, new THREE.PointsMaterial({ size: 0.22, map: dotTexture(), vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }));
  Z.add(conf);
  anims.push({ zone: zi, fn: (t, dt) => {
    if (REDUCED) return;
    for (let i = 0; i < cn; i++) { let y = cpos[i * 3 + 1] - dt * (1.2 + (i % 5) * 0.3); if (y < Y + 0.3) y = Y + 15; cpos[i * 3 + 1] = y; cpos[i * 3] += Math.sin(t + i) * dt * 0.3; }
    cg.attributes.position.needsUpdate = true;
  } });
  // Event cards + energy monolith
  [["🎧", "DJ nights"], ["🎸", "Live bands"], ["👑", "KOS finals"]].forEach(([ic, name], i) => {
    const c = card(1.9, 1.9, drawIcon(ic, name), { frame: false, glow: seg.accent, pxPerUnit: 200 });
    Z.add(place(c, ctx.videoX + i * 0.6 * -ctx.m, Y + 3.2 + (i % 2) * 1.1, -15 - i * 2.6, ctx.videoRot));
    anims.push({ zone: zi, fn: (t) => { if (!REDUCED) c.position.y = Y + 3.2 + (i % 2) * 1.1 + Math.sin(t * 1.6 + i) * 0.15; } });
  });
  monolith(ctx, ctx.clusterX * 0.85, -24, "Real crowds. Real energy. Every night.", "5F ROOFTOP · LIVE", 4.2, 2.6);
}

// ── Zones: SHOWCASE stages (blind box, demo, location) ─────────────────────
function buildShowcase(seg, dress) {
  const Z = new THREE.Group(); const zi = zones.length; zones.push(Z); scene.add(Z);
  const Y = seg.y;
  Z.add(ground(Y, seg.accent));
  Z.add(accentLight(seg.accent, -9, Y + 6, 6), accentLight(seg.accent2, 9, Y + 6, 6), accentLight(0xffe6b0, 0, Y + 9, 12, 70));
  Z.add(dust(zi, seg.accent2, 260, [-20, 20, Y + 0.4, Y + 14, -20, 16]));
  dress({ Z, zi, Y, seg, portrait: PORTRAIT() });
}

function dressBlindbox({ Z, zi, Y, seg, portrait }) {
  const box = card(3, 3, (x, W, H) => { x.fillStyle = "#1a1030"; x.fillRect(0, 0, W, H); }, { glow: seg.accent });
  const img = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 2.9), new THREE.MeshBasicMaterial({ map: IMG.blindbox, toneMapped: false }));
  img.position.z = 0.02; box.add(img);
  const boxY = portrait ? 8.4 : 5.6;
  box.position.set(0, Y + boxY, -1.5); Z.add(box);
  anims.push({ zone: zi, fn: (t) => { if (!REDUCED) { box.rotation.y = Math.sin(t * 0.7) * 0.25; box.position.y = Y + boxY + Math.sin(t * 1.2) * 0.12; } } });
  const steps = [
    ["Buy a blind box", ["Pick up a package", "at the club"]],
    ["Enter the code", ["Type it in Pet Care", "in the Reborn app"]],
    ["Doluruu hatches", ["Feed and care for it", "(up to 2 pets)"]],
    ["Earn & win", ["Male + female = free baby", "Feeding earns tokens"]],
  ];
  steps.forEach(([title, lines], i) => {
    const c = card(3.6, 2.4, drawPanel({ eyebrow: `Step ${i + 1}`, title, lines, accent: "#ff9db0" }), { glow: i % 2 ? seg.accent2 : seg.accent });
    const x = portrait ? (i % 2 ? 2 : -2) : -6.3 + i * 4.2;
    const y = portrait ? (i < 2 ? 5.1 : 2.3) : 2.2;
    const s = portrait ? 0.95 : 1;
    c.scale.setScalar(s); c.position.set(x, Y + y, 0); Z.add(c);
    anims.push({ zone: zi, fn: (t) => { if (!REDUCED) c.position.y = Y + y + Math.sin(t * 1.1 + i) * 0.07; } });
  });
  if (!portrait) {
    const boy = makeDoluruu("boy", 3); boy.position.set(-10.2, Y, 0.5); Z.add(boy);
    const girl = makeDoluruu("female", 3); girl.position.set(10.2, Y, 0.5); Z.add(girl);
    anims.push({ zone: zi, fn: (t) => { if (!REDUCED) { boy.userData.sprite.position.y = Math.abs(Math.sin(t * 2.2)) * 0.1; girl.userData.sprite.position.y = Math.abs(Math.sin(t * 2.2 + 1)) * 0.1; } } });
  }
  const eggGeo = new THREE.SphereGeometry(0.4, 24, 18); eggGeo.scale(1, 1.3, 1);
  const eggCols = [0xff9db0, 0x7fe0d2, 0xffe08a, 0xc7b3ff, 0xffb27a];
  for (let i = 0; i < 8; i++) {
    const egg = new THREE.Mesh(eggGeo, new THREE.MeshStandardMaterial({ color: eggCols[i % 5], roughness: 0.35 }));
    const a = (i / 8) * Math.PI * 2;
    Z.add(egg);
    anims.push({ zone: zi, fn: (t) => { const r = portrait ? 4.2 : 3.4; const b = a + (REDUCED ? 0 : t * 0.35); egg.position.set(Math.cos(b) * r, Y + boxY + Math.sin(b) * r * 0.35, -1.5 + Math.sin(b) * 1.2); egg.rotation.y = t; } });
  }
}

function dressDemo({ Z, zi, Y, seg }) {
  const screen = videoScreen("demo", 14, seg.accent, zi);
  screen.position.set(0, Y + 4.8, -2); Z.add(screen);
  const play = card(1.4, 1.4, (x, W) => {
    x.fillStyle = "rgba(10,7,20,.55)"; x.beginPath(); x.arc(W / 2, W / 2, W * 0.46, 0, Math.PI * 2); x.fill();
    x.lineWidth = W * 0.04; x.strokeStyle = goldGrad(x, 0, W); x.stroke();
    x.fillStyle = "#f0d787"; x.beginPath(); x.moveTo(W * 0.4, W * 0.3); x.lineTo(W * 0.72, W * 0.5); x.lineTo(W * 0.4, W * 0.7); x.closePath(); x.fill();
  }, { frame: false });
  play.position.set(0, Y + 4.8, -1.85); Z.add(play);
  anims.push({ zone: zi, fn: (t) => { if (!REDUCED) play.scale.setScalar(1 + Math.sin(t * 2.4) * 0.05); } });
}

function dressLocation({ Z, zi, Y, seg, portrait }) {
  const cx = portrait ? 0 : 4;
  // Stylised city map: grid, blocks, and a pulsing gold pin at the venue
  const grid = new THREE.GridHelper(26, 26, HEX.goldHi, 0x2fae9e);
  grid.material.transparent = true; grid.material.opacity = 0.22; grid.position.set(cx, Y + 0.02, -2); Z.add(grid);
  const blockMat = new THREE.MeshStandardMaterial({ color: 0x14202a, metalness: 0.6, roughness: 0.4, emissive: 0x06141a });
  for (let i = 0; i < 26; i++) {
    const h = rand(0.5, 3.2);
    const x = cx + Math.round(rand(-6, 6)), z = -2 + Math.round(rand(-6, 5));
    if (Math.abs(x - cx) < 1.5 && Math.abs(z + 2) < 1.5) continue;
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.8, h, 0.8), blockMat); b.position.set(x, Y + h / 2, z); Z.add(b);
  }
  const sea = glowPlane(0x2f8fd0, 26, 8, 0.35); sea.rotation.x = -Math.PI / 2; sea.position.set(cx, Y + 0.03, 6); Z.add(sea);
  const pin = new THREE.Group();
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.7, 32, 24), M.gold); head.position.y = 2.6; pin.add(head);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.6, 32), M.gold); tip.rotation.x = Math.PI; tip.position.y = 1.6; pin.add(tip);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 16), new THREE.MeshBasicMaterial({ color: 0x0a0714 })); dot.position.set(0, 2.6, 0.55); pin.add(dot);
  pin.position.set(cx, Y, -2); Z.add(pin);
  const rings = [0, 1, 2].map(() => {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.05, 48), new THREE.MeshBasicMaterial({ color: HEX.goldHi, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
    r.rotation.x = -Math.PI / 2; r.position.set(cx, Y + 0.05, -2); Z.add(r); return r;
  });
  anims.push({ zone: zi, fn: (t) => {
    pin.position.y = Y + (REDUCED ? 0.4 : 0.4 + Math.abs(Math.sin(t * 2)) * 0.5);
    if (!REDUCED) pin.rotation.y = t * 0.8;
    rings.forEach((r, i) => { const k = ((t * 0.5 + i / 3) % 1); r.scale.setScalar(1 + k * 5); r.material.opacity = (1 - k) * 0.8; });
  } });
  const sign = card(5.2, 3.2, drawPanel({ eyebrow: "Batam · Harbourfront", title: VENUE.name, lines: [...VENUE.lines.slice(0, 2), ...VENUE.hours], accent: "#7fe0d2" }), { glow: seg.accent });
  sign.position.set(cx, Y + (portrait ? 7.6 : 6.2), -3); Z.add(sign);
}

// ── Zone: FINALE ───────────────────────────────────────────────────────────
function buildFinale() {
  const Z = new THREE.Group(); const zi = zones.length; zones.push(Z); scene.add(Z);
  const Y = segById("finale").y;
  Z.add(ground(Y, 0x7a4dff));
  const logo = new THREE.Group(); logo.position.set(0, Y, 0); Z.add(logo);
  const r = word("REBORN", 3.5, M.gold, 20); r.position.y = 4.4; logo.add(r);
  const w = word("WAVE", 3.5, M.gold, 20); w.position.y = 0.4; logo.add(w);
  if (PORTRAIT()) logo.scale.setScalar(0.55);
  const halo = glowPlane(0xdcb45a, 40, 22, 0.35); halo.position.set(0, Y + 4, -4); Z.add(halo);
  const d = makeDoluruu("female", 4.2); d.position.set(PORTRAIT() ? 3.2 : 12, Y, 2.2); Z.add(d);
  anims.push({ zone: zi, fn: (t) => { if (!REDUCED) d.userData.sprite.position.y = Math.abs(Math.sin(t * 2.2)) * 0.12; } });
  Z.add(accentLight(0xffd27a, 0, Y + 8, 10, 160), accentLight(0x7a4dff, -14, Y + 6, 0, 90), accentLight(0xff4fa3, 14, Y + 6, 0, 90));
  Z.add(dust(zi, HEX.goldHi, 500, [-30, 30, Y + 0.3, Y + 20, -20, 20]));

  // Everything from the tower converges into a halo around the logo
  const factories = [
    () => card(2.2, 1.4, drawMemberCard("GOLD TIER"), { frame: false }),
    () => card(1.4, 1.4, drawIcon("🎤", "KTV"), { frame: false }),
    () => card(1.4, 1.4, drawIcon("🍸", "F&B"), { frame: false }),
    () => card(1.4, 1.4, drawIcon("💄", "Beauty"), { frame: false }),
    () => card(1.4, 1.4, drawIcon("🎮", "Gaming"), { frame: false }),
    () => card(1.4, 1.4, drawIcon("💻", "IT"), { frame: false }),
    () => { const g = new THREE.Group(); const e = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 16), new THREE.MeshStandardMaterial({ color: 0xff9db0, roughness: 0.35 })); e.scale.y = 1.3; g.add(e); return g; },
    () => { const n = ["ktv", "vip", "live", "demo", "sing", "intro"][Math.floor(Math.random() * 6)]; const g = new THREE.Group(); const p = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.35), new THREE.MeshBasicMaterial({ map: IMG[`poster_${n}`], toneMapped: false })); const f = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.45), new THREE.MeshBasicMaterial({ color: HEX.gold, toneMapped: false })); f.position.z = -0.01; g.add(f, p); return g; },
  ];
  const N = MOBILE ? 14 : 24;
  for (let i = 0; i < N; i++) {
    const o = factories[i % factories.length]();
    const ang = (i / N) * Math.PI * 2;
    const dir = V(rand(-1, 1), rand(-0.4, 1), rand(-1, 1)).normalize();
    const item = {
      o, ang, rad: PORTRAIT() ? 7.5 : 14, zOff: rand(-6, -2), yOff: rand(-0.5, 0.5),
      start: V(dir.x * 70, Y + 4 + dir.y * 40, dir.z * 70 - 10), spin: rand(4, 9) * (Math.random() < 0.5 ? -1 : 1),
    };
    converge.push(item); Z.add(o);
  }
  anims.push({ zone: zi, fn: (t, dt, lt) => {
    const c = easeOut(clamp((lt - 0.02) / 0.62));
    for (const it of converge) {
      const a = it.ang + (REDUCED ? 0 : t * 0.08);
      const tx = Math.cos(a) * it.rad, ty = Y + 4.2 + Math.sin(a) * it.rad * 0.55 + it.yOff;
      it.o.position.set(lerp(it.start.x, tx, c), lerp(it.start.y, ty, c), lerp(it.start.z, it.zOff, c));
      it.o.rotation.y = (1 - c) * it.spin;
      it.o.scale.setScalar(lerp(0.4, 0.85, c));
    }
  } });
}

// ── Camera paths ───────────────────────────────────────────────────────────
function path(pos, look) {
  const mk = (arr) => new THREE.CatmullRomCurve3(arr.map((v) => V(...v)), false, "catmullrom", 0.5);
  return { pos: mk(pos), look: mk(look) };
}
function floorPath(seg) {
  const Y = seg.y, m = seg.mirror ? -1 : 1;
  const k = PORTRAIT() ? 0.5 : 1; // tighter lateral moves on portrait screens
  const back = PORTRAIT() ? 6 : 0;
  if (seg.id === "live") {
    return path(
      [[0, Y + 3.6, 26 + back], [-0.8 * k, Y + 3.6, 16 + back * 0.5], [-1.2 * k, Y + 5.4, 6], [0.4 * k, Y + 8, -1.5], [-2.8 * k, Y + 3.0, -12], [2.4 * k, Y + 2.4, -21], [0, Y + 3.8, -30], [0, Y + 7.5, -37]],
      [[0, Y + 3.4, 0], [0, Y + 3.4, 0], [0, Y + 4.4, -2], [0, Y + 3.4, -12], [-8, Y + 3.2, -17], [8, Y + 3.2, -24], [0, Y + 6.8, -48], [0, Y + 12, -48]],
    );
  }
  const lookY = seg.id === "pet" ? 3.2 : 3.6;
  return path(
    [[0, Y + 3.3, 26 + back], [m * -0.8 * k, Y + 3.5, 16 + back * 0.5], [m * -1.2 * k, Y + 5.4, 6], [m * 0.4 * k, Y + 8, -1.5], [m * -3.2 * k, Y + 3.2, -11], [m * 3.3 * k, Y + 2.9, -22], [0, Y + 4.1, -33], [0, Y + 7.5, -40]],
    [[0, Y + 3.2, 0], [0, Y + 3.2, 0], [0, Y + 4.4, -2], [0, Y + 3.4, -12], [m * -8, Y + 3.3, -17], [m * 8, Y + 3.3, -27], [0, Y + lookY, -47], [0, Y + 13, -47]],
  );
}
// Slow dolly-in towards a stage centred on (fx, lookY).
function showcasePath(seg, fx, lookY, dist, back) {
  const Y = seg.y;
  return path(
    [[fx * 0.3 - 2, Y + 6.5, dist + 16 + back], [fx * 0.6 + 1.2, Y + 5, dist + 7 + back], [fx, Y + lookY, dist + back]],
    [[fx, Y + lookY, -2], [fx, Y + lookY, -2], [fx, Y + lookY, -2]],
  );
}
let PATHS = [];
function buildPaths() {
  const portrait = PORTRAIT();
  const back = portrait ? 10 : 0;
  const F = segById("finale").y;
  PATHS = [
    path([[0, 5, 30 + back], [1.8, 3.6, 18 + back * 0.5], [0.8, 2.8, 7], [0.2, 2.5, -4], [0, 2.4, -9.6]],
      [[0, 7, -14], [0.4, 3.4, -12], [0, 2.7, -11], [0, 2.4, -14], [0, 2.4, -20]]),
    ...SEGS.slice(1, 6).map(floorPath),
    showcasePath(segById("blindbox"), 0, portrait ? 5 : 3.6, 13, portrait ? 4 : 0),
    showcasePath(segById("demo"), 0, 4.4, 12, portrait ? 16 : 0),
    showcasePath(segById("location"), portrait ? 0 : 1.5, portrait ? 4.6 : 3.4, 13, portrait ? 14 : 0),
    path([[0, F + 8, 56 + back], [0, F + 6.5, 40 + back], [0, F + 5.2, 28 + back], [0, F + 4.9, 25 + back]],
      [[0, F + 5, 0], [0, F + 4.6, 0], [0, F + 3.4, 0], [0, F + (back ? -6 : 1.0), 0]]),
  ];
}

// ── Overlays, nav, flash ───────────────────────────────────────────────────
const beats = [...document.querySelectorAll(".beat")].map((el) => ({ el, a: +el.dataset.a, b: +el.dataset.b }));
const floorBtns = [...document.querySelectorAll("#floors button")];
const flashEl = document.getElementById("flash");
const flashFloor = document.getElementById("flash-floor");
const hint = document.getElementById("hint");

function maxScroll() { return Math.max(1, document.documentElement.scrollHeight - innerHeight); }
function scrollToProgress(p) { window.scrollTo({ top: p * maxScroll(), behavior: REDUCED ? "auto" : "smooth" }); }
floorBtns.forEach((btn) => btn.addEventListener("click", () => {
  const s = SEGS.find((x) => x.id === btn.dataset.seg);
  scrollToProgress(s.id === "arrival" ? 0 : s.id === "finale" ? 1 : s.a + (s.b - s.a) * 0.1);
}));
document.querySelector(".skip").addEventListener("click", (e) => { e.preventDefault(); scrollToProgress(1); });

function updateOverlays(p, segIdx) {
  for (const { el, a, b } of beats) {
    const fin = a <= 0 ? 1 : clamp((p - a) / BEAT_FADE);
    const fout = b >= 1 ? 1 : clamp((b - p) / BEAT_FADE);
    const o = smooth(Math.min(fin, fout));
    el.style.opacity = o.toFixed(3);
    el.style.transform = `translateY(${((1 - o) * 18).toFixed(1)}px)`;
    el.classList.toggle("visible", o > 0.02);
  }
  floorBtns.forEach((btn, i) => btn.classList.toggle("on", i === segIdx));
  // Lift flash around each segment boundary
  let best = 0, label = "";
  for (let i = 1; i < SEGS.length; i++) {
    const d = Math.abs(p - SEGS[i].a);
    const bump = smooth(clamp(1 - d / FLASH_HALF_WIDTH));
    if (bump > best) { best = bump; label = SEGS[i].label; }
  }
  flashEl.style.opacity = (REDUCED ? best * 0.9 : best).toFixed(3);
  flashEl.classList.toggle("streaking", best > 0.05);
  if (label && flashFloor.textContent !== label) flashFloor.textContent = label;
  if (hint) hint.style.opacity = p > 0.01 ? "0" : "1";
}

// ── Interaction: click a floating screen to watch it big ───────────────────
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const vmodal = document.getElementById("vmodal");
const vplayer = document.getElementById("vplayer");
function hitScreen(ev) {
  ndc.set((ev.clientX / innerWidth) * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const live = screens.filter((s) => zones[s.zone].visible).map((s) => s.mesh);
  const hit = ray.intersectObjects(live, false)[0];
  return hit ? hit.object.userData.screen : null;
}
canvas.addEventListener("pointermove", (ev) => { document.body.classList.toggle("hovering-screen", !!hitScreen(ev)); });
// The demo opens the full-quality cut with sound; venue clips are silent loops.
const FULL_DEMO_SRC = "/demo.mp4";
function openVideo(name) {
  const isDemo = name === "demo";
  vplayer.src = isDemo ? FULL_DEMO_SRC : `./media/${name}.mp4`;
  vplayer.poster = `./media/${name}.jpg`;
  vplayer.muted = !isDemo;
  vmodal.showModal(); vplayer.play().catch(() => {});
}
canvas.addEventListener("click", (ev) => { const s = hitScreen(ev); if (s) openVideo(s.name); });
document.getElementById("play-demo").addEventListener("click", () => openVideo("demo"));
const closeModal = () => { vplayer.pause(); vmodal.close(); };
vmodal.querySelector(".vclose").addEventListener("click", closeModal);
vmodal.addEventListener("click", (e) => { if (e.target === vmodal) closeModal(); });

// ── Main loop ──────────────────────────────────────────────────────────────
let target = 0, cur = 0, activeSeg = -1;
const readScroll = () => { target = clamp(scrollY / maxScroll()); };
addEventListener("scroll", readScroll, { passive: true });
const timer = new THREE.Timer();
const camPos = V(0, 0, 0), camLook = V(0, 0, 0), tmpV = V(0, 0, 0);
const bg = new THREE.Color(HEX.night0);

function segmentAt(p) {
  for (let i = 0; i < SEGS.length; i++) if (p < SEGS[i].b || i === SEGS.length - 1) return i;
  return SEGS.length - 1;
}
function setActiveSegment(i) {
  if (i === activeSeg) return;
  activeSeg = i;
  zones.forEach((z, zi) => { z.visible = Math.abs(zi - i) <= 1; });
  for (const s of screens) {
    if (s.zone === i) { if (s.video.paused) s.video.play().catch(() => {}); }
    else if (!s.video.paused) s.video.pause();
  }
  const seg = SEGS[i];
  bg.set(seg.fog); scene.background.copy(bg); scene.fog.color.copy(bg);
  scene.fog.near = seg.id === "arrival" ? 28 : 30; scene.fog.far = seg.id === "arrival" ? 120 : 95;
}

function frame(ts) {
  timer.update(ts);
  const dt = Math.min(timer.getDelta(), 0.05);
  const t = timer.getElapsed();
  cur = REDUCED ? target : cur + (target - cur) * (1 - Math.exp(-dt * SMOOTHING));
  const p = cur;
  const si = segmentAt(p);
  const seg = SEGS[si];
  const lt = clamp((p - seg.a) / (seg.b - seg.a));
  setActiveSegment(si);

  PATHS[si].pos.getPoint(lt, camPos);
  PATHS[si].look.getPoint(lt, camLook);
  camera.position.copy(camPos);
  camera.lookAt(camLook);

  key.position.set(camPos.x + 8, seg.y + 16, camPos.z + 10);
  key.target.position.set(camPos.x, seg.y, camPos.z - 20);

  for (const a of anims) if (zones[a.zone].visible) a.fn(t, dt, a.zone === si ? lt : a.zone < si ? 1 : 0);
  // Doluruu sprites always face the camera, staying upright
  for (const s of billboards) { s.getWorldPosition(tmpV); s.lookAt(camPos.x, tmpV.y, camPos.z); }
  updateOverlays(p, si);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.fov = PORTRAIT() ? 62 : 45;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  buildPaths();
}
addEventListener("resize", onResize);

// ── Boot ───────────────────────────────────────────────────────────────────
loadAll().then(() => {
  buildArrival();
  buildFloor(SEGS[1], dressKTV);
  buildFloor(SEGS[2], dressPrivate);
  buildFloor(SEGS[3], dressVIP);
  buildFloor(SEGS[4], dressPet);
  buildFloor(SEGS[5], dressLive);
  buildShowcase(segById("blindbox"), dressBlindbox);
  buildShowcase(segById("demo"), dressDemo);
  buildShowcase(segById("location"), dressLocation);
  buildFinale();
  buildPaths();
  readScroll(); cur = target;
  renderer.compile(scene, camera);
  loaderEl.classList.add("done");
  requestAnimationFrame(frame);
}).catch((e) => {
  console.error("Experience failed to load", e);
  document.body.classList.add("static");
  loaderEl.classList.add("done");
});
