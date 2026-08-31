/**
 * 全局几何背景 — 严格匹配原 DEMO 视觉
 * 固定的深色几何背景，用于所有非 Home 页面
 */
export function GeometricBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex justify-center bg-[#050505]">
      <svg
        className="absolute inset-0 w-full h-full opacity-100"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="line-glow-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.01)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.01)" />
          </linearGradient>
          <linearGradient id="line-glow-2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(62,196,112,0.02)" />
            <stop offset="50%" stopColor="rgba(62,196,112,0.25)" />
            <stop offset="100%" stopColor="rgba(62,196,112,0.02)" />
          </linearGradient>
          <mask id="fade-out">
            <rect width="1440" height="900" fill="url(#mask-grad)" />
          </mask>
          <linearGradient id="mask-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="85%" stopColor="#fff" />
            <stop offset="100%" stopColor="#000" />
          </linearGradient>
        </defs>
        <g mask="url(#fade-out)">
          {/* Random angular abstract lines */}
          <path d="M-200,100 L600,800 L1600,400" stroke="url(#line-glow-1)" strokeWidth="1" fill="none" />
          <path d="M400,-100 L1000,1000" stroke="url(#line-glow-2)" strokeWidth="1.5" fill="none" />
          <path d="M1200,-200 L200,900" stroke="url(#line-glow-1)" strokeWidth="1" fill="none" />
          <path d="M-100,500 L1500,200" stroke="url(#line-glow-1)" strokeWidth="0.5" fill="none" />
          <path d="M-50,850 L1490,-50" stroke="url(#line-glow-1)" strokeWidth="1" fill="none" strokeDasharray="4 8" />

          {/* Geometric accents: large faint orbit rings */}
          <circle cx="1100" cy="150" r="350" stroke="url(#line-glow-1)" strokeWidth="1" strokeDasharray="4 12" fill="none" />
          <circle cx="250" cy="750" r="450" stroke="url(#line-glow-2)" strokeWidth="1" strokeDasharray="2 20" fill="none" />
          <circle cx="250" cy="750" r="250" stroke="url(#line-glow-1)" strokeWidth="0.5" fill="none" />

          {/* Accent nodes at intersections */}
          <circle cx="600" cy="800" r="2" fill="rgba(62,196,112,0.5)" />
          <circle cx="200" cy="900" r="1.5" fill="rgba(255,255,255,0.4)" />
          <circle cx="1000" cy="1000" r="2" fill="rgba(62,196,112,0.5)" />
          <circle cx="685" cy="400" r="1.5" fill="rgba(255,255,255,0.4)" />
        </g>
      </svg>
    </div>
  );
}
