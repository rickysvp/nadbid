/**
 * 全局几何背景 — NEON VEGAS
 * 暖黑底 + 金色光效 + 微妙纹理
 */
export function GeometricBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#0f0a1a]">
      {/* 顶部金色光效 */}
      <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-[#9333ea]/8 blur-[180px]" />
      <div className="absolute top-1/4 right-0 h-[400px] w-[400px] rounded-full bg-[#b45309]/6 blur-[160px]" />
      <div className="absolute bottom-0 left-1/3 h-[350px] w-[350px] rounded-full bg-[#10b981]/5 blur-[140px]" />

      {/* 微妙网格纹理 */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.03]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#fafaf9" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* 噪点纹理 */}
      <div
        className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* 装饰性线条 */}
      <svg
        className="absolute inset-0 w-full h-full opacity-60"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="gold-line" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(245,158,11,0)" />
            <stop offset="50%" stopColor="rgba(245,158,11,0.15)" />
            <stop offset="100%" stopColor="rgba(245,158,11,0)" />
          </linearGradient>
          <linearGradient id="subtle-line" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        {/* 金色对角线条纹 */}
        <path d="M-200,100 L600,800 L1600,400" stroke="url(#gold-line)" strokeWidth="1" fill="none" />
        <path d="M1200,-200 L200,900" stroke="url(#subtle-line)" strokeWidth="1" fill="none" />

        {/* 装饰圆环 */}
        <circle cx="1100" cy="150" r="350" stroke="url(#subtle-line)" strokeWidth="1" strokeDasharray="4 12" fill="none" />
        <circle cx="250" cy="750" r="450" stroke="url(#gold-line)" strokeWidth="1" strokeDasharray="2 20" fill="none" />
      </svg>
    </div>
  );
}
