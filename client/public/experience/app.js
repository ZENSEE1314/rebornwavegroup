// Reborn Wave — immersive scroll-driven 3D tower experience.
// One continuous WebGL world: arrival → lift portal → 1F KTV → 2F Private →
// 3F VIP → 4F Pet (Doluruu) → 5F Live rooftop → convergence + CTA.
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
  { id: "arrival", a: 0.00, b: 0.13, y: 0, fog: 0x0b0716, label: "" },
  { id: "ktv", a: 0.13, b: 0.28, y: 200, floor: 1, word: "KTV", mirror: false, accent: 0xc04dff, accent2: 0xff4fa3, fog: 0x12071d, label: "1F" },
  { id: "private", a: 0.28, b: 0.42, y: 300, floor: 2, word: "PRIVATE", mirror: true, accent: 0x8a3dff, accent2: 0xdcb45a, fog: 0x0e0716, label: "2F" },
  { id: "vip", a: 0.42, b: 0.56, y: 400, floor: 3, word: "VIP", mirror: false, accent: 0xf0d787, accent2: 0xc98b3c, fog: 0x140e07, label: "3F" },
  { id: "pet", a: 0.56, b: 0.72, y: 500, floor: 4, word: "PET", mirror: true, accent: 0x2fae9e, accent2: 0xff9db0, fog: 0x0a1417, label: "4F" },
  { id: "live", a: 0.72, b: 0.86, y: 600, floor: 5, word: "LIVE", mirror: false, accent: 0xff5a5f, accent2: 0x4fc3ff, fog: 0x10050b, label: "5F" },
  { id: "finale", a: 0.86, b: 1.00, y: 800, fog: 0x0a0714, label: "★" },
];

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
  const imgs = ["baby", "boy", "teen", "adult", "female"];
  const [f, ...tex] = await Promise.all([
    new FontLoader(manager).loadAsync("./vendor/fonts/helvetiker_bold.typeface.json"),
    ...imgs.map((n) => texLoader.loadAsync(`./img/doluruu-${n}.png`)),
    document.fonts ? document.fonts.load("800 64px Montserrat").catch(() => {}) : null,
    document.fonts ? document.fonts.load("800 64px Cinzel").catch(() => {}) : null,
  ]);
  font = f;
  imgs.forEach((n, i) => { tex[i].colorSpace = THREE.SRGBColorSpace; tex[i].anisotropy = 8; IMG[n] = tex[i]; });
  IMG.blindbox = loadTex("./img/blindbox.jpeg");
  for (const n of ["intro", "ktv", "sing", "vip", "pet", "live"]) IMG[`poster_${n}`] = loadTex(`./media/${n}.jpg`);
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
  const floorNames = ["KTV", "PRIVATE", "VIP", "DOLURUU WORLD", "LIVE"];
  for (let i = 0; i < 5; i++) {
    const y = 8 + i * 7;
    const band = new THREE.Mesh(new THREE.BoxGeometry(7.12, 0.07, 7.12), M.gold); band.position.y = y; tower.add(band);
    const lab = card(3.6, 0.6, (x, W, H) => {
      x.fillStyle = goldGrad(x, 0, W); x.font = `800 ${H * 0.6}px Montserrat`; x.textBaseline = "middle";
      x.fillText(`${i + 1}F  ·  ${floorNames[i]}`, 8, H / 2);
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

function dressKTV(ctx) {
  const { Z, zi, Y, seg } = ctx;
  Z.add(place(videoScreen("ktv", 6.4, seg.accent, zi), ctx.videoX, Y + 3.4, -17, ctx.videoRot));
  Z.add(place(videoScreen("sing", 5.4, seg.accent2, zi), ctx.clusterX, Y + 3.6, -27, ctx.clusterRot));
  const board = card(2.8, 3.4, drawPanel({ eyebrow: "Kings of Singers", title: "Weekly board", lines: ["#1  🎤  Weekly champion", "#2  🎤  Runner-up", "#3  🎤  Rising star", "Sing live · earn tokens"], accent: "#ff4fa3" }), { glow: seg.accent2 });
  Z.add(place(board, ctx.clusterX + 0.6, Y + 3.2, -22.5, ctx.clusterRot));
  // Disco ball
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 2), M.chrome); ball.position.set(0, Y + 10.5, -15); Z.add(ball);
  const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 6), M.goldSoft); wire.position.set(0, Y + 14.9, -15); Z.add(wire);
  const sparkle = glowPlane(0xffffff, 7, 7, 0.35); sparkle.position.set(0, Y + 10.5, -15.2); Z.add(sparkle);
  anims.push({ zone: zi, fn: (t) => { if (!REDUCED) { ball.rotation.y = t * 0.45; sparkle.material.opacity = 0.25 + Math.abs(Math.sin(t * 3)) * 0.2; } } });
  // Floating microphones
  for (let i = 0; i < 7; i++) {
    const mic = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.9, 16), M.night); handle.position.y = -0.45; mic.add(handle);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 16), M.goldSoft); mic.add(head);
    const side = i % 2 ? 1 : -1;
    mic.position.set(side * rand(3, 6.5), Y + rand(2.4, 6), -4 - i * 4.4); mic.rotation.z = side * -0.5;
    Z.add(mic);
    const ph = rand(0, 6);
    anims.push({ zone: zi, fn: (t) => { if (!REDUCED) { mic.rotation.y = t * 0.6 + ph; mic.position.y += Math.sin(t * 1.4 + ph) * 0.0025; } } });
  }
  // Lyric ribbons drifting through the air
  const lyrics = ["♪  sing it like it's yours  ♪", "♫  one more song tonight  ♫", "♪  take the mic  ♪"];
  lyrics.forEach((txt, i) => {
    const rib = card(9, 0.8, (x, W, H) => {
      const g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, "rgba(255,79,163,0)"); g.addColorStop(0.5, "rgba(255,79,163,.28)"); g.addColorStop(1, "rgba(255,79,163,0)");
      x.fillStyle = g; x.fillRect(0, 0, W, H); x.fillStyle = "#fbf6ea"; x.font = `600 ${H * 0.5}px Montserrat`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(txt, W / 2, H / 2);
    }, { frame: false });
    rib.position.set(0, Y + 6.5 + i * 1.1, -8 - i * 9); Z.add(rib);
    anims.push({ zone: zi, fn: (t) => { if (!REDUCED) rib.position.x = Math.sin(t * 0.25 + i * 2) * 4; } });
  });
  monolith(ctx, 0, -47, "Sing live. Top the board. Win tokens.", "KINGS OF SINGERS · IN THE APP");
}

