import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, User, Package, TerminalSquare, ExternalLink } from 'lucide-react';
import { useToast } from '../hooks/useToast';

const initialPending = [
  { id: 'p1', title: '@0xChine PASS', type: 'Staking', amount: '4,100.00', rawAmount: 4100.00 },
  { id: 'p2', title: 'KOLF #842', type: 'Refund', amount: '3,150.50', rawAmount: 3150.50 },
  { id: 'p3', title: '@DegenSpartan PASS', type: 'Staking', amount: '4,100.00', rawAmount: 4100.00 },
];

const initialHistory = [
  { id: 'h1', status: 'SETTLED', event: 'Claimed Staking Rewards', date: 'Oct 24, 2024 • 14:32 UTC', amount: '+ 450.00 MON' },
  { id: 'h2', status: 'SETTLED', event: 'Auction Refund: KOLF #842', date: 'Oct 22, 2024 • 09:15 UTC', amount: '+ 1,200.00 MON' },
];

export default function ClaimPage() {
  const [pending, setPending] = useState(initialPending);
  const [history, setHistory] = useState(initialHistory);
  const { success, info } = useToast();

  const handleClaim = (item: typeof initialPending[0]) => {
    success('Claimed rewards for ' + item.type + ' successfully!');
    setPending((prev) => prev.filter((p) => p.id !== item.id));

    const newHistoryItem = {
      id: `h-${Date.now()}`,
      status: 'SETTLED',
      event: item.type === 'Staking' ? `Claimed Staking Rewards (${item.title})` : `Auction Refund: ${item.title}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' • ' +
        new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }),
      amount: `+ ${item.amount} MON`,
    };

    setHistory((prev) => [newHistoryItem, ...prev]);
  };

  const handleClaimAll = () => {
    success('Claimed all available rewards successfully!');
    if (pending.length === 0) return;

    const newHistoryItems = pending.map((item, index) => ({
      id: `h-all-${Date.now()}-${index}`,
      status: 'SETTLED',
      event: item.type === 'Staking' ? `Claimed Staking Rewards (${item.title})` : `Auction Refund: ${item.title}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' • ' +
        new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }),
      amount: `+ ${item.amount} MON`,
    }));

    setPending([]);
    setHistory((prev) => [...newHistoryItems, ...prev]);
  };

  return (
    <div className="min-h-screen bg-transparent pt-32 pb-24 font-sans text-white relative">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-12 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6 border-b border-white/[0.04] pb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Pending Rewards Breakdown</h1>
            <p className="text-white/50 text-sm font-medium">Review and collect your outstanding balances.</p>
          </div>

          <button
            onClick={handleClaimAll}
            disabled={pending.length === 0}
            className={`flex items-center gap-2 font-bold text-sm px-6 py-3 rounded uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(62,196,112,0.1)] hover:shadow-[0_0_25px_rgba(62,196,112,0.2)] ${
              pending.length > 0
                ? 'bg-[#3ec470] text-black hover:bg-[#4ade80] active:scale-[0.98]'
                : 'bg-white/5 text-white/30 cursor-not-allowed shadow-none hover:shadow-none'
            }`}
          >
            Claim All <Zap className="w-4 h-4" />
          </button>
        </div>

        {/* Two Column Layout for Pending & Rules */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          {/* Left Column: Pending Rewards */}
          <div className="lg:col-span-8">
            <div className="flex justify-between text-white/40 text-[10px] font-bold uppercase tracking-[0.15em] mb-4 px-2">
              <span>Source (KOL/Event)</span>
              <span>Amount / Action</span>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {pending.map((item) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    key={item.id}
                    className="bg-[#161616] border border-white/[0.04] rounded-lg p-5 flex items-center justify-between group hover:border-white/[0.08] transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-center justify-center shrink-0">
                        {item.type === 'Staking' ? (
                          <User className="w-5 h-5 text-[#3ec470]/80" />
                        ) : (
                          <Package className="w-5 h-5 text-[#fbbf24]/80" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-white text-[15px] tracking-tight mb-1">{item.title}</div>
                        <span className={`inline-block px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider ${
                          item.type === 'Staking'
                            ? 'bg-white/5 text-white/60 border border-white/10'
                            : 'bg-[#fbbf24]/10 text-[#fbbf24] border border-[#fbbf24]/20'
                        }`}>
                          {item.type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="font-mono text-lg font-bold text-white">
                        {item.amount} <span className="text-[12px] text-white/50">MON</span>
                      </div>
                      <button
                        onClick={() => handleClaim(item)}
                        className="bg-white/[0.05] border border-white/[0.08] text-white/80 font-bold text-[12px] px-5 py-2.5 rounded hover:bg-white/[0.1] hover:text-white transition-all tracking-wide"
                      >
                        Claim
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {pending.length === 0 && (
                <div className="bg-[#161616] border border-white/[0.04] rounded-lg p-12 text-center text-white/40 text-sm font-medium">
                  No pending rewards. You are all caught up!
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Claim Rules */}
          <div className="lg:col-span-4">
            <div className="bg-[#161616] border border-white/[0.04] rounded-lg overflow-hidden h-full">
              <div className="bg-[#1a1a1a] border-b border-white/[0.04] p-4 flex items-center gap-2">
                <TerminalSquare className="w-4 h-4 text-white/50" />
                <span className="text-[10px] font-bold text-white/80 uppercase tracking-[0.15em]">Claim Rules</span>
              </div>

              <div className="p-6 space-y-6">
                {[
                  { num: '01.', title: 'STAKING DISTRIBUTED', desc: 'Calculated and unlocked every 24 hours based on active staked PASS volume.' },
                  { num: '02.', title: 'AUCTION REFUNDS', desc: '100% of outbid amounts become instantly liquid & claimable upon auction settlement.' },
                  { num: '03.', title: 'PLATFORM FEES', desc: 'A fixed 1% protocol fee applies to all claimed yields to support the Monad ecosystem.' },
                  { num: '04.', title: 'MINIMUM CLAIM', desc: 'No minimum balance constraint required for claiming $MON rewards.' },
                ].map((rule, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="font-mono text-[#3ec470] font-bold text-sm shrink-0">{rule.num}</span>
                    <div>
                      <div className="font-bold text-white text-[11px] uppercase tracking-[0.1em] mb-1.5">{rule.title}</div>
                      <p className="text-white/50 text-[12px] leading-relaxed">{rule.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* History Section */}
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide uppercase mb-6">Recent Claims History</h2>

          <div className="bg-[#161616] border border-white/[0.04] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#1a1a1a]">
                    <th className="py-4 px-6 text-white/40 text-[10px] font-bold uppercase tracking-[0.15em] w-32">Status</th>
                    <th className="py-4 px-6 text-white/40 text-[10px] font-bold uppercase tracking-[0.15em]">Event / Source</th>
                    <th className="py-4 px-6 text-white/40 text-[10px] font-bold uppercase tracking-[0.15em]">Date & Time</th>
                    <th className="py-4 px-6 text-right text-white/40 text-[10px] font-bold uppercase tracking-[0.15em]">Amount Settled</th>
                    <th className="py-4 px-6 text-center text-white/40 text-[10px] font-bold uppercase tracking-[0.15em] w-24">TX Link</th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  <AnimatePresence>
                    {history.map((item) => (
                      <motion.tr
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={item.id}
                        className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01] transition-colors"
                      >
                        <td className="py-5 px-6">
                          <span className="inline-block px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-[0.1em] bg-[#3ec470]/10 text-[#3ec470] border border-[#3ec470]/30">
                            {item.status}
                          </span>
                        </td>
                        <td className="py-5 px-6 font-bold text-white/90">{item.event}</td>
                        <td className="py-5 px-6 font-mono text-white/50">{item.date}</td>
                        <td className="py-5 px-6 text-right font-bold font-mono text-[#3ec470]">{item.amount}</td>
                        <td className="py-5 px-6 text-center">
                          <button onClick={() => info('Opening Transaction...')} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors mx-auto group">
                            <ExternalLink className="w-3.5 h-3.5 text-white/40 group-hover:text-white/80 transition-colors" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            <div className="p-6 flex justify-center border-t border-white/[0.04]">
              <button onClick={() => info('Loading older history...')} className="bg-white/[0.03] border border-white/[0.06] text-white/70 font-bold text-[12px] px-6 py-2.5 rounded hover:bg-white/[0.08] hover:text-white transition-all tracking-wide">
                Load More History
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
