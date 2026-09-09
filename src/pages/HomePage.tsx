import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, ArrowRight } from 'lucide-react';
import { ROUTES } from '../config/routes';
import { useFactory } from '../web3/hooks/useFactory';
import { formatMon } from '../utils/format';

const marqueeWords = ['Monad', 'Nadbid.fun', 'Penny Auctions', 'Soulbound PASS', 'On-chain', 'KOL Service', 'Fixed Bid 99 MON'];

/**
 * HERO 联合曲线：P(s) = basePrice * s² 的二次增长曲线，映射到 400x400 画布。
 * 采样 24 段后经 Catmull-Rom → Bezier 平滑，所有点位可精确计算（非手绘近似）。
 */
function buildHeroCurve() {
  const pts: [number, number][] = [];
  const N = 24;
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    pts.push([40 + 340 * s, 340 - 280 * s * s]);
  }
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

/** 曲线上 s∈[0,1] 处坐标（与 buildHeroCurve 同公式） */
function curvePoint(s: number): [number, number] {
  return [40 + 340 * s, 340 - 280 * s * s];
}

/** HERO 曲线路径与当前价点位（模块级常量，仅计算一次） */
const HERO_CURVE_PATH = buildHeroCurve();
const CUR_X = curvePoint(0.62)[0];
const CUR_Y = curvePoint(0.62)[1];