function dressPrivate(ctx) {
  const { Z, zi, Y, seg } = ctx;
  Z.add(place(videoScreen("intro", 6.6, seg.accent, zi), ctx.videoX, Y + 3.4, -17, ctx.videoRot));
  // Bottle walls on both sides (instanced)
  const prof = [[0, 0], [0.12, 0], [0.13, 0.05], [0.13, 0.42], [0.06, 0.52], [0.045, 0.62], [0.045, 0.74], [0, 0.74]].map(([a, b]) => new THREE.Vector2(a, b));
  const bottleGeo = new THREE.LatheGeometry(prof, 14);
  const bottleMat = new THREE.MeshStandardMaterial({ metalness: 0.2, roughness: 0.12, emissive: 0x220c33, emissiveIntensity: 0.6 });
  const step = MOBILE ? 1.7 : 1.05, shelves = [1.1, 2.3, 3.5, 4.7];
  const perWall = shelves.length * Math.floor(34 / step);
  const tints = [0x9a5a1a, 0x1f5a33, 0x8fb6c2, 0xc9a84c, 0x6b1520, 0x3b2a6b].map((c) => new THREE.Color(c));
  for (const side of [-1, 1]) {
    const inst = new THREE.InstancedMesh(bottleGeo, bottleMat, perWall);
    const mtx = new THREE.Matrix4(); let k = 0;
    for (const sy of shelves) for (let z = -2; z > -36 && k < perWall; z -= step) {
      mtx.makeScale(1.3, 1.3, 1.3).setPosition(side * 11.4, Y + sy, z + rand(-0.15, 0.15));
      inst.setMatrixAt(k, mtx); inst.setColorAt(k, tints[k % tints.length]); k++;
    }
    inst.count = k; Z.add(inst);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6.2, 36), M.night); wall.position.set(side * 12, Y + 3.1, -19); Z.add(wall);
    for (const sy of shelves) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 36), M.gold); s.position.set(side * 11.5, Y + sy - 0.03, -19); Z.add(s); }
    const strip = glowPlane(seg.accent, 1.2, 36, 0.5); strip.rotation.y = side * -Math.PI / 2; strip.position.set(side * 11.8, Y + 5.8, -19); Z.add(strip);
  }
  // Velvet booth
  const seat = new THREE.Mesh(new THREE.BoxGeometry(5, 0.9, 1.8), M.velvet); seat.position.set(ctx.clusterX * 1.25, Y + 0.45, -30); Z.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(5, 1.8, 0.5), M.velvet); back.position.set(ctx.clusterX * 1.25, Y + 1.4, -30.9); Z.add(back);
  // F&B + Beauty cards (part of the 5-in-1)
  const cards = [["🍸", "Signature bar", "Crafted cocktails & bottle service"], ["🍽️", "Kitchen", "Plates made for the party"], ["💄", "Beauty", "Glow-up before the night"]];
  cards.forEach(([ic, t, l], i) => {
    const c = card(2.6, 2.1, drawPanel({ icon: ic, title: t, lines: [l], accent: "#b58cff" }), { glow: seg.accent });
    Z.add(place(c, ctx.clusterX + i * 0.4 * ctx.m, Y + 2.2 + i * 1.5, -22 - i * 2.2, ctx.clusterRot));
    anims.push({ zone: zi, fn: (t2) => { if (!REDUCED) c.position.y = Y + 2.2 + i * 1.5 + Math.sin(t2 + i) * 0.1; } });
  });
  // 5-IN-1 monument
  const mono = word("5-IN-1", 2.6, wordMaterial(seg.accent), 14); mono.position.set(0, Y + 1.2, -47); Z.add(mono);
  const cap = card(9, 1.1, (x, W, H) => { x.fillStyle = "#f0d787"; x.font = `700 ${H * 0.42}px Montserrat`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("BEAUTY  ·  F&B  ·  GAMING  ·  KTV  ·  IT", W / 2, H / 2); }, { frame: false });
  cap.position.set(0, Y + 0.6, -46.2); Z.add(cap);
}

