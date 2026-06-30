import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

// Scroll track length of the pinned hero — long enough that all 8 sectors get
// room to read, while scrubbing keeps every scroll movement responsive.
const SCROLL_TRACK = "560vh";
// Progress at which the intro clip hands off to the scrubbed continuous clip.
const SCRUB_START = 0.12;

export interface HeroLevel {
  no: string;
  tone: string;
  title: string;
  units: string;
  detail: string;
  /** Timestamp (seconds) in the continuous clip where this sector's scene is on screen. */
  at: number;
}

interface ScrollVideoLevelsProps {
  introVideoSrc: string;
  scrubVideoSrc: string;
  posterSrc?: string;
  eyebrow?: string;
  title: ReactNode;
  scrollHint?: string;
  levels: HeroLevel[];
}

/**
 * Pinned hero where the top plays an intro clip, then on scroll crossfades to a
 * second "continuous" clip that is scrubbed by scroll position — each floor
 * (1F → 5F) maps to a segment of that clip, so scrolling moves through the video.
 *
 * The scrub clip must be encoded all-intra (every frame a keyframe) so seeking
 * to any scroll position is smooth instead of snapping between keyframes.
 */
export function ScrollVideoLevels({
  introVideoSrc,
  scrubVideoSrc,
  posterSrc,
  eyebrow,
  title,
  scrollHint,
  levels,
}: ScrollVideoLevelsProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLVideoElement>(null);
  const scrubRef = useRef<HTMLVideoElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const introOpacity = useTransform(scrollYProgress, [0, SCRUB_START], [1, 0]);
  const scrubOpacity = useTransform(scrollYProgress, [SCRUB_START * 0.4, SCRUB_START], [0, 1]);
  const levelOpacity = useTransform(scrollYProgress, [SCRUB_START * 0.7, SCRUB_START * 1.3], [0, 1]);
  const barWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  // Move the camera between each sector's exact moment in the continuous clip,
  // interpolating between their timestamps, and pick the nearest floor.
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const sp = Math.min(1, Math.max(0, (p - SCRUB_START) / (1 - SCRUB_START)));
    const pos = sp * (levels.length - 1);
    const k = Math.min(levels.length - 2, Math.floor(pos));
    const frac = pos - k;
    const video = scrubRef.current;
    if (video && !prefersReducedMotion) {
      try {
        video.currentTime = levels[k].at + (levels[k + 1].at - levels[k].at) * frac;
      } catch {
        /* seeking before metadata is ready — ignored */
      }
    }
    setActive(Math.min(levels.length - 1, Math.round(pos)));
  });

  // Intro clip plays for lively motion at the top; browsers allow this only muted.
  useEffect(() => {
    const intro = introRef.current;
    if (!intro || prefersReducedMotion) return;
    const play = () => void intro.play().catch(() => {});
    play();
    window.addEventListener("click", play, { once: true });
    return () => window.removeEventListener("click", play);
  }, [prefersReducedMotion]);

  const level = levels[active];

  return (
    <section ref={sectionRef} className="relative bg-[#090d12]" style={{ height: SCROLL_TRACK }}>
      <motion.div className="fixed left-0 top-0 z-30 h-[3px] bg-gradient-to-r from-amber-300 to-cyan-300" style={{ width: barWidth }} />

      <div className="sticky top-0 h-screen overflow-hidden">
        <motion.video
          ref={introRef}
          className="absolute inset-0 h-full w-full object-cover"
          style={prefersReducedMotion ? undefined : { opacity: introOpacity }}
          src={introVideoSrc}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
        <motion.video
          ref={scrubRef}
          className="absolute inset-0 h-full w-full object-cover"
          style={prefersReducedMotion ? undefined : { opacity: scrubOpacity }}
          src={scrubVideoSrc}
          poster={posterSrc}
          muted
          playsInline
          preload="auto"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.05)_28%,rgba(0,0,0,0.15)_60%,rgba(9,13,18,0.85)_100%)]" />

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

        {/* Vertical floor stepper — hidden on small screens to avoid crowding the caption */}
        <div className="absolute right-6 top-1/2 z-10 hidden -translate-y-1/2 space-y-3.5 sm:block">
          {levels.map((lvl, i) => (
            <div key={lvl.no} className="flex items-center justify-end gap-2.5" style={{ opacity: i === active ? 1 : 0.45 }}>
              <span className="text-xs font-bold tracking-widest">{lvl.no}</span>
              <span
                className="inline-block h-2.5 w-2.5 rounded-full bg-white transition-transform"
                style={{ transform: i === active ? "scale(1.6)" : "scale(1)", backgroundColor: i === active ? lvl.tone : "#fff" }}
              />
            </div>
          ))}
        </div>

        {/* Per-floor caption */}
        <motion.div
          className="absolute inset-x-0 bottom-[9vh] flex justify-center px-6"
          style={prefersReducedMotion ? undefined : { opacity: levelOpacity }}
        >
          {level ? (
            <motion.div
              key={level.no}
              initial={{ opacity: 0.35, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="w-[min(680px,92vw)] rounded-2xl border border-white/15 bg-[rgba(10,14,20,0.55)] p-6 backdrop-blur"
              style={{ borderLeft: `4px solid ${level.tone}` }}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-extrabold tracking-[0.18em]" style={{ color: level.tone }}>{level.no}</span>
                <span className="text-xl font-extrabold md:text-2xl">{level.title}</span>
              </div>
              <div className="mt-1 text-sm font-semibold text-amber-200/85">{level.units}</div>
              <p className="mt-2 text-[15px] leading-relaxed text-white/75">{level.detail}</p>
            </motion.div>
          ) : null}
        </motion.div>
      </div>
    </section>
  );
}
