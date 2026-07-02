import type { ReactNode } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";

// Footage layer: scaled for vertical headroom, panned by scroll (slowest layer).
const IMAGE_SCALE = 1.18;
const PAN_FROM = "4%";
const PAN_TO = "-8%";
// Cap canvas backing-store resolution — frames are 840px wide, no point going higher.
const MAX_DPR = 1.5;

export interface HeroLevel {
  /** Empty for the entrance page — hides its stepper dot, caption, and layers. */
  no: string;
  tone: string;
  title: string;
  units: string;
  detail: string;
  /** Landscape still — instant backdrop while the frame sequence loads. */
  imageSrc: string;
  /** 9:16 portrait crop served on portrait (mobile) screens. */
  portraitSrc: string;
  /** Base path of this floor's scroll-scrubbed frame sequence (f01.jpg…). */
  seqBase?: string;
  /** Number of frames in the sequence. */
  seqCount?: number;
}

interface ScrollFloorPagesProps {
  eyebrow?: string;
  title: ReactNode;
  scrollHint?: string;
  levels: HeroLevel[];
}

/**
 * Layered-parallax, scroll-driven hero. Each floor is a full-screen sticky
 * page; the next floor slides up over it (one floor per screen of scroll).
 * While a floor is pinned, its real footage plays as a scroll-scrubbed frame
 * sequence on a canvas — motion comes from YOUR scroll, frame by frame; stop
 * scrolling and it freezes. On top, independent parallax layers move at
 * different speeds: a giant outlined floor number, a tone-colored glow, and
 * the caption card rising into place — the Slider-Revolution-style depth.
 *
 * NOTE: per-page useScroll doesn't work with stacked sticky pages (a stuck
 * element reports rect.top = 0 forever), so every layer derives its motion
 * from the parent track's single scroll progress, mapped to its own segment.
 */
export function ScrollFloorPages({ eyebrow, title, scrollHint, levels }: ScrollFloorPagesProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({ target: wrapRef, offset: ["start start", "end end"] });
  const barWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (!Number.isFinite(p)) return;
    setActive(Math.min(levels.length - 1, Math.max(0, Math.floor(p * levels.length))));
  });

  return (
    <div ref={wrapRef} className="relative bg-[#090d12]">
      <motion.div className="fixed left-0 top-0 z-30 h-[3px] bg-gradient-to-r from-amber-300 to-cyan-300" style={{ width: barWidth }} />

      {/* Vertical floor stepper — skips the entrance page, hidden on small screens */}
      <div className="pointer-events-none fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 space-y-3.5 sm:block">
        {levels.map((lvl, i) =>
          lvl.no ? (
            <div key={lvl.imageSrc} className="flex items-center justify-end gap-2.5" style={{ opacity: i === active ? 1 : 0.45 }}>
              <span className="text-xs font-bold tracking-widest text-white">{lvl.no}</span>
              <span
                className="inline-block h-2.5 w-2.5 rounded-full bg-white transition-transform"
                style={{ transform: i === active ? "scale(1.6)" : "scale(1)", backgroundColor: i === active ? lvl.tone : "#fff" }}
              />
            </div>
          ) : null,
        )}
      </div>

      {levels.map((lvl, i) => (
        <FloorPage
          key={lvl.imageSrc}
          level={lvl}
          index={i}
          count={levels.length}
          progress={scrollYProgress}
          near={Math.abs(active - i) <= 1}
          eyebrow={i === 0 ? eyebrow : undefined}
          title={i === 0 ? title : undefined}
          scrollHint={i === 0 ? scrollHint : undefined}
        />
      ))}
    </div>
  );
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cw: number, ch: number) {
  const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
  const w = img.naturalWidth * s;
  const h = img.naturalHeight * s;
  ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
}