function Hero({ onExplore }: { onExplore: () => void }) {
  return (
    <section className="bg-brand-green min-h-screen relative pt-24 lg:pt-28 flex flex-col justify-between overflow-hidden">
      {/* Dynamic Fluid & Geometric Background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Flat Background Grid */}
        <div className="absolute inset-0 opacity-80" style={{
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}></div>

        {/* Flowing Ambient Light FX */}
        <div className="absolute inset-0 mix-blend-overlay">
          <motion.div
            className="absolute w-[50vw] h-[50vw] bg-white rounded-full blur-[120px] opacity-20"
            animate={{ x: ['-20vw', '70vw', '-20vw'], y: ['-10vh', '40vh', '-10vh'], scale: [1, 1.2, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute w-[40vw] h-[40vw] bg-black rounded-full blur-[100px] opacity-15"
            animate={{ x: ['80vw', '10vw', '80vw'], y: ['60vh', '20vh', '60vh'], scale: [1, 1.5, 1] }}
            transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Large Dynamic Geometric Background with Flowing Light Dots */}
        <svg className="absolute w-full h-full opacity-70" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
          {/* 1. Large Circle */}
          <motion.g animate={{ x: [0, 15, -15, 0], y: [0, -20, 10, 0] }} transition={{ duration: 40, repeat: Infinity, ease: 'easeInOut' }}>
            <circle cx="160" cy="50" r="70" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="0.1" />
            <motion.circle
              cx="160" cy="50" r="70" fill="none" stroke="rgba(255,255,255,1)" strokeWidth="0.6" strokeLinecap="round" strokeDasharray="0.1 440"
              style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,1))' }}
              animate={{ strokeDashoffset: [440, 0] }} transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            />
          </motion.g>

          {/* 2. Large Triangle */}
          <motion.g style={{ transformOrigin: '80px 140px' }} animate={{ x: [0, -25, 20, 0], y: [0, 20, -15, 0], rotate: [0, 15, -10, 0] }} transition={{ duration: 45, repeat: Infinity, ease: 'easeInOut' }}>
            <polygon points="80,60 160,200 0,200" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="0.1" />
            <motion.polygon
              points="80,60 160,200 0,200" fill="none" stroke="rgba(255,255,255,1)" strokeWidth="0.6" strokeLinecap="round" strokeDasharray="0.1 400"
              style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,1))' }}
              animate={{ strokeDashoffset: [400, 0] }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            />
          </motion.g>

          {/* 3. Large Square */}
          <motion.g style={{ transformOrigin: '70px 70px' }} animate={{ x: [0, 30, -25, 0], y: [0, -20, 30, 0], rotate: [0, -20, 15, 0] }} transition={{ duration: 50, repeat: Infinity, ease: 'easeInOut' }}>
            <rect x="20" y="20" width="100" height="100" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="0.1" />
            <motion.rect
              x="20" y="20" width="100" height="100" fill="none" stroke="rgba(255,255,255,1)" strokeWidth="0.6" strokeLinecap="round" strokeDasharray="0.1 400"
              style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,1))' }}
              animate={{ strokeDashoffset: [400, 0] }} transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
            />
          </motion.g>
        </svg>
      </div>

      <div className="max-w-[1500px] mx-auto w-full px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16 relative z-10">
        {/* Left Content */}
        <div className="space-y-6 max-w-2xl pt-4 lg:pt-8">
          <h1 className="text-[80px] font-black text-black leading-[0.95] tracking-tighter">
            Decentralized <br />
            Influencer <br />
            Auctions
          </h1>
          <p className="text-[20px] font-medium text-black/80 leading-relaxed max-w-md pt-2">
            The premier marketplace for KOL access passes and influencer-led auctions on Monad. Bid, stake, and earn network yield.
          </p>
          <button
            onClick={onExplore}
            className="mt-8 bg-black text-[#3ec470] font-bold px-8 py-4 rounded-xl hover:bg-[#111] hover:scale-105 transition-all uppercase tracking-widest text-sm shadow-xl"
          >
            Explore Auctions
          </button>
        </div>

        {/* Right Graphic - Bonding Curve */}
        <motion.div
          animate={{ y: [0, -15, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
          className="relative w-full z-10 mt-12 lg:mt-0 flex items-center justify-end"
        >
          <div className="w-full max-w-[520px] relative select-none">
            <svg viewBox="0 0 400 400" className="w-full h-full" fill="none">
              <defs>
                <linearGradient id="heroCurveFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(0,0,0,0.28)" />
                  <stop offset="55%" stopColor="rgba(0,0,0,0.10)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.02)" />
                </linearGradient>
                <linearGradient id="heroCurveStroke" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(0,0,0,0.55)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.95)" />
                </linearGradient>
                <filter id="heroCurveGlow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="3.5" />
                </filter>
              </defs>

              {/* ---------- 背景网格 ---------- */}
              {[60, 130, 200, 270, 340].map((y) => (
                <line key={`h${y}`} x1="40" y1={y} x2="380" y2={y} stroke="rgba(0,0,0,0.07)" strokeWidth="1" />
              ))}
              {[40, 125, 210, 295, 380].map((x) => (
                <line key={`v${x}`} x1={x} y1="60" x2={x} y2="340" stroke="rgba(0,0,0,0.07)" strokeWidth="1" />
              ))}

              {/* ---------- 坐标轴 + 刻度 ---------- */}
              <line x1="40" y1="340" x2="392" y2="340" stroke="rgba(0,0,0,0.55)" strokeWidth="1.5" />
              <line x1="40" y1="340" x2="40" y2="48" stroke="rgba(0,0,0,0.55)" strokeWidth="1.5" />
              {/* 箭头 */}
              <path d="M 388 337 L 396 340 L 388 343 Z" fill="rgba(0,0,0,0.55)" />
              <path d="M 37 52 L 40 44 L 43 52 Z" fill="rgba(0,0,0,0.55)" />
              {/* x 刻度 */}
              {[
                { x: 40, l: '0' },
                { x: 125, l: '0.5K' },
                { x: 210, l: '1K' },
                { x: 295, l: '1.5K' },
                { x: 380, l: '2K' },
              ].map((t) => (
                <g key={t.l}>
                  <line x1={t.x} y1="340" x2={t.x} y2="346" stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
                  <text x={t.x} y="361" textAnchor="middle" fontSize="9" fill="rgba(0,0,0,0.45)" fontFamily="monospace">
                    {t.l}
                  </text>
                </g>
              ))}
              {/* y 刻度 */}
              {[
                { y: 340, l: '0' },
                { y: 270, l: '0.25' },
                { y: 200, l: '0.5' },
                { y: 130, l: '0.75' },
                { y: 60, l: '1' },
              ].map((t) => (
                <g key={t.l}>
                  <line x1="34" y1={t.y} x2="40" y2={t.y} stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
                  <text x="31" y={t.y + 3} textAnchor="end" fontSize="9" fill="rgba(0,0,0,0.45)" fontFamily="monospace">
                    {t.l}
                  </text>
                </g>
              ))}
              {/* 轴名 */}
              <text x="210" y="380" textAnchor="middle" fontSize="9" fontWeight="bold" fill="rgba(0,0,0,0.5)" fontFamily="monospace" letterSpacing="2">
                SUPPLY →
              </text>
              <text x="16" y="196" textAnchor="middle" fontSize="9" fontWeight="bold" fill="rgba(0,0,0,0.5)" fontFamily="monospace" letterSpacing="2" transform="rotate(-90 16 196)">
                PRICE →
              </text>

              {/* ---------- 曲线填充（入场淡入） ---------- */}
              <motion.path
                d={`${HERO_CURVE_PATH} L 380 340 L 40 340 Z`}
                fill="url(#heroCurveFill)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.1, delay: 0.35 }}
              />

              {/* ---------- 主曲线：白色辉光 + 渐变黑描边（入场绘制） ---------- */}
              <motion.path
                id="heroCurvePath"
                d={HERO_CURVE_PATH}
                stroke="rgba(255,255,255,0.85)"
                strokeWidth="7"
                strokeLinecap="round"
                fill="none"
                filter="url(#heroCurveGlow)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.4, ease: 'easeInOut' }}
              />
              <motion.path
                d={HERO_CURVE_PATH}
                stroke="url(#heroCurveStroke)"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.4, ease: 'easeInOut' }}
              />

              {/* ---------- 沿曲线流动的能量粒子 ---------- */}
              <circle r="2.5" fill="#ffffff" stroke="rgba(0,0,0,0.7)" strokeWidth="0.8" style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.9))' }}>
                <animateMotion dur="5.5s" repeatCount="indefinite" rotate="auto">
                  <mpath href="#heroCurvePath" />
                </animateMotion>
              </circle>
              <circle r="2" fill="rgba(0,0,0,0.85)">
                <animateMotion dur="5.5s" begin="2.75s" repeatCount="indefinite" rotate="auto">
                  <mpath href="#heroCurvePath" />
                </animateMotion>
              </circle>

              {/* ---------- 已铸造点 ---------- */}
              <circle cx={125} cy={curvePoint(0.25)[1]} r="4.5" fill="rgba(0,0,0,0.75)" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
              <circle cx={210} cy={curvePoint(0.5)[1]} r="4.5" fill="rgba(0,0,0,0.75)" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />

              {/* ---------- 未来点位（空心虚线） ---------- */}
              <circle cx={329} cy={curvePoint(0.85)[1]} r="5" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" strokeDasharray="2 3" />
              <circle cx={380} cy={60} r="5" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" strokeDasharray="2 3" />

              {/* ---------- 当前价点位：参考虚线 + 脉冲环 + 实心点 ---------- */}
              <line x1="40" y1={CUR_Y} x2={CUR_X} y2={CUR_Y} stroke="rgba(0,0,0,0.22)" strokeWidth="1" strokeDasharray="3 4" />
              <line x1={CUR_X} y1={CUR_Y} x2={CUR_X} y2="340" stroke="rgba(0,0,0,0.22)" strokeWidth="1" strokeDasharray="3 4" />
              <motion.circle
                cx={CUR_X}
                cy={CUR_Y}
                fill="none"
                stroke="rgba(0,0,0,0.5)"
                strokeWidth="1.2"
                initial={{ r: 12, opacity: 0.55 }}
                animate={{ r: 34, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 2.1, ease: 'easeOut' }}
              />
              <motion.circle
                cx={CUR_X}
                cy={CUR_Y}
                fill="none"
                stroke="rgba(255,255,255,0.9)"
                strokeWidth="1.4"
                initial={{ r: 8, opacity: 0.9 }}
                animate={{ r: 22, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 2.1, delay: 0.5, ease: 'easeOut' }}
              />
              <circle cx={CUR_X} cy={CUR_Y} r="6" fill="#000" stroke="rgba(255,255,255,0.95)" strokeWidth="2.2" />
              {/* 当前价标签 */}
              <g>
                <rect x={CUR_X + 12} y={CUR_Y - 34} width="92" height="20" rx="4" fill="rgba(0,0,0,0.85)" />
                <text x={CUR_X + 20} y={CUR_Y - 20} fontSize="9" fontWeight="bold" fill="#3ec470" fontFamily="monospace" letterSpacing="0.5">
                  CURRENT PRICE
                </text>
              </g>

              {/* ---------- 标题区 ---------- */}
              <circle cx="14" cy="16" r="3.5" fill="#000" />
              <text x="26" y="20" fontSize="10" fontWeight="bold" fill="rgba(0,0,0,0.75)" fontFamily="monospace" letterSpacing="2">
                BONDING CURVE
              </text>
              <circle cx="352" cy="14" r="3.5" fill="#000">
                <animate attributeName="opacity" values="1;0.2;1" dur="1.6s" repeatCount="indefinite" />
              </circle>
              <text x="363" y="18" fontSize="9" fontWeight="bold" fill="rgba(0,0,0,0.6)" fontFamily="monospace" letterSpacing="1.5" textAnchor="start">
                LIVE
              </text>

              {/* ---------- 底部角标 ---------- */}
              <text x="40" y="394" fontSize="8" fill="rgba(0,0,0,0.4)" fontFamily="monospace">
                Mint early · price grows with supply
              </text>
              <text x="380" y="394" textAnchor="end" fontSize="7" fill="rgba(0,0,0,0.3)" fontFamily="monospace" letterSpacing="1">
                ILLUSTRATIVE
              </text>
            </svg>
          </div>
        </motion.div>
      </div>

      {/* Bottom Features on 3D Grid */}
      <div className="relative w-full mt-24 lg:mt-32">
        {/* 3D Floor Grid */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none border-t border-black/10">
          <div className="w-[150%] h-[250%] origin-top absolute left-[-25%]" style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            transform: 'perspective(1000px) rotateX(75deg)',
          }}></div>
        </div>

        {/* Features Content */}
        <div className="max-w-[1500px] mx-auto w-full px-6 md:px-12 relative z-10 h-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 h-full border-x border-black/10 divide-y lg:divide-y-0 lg:divide-x divide-black/10">
            <div className="py-12 px-6">
              <div className="text-black/60 font-mono text-sm font-bold mb-3">01 / Minting</div>
              <p className="text-black/80 text-sm font-medium leading-relaxed">Mint your favorite KOL's PASS to place bids. Pricing follows a dynamic bonding curve.</p>
            </div>
            <div className="py-12 px-6">
              <div className="text-black/60 font-mono text-sm font-bold mb-3">02 / Bidding</div>
              <p className="text-black/80 text-sm font-medium leading-relaxed">Engage in penny auctions to win exclusive KOL offerings at incredibly low prices.</p>
            </div>
            <div className="py-12 px-6">
              <div className="text-black/60 font-mono text-sm font-bold mb-3">03 / Staking</div>
              <p className="text-black/80 text-sm font-medium leading-relaxed">Stake your KOL PASS to earn a share of their auction yields and exclusive benefits.</p>
            </div>
            <div className="py-12 px-6">
              <div className="text-black/60 font-mono text-sm font-bold mb-3">04 / Claiming</div>
              <p className="text-black/80 text-sm font-medium leading-relaxed">Claim your earned rewards, including PASS trading profits, KOL perks, staking yields, and point airdrops.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PartnersMarquee() {
  return (
    <div className="w-full bg-[#050505] border-t border-black/10 overflow-hidden relative z-20 flex">
      <div className="bg-[#050505] z-30 px-6 py-4 flex items-center shrink-0 border-r border-white/10 shadow-[20px_0_20px_-10px_rgba(5,5,5,1)]">
        <span className="text-brand-green/80 font-bold tracking-widest text-xs uppercase flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-brand-green rounded-full animate-pulse"></div>
          Network
        </span>
      </div>
      <div className="flex-1 overflow-hidden relative flex items-center py-4">
        <motion.div
          className="flex gap-16 items-center px-6"
          animate={{ x: [0, -2500] }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
        >
          {[...marqueeWords, ...marqueeWords, ...marqueeWords, ...marqueeWords].map((word, idx) => (
            <div key={`mq-${idx}`} className="flex items-center shrink-0">
              <span className="text-white/40 hover:text-white transition-colors duration-300 font-black text-xl uppercase tracking-[0.2em]">{word}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

/** 链上实时拍卖入口（无 mock 榜单，全部真实链上数据在 /auctions 展示） */
function LiveAuctionsCTA() {
  // Codex 审计：价格文案读链上 FIXED_BID_AMOUNT（测试网 0.1 / 主网 99），
  // 不写死 99——避免误导用户资金预估
  const { fixedBidAmount } = useFactory();
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(ROUTES.AUCTIONS);
  };

  return (
    <section className="bg-transparent pb-32 px-6 pt-12 relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <h2 className="text-white text-4xl md:text-5xl font-bold tracking-tight">LIVE AUCTIONS</h2>
            <p className="text-white/40 text-[14px] mt-3 max-w-xl leading-relaxed">
              Real-time penny auctions from on-chain KOLs on Monad testnet. Each bid costs {formatMon(fixedBidAmount)} MON and extends the countdown.
            </p>
          </div>
          <form onSubmit={handleSearch} className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-500" />
            </div>
            <input
              type="text"
              className="block w-full pl-12 pr-4 py-3 bg-[#111] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-green focus:border-brand-green transition-colors font-medium"
              placeholder="Explore live auctions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>
        </div>

        <button
          onClick={() => navigate(ROUTES.AUCTIONS)}
          className="w-full bg-[#0a0a0a] border border-white/10 rounded-3xl p-16 text-center hover:border-brand-green/40 transition-all group"
        >
          <div className="text-white/30 text-[12px] font-bold uppercase tracking-[0.2em] mb-4">View All Auctions</div>
          <div className="text-white text-2xl font-bold group-hover:text-brand-green transition-colors flex items-center justify-center gap-3">
            Enter the Live Marketplace
            <ArrowRight className="w-6 h-6" />
          </div>
        </button>
      </div>
    </section>
  );
}

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-transparent">
      <Hero onExplore={() => navigate('/auctions')} />
      <PartnersMarquee />
      <LiveAuctionsCTA />
    </div>
  );
}
