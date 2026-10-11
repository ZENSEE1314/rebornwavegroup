import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { TRANSLATIONS } from './i18n.js';

// Digits only, country code first (e.g. 6281234567890). Every WhatsApp button on the page uses this.
const WHATSAPP_NUMBER = '62XXXXXXXXXX';

const LANGUAGES = ['en', 'zh', 'id'];
// The same key the BridgeXPOS app reads, so the login page opens in the language chosen here.
const LANGUAGE_STORAGE_KEY = 'language';
const HTML_LANG = { en: 'en', zh: 'zh-Hans', id: 'id' };

const STACKED_BREAKPOINT = 1100;
const MAX_PIXEL_RATIO = 1.75;
const CAMERA_DISTANCE = 9;
const CAMERA_FOV = 35;
const SIDE_OFFSET_RATIO = 0.26;
const SIDE_YAW_TURNS = 0.045;
const FULL_SIZE_ASPECT = 1.6;
const POSE_DAMPING = 4;
const POINTER_DAMPING = 5;
const POINTER_TILT = { x: 0.28, y: 0.42 };
const NARROW_POSE = { introScale: 0.75, introY: 0.5, heroY: 1.5, heroScale: 0.5, heroDim: 0.3, scale: 1.25, dim: 0.78 };
const INTRO_SECONDS = 2.6;
const INTRO_SPIN_TURNS = 1.25;
const INTRO_SPREAD = 2.4;
const SCROLL_TILT = 0.22;
const SCROLL_TILT_LIMIT = 0.7;
const PARALLAX_RANGE = 1.5;
const CARD_TILT_DEGREES = 9;
const COUNT_UP_MS = 1400;
const PAGE_STEP_MS = 1100;
const PAGE_EDGE_TOLERANCE = 4;
const WHEEL_GESTURE_GAP_MS = 220;
const WHEEL_LINE_PIXELS = 16;
const SETTLE_DELAY_MS = 260;

const RING_RADIUS = 1.5;
const ORBIT_RADIUS = 1.28;
const NODE_ANGLES = [90, 30, -35, -90, -145, 150];
const ROAD_WIDTH = 0.46;
const ROAD_DEPTH = 0.1;
const ROAD_LIFT = 0.17;
const ROAD_SAMPLES = 64;
const DASH_COUNT = 13;
const HUE_BLUE = 0.615;
const HUE_CYAN = 0.5;
// Glass goes from clear (tint 0, the opening page) to brand-coloured (tint 1) as the visitor scrolls.
const CLEAR_GLASS = { saturation: 0.7, lightness: 0.66, emissive: 0.05 };
const TINTED_GLASS = { saturation: 1, lightness: 0.42, emissive: 0.22 };
const PARTICLE_COUNT = 700;

const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pages = [...document.querySelectorAll('.page')];

setUpLanguages();
decoratePages();
observeReveals();
wireCardTilt();
wirePageStepping();
const pager = buildPager();
document.getElementById('year').textContent = new Date().getFullYear();

try {
  startScene();
} catch (error) {
  console.error('BridgeX 3D scene could not start, showing the static logo instead:', error);
  document.documentElement.classList.add('no-webgl');
  addEventListener('scroll', () => pager.setActive(nearestPageIndex()), { passive: true });
}