function dressVIP(ctx) {
  const { Z, zi, Y, seg } = ctx;
  Z.add(place(videoScreen("vip", 6.4, seg.accent, zi), ctx.videoX, Y + 3.4, -17, ctx.videoRot));
  // Floating VIP member cards (fanned)
  ["GOLD", "PLATINUM", "BLACK"].forEach((tier, i) => {
    const c = card(3.2, 2, drawMemberCard(`${tier} TIER`), { frame: false, glow: 0xf0d787 });
    Z.add(place(c, ctx.clusterX + (i - 1) * 0.9 * ctx.m, Y + 3 + i * 0.9, -25 - i * 1.4, ctx.clusterRot + (i - 1) * 0.12));
    anims.push({ zone: zi, fn: (t) => { if (!REDUCED) { c.rotation.z = Math.sin(t * 0.8 + i) * 0.06; c.position.y = Y + 3 + i * 0.9 + Math.sin(t + i) * 0.12; } } });
  });
  // Mirrored gold pillars
  for (const z of [-6, -16, -26, -36]) for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 9, 32), M.gold); p.position.set(s * 6.8, Y + 4.5, z); Z.add(p);
  }
  // Throne booth
  const throne = new THREE.Group();
  const backrest = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.35, 16, 40, Math.PI), M.gold); backrest.position.y = 1.2; throne.add(backrest);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(3, 0.7, 1.4), M.velvet); seat.position.y = 0.45; throne.add(seat);
  Z.add(place(throne, ctx.clusterX * 1.35, Y, -33, ctx.clusterRot));
  // Member-economy monuments
  [["TOKENS", "Earn daily", -6.2], ["K-GOLD", "Collect & spend", 0], ["SPIN", "Win prizes", 6.2]].forEach(([wtxt, sub, x]) => {
    const ped = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.8, 1.6), M.night); ped.position.set(x, Y + 0.4, -47); Z.add(ped);
    const wd = word(wtxt, 1.15, wordMaterial(seg.accent), 4.2); wd.position.set(x, Y + 0.85, -47); Z.add(wd);
    const cap = card(3.6, 0.6, (c2, W, H) => { c2.fillStyle = "#f0d787"; c2.font = `700 ${H * 0.55}px Montserrat`; c2.textAlign = "center"; c2.textBaseline = "middle"; c2.fillText(sub.toUpperCase(), W / 2, H / 2); }, { frame: false });
    cap.position.set(x, Y + 0.4, -46.15); Z.add(cap);
  });
  monolith(ctx, ctx.videoX * 0.62, -35, "Priority tables. Members' lounge. Invitation-only nights.", "VIP MEMBERSHIP", 4.2, 2.6);
}