function FloorPage({
  level,
  index,
  count,
  progress,
  near,
  eyebrow,
  title,
  scrollHint,
}: {
  level: HeroLevel;
  index: number;
  count: number;
  progress: MotionValue<number>;
  near: boolean;
  eyebrow?: string;
  title?: ReactNode;
  scrollHint?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const lastFrameRef = useRef(0);
  const loadStartedRef = useRef(false);
  const [seqReady, setSeqReady] = useState(false);

  // On screen from when it slides in (previous segment) until fully covered
  // (its own segment) — layers travel across that whole window.
  const segStart = Math.max(0, (index - 1) / count);
  const segEnd = Math.min(1, (index + 1) / count);
  const pinStart = index / count;

  // Layer speeds: footage slowest, glow mid, giant number fastest.
  const bgY = useTransform(progress, [segStart, segEnd], [PAN_FROM, PAN_TO]);
  const numY = useTransform(progress, [segStart, segEnd], ["36%", "-52%"]);
  const numOpacity = useTransform(progress, [segStart, (segStart + segEnd) / 2, segEnd], [0, 0.5, 0]);
  const glowY = useTransform(progress, [segStart, segEnd], ["22%", "-34%"]);
  const cardY = useTransform(progress, [pinStart - 0.5 / count, pinStart], ["70px", "0px"]);
  const cardOpacity = useTransform(progress, [pinStart - 0.45 / count, pinStart], [0, 1]);
  const introOpacity = useTransform(progress, [0, 0.7 / count], [1, 0]);
  const introY = useTransform(progress, [0, 1 / count], ["0%", "-45%"]);
  const eyebrowY = useTransform(progress, [0, 1 / count], ["0%", "-160%"]);

  // Lazily preload this floor's frame sequence once the visitor is near it.
  useEffect(() => {
    if (!near || loadStartedRef.current || prefersReducedMotion) return;
    const { seqBase, seqCount } = level;
    if (!seqBase || !seqCount) return;
    loadStartedRef.current = true;
    let loaded = 0;
    const frames: HTMLImageElement[] = [];
    for (let k = 0; k < seqCount; k++) {
      const img = new Image();
      img.onload = () => {
        loaded += 1;
        if (loaded === seqCount) {
          framesRef.current = frames;
          setSeqReady(true);
        }
      };
      img.src = `${seqBase}/f${String(k + 1).padStart(2, "0")}.jpg`;
      frames.push(img);
    }
  }, [near, level, prefersReducedMotion]);

  // Size the canvas to its box (and redraw) on mount + resize.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      const frame = framesRef.current[lastFrameRef.current];
      const ctx = canvas.getContext("2d");
      if (ctx && frame?.complete) drawCover(ctx, frame, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [seqReady]);

  // Scrub the footage with scroll during this floor's pinned phase.
  useMotionValueEvent(progress, "change", (p) => {
    if (!seqReady || prefersReducedMotion) return;
    const seqCount = level.seqCount ?? 0;
    const canvas = canvasRef.current;
    if (!canvas || seqCount === 0) return;
    const lp = Math.min(1, Math.max(0, (p - pinStart) * count));
    const frame = Math.min(seqCount - 1, Math.floor(lp * seqCount));
    if (frame === lastFrameRef.current && lp > 0) return;
    lastFrameRef.current = frame;
    const img = framesRef.current[frame];
    const ctx = canvas.getContext("2d");
    if (ctx && img?.complete) drawCover(ctx, img, canvas.width, canvas.height);
  });

  return (
    <section className="sticky top-0 h-screen overflow-hidden" style={{ zIndex: index + 1 }}>
      {/* Layer 1 — footage: still image backdrop + scroll-scrubbed canvas on top */}
      <motion.div
        className="absolute inset-0"
        style={prefersReducedMotion ? undefined : { scale: IMAGE_SCALE, y: bgY }}
      >
        <picture className="block h-full w-full">
          <source media="(orientation: portrait)" srcSet={level.portraitSrc} />
          <img src={level.imageSrc} alt="" className="h-full w-full object-cover" />
        </picture>
        {level.seqBase ? (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full transition-opacity duration-300"
            style={{ opacity: seqReady ? 1 : 0 }}
          />
        ) : null}
      </motion.div>

      {/* Layer 2 — vignette for text legibility */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.05)_28%,rgba(0,0,0,0.15)_60%,rgba(9,13,18,0.85)_100%)]" />

      {/* Layer 3 — tone-colored glow drifting at its own speed */}
      {level.no ? (
        <motion.div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 rounded-full mix-blend-screen"
          style={{
            background: `radial-gradient(circle, ${level.tone}33 0%, transparent 65%)`,
            ...(prefersReducedMotion ? {} : { y: glowY }),
          }}
        />
      ) : null}

      {/* Layer 4 — giant outlined floor number, fastest parallax layer */}
      {level.no ? (
        <motion.div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={prefersReducedMotion ? undefined : { y: numY, opacity: numOpacity }}
        >
          <span
            className="select-none text-[46vw] font-black leading-none tracking-tighter sm:text-[26vw]"
            style={{ WebkitTextStroke: `2px ${level.tone}55`, color: "transparent" }}
          >
            {level.no}
          </span>
        </motion.div>
      ) : null}

      {/* Entrance page — title layers, each on its own parallax speed */}
      {title ? (
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
          style={prefersReducedMotion ? undefined : { opacity: introOpacity }}
        >
          {eyebrow ? (
            <motion.span
              className="mb-5 inline-flex items-center rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-amber-200"
              style={prefersReducedMotion ? undefined : { y: eyebrowY }}
            >
              {eyebrow}
            </motion.span>
          ) : null}
          <motion.h1
            className="max-w-4xl text-5xl font-black leading-[0.95] tracking-tight text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.7)] md:text-7xl lg:text-8xl"
            style={prefersReducedMotion ? undefined : { y: introY }}
          >
            {title}
          </motion.h1>
          {scrollHint ? <p className="mt-8 text-sm text-white/70">{scrollHint}</p> : null}
        </motion.div>
      ) : null}

      {/* Layer 5 — caption card rising into place */}
      {level.no ? (
        <motion.div
          className="absolute inset-x-0 bottom-[7vh] flex justify-center px-4 sm:bottom-[9vh] sm:px-6"
          style={prefersReducedMotion ? undefined : { y: cardY, opacity: cardOpacity }}
        >
          <div
            className="w-[min(680px,94vw)] rounded-2xl border border-white/15 bg-[rgba(10,14,20,0.55)] p-4 backdrop-blur sm:p-6"
            style={{ borderLeft: `4px solid ${level.tone}` }}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-extrabold tracking-[0.18em]" style={{ color: level.tone }}>{level.no}</span>
              <span className="text-lg font-extrabold sm:text-xl md:text-2xl">{level.title}</span>
            </div>
            <div className="mt-1 text-sm font-semibold text-amber-200/85">{level.units}</div>
            <p className="mt-2 text-sm leading-relaxed text-white/75 sm:text-[15px]">{level.detail}</p>
          </div>
        </motion.div>
      ) : null}
    </section>
  );
}
