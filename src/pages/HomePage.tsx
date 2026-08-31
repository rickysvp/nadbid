import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search } from 'lucide-react';
import { kolProfilePath } from '../config/routes';

const partners = [
  'Monad', 'Paradigm', 'Jump Crypto', 'Wintermute', 'Dragonfly',
  'Multicoin', 'Framework', 'Binance Labs', 'GSR', 'Pantera',
];

const generatedKols = Array.from({ length: 100 }).map((_, i) => {
  const names = ['Ansem', 'Cobie', 'Hsaka', 'Pentoshi', 'Sisyphus', 'Loomdart', 'DegenSpartan', 'CryptoHayes', 'GCR', 'Gainzy'];
  const name = names[i % names.length] + (i >= names.length ? `_${i}` : '');
  return {
    rank: `#${i + 1}`,
    name,
    handle: `@${name.toLowerCase()}`,
    tvl: (100000 - i * 850 - Math.random() * 500).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    status: Math.random() > 0.3 ? 'Active' : 'Bidding',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}${i}`,
  };
});

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
          Partners
        </span>
      </div>
      <div className="flex-1 overflow-hidden relative flex items-center py-4">
        <motion.div
          className="flex gap-16 items-center px-6"
          animate={{ x: [0, -2500] }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
        >
          {[...partners, ...partners, ...partners, ...partners].map((partner, idx) => (
            <div key={`mq-${idx}`} className="flex items-center shrink-0">
              <span className="text-white/40 hover:text-white transition-colors duration-300 font-black text-xl uppercase tracking-[0.2em]">{partner}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

function KOLRank({ onSelectKOL }: { onSelectKOL: (handle: string) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const filteredKols = generatedKols.filter(kol =>
    kol.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kol.handle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section className="bg-transparent pb-32 px-6 pt-12 relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <h2 className="text-white text-4xl md:text-5xl font-bold tracking-tight">KOL RANK</h2>
          </div>
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-500" />
            </div>
            <input
              type="text"
              className="block w-full pl-12 pr-4 py-3 bg-[#111] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-green focus:border-brand-green transition-colors font-medium"
              placeholder="Search KOL name or handle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl shadow-2xl overflow-hidden h-[600px] flex flex-col">
          <div className="overflow-x-auto overflow-y-auto flex-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 bg-[#0a0a0a] z-10">
                <tr className="border-b border-white/5 text-gray-500 text-xs font-semibold tracking-wider uppercase bg-white/[0.02] backdrop-blur-md">
                  <th className="py-6 px-8">Rank</th>
                  <th className="py-6 px-8">KOL</th>
                  <th className="py-6 px-8 text-right">Total TVL (MON)</th>
                  <th className="py-6 px-8 text-center">Status</th>
                  <th className="py-6 px-8 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredKols.length > 0 ? (
                  filteredKols.map((kol, i) => (
                    <motion.tr
                      key={i}
                      onClick={() => onSelectKOL(kol.handle.replace('@', ''))}
                      className="hover:bg-white/[0.04] transition-all group relative z-0 hover:z-10 bg-transparent cursor-pointer origin-center"
                      whileHover={{ scale: 1.02, y: -2, boxShadow: '0px 10px 30px rgba(0,0,0,0.5)', backgroundColor: 'rgba(255,255,255,0.06)' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    >
                      <td className="py-6 px-8 text-gray-400 font-medium text-lg tabular-nums">{kol.rank}</td>
                      <td className="py-6 px-8">
                        <div className="flex items-center gap-4">
                          <motion.img src={kol.avatar} alt={kol.name} className="w-12 h-12 rounded-full border border-white/10 bg-[#111]" whileHover={{ scale: 1.15, rotate: 5 }} transition={{ type: 'spring', stiffness: 300 }} />
                          <div>
                            <div className="text-white font-semibold text-lg leading-none mb-1.5 hover:text-brand-green transition-colors">{kol.name}</div>
                            <div className="text-gray-500 font-normal text-sm leading-none">{kol.handle}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-6 px-8 text-right text-white font-medium text-xl tabular-nums">{kol.tvl}</td>
                      <td className="py-6 px-8 text-center">
                        {kol.status === 'Bidding' ? (
                          <span className="inline-flex items-center gap-2 bg-brand-green/10 border border-brand-green/20 text-brand-green px-3 py-1 rounded-full text-xs font-medium">
                            <span className="w-1.5 h-1.5 bg-brand-green rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
                            BIDDING
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-gray-400 px-3 py-1 rounded-full text-xs font-medium">Active</span>
                        )}
                      </td>
                      <td className="py-6 px-8 text-right">
                        {kol.status === 'Bidding' ? (
                          <button className="text-black bg-brand-green font-medium text-sm px-8 py-2 rounded-full hover:bg-green-400 hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:-translate-y-0.5 transition-all duration-300">Bid</button>
                        ) : (
                          <button className="text-white bg-white/5 font-medium text-sm px-8 py-2 border border-white/10 rounded-full hover:bg-white/10 transition-all duration-300">View</button>
                        )}
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-24 text-center text-gray-500 text-lg">No results found for "{searchTerm}"</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
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
      <KOLRank onSelectKOL={(handle) => navigate(kolProfilePath(handle))} />
    </div>
  );
}
