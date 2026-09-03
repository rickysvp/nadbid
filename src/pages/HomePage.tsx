import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, ArrowRight } from 'lucide-react';
import { ROUTES } from '../config/routes';

const marqueeWords = ['Monad', 'Nadbid.fun', 'Penny Auctions', 'Soulbound PASS', 'On-chain', 'KOL Service', 'Fixed Bid 99 MON'];

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
          <div className="w-full max-w-[480px] aspect-square relative">
            <svg viewBox="0 0 400 400" className="w-full h-full" fill="none">
              <defs>
                <linearGradient id="curveGrad" x1="0" y1="400" x2="400" y2="0">
                  <stop offset="0%" stopColor="rgba(0,0,0,0.1)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
                </linearGradient>
              </defs>
              <path d="M 20 380 Q 100 370 160 320 T 280 180 T 380 40" stroke="rgba(0,0,0,0.5)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <path d="M 20 380 Q 100 370 160 320 T 280 180 T 380 40 L 380 380 Z" fill="url(#curveGrad)" opacity="0.3" />
              <circle cx="160" cy="320" r="6" fill="rgba(0,0,0,0.6)" />
              <circle cx="280" cy="180" r="6" fill="rgba(0,0,0,0.6)" />
              <circle cx="380" cy="40" r="8" fill="rgba(0,0,0,0.8)" />
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
              Real-time penny auctions from on-chain KOLs on Monad testnet. Each bid costs 99 MON and extends the countdown.
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
