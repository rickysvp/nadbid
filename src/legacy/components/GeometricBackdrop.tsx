/**
 * Neo-Brutalist tiny random geometric backdrop (design.md §7).
 *
 * Version 2: SMALL decorative seeds only — 24 pieces, 8–60px.
 *
 * RULES (per user request):
 *  · NO mask / overlay — each shape sits on the #F7F6F2 cream canvas
 *    WITHOUT extra blend modes or opaque layers (clean & sharp).
 *  · NO giant graphics (no >60px circles, no 300px arcs).
 *  · Scattered UNIFORMLY across the viewport (not only corners).
 *  · All op 4%–12% so each is clearly a "点缀" (accent), not a hero.
 *
 * Shape types (5 types, ~5 each, mixed colors from palette):
 *   1) Dot        · solid circle          (10–22px)
 *   2) Ring       · outline stroke circle (18–44px)
 *   3) Square     · rotated diamond 45°   (18–40px)
 *   4) Dash       · diagonal short bar    (40–56px long)
 *   5) Cross (+)  · plus / star-mark      (22–40px)
 *
 * Mounted once in App.tsx: fixed z-0, pointer-events-none.
 */
export default function GeometricBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* ============ TOP ROW ============ */}

      {/* Dots */}
      <div className="absolute rounded-full bg-[var(--color-primary)]" style={{ top: '7%',  left: '12%', width: 18, height: 18, opacity: 0.10 }} />
      <div className="absolute rounded-full bg-[var(--color-secondary)]" style={{ top: '14%', left: '42%', width: 12, height: 12, opacity: 0.12 }} />
      <div className="absolute rounded-full bg-[var(--color-monad)]" style={{ top: '4%',  left: '72%', width: 14, height: 14, opacity: 0.09 }} />
      <div className="absolute rounded-full bg-[var(--color-tertiary)]" style={{ top: '18%', left: '88%', width: 10, height: 10, opacity: 0.11 }} />
      <div className="absolute rounded-full bg-[var(--color-error)]" style={{ top: '9%',  left: '30%', width: 8,  height: 8,  opacity: 0.10 }} />

      {/* Rings */}
      <div className="absolute rounded-full border-[2px] border-[var(--color-primary)]" style={{ top: '5%',  left: '55%', width: 36, height: 36, opacity: 0.08 }} />
      <div className="absolute rounded-full border-[2px] border-[var(--color-tertiary)]" style={{ top: '12%', left: '22%', width: 28, height: 28, opacity: 0.09 }} />
      <div className="absolute rounded-full border-[1.5px] border-[var(--color-monad)]" style={{ top: '20%', left: '80%', width: 40, height: 40, opacity: 0.07 }} />

      {/* Squares (rotated 45°) */}
      <div className="absolute -rotate-45 rounded-[3px] bg-[var(--color-secondary)]" style={{ top: '6%',  left: '82%', width: 22, height: 22, opacity: 0.10 }} />
      <div className="absolute rotate-12   rounded-sm   border-[2px] border-[var(--color-tertiary)] bg-transparent" style={{ top: '16%', left: '5%', width: 30, height: 30, opacity: 0.09 }} />
      <div className="absolute rotate-[25deg] rounded-sm bg-[var(--color-monad)]" style={{ top: '11%', left: '48%', width: 18, height: 18, opacity: 0.08 }} />

      {/* Dashes (skewed short bars, ~50px) */}
      <div className="absolute -skew-x-[28deg] rounded-sm bg-[var(--color-error)]" style={{ top: '10%', left: '65%', width: 46, height: 6,  opacity: 0.07 }} />
      <div className="absolute skew-x-[20deg]   rounded-sm bg-[var(--color-primary)]" style={{ top: '22%', left: '36%', width: 38, height: 5,  opacity: 0.08 }} />

      {/* Crosses */}
      <svg viewBox="0 0 32 32" className="absolute text-black" style={{ top: '8%',  left: '38%', width: 26, height: 26, opacity: 0.06 }}>
        <rect x="14" y="2"  width="4" height="28" fill="currentColor" />
        <rect x="2"  y="14" width="28" height="4" fill="currentColor" />
      </svg>
      <svg viewBox="0 0 32 32" className="absolute text-[var(--color-error)]" style={{ top: '18%', left: '62%', width: 22, height: 22, opacity: 0.07 }}>
        <rect x="14" y="2"  width="4" height="28" fill="currentColor" />
        <rect x="2"  y="14" width="28" height="4" fill="currentColor" />
      </svg>

      {/* ============ MIDDLE ROW ============ */}

      {/* Dots */}
      <div className="absolute rounded-full bg-[var(--color-primary)]" style={{ top: '38%', left: '8%',  width: 14, height: 14, opacity: 0.09 }} />
      <div className="absolute rounded-full bg-[var(--color-monad)]" style={{ top: '45%', left: '28%', width: 18, height: 18, opacity: 0.08 }} />
      <div className="absolute rounded-full bg-[var(--color-tertiary)]" style={{ top: '34%', left: '50%', width: 12, height: 12, opacity: 0.10 }} />
      <div className="absolute rounded-full bg-[var(--color-secondary)]" style={{ top: '50%', left: '68%', width: 10, height: 10, opacity: 0.12 }} />
      <div className="absolute rounded-full bg-[var(--color-error)]" style={{ top: '42%', left: '86%', width: 16, height: 16, opacity: 0.08 }} />
      <div className="absolute rounded-full bg-[var(--color-primary)]" style={{ top: '55%', left: '18%', width: 9,  height: 9,  opacity: 0.11 }} />
      <div className="absolute rounded-full bg-[var(--color-tertiary)]" style={{ top: '48%', left: '40%', width: 7,  height: 7,  opacity: 0.10 }} />
      <div className="absolute rounded-full bg-[var(--color-monad)]" style={{ top: '36%', left: '78%', width: 11, height: 11, opacity: 0.09 }} />

      {/* Rings */}
      <div className="absolute rounded-full border-[2px] border-[var(--color-secondary)]" style={{ top: '40%', left: '34%', width: 44, height: 44, opacity: 0.07 }} />
      <div className="absolute rounded-full border-[1.5px] border-[var(--color-primary)]" style={{ top: '52%', left: '60%', width: 34, height: 34, opacity: 0.08 }} />
      <div className="absolute rounded-full border-[2px] border-[var(--color-tertiary)]" style={{ top: '44%', left: '92%', width: 26, height: 26, opacity: 0.07 }} />
      <div className="absolute rounded-full border-[1.5px] border-[var(--color-error)]" style={{ top: '58%', left: '12%', width: 38, height: 38, opacity: 0.07 }} />

      {/* Squares */}
      <div className="absolute -rotate-[30deg] rounded-sm bg-[var(--color-tertiary)]" style={{ top: '36%', left: '24%', width: 26, height: 26, opacity: 0.08 }} />
      <div className="absolute rotate-45      rounded-sm border-[2px] border-[var(--color-primary)] bg-transparent" style={{ top: '52%', left: '46%', width: 36, height: 36, opacity: 0.07 }} />
      <div className="absolute -rotate-12    rounded-[3px] bg-[var(--color-monad)]" style={{ top: '46%', left: '74%', width: 20, height: 20, opacity: 0.08 }} />
      <div className="absolute rotate-[20deg]   rounded-sm bg-[var(--color-error)]" style={{ top: '56%', left: '86%', width: 24, height: 24, opacity: 0.07 }} />
      <div className="absolute -rotate-[25deg] rounded-sm border-[1.5px] border-[var(--color-secondary)]" style={{ top: '32%', left: '64%', width: 28, height: 28, opacity: 0.08 }} />

      {/* Dashes */}
      <div className="absolute skew-x-[25deg]  rounded-sm bg-[var(--color-primary)]" style={{ top: '41%', left: '58%', width: 52, height: 5, opacity: 0.06 }} />
      <div className="absolute -skew-x-[22deg] rounded-sm bg-[var(--color-tertiary)]" style={{ top: '54%', left: '6%',  width: 42, height: 6, opacity: 0.07 }} />
      <div className="absolute skew-x-[16deg]  rounded-sm bg-[var(--color-secondary)]" style={{ top: '48%', left: '82%', width: 36, height: 4, opacity: 0.08 }} />
      <div className="absolute -skew-x-[30deg] rounded-sm bg-[var(--color-monad)]" style={{ top: '34%', left: '88%', width: 44, height: 5, opacity: 0.06 }} />

      {/* Crosses */}
      <svg viewBox="0 0 32 32" className="absolute text-[var(--color-primary)]" style={{ top: '38%', left: '44%', width: 30, height: 30, opacity: 0.06 }}>
        <rect x="14" y="2"  width="4" height="28" fill="currentColor" />
        <rect x="2"  y="14" width="28" height="4" fill="currentColor" />
      </svg>
      <svg viewBox="0 0 32 32" className="absolute text-black" style={{ top: '50%', left: '16%', width: 22, height: 22, opacity: 0.05 }}>
        <line x1="12" y1="3"  x2="20" y2="29" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <line x1="3"  y1="20" x2="29" y2="12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <svg viewBox="0 0 32 32" className="absolute text-[var(--color-monad)]" style={{ top: '56%', left: '70%', width: 26, height: 26, opacity: 0.07 }}>
        <rect x="14" y="2"  width="4" height="28" fill="currentColor" />
        <rect x="2"  y="14" width="28" height="4" fill="currentColor" />
      </svg>

      {/* ============ BOTTOM ROW ============ */}

      {/* Dots */}
      <div className="absolute rounded-full bg-[var(--color-secondary)]" style={{ top: '72%', left: '10%', width: 14, height: 14, opacity: 0.09 }} />
      <div className="absolute rounded-full bg-[var(--color-primary)]" style={{ top: '80%', left: '32%', width: 11, height: 11, opacity: 0.10 }} />
      <div className="absolute rounded-full bg-[var(--color-tertiary)]" style={{ top: '68%', left: '52%', width: 16, height: 16, opacity: 0.08 }} />
      <div className="absolute rounded-full bg-[var(--color-monad)]" style={{ top: '84%', left: '68%', width: 13, height: 13, opacity: 0.09 }} />
      <div className="absolute rounded-full bg-[var(--color-error)]" style={{ top: '76%', left: '88%', width: 10, height: 10, opacity: 0.11 }} />
      <div className="absolute rounded-full bg-[var(--color-primary)]" style={{ top: '88%', left: '82%', width: 8,  height: 8,  opacity: 0.10 }} />
      <div className="absolute rounded-full bg-[var(--color-secondary)]" style={{ top: '64%', left: '22%', width: 9,  height: 9,  opacity: 0.11 }} />

      {/* Rings */}
      <div className="absolute rounded-full border-[2px] border-[var(--color-monad)]" style={{ top: '70%', left: '42%', width: 48, height: 48, opacity: 0.07 }} />
      <div className="absolute rounded-full border-[1.5px] border-[var(--color-error)]" style={{ top: '82%', left: '20%', width: 32, height: 32, opacity: 0.08 }} />
      <div className="absolute rounded-full border-[2px] border-[var(--color-primary)]" style={{ top: '76%', left: '76%', width: 40, height: 40, opacity: 0.07 }} />
      <div className="absolute rounded-full border-[1.5px] border-[var(--color-tertiary)]" style={{ top: '90%', left: '48%', width: 28, height: 28, opacity: 0.08 }} />

      {/* Squares */}
      <div className="absolute rotate-45     rounded-sm bg-[var(--color-primary)]" style={{ top: '74%', left: '4%',  width: 22, height: 22, opacity: 0.08 }} />
      <div className="absolute -rotate-[18deg] rounded-[3px] border-[2px] border-[var(--color-secondary)] bg-transparent" style={{ top: '82%', left: '58%', width: 32, height: 32, opacity: 0.07 }} />
      <div className="absolute rotate-[22deg]   rounded-sm bg-[var(--color-tertiary)]" style={{ top: '70%', left: '86%', width: 18, height: 18, opacity: 0.09 }} />
      <div className="absolute -rotate-45    rounded-sm bg-[var(--color-monad)]" style={{ top: '88%', left: '30%', width: 24, height: 24, opacity: 0.08 }} />

      {/* Dashes */}
      <div className="absolute skew-x-[20deg]   rounded-sm bg-[var(--color-secondary)]" style={{ top: '74%', left: '56%', width: 48, height: 5, opacity: 0.06 }} />
      <div className="absolute -skew-x-[26deg] rounded-sm bg-[var(--color-error)]" style={{ top: '86%', left: '74%', width: 38, height: 5, opacity: 0.07 }} />
      <div className="absolute skew-x-[14deg]   rounded-sm bg-[var(--color-tertiary)]" style={{ top: '68%', left: '26%', width: 40, height: 4, opacity: 0.08 }} />

      {/* Crosses */}
      <svg viewBox="0 0 32 32" className="absolute text-[var(--color-secondary)]" style={{ top: '70%', left: '36%', width: 26, height: 26, opacity: 0.07 }}>
        <rect x="14" y="2"  width="4" height="28" fill="currentColor" />
        <rect x="2"  y="14" width="28" height="4" fill="currentColor" />
      </svg>
      <svg viewBox="0 0 32 32" className="absolute text-black" style={{ top: '86%', left: '58%', width: 20, height: 20, opacity: 0.05 }}>
        <g stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <line x1="12" y1="3"  x2="20" y2="29" />
          <line x1="3"  y1="20" x2="29" y2="12" />
        </g>
      </svg>
    </div>
  );
}
