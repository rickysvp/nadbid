import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { KolAvatar } from '../components/kol/KolAvatar';
import { useToast } from '../hooks/useToast';
import { kolProfilePath } from '../config/routes';

const initialAvailable = [
  { id: 'a1', name: 'CryptoQueen', handle: '@cryptoqueen', pass: 12, revShare: '12%' },
  { id: 'a2', name: 'AlphaSeeker', handle: '@alphaseek', pass: 8, revShare: '15%' },
  { id: 'a3', name: 'MoonShot', handle: '@moonshot', pass: 20, revShare: '14%' },
  { id: 'a4', name: 'DegenWizard', handle: '@degenwiz', pass: 3, revShare: '8%' },
  { id: 'a5', name: 'WhaleWatch', handle: '@whalewatch', pass: 1, revShare: '5%' },
  { id: 'a6', name: 'DeFiGuru', handle: '@defiguru', pass: 4, revShare: '10%' },
  { id: 'a7', name: 'YieldFarm', handle: '@yieldfarm', pass: 15, revShare: '13%' },
  { id: 'a8', name: 'BlockBoss', handle: '@blockboss', pass: 7, revShare: '9%' },
];

const initialStaked = [
  { id: 's1', name: 'BobBuilder', handle: '@bobbuild', pass: 10, yieldAmount: 450.00, revShare: '11%' },
  { id: 's2', name: 'ArtDegen', handle: '@artdegen', pass: 1, yieldAmount: 12.50, revShare: '5%' },
  { id: 's3', name: 'WhaleWatch', handle: '@whalewatch', pass: 5, yieldAmount: 1200.00, revShare: '12%' },
  { id: 's4', name: 'CryptoQueen', handle: '@cryptoqueen', pass: 2, yieldAmount: 85.00, revShare: '12%' },
  { id: 's5', name: 'YieldFarm', handle: '@yieldfarm', pass: 4, yieldAmount: 120.00, revShare: '13%' },
  { id: 's6', name: 'BlockBoss', handle: '@blockboss', pass: 8, yieldAmount: 340.00, revShare: '9%' },
  { id: 's7', name: 'AlphaSeeker', handle: '@alphaseek', pass: 3, yieldAmount: 95.00, revShare: '15%' },
  { id: 's8', name: 'MoonShot', handle: '@moonshot', pass: 5, yieldAmount: 210.00, revShare: '14%' },
];

