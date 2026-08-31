import { useState } from 'react';
import { Trophy, Clock, Share2, Copy, Users, Zap, TrendingUp, ShieldCheck, Ticket } from 'lucide-react';
import { useToast } from '../hooks/useToast';

const referrals = [
  { id: 1, handle: '@AlphaHunter', points: '12,500', date: '2 days ago' },
  { id: 2, handle: '@DegenKing', points: '8,420', date: '5 days ago' },
  { id: 3, handle: '@CryptoWhale', points: '4,100', date: '1 week ago' },
  { id: 4, handle: '@OxPunk', points: '2,150', date: '10 days ago' },
];

export default function PointsPage() {
  const [copied, setCopied] = useState(false);
  const { success, info } = useToast();

  const handleCopy = () => {
    setCopied(true);
    navigator.clipboard.writeText('https://nadbid.fun/ref?code=you');
    success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-transparent pt-32 pb-24 font-sans text-white relative">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-12 relative z-10 space-y-6">
        {/* Top Row: Balance & Rank */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Total Points Balance */}
          <div className="lg:col-span-2 bg-[#161616] border border-white/[0.04] rounded-lg p-8 relative overflow-hidden flex flex-col justify-between h-[220px]">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-white/[0.03] to-transparent transform skew-x-12 translate-x-20 pointer-events-none"></div>

            <div className="relative z-10">
              <div className="text-white/40 text-[10px] font-bold uppercase tracking-[0.15em] mb-4">Total Points Balance</div>
              <div className="flex items-baseline gap-4">
                <h1 className="text-6xl md:text-7xl font-black tracking-tighter">124,500</h1>
                <div className="flex items-center gap-1 bg-[#1a2f22] text-[#3ec470] text-[10px] font-bold px-2 py-1 rounded border border-[#3ec470]/30 tracking-wider">
                  <TrendingUp className="w-3 h-3" /> +1,200 PTS
                </div>
              </div>
            </div>

            <div className="relative z-10 flex justify-between items-center mt-8">
              <div className="flex items-center gap-1.5 text-white/30 text-[10px] font-bold uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5" /> Updated 2 minutes ago
              </div>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
              </div>
            </div>
          </div>

          {/* Global Rank */}
          <div className="lg:col-span-1 bg-[#0d1611] border border-[#3ec470]/30 rounded-lg p-8 relative overflow-hidden flex flex-col items-center justify-center text-center h-[220px]">
            <Trophy className="absolute -right-6 -bottom-6 w-40 h-40 text-[#3ec470]/5" strokeWidth={1} />

            <div className="w-12 h-12 rounded-lg bg-[#3ec470]/10 border border-[#3ec470]/20 flex items-center justify-center mb-4 relative z-10">
              <Trophy className="w-6 h-6 text-[#3ec470]" />
            </div>
            <div className="text-[#3ec470] text-[10px] font-bold uppercase tracking-[0.15em] mb-1 relative z-10">Global Rank</div>
            <div className="text-5xl font-black text-[#3ec470] tracking-tighter mb-4 relative z-10">#42</div>
            <div className="flex items-center gap-1.5 bg-[#0f1f15] border border-[#3ec470]/20 text-[#3ec470] text-[9px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider relative z-10">
              <ShieldCheck className="w-3 h-3" /> Top 0.1% of Users
            </div>
          </div>
        </div>

        {/* Invite & Earn */}
        <div className="bg-[#161616] border border-white/[0.04] rounded-lg p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight mb-3">Invite & Earn Network Yield</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-4">
              You and your friend both earn 5% bonus points based on your friend's base point generation.
            </p>
            <p className="text-white/50 text-sm leading-relaxed">
              Keep building to unlock the next evolution of network rewards.
            </p>
          </div>

          <div className="bg-[#0f0f0f] border border-white/[0.04] rounded-lg p-5">
            <div className="text-center font-mono text-sm text-white mb-5">
              https://nadbid.fun/ref?code=you
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => info('Opening X share dialog...')} className="flex items-center justify-center gap-2 bg-[#1a1a1a] border border-white/[0.08] text-white text-[10px] font-bold uppercase tracking-wider py-3.5 rounded hover:bg-[#222] transition-colors">
                <Share2 className="w-3.5 h-3.5" /> Share on X
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center justify-center gap-2 bg-[#3ec470] text-black text-[10px] font-bold uppercase tracking-wider py-3.5 rounded hover:bg-[#4ade80] transition-colors"
              >
                {copied ? <ShieldCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div>
          <h3 className="text-xl font-bold tracking-tight mb-4">Points Source Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* 1 - Minting PASS */}
            <div className="bg-[#161616] border border-white/[0.04] rounded-lg p-5">
              <div className="flex items-center gap-1.5 text-white/50 text-[10px] font-bold uppercase tracking-wider mb-3">
                <Ticket className="w-3.5 h-3.5" /> Minting PASS
              </div>
              <div className="text-2xl font-black text-white tracking-tight mb-1">45,000</div>
              <div className="text-white/30 text-[10px] font-bold uppercase tracking-widest">pts</div>
            </div>

            {/* 2 - Bidding Activity */}
            <div className="bg-[#161616] border border-white/[0.04] rounded-lg p-5">
              <div className="flex items-center gap-1.5 text-white/50 text-[10px] font-bold uppercase tracking-wider mb-3">
                <Zap className="w-3.5 h-3.5" /> Bidding Activity
              </div>
              <div className="text-2xl font-black text-white tracking-tight mb-1">32,500</div>
              <div className="text-white/30 text-[10px] font-bold uppercase tracking-widest">pts</div>
            </div>

            {/* 3 - Referral Bonuses (Highlighted) */}
            <div className="bg-[#0d1611] border border-[#3ec470]/30 rounded-lg p-5 relative overflow-hidden">
              <div className="absolute inset-0 bg-[#3ec470]/5 pointer-events-none"></div>
              <div className="relative z-10 flex items-center gap-1.5 text-[#3ec470] text-[10px] font-bold uppercase tracking-wider mb-3">
                <Users className="w-3.5 h-3.5" /> Referral Bonuses
              </div>
              <div className="relative z-10 text-2xl font-black text-[#3ec470] tracking-tight mb-1">22,000</div>
              <div className="relative z-10 text-[#3ec470]/50 text-[10px] font-bold uppercase tracking-widest">pts</div>
            </div>

            {/* 4 - Staking Multipliers */}
            <div className="bg-[#161616] border border-white/[0.04] rounded-lg p-5">
              <div className="flex items-center gap-1.5 text-white/50 text-[10px] font-bold uppercase tracking-wider mb-3">
                <ShieldCheck className="w-3.5 h-3.5" /> Staking Multipliers
              </div>
              <div className="text-2xl font-black text-white tracking-tight mb-1">15,000</div>
              <div className="text-white/30 text-[10px] font-bold uppercase tracking-widest">pts</div>
            </div>

            {/* 5 - Auction Wins */}
            <div className="bg-[#161616] border border-white/[0.04] rounded-lg p-5">
              <div className="flex items-center gap-1.5 text-white/50 text-[10px] font-bold uppercase tracking-wider mb-3">
                <Trophy className="w-3.5 h-3.5" /> Auction Wins
              </div>
              <div className="text-2xl font-black text-white tracking-tight mb-1">10,000</div>
              <div className="text-white/30 text-[10px] font-bold uppercase tracking-widest">pts</div>
            </div>
          </div>
        </div>

        {/* Referral List */}
        <div className="bg-[#161616] border border-white/[0.04] rounded-lg overflow-hidden mt-6">
          <div className="p-6 border-b border-white/[0.04]">
            <h3 className="text-sm font-bold tracking-wide">Referral List</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-white/[0.04] bg-[#1a1a1a]">
                  <th className="py-4 px-6 text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Invitee</th>
                  <th className="py-4 px-6 text-center text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Total Points Earned for You</th>
                  <th className="py-4 px-6 text-right text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Join Date</th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {referrals.map((row) => (
                  <tr key={row.id} className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01] transition-colors">
                    <td className="py-5 px-6 font-bold text-white/90">{row.handle}</td>
                    <td className="py-5 px-6 text-center font-mono font-bold text-[#3ec470]">{row.points} pts</td>
                    <td className="py-5 px-6 text-right text-white/40 text-[12px]">{row.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