function dressPet(ctx) {
  const { Z, zi, Y, seg } = ctx;
  Z.add(place(videoScreen("pet", 6.2, seg.accent, zi), ctx.videoX, Y + 3.4, -17, ctx.videoRot));
  // Growth path: baby → boy → teen → adult
  [["baby", "Hatch"], ["boy", "Grow"], ["teen", "Level up"], ["adult", "Earn perks"]].forEach(([img, label], i) => {
    const c = card(2, 2.5, (x, W, H) => {
      rr(x, 4, 4, W - 8, H - 8, 26); x.fillStyle = "rgba(14,24,28,.9)"; x.fill(); x.lineWidth = 5; x.strokeStyle = goldGrad(x, 0, W); x.stroke();
      x.fillStyle = "#2fae9e"; x.font = `800 ${H * 0.075}px Montserrat`; x.textAlign = "center"; x.fillText(`STEP ${i + 1}`, W / 2, H * 0.12);
      x.fillStyle = "#fbf6ea"; x.font = `800 ${H * 0.1}px Montserrat`; x.fillText(label.toUpperCase(), W / 2, H * 0.93);
    }, { glow: seg.accent });
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), new THREE.MeshBasicMaterial({ map: IMG[img], transparent: true, toneMapped: false }));
    pic.position.z = 0.02; pic.position.y = 0.05; c.add(pic);
    Z.add(place(c, ctx.clusterX + i * 0.5 * ctx.m, Y + 2.6 + (i % 2) * 0.6, -21 - i * 2.8, ctx.clusterRot));
    anims.push({ zone: zi, fn: (t) => { if (!REDUCED) pic.position.y = 0.05 + Math.abs(Math.sin(t * 2 + i)) * 0.06; } });
  });
  // Mini-game arcade screens
  [["🧱", "Tower Stack"], ["🎲", "789 Dice"], ["🔢", "Guess the Number"], ["⏱️", "Stop at 1:00"]].forEach(([ic, name], i) => {
    const c = card(1.7, 1.7, drawIcon(ic, name), { frame: false, glow: seg.accent2, pxPerUnit: 200 });
    Z.add(place(c, ctx.videoX + (i - 1.5) * 1.9 * -ctx.m * 0.5, Y + 6.6 + (i % 2) * 0.5, -15 - i * 1.4, ctx.videoRot));
    anims.push({ zone: zi, fn: (t) => { if (!REDUCED) c.position.y = Y + 6.6 + (i % 2) * 0.5 + Math.sin(t * 1.3 + i) * 0.14; } });
  });
  // Blind-box eggs
  const eggGeo = new THREE.SphereGeometry(0.45, 24, 18); eggGeo.scale(1, 1.3, 1);
  const bandGeo = new THREE.TorusGeometry(0.46, 0.035, 8, 32);
  const eggCols = [0xff9db0, 0x7fe0d2, 0xffe08a, 0xc7b3ff, 0xffb27a];
  const eggs = MOBILE ? 7 : 14;
  for (let i = 0; i < eggs; i++) {
    const egg = new THREE.Group();
    egg.add(new THREE.Mesh(eggGeo, new THREE.MeshStandardMaterial({ color: eggCols[i % 5], roughness: 0.35, metalness: 0.1 })));
    const band = new THREE.Mesh(bandGeo, M.gold); band.rotation.x = Math.PI / 2; egg.add(band);
    const side = i % 2 ? 1 : -1;
    egg.position.set(side * rand(2.5, 6), Y + rand(1.2, 6.5), rand(-4, -38)); Z.add(egg);
    const ph = rand(0, 6);
    anims.push({ zone: zi, fn: (t) => { if (!REDUCED) { egg.rotation.y = t * 0.6 + ph; egg.position.y += Math.sin(t * 1.5 + ph) * 0.003; } } });
  }
  const box = card(2.2, 2.2, (x, W, H) => { x.fillStyle = "#1a1030"; x.fillRect(0, 0, W, H); }, { glow: seg.accent2 });
  const boxImg = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1), new THREE.MeshBasicMaterial({ map: IMG.blindbox, toneMapped: false }));
  boxImg.position.z = 0.02; box.add(boxImg);
  Z.add(place(box, ctx.videoX * 0.55, Y + 1.8, -33, ctx.videoRot));
  // Doluruu, the star of the floor
  const d = makeDoluruu("adult", 5.6); d.position.set(0, Y, -44); Z.add(d);
  const halo = glowPlane(seg.accent, 12, 12, 0.45); halo.rotation.x = -Math.PI / 2; halo.position.set(0, Y + 0.03, -44); Z.add(halo);
  const back = glowPlane(seg.accent2, 14, 12, 0.3); back.position.set(0, Y + 3, -46.5); Z.add(back);
  anims.push({ zone: zi, fn: (t) => {
    if (REDUCED) return;
    const s = d.userData.sprite;
    s.position.y = Math.abs(Math.sin(t * 2.4)) * 0.18;
    s.scale.y = 1 + Math.sin(t * 4.8) * 0.015;
  } });
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

