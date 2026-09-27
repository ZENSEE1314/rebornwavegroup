// Illustrated artwork for pet-room furniture and Doluruu costumes (replaces emoji).
// Every drawing uses a 100×100 viewBox. Hats sit with their brim on the bottom
// edge, glasses/scarf are centred, so PetRoom can anchor them to the pet's head,
// eyes and neck.
import type { ReactElement } from "react";

const Svg = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <svg viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label={label} style={{ overflow: "visible", display: "block" }}>{children}</svg>
);

// Terracotta pot shared by the plants.
const Pot = ({ id }: { id: string }) => (
  <>
    <defs>
      <linearGradient id={`${id}-pot`} x1="0" x2="1"><stop offset="0" stopColor="#b8562e" /><stop offset=".45" stopColor="#e07a45" /><stop offset="1" stopColor="#a44a26" /></linearGradient>
    </defs>
    <path d="M30 70 L70 70 L65 97 Q50 100 35 97 Z" fill={`url(#${id}-pot)`} />
    <rect x="26" y="64" width="48" height="9" rx="3" fill="#c4633a" />
    <rect x="26" y="64" width="48" height="3" rx="1.5" fill="#e8925f" />
    <ellipse cx="50" cy="65" rx="20" ry="2.4" fill="#4a2c1a" />
  </>
);