export default function StakingPage() {
  const [available, setAvailable] = useState(initialAvailable);
  const [staked, setStaked] = useState(initialStaked);
  const { success } = useToast();

  const handleStake = (item: typeof initialAvailable[0]) => {
    success('Staked ' + item.name + ' successfully!');
    setAvailable((prev) => prev.filter((i) => i.id !== item.id));
    setStaked((prev) => [{ ...item, yieldAmount: 0.00, id: `s-${Date.now()}` }, ...prev]);
  };

  const handleUnstake = (item: typeof initialStaked[0]) => {
    success('Unstaked ' + item.name + ' successfully!');
    setStaked((prev) => prev.filter((i) => i.id !== item.id));
    setAvailable((prev) => [{ ...item, id: `a-${Date.now()}` }, ...prev]);
  };

  return (
    <div className="min-h-screen bg-transparent pt-32 pb-24 font-sans text-white relative">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Staking for Yield</h1>
            <p className="text-white/50 text-[13px] font-medium">Manage your active stakes and check distributed yields.</p>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="bg-[#161616] border border-white/[0.04] rounded-lg p-5 min-w-[160px]">
              <div className="text-[9px] text-white/40 font-bold uppercase tracking-[0.15em] mb-2">TVL</div>
              <div className="font-mono text-xl font-bold text-white tracking-tight">12.45M <span className="text-sm text-white/50">$MON</span></div>
            </div>
            <div className="bg-[#161616] border border-white/[0.04] rounded-lg p-5 min-w-[160px]">
              <div className="text-[9px] text-white/40 font-bold uppercase tracking-[0.15em] mb-2">Total Staked</div>
              <div className="font-mono text-xl font-bold text-[#3ec470] tracking-tight">45,280</div>
            </div>
            <div className="bg-[#161616] border border-white/[0.04] rounded-lg p-5 min-w-[160px]">
              <div className="text-[9px] text-white/40 font-bold uppercase tracking-[0.15em] mb-2">Total Yield</div>
              <div className="font-mono text-xl font-bold text-[#3ec470] tracking-tight">1.24M <span className="text-sm text-[#3ec470]/70">$MON</span></div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Left Column: Available to Stake */}
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide mb-6">Available to Stake</h2>

            <div className="bg-[#161616] border border-white/[0.04] rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#0f0f0f]">
                    <th className="py-4 px-6 text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">KOL</th>
                    <th className="py-4 px-6 text-center text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Pass</th>
                    <th className="py-4 px-6 text-center text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Rev. Share</th>
                    <th className="py-4 px-6 text-center text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Yield ($MON)</th>
                    <th className="py-4 px-6 text-right text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Action</th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  <AnimatePresence>
                    {available.map((item) => (
                      <motion.tr
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        key={item.id}
                        className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01] transition-colors"
                      >
                        <td className="py-4 px-6">
                          <Link to={kolProfilePath(item.handle)} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                            <div className="w-9 h-9 rounded-full bg-[#0a0a0a] border border-white/5 overflow-hidden flex items-center justify-center">
                              <KolAvatar handle={item.handle} name={item.name} className="!w-full !h-full !rounded-full !border-0" />
                            </div>
                            <div>
                              <div className="font-bold text-white tracking-tight hover:text-[#3ec470] transition-colors">{item.name}</div>
                              <div className="text-[11px] text-white/40 font-mono">{item.handle}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="py-4 px-6 text-center font-bold font-mono text-white/80">{item.pass}</td>
                        <td className="py-4 px-6 text-center font-bold font-mono text-white/80">{item.revShare}</td>
                        <td className="py-4 px-6 text-center font-bold font-mono text-white/30">-</td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleStake(item)}
                            className="bg-[#3ec470] text-black font-bold text-[11px] px-5 py-2 rounded shadow-[0_0_10px_rgba(62,196,112,0.1)] hover:shadow-[0_0_15px_rgba(62,196,112,0.2)] hover:bg-[#4ade80] transition-all tracking-wider"
                          >
                            Stake
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  {available.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-white/30 text-sm font-medium">No passes available to stake.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Currently Staked */}
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide mb-6">Currently Staked</h2>

            <div className="bg-[#161616] border border-white/[0.04] rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#0f0f0f]">
                    <th className="py-4 px-6 text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">KOL</th>
                    <th className="py-4 px-6 text-center text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Staked</th>
                    <th className="py-4 px-6 text-center text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Yield ($MON)</th>
                    <th className="py-4 px-6 text-right text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Action</th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  <AnimatePresence>
                    {staked.map((item) => (
                      <motion.tr
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        key={item.id}
                        className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01] transition-colors"
                      >
                        <td className="py-4 px-6">
                          <Link to={kolProfilePath(item.handle)} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                            <div className="w-9 h-9 rounded-full bg-[#0a0a0a] border border-white/5 overflow-hidden flex items-center justify-center">
                              <KolAvatar handle={item.handle} name={item.name} className="!w-full !h-full !rounded-full !border-0" />
                            </div>
                            <div>
                              <div className="font-bold text-white tracking-tight hover:text-[#3ec470] transition-colors">{item.name}</div>
                              <div className="text-[11px] text-white/40 font-mono">{item.handle}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="py-4 px-6 text-center font-bold font-mono text-white/80">{item.pass}</td>
                        <td className="py-4 px-6 text-center font-bold font-mono text-[#3ec470]">
                          {item.yieldAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleUnstake(item)}
                            className="bg-transparent border border-white/[0.08] text-white/60 font-bold text-[11px] px-4 py-2 rounded hover:bg-white/[0.04] hover:text-white transition-all tracking-wider"
                          >
                            Unstake
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  {staked.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-white/30 text-sm font-medium">No active stakes.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
