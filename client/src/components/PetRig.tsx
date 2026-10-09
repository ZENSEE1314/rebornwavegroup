// A cartoon "puppet" for the pet: the pet picture (all its outfit layers flattened)
// is drawn on a bendable WebGL mesh, so the head, legs, arms, tail and body move on
// their own — steps, arm swings, head tilts, squash & stretch, a wagging tail and
// blinking eyes — instead of the whole flat picture sliding around like paper.
// Body parts are found from the eyes (measured for every outfit) and the figure's
// proportions; motions are springs, so every move eases in and overshoots a little.
import { useEffect, useRef } from "react";

export type RigPose =
  | "walk" | "idle" | "look" | "hop" | "dance" | "spin" | "stretch" | "wave"
  | "sleep" | "yawn" | "feed" | "clean" | "play" | "wake"
  | "poke-0" | "poke-1" | "poke-2" | "poke-3";
/** One picture of the figure, in figure pixels (cw × ch). h = 0 → from the picture's own shape. */
export interface RigLayer { src: string; x: number; y: number; w: number; h: number; clip?: number; fade?: boolean; over?: boolean }
/** cw = 0 → a single picture whose own size is the figure (a company's own pet). */
export interface RigFigure { cw: number; ch: number; layers: RigLayer[]; eyes?: number[] | null }

// The canvas reaches past the pet's box so raised arms and a tilted head aren't cut off.
const VIEW = { x: -0.12, y: -0.2, w: 1.24, h: 1.22 };
const GRID_X = 22, GRID_Y = 26;

const VS = `
attribute vec2 aUV;
uniform vec2 uFig;
uniform vec4 uView;
uniform vec4 uLand;   // centreX, neckY, eye distance, feetY
uniform vec2 uLand2;  // arm inner offset, tail offset
uniform vec4 uHead;   // tilt, nod, look, squash
uniform vec4 uBody;   // scaleX, scaleY, lean, bounce
uniform vec4 uLegs;   // lift L, lift R, stride L, stride R
uniform vec4 uArms;   // arm L, arm R, tail, breathe
uniform float uFlip;
varying vec2 vUV;
vec2 rot(vec2 p, vec2 c, float a) { vec2 d = p - c; float s = sin(a), k = cos(a); return c + vec2(d.x * k - d.y * s, d.x * s + d.y * k); }
void main() {
  vUV = aUV;
  vec2 p = vec2(0.5 + (aUV.x - 0.5) * uFig.x, aUV.y);
  float cx = uLand.x, neckY = uLand.y, D = uLand.z, feetY = uLand.w;
  float dx = p.x - cx;
  float wHead = 1.0 - smoothstep(neckY - D * 0.35, neckY + D * 0.25, p.y);
  float wFoot = smoothstep(feetY - 0.06, feetY + 0.04, p.y);
  float wL = wFoot * (1.0 - smoothstep(-0.03, 0.03, dx));
  float wR = wFoot * smoothstep(-0.03, 0.03, dx);
  float band = smoothstep(neckY - 0.02, neckY + 0.06, p.y) * (1.0 - smoothstep(feetY - 0.2, feetY - 0.08, p.y));
  float wAL = band * smoothstep(uLand2.x, uLand2.x + 0.06, -dx);
  float wAR = band * smoothstep(uLand2.x, uLand2.x + 0.06, dx);
  float wTail = smoothstep(uLand2.y, uLand2.y + 0.06, dx) * smoothstep(feetY - 0.25, feetY - 0.1, p.y);
  float wTorso = (1.0 - wHead) * (1.0 - wFoot);
  p.y -= uLegs.x * wL + uLegs.y * wR;
  p.x += uLegs.z * wL + uLegs.w * wR;
  p = mix(p, rot(p, vec2(cx - uLand2.x, neckY + 0.03), uArms.x), wAL);
  p = mix(p, rot(p, vec2(cx + uLand2.x, neckY + 0.03), -uArms.y), wAR);
  p = mix(p, rot(p, vec2(cx + uLand2.y, feetY - 0.08), uArms.z), wTail);
  p.x = mix(p.x, cx + (p.x - cx) * (1.0 + uArms.w), wTorso);
  p.y = mix(p.y, p.y - (1.0 - p.y) * uArms.w * 0.6, wTorso);
  vec2 neck = vec2(cx, neckY);
  vec2 ph = rot(p, neck, uHead.x) + vec2(uHead.z, uHead.y);
  ph.y = neck.y + (ph.y - neck.y) * (1.0 + uHead.w);
  p = mix(p, ph, wHead);
  vec2 base = vec2(cx, 1.0);
  p = base + vec2((p.x - base.x) * uBody.x * uFlip, (p.y - base.y) * uBody.y);
  p = rot(p, base, uBody.z);
  p.y += uBody.w;
  vec2 c = (p - uView.xy) / uView.zw;
  gl_Position = vec4(c.x * 2.0 - 1.0, 1.0 - c.y * 2.0, 0.0, 1.0);
}`;
// Dimming (asleep) and grey (sick) are done here, not with CSS filters on the canvas.
const FS = `precision mediump float; varying vec2 vUV; uniform sampler2D uTex; uniform vec3 uTone;
void main() { vec4 c = texture2D(uTex, vUV); float g = dot(c.rgb, vec3(.299, .587, .114)); c.rgb = mix(c.rgb, vec3(g), uTone.y) * uTone.x; gl_FragColor = c * uTone.z; }`;