// The page is written in English; every text is swapped for its 中文 / Bahasa Indonesia version from i18n.js.
function setUpLanguages() {
  const picker = document.querySelector('.lang');
  const headings = [...document.querySelectorAll('[data-split]')].map((element) => ({ element, english: element.textContent.trim() }));
  const texts = collectTextNodes();
  const attributes = [...document.querySelectorAll('[alt], [aria-label]')].flatMap((element) =>
    ['alt', 'aria-label'].filter((name) => element.hasAttribute(name)).map((name) => ({ element, name, english: element.getAttribute(name) })));
  const description = document.querySelector('meta[name="description"]');
  const head = { title: document.title, description: description.content };

  const apply = (language) => {
    const say = (english) => translate(english, language);
    for (const { node, english, before, after } of texts) node.nodeValue = before + say(english) + after;
    for (const { element, english } of headings) splitHeading(element, say(english), language);
    for (const { element, name, english } of attributes) element.setAttribute(name, say(english));
    for (const link of document.querySelectorAll('[data-whatsapp]')) {
      link.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(say(link.dataset.whatsapp))}`;
      link.target = '_blank';
      link.rel = 'noopener';
    }
    document.title = say(head.title);
    description.content = say(head.description);
    document.documentElement.lang = HTML_LANG[language];
    picker.value = language;
  };

  picker.addEventListener('change', () => {
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, picker.value); } catch { /* private mode: the choice lasts for this visit only */ }
    apply(picker.value);
  });
  apply(preferredLanguage());
}

function preferredLanguage() {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (LANGUAGES.includes(stored)) return stored;
  } catch { /* storage blocked: fall back to the browser's language */ }
  const browser = navigator.language.toLowerCase();
  if (browser.startsWith('zh')) return 'zh';
  if (browser.startsWith('id')) return 'id';
  return 'en';
}

function translate(english, language) {
  const versions = TRANSLATIONS[english];
  if (language === 'en' || !versions) return english;
  return versions[language === 'zh' ? 0 : 1];
}

function collectTextNodes() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (node.nodeValue.trim() && !node.parentElement.closest('[data-split], script, style, select')
      ? NodeFilter.FILTER_ACCEPT
      : NodeFilter.FILTER_REJECT),
  });
  const found = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const english = node.nodeValue.trim();
    const start = node.nodeValue.indexOf(english);
    found.push({ node, english, before: node.nodeValue.slice(0, start), after: node.nodeValue.slice(start + english.length) });
  }
  return found;
}

function splitHeading(heading, text, language) {
  const isChinese = language === 'zh';
  const words = isChinese ? chineseWords(text) : text.split(/\s+/);
  heading.setAttribute('aria-label', text);
  heading.replaceChildren();
  words.forEach((word, index) => {
    const wrap = document.createElement('span');
    wrap.className = 'word';
    wrap.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('span');
    inner.style.setProperty('--i', index);
    inner.textContent = word;
    wrap.append(inner);
    heading.append(wrap, isChinese ? '' : ' ');
  });
}

// Chinese has no spaces, so the reveal goes word by word with punctuation kept on the word before it.
function chineseWords(text) {
  if (!Intl.Segmenter) return [...text];
  const words = [];
  for (const { segment, isWordLike } of new Intl.Segmenter('zh', { granularity: 'word' }).segment(text)) {
    if (isWordLike || !words.length) words.push(segment);
    else words[words.length - 1] += segment;
  }
  return words;
}

function decoratePages() {
  pages.forEach((page, index) => {
    const grid = document.createElement('div');
    grid.className = 'page__grid';
    grid.setAttribute('aria-hidden', 'true');
    grid.innerHTML = '<i></i><i></i><i></i>';
    const number = document.createElement('span');
    number.className = 'page__index';
    number.setAttribute('aria-hidden', 'true');
    number.textContent = String(index + 1).padStart(2, '0');
    page.prepend(grid, number);
  });
}

function observeReveals() {
  for (const page of pages) {
    page.querySelectorAll('[data-reveal]').forEach((element, i) => element.style.setProperty('--i', i + 2));
  }
  // Toggling (not just adding) the class replays each page's entrance every time it scrolls back into view.
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      entry.target.classList.toggle('is-visible', entry.isIntersecting);
      if (entry.isIntersecting) entry.target.querySelectorAll('[data-count]').forEach(countUp);
    }
  }, { threshold: 0.18 });
  pages.forEach((page) => observer.observe(page));
}

function countUp(element) {
  const target = Number(element.dataset.count);
  const suffix = element.dataset.suffix ?? '';
  if (prefersReducedMotion) return;
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min(1, (now - start) / COUNT_UP_MS);
    element.textContent = Math.round(target * (1 - (1 - progress) ** 3)) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function wireCardTilt() {
  if (prefersReducedMotion) return;
  for (const card of document.querySelectorAll('.card, .plan, .stack > div, .stats > div, .faq details, .shot__frame')) {
    card.addEventListener('pointermove', (event) => {
      const box = card.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      card.style.setProperty('--tilt-x', (-y * CARD_TILT_DEGREES * 2).toFixed(2));
      card.style.setProperty('--tilt-y', (x * CARD_TILT_DEGREES * 2).toFixed(2));
      card.style.setProperty('--glare-x', `${((x + 0.5) * 100).toFixed(1)}%`);
      card.style.setProperty('--glare-y', `${((y + 0.5) * 100).toFixed(1)}%`);
      card.classList.add('is-tilting');
    });
    card.addEventListener('pointerleave', () => {
      card.style.removeProperty('--tilt-x');
      card.style.removeProperty('--tilt-y');
      card.classList.remove('is-tilting');
    });
  }
}

function buildPager() {
  const dotsHost = document.querySelector('.pager__dots');
  const current = document.querySelector('.pager__current');
  document.querySelector('.pager__total').textContent = String(pages.length).padStart(2, '0');
  const dots = pages.map(() => {
    const dot = document.createElement('span');
    dot.className = 'pager__dot';
    dotsHost.append(dot);
    return dot;
  });
  let activeIndex = -1;
  return {
    setActive(index) {
      if (index === activeIndex) return;
      dots[activeIndex]?.classList.remove('is-active');
      dots[index].classList.add('is-active');
      current.textContent = String(index + 1).padStart(2, '0');
      activeIndex = index;
    },
  };
}

// One scroll gesture = one page: the wheel, arrow keys and in-page links all glide to the next page's top.
function wirePageStepping() {
  let isGliding = false;
  // A trackpad keeps sending wheel events (inertia) long after the fingers lift; all of them belong to one gesture.
  const gesture = { lastEventAt: 0, direction: 0, startedAtEdge: false, hasStepped: false };

  const glideTo = (target) => {
    if (isGliding || Math.abs(target - scrollY) < 1) return;
    if (prefersReducedMotion) return scrollTo(0, target);
    isGliding = true;
    const from = scrollY;
    const start = performance.now();
    const frame = (now) => {
      const progress = Math.min(1, (now - start) / PAGE_STEP_MS);
      scrollTo(0, from + (target - from) * THREE.MathUtils.smootherstep(progress, 0, 1));
      if (progress < 1) return requestAnimationFrame(frame);
      isGliding = false;
    };
    requestAnimationFrame(frame);
  };

  const goToPage = (index) => glideTo(pages[THREE.MathUtils.clamp(index, 0, pages.length - 1)].offsetTop);

  const currentPage = () => {
    const index = pages.findIndex((page) => scrollY < page.offsetTop + page.offsetHeight - PAGE_EDGE_TOLERANCE);
    return pages[index === -1 ? pages.length - 1 : index];
  };

  // Where the screen may rest on a page: its top, or anywhere down to its end if it is taller than the screen.
  const restRange = (page) => {
    const top = page.offsetTop;
    return { top, bottom: Math.max(top, top + page.offsetHeight - innerHeight) };
  };

  const isAtEdge = (page, direction) => {
    const { top, bottom } = restRange(page);
    return direction > 0 ? scrollY >= bottom - PAGE_EDGE_TOLERANCE : scrollY <= top + PAGE_EDGE_TOLERANCE;
  };

  addEventListener('wheel', (event) => {
    if (event.ctrlKey || !event.deltaY) return;
    event.preventDefault();
    const now = performance.now();
    const direction = Math.sign(event.deltaY);
    const isNewGesture = now - gesture.lastEventAt > WHEEL_GESTURE_GAP_MS || direction !== gesture.direction;
    gesture.lastEventAt = now;
    if (isGliding) return;

    const page = currentPage();
    if (isNewGesture) Object.assign(gesture, { direction, startedAtEdge: isAtEdge(page, direction), hasStepped: false });
    if (gesture.hasStepped) return;
    if (gesture.startedAtEdge) {
      gesture.hasStepped = true;
      goToPage(pages.indexOf(page) + direction);
      return;
    }
    // Inside a page taller than the screen: read on within it, never past its edge. The next gesture turns the page.
    const { top, bottom } = restRange(page);
    const pixels = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * WHEEL_LINE_PIXELS : event.deltaY;
    scrollTo(0, THREE.MathUtils.clamp(scrollY + pixels, top, bottom));
  }, { passive: false });

  addEventListener('keydown', (event) => {
    const direction = { ArrowDown: 1, PageDown: 1, ' ': 1, ArrowUp: -1, PageUp: -1 }[event.key];
    if (!direction || event.target.closest('input, textarea, select, summary, a, button')) return;
    const page = currentPage();
    if (!isGliding && !isAtEdge(page, direction)) return;
    event.preventDefault();
    if (!isGliding) goToPage(pages.indexOf(page) + direction);
  });

  for (const link of document.querySelectorAll('a[href^="#"]:not([data-whatsapp])')) {
    link.addEventListener('click', (event) => {
      const page = document.querySelector(link.getAttribute('href'))?.closest('.page, main');
      if (!page) return;
      event.preventDefault();
      goToPage(Math.max(0, pages.indexOf(page)));
    });
  }

  // A scroll that stops between two pages (scrollbar drag, window resize) settles on the nearer one.
  // Touch screens are left to the browser's own snapping (site.css).
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let settleTimer;
  addEventListener('scroll', () => {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      if (isGliding) return;
      const page = currentPage();
      const { bottom } = restRange(page);
      const next = pages[pages.indexOf(page) + 1];
      if (scrollY <= bottom + PAGE_EDGE_TOLERANCE || !next) return;
      glideTo(scrollY - bottom < next.offsetTop - scrollY ? bottom : next.offsetTop);
    }, SETTLE_DELAY_MS);
  }, { passive: true });
}

function nearestPageIndex() {
  const middle = scrollY + innerHeight / 2;
  const index = pages.findIndex((page) => middle < page.offsetTop + page.offsetHeight);
  return index === -1 ? pages.length - 1 : index;
}

function startScene() {
  const canvas = document.getElementById('stage');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
  camera.position.z = CAMERA_DISTANCE;

  const materials = createMaterials();
  const logo = createLogo(materials);
  scene.add(logo.group);

  const particles = createParticles();
  const backdrop = createBackdrop();
  scene.add(particles, backdrop);

  const lights = createLights();
  scene.add(...Object.values(lights));

  const pointer = { x: 0, y: 0, smoothX: 0, smoothY: 0 };
  addEventListener('pointermove', (event) => {
    pointer.x = (event.clientX / innerWidth) * 2 - 1;
    pointer.y = (event.clientY / innerHeight) * 2 - 1;
  });

  let poses = [];
  let centers = [];
  const measure = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    poses = pages.map(readPose);
    centers = pages.map((page) => page.offsetTop + page.offsetHeight / 2);
  };
  measure();
  addEventListener('resize', measure);
  new ResizeObserver(measure).observe(document.body);

  const live = { ...blendPoses(poses, centers) };
  const clock = new THREE.Clock();
  let lastScrollY = scrollY;
  let scrollVelocity = 0;

  renderer.setAnimationLoop(() => {
    const delta = Math.min(clock.getDelta(), 0.1);
    const time = prefersReducedMotion ? 0 : clock.elapsedTime;
    const target = blendPoses(poses, centers);
    for (const key of Object.keys(live)) live[key] = damp(live[key], target[key], POSE_DAMPING, delta);
    pointer.smoothX = damp(pointer.smoothX, pointer.x, POINTER_DAMPING, delta);
    pointer.smoothY = damp(pointer.smoothY, pointer.y, POINTER_DAMPING, delta);

    const pagesPerSecond = delta > 0 ? (scrollY - lastScrollY) / innerHeight / delta : 0;
    scrollVelocity = damp(scrollVelocity, pagesPerSecond, POSE_DAMPING, delta);
    lastScrollY = scrollY;
    const scrollTilt = THREE.MathUtils.clamp(scrollVelocity * SCROLL_TILT, -SCROLL_TILT_LIMIT, SCROLL_TILT_LIMIT);

    // The logo assembles itself on load: layers fly in from depth while it spins up to full size.
    const assembled = prefersReducedMotion ? 1 : easeOutCubic(Math.min(1, clock.elapsedTime / INTRO_SECONDS));

    const viewHeight = 2 * CAMERA_DISTANCE * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
    logo.group.position.set(live.side * viewHeight * camera.aspect * SIDE_OFFSET_RATIO, live.y + Math.sin(time * 0.8) * 0.06, 0);
    logo.group.scale.setScalar(live.scale * assembled);
    logo.group.rotation.set(
      pointer.smoothY * POINTER_TILT.x + Math.sin(time * 0.5) * 0.05 + scrollTilt,
      (live.turn - (1 - assembled) * INTRO_SPIN_TURNS) * Math.PI * 2 + pointer.smoothX * POINTER_TILT.y + Math.sin(time * 0.35) * 0.12,
      scrollTilt * 0.3,
    );
    logo.update(live.spread + (1 - assembled) * INTRO_SPREAD, time);

    applyGlassLook(materials, lights, live.hue, live.tint);
    lights.cursor.position.set(pointer.smoothX * 4.5, -pointer.smoothY * 2.8, 3);
    particles.rotation.set(scrollTilt * 0.4, time * 0.02 + pointer.smoothX * 0.05, 0);
    particles.position.y = (scrollY / Math.max(1, document.body.scrollHeight)) * 6;
    backdrop.position.set(-pointer.smoothX * 0.8, pointer.smoothY * 0.5 + Math.sin(time * 0.2) * 0.6, backdrop.position.z);
    backdrop.rotation.z = time * 0.03;
    canvas.style.opacity = String(1 - live.dim);
    updateParallax(centers);

    pager.setActive(nearestPageIndex());
    renderer.render(scene, camera);
  });
}

function readPose(page, index) {
  const number = (name, fallback) => (page.dataset[name] === undefined ? fallback : Number(page.dataset[name]));
  const pose = {
    side: number('side', 0),
    y: number('y', 0),
    scale: number('scale', 1),
    turn: number('turn', 0) - number('side', 0) * SIDE_YAW_TURNS,
    spread: number('spread', 0),
    hue: number('hue', 0),
    dim: number('dim', 0),
    tint: number('tint', 1),
  };
  if (innerWidth > STACKED_BREAKPOINT) {
    return { ...pose, scale: pose.scale * Math.min(1, innerWidth / innerHeight / FULL_SIZE_ASPECT) };
  }
  // On narrow screens the logo cannot sit beside the text: it opens alone, floats above the hero, then fades behind every other page.
  if (page.classList.contains('page--intro')) return { ...pose, scale: NARROW_POSE.introScale, y: NARROW_POSE.introY };
  const isHero = page.classList.contains('page--hero');
  return {
    ...pose,
    side: 0,
    y: isHero ? NARROW_POSE.heroY : 0,
    scale: isHero ? NARROW_POSE.heroScale : NARROW_POSE.scale,
    dim: isHero ? NARROW_POSE.heroDim : Math.max(pose.dim, NARROW_POSE.dim),
  };
}

function updateParallax(centers) {
  const middle = scrollY + innerHeight / 2;
  pages.forEach((page, index) => {
    const offset = (centers[index] - middle) / innerHeight;
    if (Math.abs(offset) < PARALLAX_RANGE) page.style.setProperty('--offset', offset.toFixed(3));
  });
}

function easeOutCubic(progress) {
  return 1 - (1 - progress) ** 3;
}

function blendPoses(poses, centers) {
  const middle = scrollY + innerHeight / 2;
  let index = 0;
  while (index < centers.length - 2 && middle > centers[index + 1]) index++;
  const next = Math.min(index + 1, poses.length - 1);
  const span = centers[next] - centers[index] || 1;
  const progress = THREE.MathUtils.smootherstep((middle - centers[index]) / span, 0, 1);
  const blended = {};
  for (const key of Object.keys(poses[index])) {
    blended[key] = THREE.MathUtils.lerp(poses[index][key], poses[next][key], progress);
  }
  return blended;
}

function damp(current, target, lambda, delta) {
  return THREE.MathUtils.damp(current, target, lambda, delta);
}

function createMaterials() {
  const glass = (hue) => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color().setHSL(hue, TINTED_GLASS.saturation, TINTED_GLASS.lightness),
    emissive: new THREE.Color().setHSL(hue, 1, 0.5),
    emissiveIntensity: TINTED_GLASS.emissive,
    roughness: 0.06,
    metalness: 0,
    transmission: 0.82,
    thickness: 1.1,
    ior: 1.5,
    dispersion: 0.6,
    attenuationColor: new THREE.Color().setHSL(hue, 1, 0.5),
    attenuationDistance: 1.4,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 0.4,
  });
  return {
    roadBlue: glass(HUE_BLUE),
    roadCyan: glass(HUE_CYAN),
    ring: glass(HUE_BLUE),
    bridge: new THREE.MeshStandardMaterial({ color: 0x0a2468, emissive: 0x0a2fb0, emissiveIntensity: 0.3, roughness: 0.35, metalness: 0.6 }),
    node: new THREE.MeshStandardMaterial({ color: 0x28c8ee, emissive: 0x1fb4e6, emissiveIntensity: 0.6, roughness: 0.2 }),
    dash: new THREE.MeshBasicMaterial({ color: 0xeaf6ff }),
    orbit: new THREE.MeshBasicMaterial({ color: 0x3fb8ff, transparent: true, opacity: 0.55 }),
  };
}

function applyGlassLook(materials, lights, hueShift, tint) {
  const { lerp } = THREE.MathUtils;
  const saturation = lerp(CLEAR_GLASS.saturation, TINTED_GLASS.saturation, tint);
  const lightness = lerp(CLEAR_GLASS.lightness, TINTED_GLASS.lightness, tint);
  for (const [material, hue] of [[materials.roadBlue, HUE_BLUE], [materials.ring, HUE_BLUE], [materials.roadCyan, HUE_CYAN]]) {
    material.color.setHSL(hue + hueShift, saturation, lightness);
    material.emissive.setHSL(hue + hueShift, 1, 0.5);
    material.emissiveIntensity = lerp(CLEAR_GLASS.emissive, TINTED_GLASS.emissive, tint);
    material.attenuationColor.setHSL(hue + hueShift, saturation, lerp(0.85, 0.5, tint));
  }
  lights.key.color.setHSL(HUE_BLUE + 0.08 + hueShift, tint * 0.6, lerp(1, 0.8, tint));
  lights.rim.color.setHSL(HUE_BLUE + hueShift, 1, 0.55);
  lights.cursor.color.setHSL(HUE_CYAN + hueShift, 1, 0.6);
}

function createLights() {
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(3, 4, 6);
  const rim = new THREE.PointLight(0x2f6bff, 24, 30);
  rim.position.set(-5, -2, -3);
  const cursor = new THREE.PointLight(0x28e0e6, 10, 16);
  return { key, rim, cursor };
}

function createLogo(materials) {
  const group = new THREE.Group();

  const halo = createGlowSprite(0x1f5bff, 6.4, 0.55);
  halo.position.z = -1.2;

  const ring = new THREE.Group();
  ring.add(
    new THREE.Mesh(new THREE.TorusGeometry(RING_RADIUS, 0.055, 24, 180), materials.ring),
    createSwoosh(materials.roadCyan),
  );

  const bridge = createBridge(materials.bridge);
  bridge.position.z = -0.28;

  const roadRising = createRoad(1, ROAD_LIFT, materials.roadCyan, materials.dash);
  const roadFalling = createRoad(-1, -ROAD_LIFT, materials.roadBlue, materials.dash);

  const orbit = new THREE.Group();
  orbit.add(new THREE.Mesh(new THREE.TorusGeometry(ORBIT_RADIUS, 0.01, 8, 160), materials.orbit));
  const nodes = NODE_ANGLES.map((degrees) => {
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.095, 32, 32), materials.node);
    node.add(createGlowSprite(0x28e0e6, 0.7, 0.55));
    node.userData.angle = THREE.MathUtils.degToRad(degrees);
    orbit.add(node);
    return node;
  });

  group.add(halo, bridge, ring, roadFalling, roadRising, orbit);

  // `spread` pulls the layers apart along the depth axis so each project page shows the mark "exploded".
  const update = (spread, time) => {
    ring.position.z = -spread * 0.7;
    ring.rotation.z = spread * 0.6 - time * 0.12;
    roadRising.userData.driveDashes(time);
    roadFalling.userData.driveDashes(time);
    bridge.position.z = -0.28 - spread * 1.5;
    roadRising.position.z = spread * 0.75;
    roadFalling.position.z = spread * 0.15;
    orbit.position.z = spread * 1.25;
    orbit.rotation.z = time * 0.25;
    const radius = ORBIT_RADIUS * (1 + spread * 0.12);
    orbit.children[0].scale.setScalar(1 + spread * 0.12);
    for (const node of nodes) {
      node.position.set(Math.cos(node.userData.angle) * radius, Math.sin(node.userData.angle) * radius, 0);
      node.scale.setScalar(1 + Math.sin(time * 2 + node.userData.angle * 3) * 0.12);
    }
  };

  return { group, update };
}

function createSwoosh(material) {
  const swoosh = new THREE.Mesh(new THREE.TorusGeometry(RING_RADIUS, 0.1, 24, 100, Math.PI * 0.85), material);
  swoosh.rotation.z = Math.PI * 0.45;
  swoosh.scale.set(1.02, 1.02, 0.6);
  return swoosh;
}

function roadCurve(direction) {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.1 * direction, -0.98, 0),
    new THREE.Vector3(-0.62 * direction, -0.58, 0),
    new THREE.Vector3(0, -0.02, 0),
    new THREE.Vector3(0.74 * direction, 0.36, 0),
    new THREE.Vector3(1.42 * direction, 0.42, 0),
  ]);
}

function roadLiftAt(x, y, lift) {
  return lift * Math.exp(-(x * x + y * y) / 0.45);
}

function createRoad(direction, lift, material, dashMaterial) {
  const curve = roadCurve(direction);
  // Each cross-section is a rectangle: [top-left, top-right, bottom-right, bottom-left].
  const sections = [];
  for (let i = 0; i <= ROAD_SAMPLES; i++) {
    const u = i / ROAD_SAMPLES;
    const point = curve.getPointAt(u);
    const tangent = curve.getTangentAt(u);
    const halfWidth = (ROAD_WIDTH / 2) * (0.45 + 0.55 * Math.sin(Math.PI * u) ** 0.6);
    const z = roadLiftAt(point.x, point.y, lift);
    const edge = (sign, depth) => new THREE.Vector3(point.x - sign * tangent.y * halfWidth, point.y + sign * tangent.x * halfWidth, z + depth);
    sections.push([edge(1, ROAD_DEPTH / 2), edge(-1, ROAD_DEPTH / 2), edge(-1, -ROAD_DEPTH / 2), edge(1, -ROAD_DEPTH / 2)]);
  }

  // Faces get their own vertices so the edges stay crisp while the length stays smooth.
  const positions = [];
  const indices = [];
  const pushQuad = (a, b, c, d) => {
    const base = positions.length / 3;
    for (const corner of [a, b, c, d]) positions.push(corner.x, corner.y, corner.z);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  for (let face = 0; face < 4; face++) {
    const base = positions.length / 3;
    for (const section of sections) {
      for (const corner of [section[face], section[(face + 1) % 4]]) positions.push(corner.x, corner.y, corner.z);
    }
    for (let i = 0; i < ROAD_SAMPLES; i++) {
      const a = base + i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  pushQuad(...sections[0]);
  pushQuad(...[...sections[ROAD_SAMPLES]].reverse());

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const road = new THREE.Group();
  const dashes = createDashes(curve, lift, dashMaterial);
  road.add(new THREE.Mesh(geometry, material), dashes.mesh);
  road.userData.driveDashes = dashes.drive;
  return road;
}

function createDashes(curve, lift, material) {
  const DASH_SPEED = 0.05;
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.13, 0.024, 0.012), material, DASH_COUNT);
  const transform = new THREE.Object3D();
  // Lane markings travel along the road so the mark always reads as traffic in motion.
  const drive = (time) => {
    for (let i = 0; i < DASH_COUNT; i++) {
      const u = 0.06 + 0.88 * ((i / DASH_COUNT + time * DASH_SPEED) % 1);
      const point = curve.getPointAt(u);
      const tangent = curve.getTangentAt(u);
      transform.position.set(point.x, point.y, roadLiftAt(point.x, point.y, lift) + ROAD_DEPTH / 2 + 0.032);
      transform.rotation.set(0, 0, Math.atan2(tangent.y, tangent.x));
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  drive(0);
  return { mesh, drive };
}

function createBridge(material) {
  const DECK_Y = 0.06;
  const DECK_HALF = 1.25;
  const TOWER_X = 0.62;
  const TOWER_TOP = 0.98;
  const bridge = new THREE.Group();

  const deck = new THREE.Mesh(new THREE.BoxGeometry(DECK_HALF * 2, 0.07, 0.12), material);
  deck.position.y = DECK_Y;
  bridge.add(deck);

  for (const x of [-TOWER_X, TOWER_X]) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.13, 1.5, 0.13), material);
    tower.position.set(x, TOWER_TOP - 0.75, 0);
    bridge.add(tower);
  }

  const cableHeight = (x) => {
    const ax = Math.abs(x);
    if (ax <= TOWER_X) return 0.36 + (TOWER_TOP - 0.36) * (ax / TOWER_X) ** 2;
    return DECK_Y + (TOWER_TOP - DECK_Y) * (Math.max(0, DECK_HALF - ax) / (DECK_HALF - TOWER_X)) ** 1.6;
  };
  const cablePoints = [];
  for (let x = -DECK_HALF; x <= DECK_HALF + 1e-6; x += 0.05) cablePoints.push(new THREE.Vector3(x, cableHeight(x), 0));
  bridge.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePoints), 120, 0.017, 8), material));

  for (let x = -DECK_HALF + 0.12; x < DECK_HALF; x += 0.12) {
    const height = cableHeight(x) - DECK_Y;
    if (height < 0.06) continue;
    const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, height, 6), material);
    hanger.position.set(x, DECK_Y + height / 2, 0);
    bridge.add(hanger);
  }
  return bridge;
}

function createGlowSprite(color, size, opacity) {
  const TEXTURE_SIZE = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TEXTURE_SIZE;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(canvas),
    color,
    opacity,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  sprite.scale.setScalar(size);
  return sprite;
}

function createParticles() {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3] = THREE.MathUtils.randFloatSpread(26);
    positions[i * 3 + 1] = THREE.MathUtils.randFloatSpread(22);
    positions[i * 3 + 2] = THREE.MathUtils.randFloat(-14, 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({
    color: 0x6fb6ff,
    size: 0.045,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
}

// Opaque colour field behind the logo: transmissive glass can only refract opaque objects, so this is what bends through it.
function createBackdrop() {
  const TEXTURE_SIZE = 512;
  const BLOBS = [
    [0.3, 0.35, 0.3, 'rgba(47,107,255,0.55)'],
    [0.7, 0.4, 0.26, 'rgba(40,224,230,0.4)'],
    [0.55, 0.72, 0.3, 'rgba(124,77,255,0.45)'],
    [0.42, 0.55, 0.12, 'rgba(255,255,255,0.16)'],
  ];
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TEXTURE_SIZE;
  const context = canvas.getContext('2d');
  context.fillStyle = '#02040c';
  context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  for (const [x, y, radius, color] of BLOBS) {
    const gradient = context.createRadialGradient(x * TEXTURE_SIZE, y * TEXTURE_SIZE, 0, x * TEXTURE_SIZE, y * TEXTURE_SIZE, radius * TEXTURE_SIZE);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(2,4,12,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  backdrop.position.z = -5;
  return backdrop;
}