// ── Zone: FINALE ───────────────────────────────────────────────────────────
function buildFinale() {
  const Z = new THREE.Group(); const zi = zones.length; zones.push(Z); scene.add(Z);
  const Y = SEGS[6].y;
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
    () => { const n = ["ktv", "vip", "live", "pet", "sing", "intro"][Math.floor(Math.random() * 6)]; const g = new THREE.Group(); const p = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.35), new THREE.MeshBasicMaterial({ map: IMG[`poster_${n}`], toneMapped: false })); const f = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.45), new THREE.MeshBasicMaterial({ color: HEX.gold, toneMapped: false })); f.position.z = -0.01; g.add(f, p); return g; },
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
let PATHS = [];
function buildPaths() {
  const back = PORTRAIT() ? 10 : 0;
  const F = SEGS[6].y;
  PATHS = [
    path([[0, 5, 30 + back], [1.8, 3.6, 18 + back * 0.5], [0.8, 2.8, 7], [0.2, 2.5, -4], [0, 2.4, -9.6]],
      [[0, 7, -14], [0.4, 3.4, -12], [0, 2.7, -11], [0, 2.4, -14], [0, 2.4, -20]]),
    ...SEGS.slice(1, 6).map(floorPath),
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
canvas.addEventListener("click", (ev) => {
  const s = hitScreen(ev); if (!s) return;
  vplayer.src = `./media/${s.name}.mp4`; vplayer.poster = `./media/${s.name}.jpg`;
  vmodal.showModal(); vplayer.play().catch(() => {});
});
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