type P = { tilt: number; nod: number; look: number; hsq: number; sx: number; sy: number; lean: number; bounce: number; liftL: number; liftR: number; strL: number; strR: number; armL: number; armR: number; tail: number; breathe: number; flip: number };
const REST: P = { tilt: 0, nod: 0, look: 0, hsq: 0, sx: 1, sy: 1, lean: 0, bounce: 0, liftL: 0, liftR: 0, strL: 0, strR: 0, armL: 0, armR: 0, tail: 0, breathe: 0, flip: 1 };
const TAU = Math.PI * 2;
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
// One bounce of a hop over `len` seconds: crouch → jump → land squash → settle.
function hop(t: number, len: number, height: number, o: P) {
  const u = (t % len) / len;
  if (u < 0.18) { const k = ease(u / 0.18); o.sy = 1 - 0.14 * k; o.sx = 1 + 0.1 * k; }
  else if (u < 0.62) { const k = (u - 0.18) / 0.44; o.bounce = -height * Math.sin(Math.PI * k); o.sy = 1.08 - 0.08 * k; o.sx = 0.94 + 0.06 * k; o.armL = o.armR = 0.7 * Math.sin(Math.PI * k); o.liftL = o.liftR = 0.025 * Math.sin(Math.PI * k); }
  else if (u < 0.78) { const k = Math.sin(Math.PI * (u - 0.62) / 0.16); o.sy = 1 - 0.13 * k; o.sx = 1 + 0.11 * k; }
}
// Target pose for this moment. t = seconds since the pose started, T = clock.
function target(pose: RigPose, mood: string, t: number, T: number): P {
  const o: P = { ...REST };
  const slow = mood === "sad" ? 0.7 : mood === "happy" ? 1.2 : 1;
  o.breathe = (pose === "sleep" ? 0.028 : 0.014) * Math.sin(T * TAU / (pose === "sleep" ? 3.2 : 2.6 / slow));
  o.tail = (mood === "happy" ? 0.22 : mood === "sad" ? 0.05 : 0.12) * Math.sin(T * TAU * (mood === "happy" ? 2.2 : 1.1));
  switch (pose) {
    case "walk": {
      const ph = T * TAU * 2.3 * slow, s = Math.sin(ph);
      o.liftL = Math.max(0, s) * 0.05; o.liftR = Math.max(0, -s) * 0.05;
      o.strL = 0.02 * Math.cos(ph); o.strR = -0.02 * Math.cos(ph);
      o.bounce = -0.014 * Math.abs(s); o.lean = 0.035 * s; o.tilt = -0.05 * s;
      o.armL = 0.12 + 0.28 * s; o.armR = 0.12 - 0.28 * s;
      if (mood === "sad") { o.nod = 0.012; o.tilt -= 0.05; }
      break;
    }
    case "look": { const s = Math.sin(t * TAU / 1.6); o.look = 0.03 * s; o.tilt = 0.12 * s; o.armL = 0.05; break; }
    case "hop": hop(t, 0.7, 0.2, o); break;
    case "play": hop(t, 0.6, 0.18, o); o.tilt = 0.08 * Math.sin(t * TAU); break;
    case "dance": {
      const w = t * TAU * 1.75, s = Math.sin(w);
      o.lean = 0.1 * s; o.tilt = -0.1 * s; o.nod = 0.012 * Math.abs(Math.cos(w));
      o.armL = 0.9 + 0.7 * Math.max(0, s); o.armR = 0.9 + 0.7 * Math.max(0, -s);
      o.bounce = -0.035 * Math.abs(s); o.liftL = Math.max(0, s) * 0.04; o.liftR = Math.max(0, -s) * 0.04;
      break;
    }
    case "spin": { // jump, turn around at the top, land, turn back: a 2D cartoon never goes paper-thin
      hop(t, 0.5, 0.14, o); o.flip = t > 0.2 && t < 0.72 ? -1 : 1; o.armL = o.armR = Math.max(o.armL, 0.8); break;
    }
    case "stretch": case "wake": case "yawn": {
      const len = pose === "yawn" ? 1.8 : pose === "wake" ? 1.6 : 1.5, e = Math.sin(Math.PI * Math.min(1, t / len));
      o.armL = o.armR = 2.3 * e; o.sy = 1 + 0.09 * e; o.sx = 1 - 0.05 * e; o.tilt = (pose === "yawn" ? 0.14 : 0.06) * e; o.nod = -0.015 * e; o.hsq = 0.04 * e;
      break;
    }
    case "wave": {
      const e = Math.sin(Math.PI * Math.min(1, t / 1.6));
      o.armR = 2.1 * Math.min(1, e * 2) + 0.35 * Math.sin(t * TAU * 2.8) * e; o.tilt = 0.12 * e; o.lean = -0.03 * e; o.armL = 0.1;
      break;
    }
    case "feed": {
      if (t < 0.95) { o.nod = -0.02 * ease(t / 0.4); o.armL = o.armR = 0.45 * ease(t / 0.5); o.tilt = 0.04; }
      else { const c = Math.abs(Math.sin((t - 0.95) * TAU * 2.4)); o.hsq = -0.08 * c; o.nod = 0.012 * c; o.armL = o.armR = 0.45; o.sy = 1 - 0.03 * c; o.sx = 1 + 0.025 * c; o.tail *= 2; }
      break;
    }
    case "clean": {
      const d = Math.max(0, 1 - t / 2.8), s = Math.sin(t * TAU * 3.2);
      o.lean = 0.1 * s * d; o.tilt = 0.14 * Math.sin(t * TAU * 3.2 + 0.6) * d; o.armL = 0.35 + 0.3 * s * d; o.armR = 0.35 - 0.3 * s * d; o.bounce = -0.01 * Math.abs(s) * d;
      break;
    }
    case "sleep": { o.tilt = 0.16; o.nod = 0.02; o.sy = 0.97 + 0.015 * Math.sin(T * TAU / 3.2); o.armL = o.armR = -0.05; break; }
    case "poke-0": { const k = Math.exp(-t * 5) * Math.sin(t * 28); o.sy = 1 + 0.16 * k; o.sx = 1 - 0.12 * k; o.hsq = 0.05 * k; o.armL = o.armR = 0.5 * Math.exp(-t * 3); break; }
    case "poke-1": hop(Math.min(t, 0.69), 0.7, 0.22, o); break;
    case "poke-2": { hop(Math.min(t, 0.79), 0.8, 0.16, o); o.flip = t > 0.28 && t < 0.62 ? -1 : 1; o.armL = o.armR = Math.max(o.armL, 0.9); break; }
    case "poke-3": { const d = Math.exp(-t * 3), s = Math.sin(t * TAU * 6); o.lean = 0.07 * s * d; o.tilt = -0.12 * s * d; o.armL = 0.6 * d; o.armR = 0.6 * d; break; }
    default: { // idle
      const s = Math.sin(T * TAU / 3.4);
      o.tilt = 0.04 * s; o.armL = 0.06 + 0.04 * s; o.armR = 0.06 - 0.04 * s;
      if (mood === "sad") { o.tilt = -0.09 + 0.02 * s; o.nod = 0.018; o.sy = 0.97; o.armL = o.armR = -0.04; }
      if (mood === "happy") { o.bounce = -0.008 * Math.abs(Math.sin(T * TAU * 0.9)); o.tilt = 0.07 * s; }
    }
  }
  return o;
}

