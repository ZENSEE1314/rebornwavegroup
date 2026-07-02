import type { ReactNode } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useRef, useState } from "react";

// The image is scaled up so it has vertical headroom, then panned by scroll:
// scale 1.25 leaves 12.5% overflow top/bottom, and the pan travels 6% -> -10%,
// staying inside that headroom. All movement is a pure function of scroll
// position — stop scrolling and everything freezes.
const IMAGE_SCALE = 1.25;
const PAN_FROM = "6%";
const PAN_TO = "-10%";

export interface HeroLevel {
  /** Empty for the entrance page — hides its stepper dot and caption card. */
  no: string;
  tone: string;
  title: string;
  units: string;
  detail: string;
  /** Landscape still for desktop screens. */
  imageSrc: string;
  /** 9:16 portrait crop served on portrait (mobile) screens. */
  portraitSrc: string;
}

interface ScrollFloorPagesProps {
  eyebrow?: string;
  title: ReactNode;
  scrollHint?: string;
  levels: HeroLevel[];
}

/**
 * Story-telling hero: each floor is a full-screen `position: sticky` page,
 * stacked in normal flow, so scrolling slides the next floor up over the
 * previous one — one floor per screen of scroll. While a page is on screen its
 * image pans vertically, driven ONLY by scroll position (scroll-linked, never
 * self-playing). Portrait screens get dedicated 9:16 crops via <picture>.
 *
 * NOTE: per-page useScroll doesn't work here — a stuck sticky element reports
 * rect.top = 0 forever, so its own progress never advances. Every page's pan
 * is therefore derived from the parent track's single scroll progress, each
 * page mapping its own segment of it.
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
  index,
  count,
  progress,
  eyebrow,
  title,
  scrollHint,
}: {
  level: HeroLevel;
  index: number;
  count: number;
  progress: MotionValue<number>;
  eyebrow?: string;
  title?: ReactNode;
  scrollHint?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  // This page is on screen from when it starts sliding in (previous segment)
  // until the next page has fully covered it (its own segment) — pan across
  // that whole window so the image is always moving while visible.
  const segStart = Math.max(0, (index - 1) / count);
  const segEnd = Math.min(1, (index + 1) / count);
  const y = useTransform(progress, [segStart, segEnd], [PAN_FROM, PAN_TO]);
  const introOpacity = useTransform(progress, [0, 0.7 / count], [1, 0]);

  return (
    <section className="sticky top-0 h-screen overflow-hidden" style={{ zIndex: index + 1 }}>
      <motion.div
        className="absolute inset-0"
        style={prefersReducedMotion ? undefined : { scale: IMAGE_SCALE, y }}
      >
        <picture className="block h-full w-full">
          <source media="(orientation: portrait)" srcSet={level.portraitSrc} />
          <img src={level.imageSrc} alt="" className="h-full w-full object-cover" />
        </picture>
      </motion.div>
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
        <div className="absolute inset-x-0 bottom-[7vh] flex justify-center px-4 sm:bottom-[9vh] sm:px-6">
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
        </div>
      ) : null}
    </section>
  );
}