export const PET_ART: Record<string, () => ReactElement> = {
  sofa_pink: () => (
    <Svg label="Pink sofa">
      <defs>
        <linearGradient id="sp-back" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffb6d0" /><stop offset="1" stopColor="#e7719d" /></linearGradient>
        <linearGradient id="sp-seat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff9fc2" /><stop offset="1" stopColor="#d85b89" /></linearGradient>
      </defs>
      <ellipse cx="50" cy="94" rx="46" ry="4" fill="rgba(0,0,0,.18)" />
      <rect x="12" y="30" width="76" height="40" rx="14" fill="url(#sp-back)" />
      <path d="M50 34 V66" stroke="#d45f8c" strokeWidth="1.5" opacity=".6" />
      <circle cx="31" cy="46" r="1.6" fill="#c24f7c" /><circle cx="69" cy="46" r="1.6" fill="#c24f7c" />
      <rect x="14" y="58" width="72" height="20" rx="8" fill="url(#sp-seat)" />
      <rect x="18" y="58" width="31" height="10" rx="5" fill="#ffc2d8" opacity=".7" />
      <rect x="51" y="58" width="31" height="10" rx="5" fill="#ffc2d8" opacity=".7" />
      <rect x="2" y="50" width="16" height="32" rx="8" fill="#e7719d" /><rect x="2" y="50" width="16" height="8" rx="4" fill="#ffa9c9" />
      <rect x="82" y="50" width="16" height="32" rx="8" fill="#e7719d" /><rect x="82" y="50" width="16" height="8" rx="4" fill="#ffa9c9" />
      <rect x="10" y="80" width="5" height="12" rx="2" fill="#7a4a2a" /><rect x="85" y="80" width="5" height="12" rx="2" fill="#7a4a2a" />
      <rect x="30" y="38" width="16" height="14" rx="5" fill="#fff1c9" transform="rotate(-12 38 45)" />
    </Svg>
  ),
  sofa_chair: () => (
    <Svg label="Armchair">
      <defs><linearGradient id="sc-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7fe0d2" /><stop offset="1" stopColor="#2aa597" /></linearGradient></defs>
      <ellipse cx="50" cy="94" rx="34" ry="4" fill="rgba(0,0,0,.18)" />
      <path d="M22 60 Q20 18 50 16 Q80 18 78 60 Z" fill="url(#sc-a)" />
      <path d="M50 20 V56" stroke="#239184" strokeWidth="1.2" opacity=".5" />
      <rect x="22" y="58" width="56" height="20" rx="8" fill="#4cc3b4" />
      <rect x="12" y="50" width="16" height="32" rx="8" fill="#2aa597" /><rect x="72" y="50" width="16" height="32" rx="8" fill="#2aa597" />
      <rect x="12" y="50" width="16" height="7" rx="3.5" fill="#8ce9dc" /><rect x="72" y="50" width="16" height="7" rx="3.5" fill="#8ce9dc" />
      <rect x="20" y="80" width="5" height="12" rx="2" fill="#7a4a2a" /><rect x="75" y="80" width="5" height="12" rx="2" fill="#7a4a2a" />
    </Svg>
  ),
  plant_fern: () => (
    <Svg label="Fern pot">
      {[-60, -35, -12, 12, 35, 60, -80, 80].map((a, i) => (
        <g key={i} transform={`rotate(${a} 50 66)`}>
          <path d="M50 66 Q38 40 50 10 Q62 40 50 66 Z" fill={i % 2 ? "#3fa34d" : "#5cc36a"} />
          <path d="M50 64 Q49 40 50 14" stroke="#2f8a3c" strokeWidth="1.4" fill="none" />
        </g>
      ))}
      <Pot id="pf" />
    </Svg>
  ),
  plant_tulip: () => (
    <Svg label="Tulip pot">
      {[[34, -14, "#ff5f8f"], [50, 0, "#ffcf3f"], [66, 14, "#ff7d4f"]].map(([x, a, c], i) => (
        <g key={i} transform={`rotate(${a} 50 66)`}>
          <path d="M50 66 C50 50 50 40 50 28" stroke="#3f9a4a" strokeWidth="3" fill="none" />
          <path d="M50 58 q-12 -6 -12 -20 q8 6 12 18 Z" fill="#4fb35c" />
          <path d={`M42 28 Q42 12 50 10 Q58 12 58 28 Q50 34 42 28 Z`} fill={c as string} />
          <path d="M50 10 Q46 20 50 30 Q54 20 50 10 Z" fill="rgba(255,255,255,.3)" />
        </g>
      ))}
      <Pot id="pt" />
    </Svg>
  ),
  plant_sunflower: () => (
    <Svg label="Sunflower pot">
      <path d="M50 66 C48 50 52 40 50 30" stroke="#3f9a4a" strokeWidth="4" fill="none" />
      <path d="M50 56 q-16 -2 -20 -14 q12 0 20 10 Z" fill="#4fb35c" /><path d="M50 50 q16 -2 20 -14 q-12 0 -20 10 Z" fill="#4fb35c" />
      {Array.from({ length: 14 }).map((_, i) => <ellipse key={i} cx="50" cy="12" rx="5" ry="10" fill={i % 2 ? "#ffc21a" : "#ffd84a"} transform={`rotate(${i * 360 / 14} 50 26)`} />)}
      <circle cx="50" cy="26" r="10" fill="#6b3d17" /><circle cx="50" cy="26" r="7" fill="#8a5324" />
      {[[-3, -3], [3, -2], [0, 3], [-4, 3], [4, 3]].map(([x, y], i) => <circle key={i} cx={50 + x} cy={26 + y} r="1.2" fill="#4a2a10" />)}
      <Pot id="ps" />
    </Svg>
  ),
  plant_cactus: () => (
    <Svg label="Cactus">
      <defs><linearGradient id="pc-g" x1="0" x2="1"><stop offset="0" stopColor="#3a9a55" /><stop offset=".5" stopColor="#62c47a" /><stop offset="1" stopColor="#3a9a55" /></linearGradient></defs>
      <rect x="40" y="16" width="20" height="52" rx="10" fill="url(#pc-g)" />
      <path d="M40 46 H30 Q26 46 26 42 V30 Q26 26 30 26 Q34 26 34 30 V40 H40" fill="url(#pc-g)" />
      <path d="M60 40 H70 Q74 40 74 36 V26 Q74 22 70 22 Q66 22 66 26 V34 H60" fill="url(#pc-g)" />
      {[24, 34, 44, 54].map((y) => <g key={y} stroke="#e8f5d0" strokeWidth="1"><path d={`M45 ${y} l-2 -2`} /><path d={`M55 ${y + 4} l2 -2`} /></g>)}
      <circle cx="50" cy="15" r="4.5" fill="#ff6fa3" /><circle cx="50" cy="15" r="2" fill="#ffd1e2" />
      <Pot id="pcp" />
    </Svg>
  ),
  plant_blossom: () => (
    <Svg label="Cherry blossom">
      <path d="M50 66 C50 50 46 40 38 30 M50 50 C54 40 60 34 66 26 M47 44 C42 40 36 40 30 38" stroke="#7a4a2a" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      {[[30, 24, 13], [52, 16, 15], [70, 22, 13], [40, 34, 11], [62, 34, 11], [24, 38, 9]].map(([x, y, r], i) => (
        <g key={i}><circle cx={x} cy={y} r={r} fill="#ffb7d0" /><circle cx={x - r * .3} cy={y - r * .3} r={r * .55} fill="#ffd6e5" /></g>
      ))}
      {[[34, 20], [56, 12], [72, 24], [44, 32], [64, 36], [26, 36]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.8" fill="#ff6f9f" />)}
      <Pot id="pb" />
    </Svg>
  ),
  lamp_floor: () => (
    <Svg label="Floor lamp">
      <defs><linearGradient id="lf-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff3c4" /><stop offset="1" stopColor="#f2c55c" /></linearGradient></defs>
      <ellipse cx="50" cy="96" rx="16" ry="3" fill="rgba(0,0,0,.2)" />
      <rect x="48.5" y="26" width="3" height="68" fill="#5a4636" />
      <ellipse cx="50" cy="94" rx="13" ry="3.5" fill="#6b5442" />
      <path d="M34 28 L40 6 H60 L66 28 Z" fill="url(#lf-s)" stroke="#d9a53c" strokeWidth="1" />
      <ellipse cx="50" cy="28" rx="16" ry="2.4" fill="#e6b24a" />
    </Svg>
  ),
  lamp_candle: () => (
    <Svg label="Candles">
      <ellipse cx="50" cy="92" rx="34" ry="6" fill="#c9a44c" /><ellipse cx="50" cy="90" rx="34" ry="5" fill="#e8c77a" />
      {[[32, 58, 30], [50, 42, 46], [68, 62, 26]].map(([x, top, h], i) => (
        <g key={i}>
          <rect x={x - 6} y={top} width="12" height={h} rx="2" fill="#fff6e8" /><rect x={x - 6} y={top} width="4" height={h} fill="#ffe9cc" />
          <path d={`M${x} ${top - 2} v-3`} stroke="#333" strokeWidth="1" />
          <path d={`M${x} ${top - 15} Q${x + 5} ${top - 7} ${x} ${top - 4} Q${x - 5} ${top - 7} ${x} ${top - 15} Z`} fill="#ffb02e" />
          <path d={`M${x} ${top - 11} Q${x + 2.4} ${top - 7} ${x} ${top - 5} Q${x - 2.4} ${top - 7} ${x} ${top - 11} Z`} fill="#fff3b0" />
        </g>
      ))}
    </Svg>
  ),
  art_landscape: () => (
    <Svg label="Landscape painting">
      <rect x="4" y="12" width="92" height="76" rx="3" fill="#b8862f" /><rect x="8" y="16" width="84" height="68" fill="#d9a441" /><rect x="12" y="20" width="76" height="60" fill="#8fd4ff" />
      <circle cx="70" cy="34" r="7" fill="#ffe066" />
      <path d="M12 64 L34 38 L52 60 L64 46 L88 70 V80 H12 Z" fill="#6aaa5a" /><path d="M34 38 L40 46 L28 46 Z" fill="#fff" />
      <path d="M12 72 Q40 62 88 72 V80 H12 Z" fill="#4f9147" />
      <path d="M22 32 q4 -4 8 0 q4 -3 7 1 h-15 Z" fill="#fff" />
    </Svg>
  ),
  art_rainbow: () => (
    <Svg label="Rainbow poster">
      <rect x="4" y="12" width="92" height="76" rx="4" fill="#fff" stroke="#e6dbe9" strokeWidth="2" />
      {["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7", "#9775fa"].map((c, i) => <path key={c} d={`M${18 + i * 5} 74 A${32 - i * 5} ${32 - i * 5} 0 0 1 ${82 - i * 5} 74`} stroke={c} strokeWidth="5" fill="none" />)}
      <ellipse cx="20" cy="74" rx="10" ry="6" fill="#f1f3f5" /><ellipse cx="80" cy="74" rx="10" ry="6" fill="#f1f3f5" />
    </Svg>
  ),
  art_clock: () => (
    <Svg label="Wall clock">
      <circle cx="50" cy="50" r="42" fill="#8a5a33" /><circle cx="50" cy="50" r="36" fill="#fffaf0" />
      {Array.from({ length: 12 }).map((_, i) => <rect key={i} x="49" y="17" width="2" height={i % 3 ? 4 : 7} fill="#6b4a2f" transform={`rotate(${i * 30} 50 50)`} />)}
      <path d="M50 50 L50 28" stroke="#333" strokeWidth="3" strokeLinecap="round" /><path d="M50 50 L66 58" stroke="#333" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="50" cy="50" r="3" fill="#e0398b" />
    </Svg>
  ),
  toy_ball: () => (
    <Svg label="Beach ball">
      <ellipse cx="50" cy="94" rx="30" ry="4" fill="rgba(0,0,0,.18)" />
      <circle cx="50" cy="54" r="38" fill="#fff" />
      <path d="M50 16 A38 38 0 0 1 88 54 Q66 44 50 16 Z" fill="#ff5f5f" /><path d="M88 54 A38 38 0 0 1 50 92 Q60 66 88 54 Z" fill="#4dabf7" />
      <path d="M50 92 A38 38 0 0 1 12 54 Q34 64 50 92 Z" fill="#ffd43b" /><path d="M12 54 A38 38 0 0 1 50 16 Q40 42 12 54 Z" fill="#69db7c" />
      <circle cx="50" cy="54" r="7" fill="#fff" /><ellipse cx="36" cy="34" rx="8" ry="4" fill="rgba(255,255,255,.55)" transform="rotate(-35 36 34)" />
    </Svg>
  ),
  toy_teddy: () => (
    <Svg label="Teddy bear">
      <defs><radialGradient id="tt-f" cx=".4" cy=".35"><stop offset="0" stopColor="#d9a066" /><stop offset="1" stopColor="#a8703d" /></radialGradient></defs>
      <ellipse cx="50" cy="95" rx="30" ry="3.5" fill="rgba(0,0,0,.18)" />
      <circle cx="28" cy="22" r="10" fill="#a8703d" /><circle cx="72" cy="22" r="10" fill="#a8703d" /><circle cx="28" cy="22" r="5" fill="#f2c89a" /><circle cx="72" cy="22" r="5" fill="#f2c89a" />
      <ellipse cx="50" cy="72" rx="26" ry="22" fill="url(#tt-f)" /><ellipse cx="50" cy="75" rx="14" ry="12" fill="#f2c89a" />
      <ellipse cx="24" cy="88" rx="10" ry="7" fill="#a8703d" /><ellipse cx="76" cy="88" rx="10" ry="7" fill="#a8703d" />
      <circle cx="50" cy="36" r="22" fill="url(#tt-f)" /><ellipse cx="50" cy="44" rx="10" ry="7.5" fill="#f2c89a" />
      <circle cx="42" cy="33" r="2.6" fill="#2b1a0e" /><circle cx="58" cy="33" r="2.6" fill="#2b1a0e" /><ellipse cx="50" cy="41" rx="3.4" ry="2.4" fill="#2b1a0e" />
      <path d="M46 47 q4 3 8 0" stroke="#2b1a0e" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M38 56 L50 60 L62 56 L58 64 L50 61 L42 64 Z" fill="#e0398b" />
    </Svg>
  ),
  toy_gift: () => (
    <Svg label="Gift box">
      <ellipse cx="50" cy="95" rx="34" ry="3.5" fill="rgba(0,0,0,.18)" />
      <rect x="16" y="42" width="68" height="52" rx="4" fill="#9775fa" /><rect x="16" y="42" width="24" height="52" fill="#b197fc" opacity=".5" />
      <rect x="10" y="32" width="80" height="16" rx="4" fill="#845ef7" />
      <rect x="44" y="32" width="12" height="62" fill="#ffd43b" />
      <path d="M50 32 C38 14 22 20 30 30 C34 34 44 33 50 32 Z" fill="#ffd43b" /><path d="M50 32 C62 14 78 20 70 30 C66 34 56 33 50 32 Z" fill="#fcc419" />
    </Svg>
  ),

  // ── Costumes ── hats: brim on the bottom edge (y≈100)
  hat_party: () => (
    <Svg label="Party hat">
      <defs><clipPath id="hp-c"><path d="M50 6 L78 96 Q50 102 22 96 Z" /></clipPath></defs>
      <path d="M50 6 L78 96 Q50 102 22 96 Z" fill="#4dabf7" />
      <g clipPath="url(#hp-c)">{[20, 40, 60, 80].map((y) => <path key={y} d={`M0 ${y + 12} L100 ${y - 8} L100 ${y} L0 ${y + 20} Z`} fill="#ffd43b" />)}{[[40, 50], [58, 72], [46, 84]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.6" fill="#ff6b9d" />)}</g>
      <circle cx="50" cy="7" r="7" fill="#ff6b9d" /><circle cx="48" cy="5" r="2.4" fill="#ffc2d8" />
      <path d="M22 96 Q50 102 78 96" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" strokeDasharray="0.1 6" />
    </Svg>
  ),
  hat_crown: () => (
    <Svg label="Crown">
      <defs><linearGradient id="hc-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff1a8" /><stop offset=".5" stopColor="#ffcf33" /><stop offset="1" stopColor="#d99a0b" /></linearGradient></defs>
      <path d="M10 96 L6 36 L28 60 L50 24 L72 60 L94 36 L90 96 Z" fill="url(#hc-g)" stroke="#b37d06" strokeWidth="2" strokeLinejoin="round" />
      <rect x="9" y="80" width="82" height="16" rx="3" fill="#e6ac14" stroke="#b37d06" strokeWidth="1.5" />
      <circle cx="6" cy="34" r="5" fill="#fff1a8" /><circle cx="50" cy="22" r="6" fill="#fff1a8" /><circle cx="94" cy="34" r="5" fill="#fff1a8" />
      <circle cx="30" cy="88" r="4" fill="#e03131" /><circle cx="50" cy="88" r="5" fill="#1c7ed6" /><circle cx="70" cy="88" r="4" fill="#2f9e44" />
      <path d="M50 50 l5 8 -5 8 -5 -8 Z" fill="#e0398b" /><path d="M16 50 q4 20 2 30" stroke="#fff8d0" strokeWidth="3" opacity=".6" fill="none" />
    </Svg>
  ),
  hat_cap: () => (
    <Svg label="Cap">
      <defs><linearGradient id="hcap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff6b6b" /><stop offset="1" stopColor="#c92a2a" /></linearGradient></defs>
      <path d="M58 90 Q96 88 98 98 Q80 102 56 98 Z" fill="#a61e1e" />
      <path d="M12 96 Q10 40 50 36 Q88 40 86 96 Z" fill="url(#hcap)" />
      <path d="M50 36 V96 M30 42 Q24 70 26 96 M70 42 Q76 70 74 96" stroke="#b02525" strokeWidth="1.4" fill="none" opacity=".7" />
      <circle cx="50" cy="37" r="4" fill="#b02525" />
      <circle cx="50" cy="70" r="10" fill="#fff" /><text x="50" y="75" fontSize="14" fontWeight="900" textAnchor="middle" fill="#c92a2a">R</text>
    </Svg>
  ),
  hat_top: () => (
    <Svg label="Top hat">
      <defs><linearGradient id="ht-g" x1="0" x2="1"><stop offset="0" stopColor="#1f1f2b" /><stop offset=".4" stopColor="#3c3c52" /><stop offset="1" stopColor="#15151e" /></linearGradient></defs>
      <ellipse cx="50" cy="92" rx="46" ry="8" fill="#1a1a24" />
      <path d="M24 90 L26 14 Q50 8 74 14 L76 90 Z" fill="url(#ht-g)" />
      <ellipse cx="50" cy="14" rx="24" ry="5" fill="#2e2e40" />
      <rect x="24.6" y="68" width="50.8" height="12" fill="#e0398b" /><rect x="60" y="66" width="10" height="16" rx="2" fill="#ffd43b" />
    </Svg>
  ),
  hat_bow: () => (
    <Svg label="Ribbon">
      <defs><linearGradient id="hb-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff9fc6" /><stop offset="1" stopColor="#e64d8a" /></linearGradient></defs>
      <path d="M50 70 L12 44 Q4 70 14 94 Z" fill="url(#hb-g)" /><path d="M50 70 L88 44 Q96 70 86 94 Z" fill="url(#hb-g)" />
      <path d="M50 70 L22 56 Q18 72 22 86 Z" fill="#c93a74" opacity=".45" /><path d="M50 70 L78 56 Q82 72 78 86 Z" fill="#c93a74" opacity=".45" />
      <rect x="40" y="58" width="20" height="26" rx="8" fill="#ff7fb0" /><rect x="44" y="61" width="5" height="18" rx="2.5" fill="#ffc2d8" />
      {[[26, 62], [74, 62], [20, 78], [80, 78]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.4" fill="#fff" opacity=".85" />)}
    </Svg>
  ),
  // centred on the eyes
  glasses_cool: () => (
    <Svg label="Sunglasses">
      <defs><linearGradient id="gc-l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4a4a6a" /><stop offset="1" stopColor="#0d0d18" /></linearGradient></defs>
      <path d="M4 40 Q2 34 8 34 H44 Q48 34 47 40 L44 58 Q42 68 30 68 H18 Q8 68 6 58 Z" fill="url(#gc-l)" stroke="#111" strokeWidth="2" />
      <path d="M96 40 Q98 34 92 34 H56 Q52 34 53 40 L56 58 Q58 68 70 68 H82 Q92 68 94 58 Z" fill="url(#gc-l)" stroke="#111" strokeWidth="2" />
      <path d="M46 40 Q50 36 54 40" stroke="#111" strokeWidth="3" fill="none" />
      <path d="M12 40 L22 40 L14 52 Z" fill="rgba(255,255,255,.35)" /><path d="M62 40 L72 40 L64 52 Z" fill="rgba(255,255,255,.35)" />
    </Svg>
  ),
  // centred on the neck
  scarf_red: () => (
    <Svg label="Scarf">
      <defs><linearGradient id="sr-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff6b6b" /><stop offset="1" stopColor="#c92a2a" /></linearGradient></defs>
      <path d="M6 40 Q50 64 94 40 L94 56 Q50 80 6 56 Z" fill="url(#sr-g)" />
      {[18, 34, 50, 66, 82].map((x) => <path key={x} d={`M${x} ${44 + Math.abs(50 - x) * -0.2 + 6} v12`} stroke="#fff" strokeWidth="3" opacity=".75" />)}
      <path d="M58 60 L66 96 L52 98 L48 64 Z" fill="#e03131" />
      <path d="M52 98 v4 M56 97 v5 M60 97 v5 M64 96 v5" stroke="#c92a2a" strokeWidth="2" />
      <path d="M56 70 l8 -1 M54 80 l9 -1" stroke="#fff" strokeWidth="3" opacity=".75" />
    </Svg>
  ),
};

// Where each costume sits on Doluruu, as % of the pet's square image.
// Measured from both the boy and girl artwork (head centre ~40% across, eyes ~30%, chin ~46%).
export const COSTUME_FIT: Record<string, { left: number; top: number; width: number; anchor: "bottom" | "center" }> = {
  head: { left: 40, top: 19, width: 36, anchor: "bottom" },
  face: { left: 40, top: 30.5, width: 36, anchor: "center" },
  neck: { left: 40, top: 49, width: 42, anchor: "center" },
};

export function ItemArt({ id, emoji, className = "", style }: { id: string; emoji?: string; className?: string; style?: React.CSSProperties }) {
  const Art = PET_ART[id];
  if (!Art) return <span className={className} style={style}>{emoji}</span>;
  return <div className={className} style={style}><Art /></div>;
}
