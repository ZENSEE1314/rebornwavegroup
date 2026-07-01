import type { ReactNode } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useRef, useState } from "react";

// Title overlay fades over the first third of the entrance page's own scroll.
const INTRO_FADE = 0.35;
// Still-image pages (the entrance) need a stronger Ken Burns push since they
// have no motion of their own. Video pages get a much subtler drift — the
// clip itself already supplies the movement.
const IMAGE_ZOOM = { from: 1.18, to: 1.0 };
const VIDEO_ZOOM = { from: 1.06, to: 1.0 };
const PAN_PERCENT = -5;

export interface HeroLevel {
  /** Empty for the entrance page — hides its stepper dot and caption card. */
  no: string;
  tone: string;
  title: string;
  units: string;
  detail: string;
  /** Still image — used alone for the entrance page, or as the video's poster frame. */
  imageSrc: string;
  /** Looping clip for this floor. Omit for a still-image page (the entrance). */
  videoSrc?: string;
}

interface ScrollFloorPagesProps {
  eyebrow?: string;
  title: ReactNode;
  scrollHint?: string;
  levels: HeroLevel[];
}

/**
 * Each floor is its own full-screen "page": a `position: sticky` section
 * exactly one viewport tall, stacked in normal document flow. Floor pages
 * play a real looping video (autoplay+muted, so no gesture/JS gating is
 * needed — each page is a persistent DOM node, never conditionally toggled,
 * so there's no opacity-index class of bug to chase). The entrance page is a
 * plain still photo. A slow scroll-linked zoom adds extra drift on top.
 */
export function ScrollFloorPages({ eyebrow, title, scrollHint, levels }: ScrollFloorPagesProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // Whole-track progress, only used to drive the top progress bar + stepper.
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
          zIndex={i + 1}
          eyebrow={i === 0 ? eyebrow : undefined}
          title={i === 0 ? title : undefined}
          scrollHint={i === 0 ? scrollHint : undefined}
        />
      ))}
    </div>
  );
}

function FloorPage({
  level,
  zIndex,
  eyebrow,
  title,
  scrollHint,
}: {
  level: HeroLevel;
  zIndex: number;
  eyebrow?: string;
  title?: ReactNode;
  scrollHint?: string;
}) {
  const pageRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const zoom = level.videoSrc ? VIDEO_ZOOM : IMAGE_ZOOM;

  const { scrollYProgress } = useScroll({ target: pageRef, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [zoom.from, zoom.to]);
  const y = useTransform(scrollYProgress, [0, 1], ["0%", `${PAN_PERCENT}%`]);
  const introOpacity = useTransform(scrollYProgress, [0, INTRO_FADE], [1, 0]);
  const captionOpacity = useTransform(scrollYProgress, [0, 0.1, 0.85, 1], [0, 1, 1, 0.3]);

  return (
    <section ref={pageRef} className="sticky top-0 h-screen overflow-hidden" style={{ zIndex }}>
      {level.videoSrc ? (
        <motion.video
          className="absolute inset-0 h-full w-full object-cover"
          style={prefersReducedMotion ? undefined : { scale, y }}
          src={level.videoSrc}
          poster={level.imageSrc}
          autoPlay
          muted
          loop
          playsInline
        />
      ) : (
        <motion.img
          src={level.imageSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={prefersReducedMotion ? undefined : { scale, y }}
        />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.05)_28%,rgba(0,0,0,0.15)_60%,rgba(9,13,18,0.85)_100%)]" />

      {title ? (
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
          style={prefersReducedMotion ? undefined : { opacity: introOpacity }}
        >
          {eyebrow ? (
            <span className="mb-5 inline-flex items-center rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-amber-200">
              {eyebrow}
            </span>
          ) : null}
          <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-tight text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.7)] md:text-7xl lg:text-8xl">
            {title}
          </h1>
          {scrollHint ? <p className="mt-8 text-sm text-white/70">{scrollHint}</p> : null}
        </motion.div>
      ) : null}

      {level.no ? (
        <motion.div
          className="absolute inset-x-0 bottom-[9vh] flex justify-center px-6"
          style={prefersReducedMotion ? undefined : { opacity: captionOpacity }}
        >
          <div
            className="w-[min(680px,92vw)] rounded-2xl border border-white/15 bg-[rgba(10,14,20,0.55)] p-6 backdrop-blur"
            style={{ borderLeft: `4px solid ${level.tone}` }}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-extrabold tracking-[0.18em]" style={{ color: level.tone }}>{level.no}</span>
              <span className="text-xl font-extrabold md:text-2xl">{level.title}</span>
            </div>
            <div className="mt-1 text-sm font-semibold text-amber-200/85">{level.units}</div>
            <p className="mt-2 text-[15px] leading-relaxed text-white/75">{level.detail}</p>
          </div>
        </motion.div>
      ) : null}
    </section>
  );
}