async function loadImg(src: string) {
  const img = new Image(); img.decoding = "async"; img.src = src;
  await img.decode();
  return img;
}

/** tone: "sleep" = a little darker, "sick" = grey and faded. */
export function PetRig({ figure, pose, mood, tone = "", onFail }: { figure: RigFigure; pose: RigPose; mood: string; tone?: "" | "sleep" | "sick"; onFail?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ pose, mood, since: performance.now() });
  if (live.current.pose !== pose) live.current = { pose, mood, since: performance.now() };
  live.current.mood = mood;
  const toneRef = useRef(tone); toneRef.current = tone;
  const key = JSON.stringify(figure);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    let stopped = false, raf = 0;
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: true }) as WebGLRenderingContext | null;
    if (!gl) { onFail?.(); return; }
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    (async () => {
      // 1. Flatten the outfit layers into one picture.
      const imgs = await Promise.all(figure.layers.map((l) => loadImg(l.src)));
      if (stopped) return;
      let cw = figure.cw, ch = figure.ch;
      const layers = figure.layers.map((l) => ({ ...l }));
      if (!cw) { cw = imgs[0].naturalWidth; ch = imgs[0].naturalHeight; layers[0] = { ...layers[0], x: 0, y: 0, w: cw, h: ch }; }
      const S = Math.min(2.5, 900 / Math.max(cw, ch));
      const base = document.createElement("canvas"); base.width = Math.round(cw * S); base.height = Math.round(ch * S);
      const bx = base.getContext("2d")!;
      let skin = "rgb(52,44,40)", lash = "rgb(20,15,13)";
      const sampleSkin = () => {
        if (!figure.eyes) return;
        const [ex, ey, d] = figure.eyes;
        const spots = [[ex - d * 0.95, ey + d * 0.15], [ex + d * 0.95, ey + d * 0.15], [ex, ey - d * 0.8], [ex, ey + d * 0.45], [ex - d * 0.5, ey - d * 0.55], [ex + d * 0.5, ey - d * 0.55]];
        const got: number[][] = [];
        for (const [x, y] of spots) { try { const c = bx.getImageData(Math.round(x * S), Math.round(y * S), 1, 1).data; if (c[3] > 220) got.push([c[0], c[1], c[2]]); } catch { /* ignore */ } }
        if (!got.length) return;
        got.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
        const [r, g, b] = got[Math.floor((got.length - 1) / 2)];
        skin = `rgb(${r},${g},${b})`; lash = `rgb(${Math.round(r * 0.35)},${Math.round(g * 0.35)},${Math.round(b * 0.35)})`;
      };
      let sampled = false;
      layers.forEach((l, i) => {
        if (l.over && !sampled) { sampleSkin(); sampled = true; }
        const img = imgs[i], w = l.w * S, h = (l.h || (l.w * img.naturalHeight) / img.naturalWidth) * S;
        const tmp = document.createElement("canvas"); tmp.width = Math.max(1, Math.round(w)); tmp.height = Math.max(1, Math.round(h));
        const tx = tmp.getContext("2d")!;
        tx.drawImage(img, 0, 0, tmp.width, tmp.height);
        if (l.clip) tx.clearRect(0, l.clip * S, tmp.width, tmp.height);
        if (l.fade) { // soften the lower edge of hats / glasses, like the shop pictures
          tx.globalCompositeOperation = "destination-in";
          const g = tx.createLinearGradient(0, 0, 0, tmp.height); g.addColorStop(0.7, "#000"); g.addColorStop(1, "rgba(0,0,0,0)");
          tx.fillStyle = g; tx.fillRect(0, 0, tmp.width, tmp.height);
        }
        bx.drawImage(tmp, l.x * S, l.y * S);
      });
      if (!sampled) sampleSkin();
      const tex = document.createElement("canvas"); tex.width = base.width; tex.height = base.height;
      const txc = tex.getContext("2d")!;

      // 2. Body landmarks (box units: figure height = 1, centred).
      const fw = cw / ch;
      const eyes = figure.eyes;
      const cx = eyes ? 0.5 + (eyes[0] / cw - 0.5) * fw : 0.5;
      const D = eyes ? eyes[2] / ch : 0.16;
      const eyeY = eyes ? eyes[1] / ch : 0.34;
      const neckY = Math.min(0.62, eyeY + D * 1.05);
      const feetY = 0.86;
      const armIn = Math.max(0.1, D * 0.85), tailX = Math.max(0.16, D * 1.15);
      const drawLids = (close: number) => {
        txc.clearRect(0, 0, tex.width, tex.height); txc.drawImage(base, 0, 0);
        if (!eyes || close <= 0.02) return;
        const d = eyes[2] * S, rx = d * 0.3, ry = d * 0.33;
        for (const sx of [-0.5, 0.5]) {
          const ex = (eyes[0] + sx * eyes[2]) * S, ey = eyes[1] * S;
          txc.save(); txc.beginPath(); txc.ellipse(ex, ey, rx, ry, 0, 0, TAU); txc.clip();
          txc.fillStyle = skin; txc.fillRect(ex - rx, ey - ry, rx * 2, ry * 2 * close);
          txc.restore();
          txc.strokeStyle = lash; txc.lineWidth = Math.max(1.5, d * 0.06); txc.lineCap = "round";
          const ly = ey - ry + ry * 2 * close;
          txc.beginPath();
          if (close > 0.9) txc.ellipse(ex, ey - ry * 0.1, rx * 0.8, ry * 0.45, 0, 0.15 * Math.PI, 0.85 * Math.PI); // closed: a happy curve
          else { txc.moveTo(ex - rx * 0.9, ly); txc.lineTo(ex + rx * 0.9, ly); }
          txc.stroke();
        }
      };
      drawLids(0);

      // 3. WebGL mesh.
      const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader"); return s; };
      const prog = gl.createProgram()!;
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
      gl.useProgram(prog);
      const uv: number[] = [], idx: number[] = [];
      for (let j = 0; j <= GRID_Y; j++) for (let i = 0; i <= GRID_X; i++) uv.push(i / GRID_X, j / GRID_Y);
      for (let j = 0; j < GRID_Y; j++) for (let i = 0; i < GRID_X; i++) { const a = j * (GRID_X + 1) + i, b = a + 1, c = a + GRID_X + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
      const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "aUV"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
      const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      const upload = () => gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex);
      upload();
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      const U = (n: string) => gl.getUniformLocation(prog, n);
      const uFig = U("uFig"), uView = U("uView"), uLand = U("uLand"), uLand2 = U("uLand2"), uHead = U("uHead"), uBody = U("uBody"), uLegs = U("uLegs"), uArms = U("uArms"), uFlip = U("uFlip"), uTone = U("uTone");
      gl.uniform2f(uFig, fw, 1); gl.uniform4f(uView, VIEW.x, VIEW.y, VIEW.w, VIEW.h);
      gl.uniform4f(uLand, cx, neckY, D, feetY); gl.uniform2f(uLand2, armIn, tailX);

      // 4. Animate: springs follow the pose's targets; eyes blink now and then.
      const cur: P = { ...REST };
      let last = performance.now(), nextBlink = last + 1500 + Math.random() * 2500, lid = -1;
      const frame = (now: number) => {
        if (stopped) return;
        const w = Math.round(canvas.clientWidth * Math.min(2, window.devicePixelRatio || 1)), h = Math.round(canvas.clientHeight * Math.min(2, window.devicePixelRatio || 1));
        if (w && h && (canvas.width !== w || canvas.height !== h)) { canvas.width = w; canvas.height = h; }
        gl.viewport(0, 0, canvas.width, canvas.height);
        // rAF's timestamp can be a little before `last` on the first frame: never let time run backwards (springs would explode)
        const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = Math.max(last, now);
        const L = live.current, T = now / 1000;
        const tg = target(L.pose, L.mood, (now - L.since) / 1000, T);
        const k = 1 - Math.exp(-dt * 16);
        (Object.keys(cur) as (keyof P)[]).forEach((n) => { cur[n] = n === "flip" ? tg.flip : reduce ? REST[n] : cur[n] + (tg[n] - cur[n]) * k; });
        // eyes: closed while asleep, otherwise a quick blink every few seconds
        let close = 0;
        if (L.pose === "sleep") close = 1;
        else if (!reduce && now > nextBlink) { const b = (now - nextBlink) / 150; close = b < 1 ? Math.sin(Math.PI * b) : 0; if (b >= 1) nextBlink = now + 2200 + Math.random() * 3800; }
        const q = Math.round(close * 8) / 8;
        if (q !== lid) { lid = q; drawLids(q); upload(); }
        gl.uniform4f(uHead, cur.tilt, cur.nod, cur.look, cur.hsq);
        gl.uniform4f(uBody, cur.sx, cur.sy, cur.lean, cur.bounce);
        gl.uniform4f(uLegs, cur.liftL, cur.liftR, cur.strL, cur.strR);
        gl.uniform4f(uArms, cur.armL, cur.armR, cur.tail, cur.breathe);
        gl.uniform1f(uFlip, cur.flip < 0 ? -1 : 1);
        const tn = toneRef.current; gl.uniform3f(uTone, tn === "sleep" ? 0.88 : 1, tn === "sick" ? 1 : 0, tn === "sick" ? 0.7 : 1);
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
        if (!reduce || L.pose === "sleep") raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    })().catch((e) => { console.warn("pet rig", e); if (!stopped) onFail?.(); });

    return () => { stopped = true; cancelAnimationFrame(raf); gl.getExtension("WEBGL_lose_context")?.loseContext(); };
  }, [key]);

  return (
    <>
      {/* index.css shrinks every canvas on phones (max-width:100%; height:auto !important) — not this one */}
      <style>{`.rwpet-rig{max-width:none !important;width:${VIEW.w * 100}% !important;height:${VIEW.h * 100}% !important;left:${VIEW.x * 100}%;top:${VIEW.y * 100}%}`}</style>
      <canvas key={key} ref={canvasRef} aria-hidden className="rwpet-rig absolute pointer-events-none" />
    </>
  );
}
