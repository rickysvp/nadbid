import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Copy, Share2, Users, Wallet, CheckCircle2, AlertTriangle } from 'lucide-react';
import { KolAvatar } from '../components/kol/KolAvatar';
import { Button } from '../components/ui/Button';
import { CircularProgress } from '../components/ui/CircularProgress';
import { BidBoard } from '../components/auction/BidBoard';
import { useToast } from '../hooks/useToast';
import { getAuctionById, getBidsByAuction } from '../data/mockAuctions';
import { kolProfilePath } from '../config/routes';
import { cn } from '../utils/cn';

// Interactive Bonding Curve for auction detail
function InteractiveBondingCurve({ maxPass, currentPrice }: { maxPass: number; currentPrice: number }) {
  const [hoverPct, setHoverPct] = useState<number | null>(null);

  const points = Array.from({ length: 101 }, (_, i) => {
    const pct = i / 100;
    const y = 38 - 30 * Math.pow(pct, 3);
    return { x: i, y, pct };
  });

  const linePath = 'M0,38 ' + points.map((p) => `L${p.x},${p.y}`).join(' ');
  const fillPath = linePath + ' L100,40 L0,40 Z';

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setHoverPct(pct / 100);
  };

  const displayPct = hoverPct !== null ? hoverPct : 1;
  const displayPass = Math.floor(displayPct * maxPass);
  const curvePrice = (displayPct === 0 ? 0 : currentPrice * Math.pow(displayPct, 3)).toFixed(2);
  const activeY = 38 - 30 * Math.pow(displayPct, 3);
  const activeX = displayPct * 100;

  return (
    <div
      className="h-28 w-full border border-white/[0.02] bg-[#0a0a0a] rounded mb-5 relative overflow-hidden cursor-crosshair group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverPct(null)}
    >
      <div className="absolute top-3 left-4 flex flex-col pointer-events-none z-10">
        <span className="text-white/40 text-[9px] font-bold uppercase tracking-wider mb-0.5">
          {hoverPct !== null ? 'Projected' : 'Latest'}
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-[#3ec470] font-mono text-[13px] font-bold">{curvePrice} MON</span>
          <span className="text-white/30 font-mono text-[10px]">Pass #{displayPass}</span>
        </div>
      </div>

      <svg viewBox="0 0 100 40" className="w-full h-full absolute inset-0 pt-8" preserveAspectRatio="none">
        <defs>
          <linearGradient id="curveGradInteractive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3ec470" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#3ec470" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fillPath} fill="url(#curveGradInteractive)" />
        <path d={linePath} fill="none" stroke="#3ec470" strokeWidth="0.8" />
        <circle cx={activeX} cy={activeY} r="1.5" fill="#3ec470" />
        {hoverPct !== null && (
          <line x1={activeX} y1={activeY} x2={activeX} y2="40" stroke="#3ec470" strokeWidth="0.3" strokeDasharray="1,1" />
        )}
      </svg>
    </div>
  );
}

// Countdown hook for circular progress
function useCountdownDetail(targetDate: number) {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, targetDate - Date.now()));
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const initialDuration = 5 * 60 * 1000;
    const interval = setInterval(() => {
      const remaining = targetDate - Date.now();
      if (remaining > 0) {
        setTimeLeft(remaining);
        setProgress(Math.max(0, Math.min(100, (remaining / initialDuration) * 100)));
      } else {
        setTimeLeft(0);
        setProgress(0);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);
  const totalSeconds = Math.floor(timeLeft / 1000);
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return { timeString, progress, isOver: timeLeft <= 0, totalSeconds };
}

const mockBidders = [
  { rank: 1, bidder: '@AlphaHunter', isYou: true, bids: 12, tvl: '45.50' },
  { rank: 2, bidder: '@DegenKing', isLatest: true, bids: 8, tvl: '38.20' },
  { rank: 3, bidder: '@WhaleWatcher', bids: 5, tvl: '32.15' },
  { rank: 4, bidder: '0x7d...f0a4', bids: 4, tvl: '28.40' },
  { rank: 5, bidder: '@CryptoWizard', bids: 4, tvl: '25.00' },
  { rank: 6, bidder: '@MoonShot', bids: 3, tvl: '22.10' },
  { rank: 7, bidder: '0x1e...bb6d', bids: 2, tvl: '18.75' },
  { rank: 8, bidder: '@BullishBear', bids: 2, tvl: '15.30' },
  { rank: 9, bidder: '@SatoshiDisciple', bids: 1, tvl: '14.00' },
  { rank: 10, bidder: '0x4c...99a2', bids: 1, tvl: '13.00' },
];

export default function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const auction = id ? getAuctionById(id) : undefined;
  const bids = id ? getBidsByAuction(id) : [];
  const { success, info } = useToast();
  const [pulse, setPulse] = useState(false);

  if (!auction) {
    return (
      <div className="min-h-screen bg-transparent pt-32 pb-24">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <div className="text-6xl mb-6">🔍</div>
          <h1 className="text-3xl font-black text-white mb-4">Auction Not Found</h1>
          <p className="text-white/40 mb-8">The auction you're looking for doesn't exist or has been removed.</p>
          <Link to="/auctions">
            <Button>Back to Auctions</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isLive = auction.status === 'LIVE';
  const targetTime = isLive ? auction.endTime : auction.startTime;
  const { timeString, progress, totalSeconds } = useCountdownDetail(targetTime);
  const latestBid = isLive ? auction.currentBid.toFixed(1) : auction.minBid.toFixed(1);

  const handleBid = () => {
    if (!isLive) {
      info('Auction has not started yet');
      return;
    }
    success('Transaction submitted to Monad testnet');
    setPulse(true);
    setTimeout(() => setPulse(false), 500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    success('Auction link copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-transparent pt-32 pb-24 font-sans text-white relative">
      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        {/* Back + Actions */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/auctions" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors font-bold text-sm tracking-wide">
            <ArrowLeft className="w-4 h-4" /> BACK TO AUCTIONS
          </Link>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={handleCopyLink}>
              <Copy className="w-3.5 h-3.5" /> Copy Link
            </Button>
            <Button size="sm" variant="secondary" onClick={() => info('Opening share dialog...')}>
              <Share2 className="w-3.5 h-3.5" /> Share
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Creator Profile Summary */}
            <div className="bg-[#161616] border border-white/[0.04] rounded-lg p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#3ec470]/[0.02] rounded-full blur-[80px] pointer-events-none"></div>

              <div className="flex flex-col sm:flex-row gap-6 relative z-10">
                <div className="flex flex-col items-center gap-4">
                  <Link to={kolProfilePath(auction.kol.handle)}>
                    <KolAvatar handle={auction.kol.handle} size="xl" name={auction.kol.name} className="!w-24 !h-24 !rounded-full border border-white/10 shadow-xl cursor-pointer hover:opacity-80 transition-opacity" />
                  </Link>
                  <button
                    onClick={() => info(`Follow ${auction.kol.handle} on X`)}
                    className="w-full bg-[#0a0a0a] border border-white/[0.06] text-white/70 hover:text-white text-[10px] font-bold uppercase tracking-[0.15em] py-2 px-4 rounded-lg hover:bg-white/[0.02] hover:border-white/10 transition-all text-center"
                  >
                    Follow on X
                  </button>
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Link to={kolProfilePath(auction.kol.handle)} className="hover:opacity-80 transition-opacity">
                        <h1 className="text-3xl font-black tracking-tight cursor-pointer hover:text-[#3ec470] transition-colors">{auction.kol.name}</h1>
                      </Link>
                      <CheckCircle2 className="w-5 h-5 text-[#3ec470]" />
                    </div>
                    {isLive ? (
                      <div className="flex items-center gap-1.5 bg-[#3ec470]/10 border border-[#3ec470]/20 px-2.5 py-1 rounded-full">
                        <div className="w-1.5 h-1.5 bg-[#3ec470] rounded-full animate-pulse"></div>
                        <span className="text-[#3ec470] text-[10px] font-bold tracking-wider uppercase">Live</span>
                      </div>
                    ) : (
                      <div className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                        <span className="text-white/40 text-[10px] font-bold tracking-wider uppercase">Upcoming</span>
                      </div>
                    )}
                  </div>
                  <div className="text-white/50 font-mono text-sm mb-4">{auction.kol.handle}</div>
                  <div className="bg-[#0f0f0f] border border-white/5 rounded p-4 mb-4">
                    <p className="text-white/50 text-[13px] leading-relaxed">
                      {auction.title} — Mastering the art of early-stage degen plays and institutional-grade swing trades. Accessing my vault gives you 24/7 insight into every move I make before it hits the timeline.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-1.5 bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded text-[9px] font-bold text-white/60 tracking-wider">
                      <Users className="w-3.5 h-3.5 text-white/40" /> {auction.kol.followers.toLocaleString()} FOLLOWERS
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded text-[9px] font-bold text-white/60 tracking-wider">
                      <Wallet className="w-3.5 h-3.5 text-white/40" /> 1,284 HOLDERS
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Bid & Last Bidder */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#161616] border border-white/[0.04] rounded-lg p-6">
                <div className="text-white/40 text-[10px] font-bold uppercase tracking-[0.15em] mb-2">{isLive ? 'Fixed Bid' : 'Starting Price'}</div>
                <div className="text-[#3ec470] font-mono text-3xl font-bold">
                  {latestBid} <span className="text-sm font-medium text-[#3ec470]/60">MON</span>
                </div>
              </div>

              <div className="bg-[#161616] border border-white/[0.04] rounded-lg p-6">
                <div className="text-white/40 text-[10px] font-bold uppercase tracking-[0.15em] mb-2">Last Bidder</div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/10 overflow-hidden flex items-center justify-center">
                    {auction.lastBidder && <div className="w-3 h-3 rounded-full bg-[#3ec470]/50"></div>}
                  </div>
                  <span className="text-white/90 font-mono text-xl">{auction.lastBidder || '-'}</span>
                </div>
              </div>
            </div>

            {/* Live Leaderboard */}
            <div className="bg-[#161616] border border-white/[0.04] rounded-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[13px] font-bold uppercase tracking-[0.1em] text-white">Live Leaderboard</h3>
                <div className="flex items-center gap-1.5 text-[#3ec470] text-[10px] font-bold tracking-[0.15em] uppercase bg-[#3ec470]/10 px-3 py-1 rounded">
                  <AlertTriangle className="w-3 h-3" /> System Live
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[9px] font-bold text-white/30 uppercase tracking-[0.15em] border-b border-white/[0.04]">
                      <th className="pb-3 px-2">Rank</th>
                      <th className="pb-3 px-2">Bidder</th>
                      <th className="pb-3 px-2 text-right">Bids</th>
                      <th className="pb-3 px-2 text-right">TVL (MON)</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-[12px]">
                    {isLive ? mockBidders.map((row) => (
                      <tr key={row.rank} className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01] transition-colors">
                        <td className="py-3 px-2 font-bold text-white/40">{row.rank}</td>
                        <td className="py-3 px-2 flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                          <span className="text-white/80 hover:text-[#3ec470] transition-colors">{row.bidder}</span>
                          {row.isYou && <span className="bg-[#1a2f22] text-[#3ec470] text-[8px] px-1.5 py-0.5 rounded-sm font-sans font-bold tracking-wider">YOU</span>}
                          {row.isLatest && <span className="text-[#3ec470] text-[8px] font-sans font-bold tracking-wider">LATEST BID</span>}
                        </td>
                        <td className="py-3 px-2 text-right text-white/50">{row.bids}</td>
                        <td className={`py-3 px-2 text-right font-bold ${row.isYou ? 'text-[#3ec470]' : 'text-white'}`}>{row.tvl}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-white/30 text-sm">
                          Auction has not started yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Bidding Control */}
            <div className="bg-[#161616] border border-white/[0.04] rounded-lg p-8 flex flex-col items-center">
              <CircularProgress
                progress={progress}
                size={160}
                strokeWidth={4}
                label={isLive ? `${totalSeconds}s` : timeString}
                sublabel={isLive ? 'In Progress' : 'Starts In'}
              />

              <div className="w-full grid grid-cols-3 gap-2 border-y border-white/[0.04] py-5 my-6 text-center">
                <div>
                  <div className="text-white/40 text-[8px] font-bold uppercase tracking-[0.15em] mb-1.5">Bidders</div>
                  <div className="font-black text-sm">{isLive ? '456' : '-'}</div>
                </div>
                <div>
                  <div className="text-white/40 text-[8px] font-bold uppercase tracking-[0.15em] mb-1.5">Total Bids</div>
                  <div className="font-black text-sm">{isLive ? '1,284' : '-'}</div>
                </div>
                <div>
                  <div className="text-white/40 text-[8px] font-bold uppercase tracking-[0.15em] mb-1.5">TVL (MON)</div>
                  <div className="font-black text-sm">{isLive ? '15,985.80' : '-'}</div>
                </div>
              </div>

              <div className="text-center w-full">
                <div className="text-[#3ec470] text-[9px] font-bold uppercase tracking-[0.15em] mb-2">{isLive ? 'Fixed Bid Amount' : 'Starting Price'}</div>
                <motion.div
                  animate={pulse ? { scale: [1, 1.05, 1], color: ['#fff', '#3ec470', '#fff'] } : {}}
                  transition={{ duration: 0.3 }}
                  className="text-[32px] font-black mb-6 flex items-baseline justify-center gap-1.5"
                >
                  {latestBid} <span className="text-sm font-medium text-[#3ec470]">MON</span>
                </motion.div>

                <button
                  onClick={handleBid}
                  disabled={!isLive}
                  className={cn(
                    'w-full font-black text-[15px] py-3.5 rounded transition-all active:scale-[0.98]',
                    isLive
                      ? 'bg-[#3ec470] text-black hover:bg-[#4ade80] shadow-[0_0_15px_rgba(62,196,112,0.1)] hover:shadow-[0_0_25px_rgba(62,196,112,0.2)]'
                      : 'bg-white/10 text-white cursor-not-allowed hover:bg-white/15'
                  )}
                >
                  {isLive ? 'PLACE BID NOW' : 'WAITING TO START...'}
                </button>

                <div className="text-white/40 text-[9px] font-bold tracking-[0.15em] uppercase mt-5">
                  Your Pass Holdings: <span className="text-white">{isLive ? '12' : '0'}</span>
                </div>
              </div>
            </div>

            {/* Pass Info */}
            <div className="bg-[#161616] border border-white/[0.04] rounded-lg p-6">
              <h3 className="text-[13px] font-bold uppercase tracking-[0.1em] mb-5">{auction.kol.name} PASS</h3>

              <div className="grid grid-cols-3 gap-2 mb-5">
                <div className="bg-[#0f0f0f] border border-white/[0.04] rounded p-2.5">
                  <div className="text-white/40 text-[8px] font-bold uppercase tracking-[0.15em] mb-1">Supply</div>
                  <div className="font-mono text-[11px] font-bold">8,492</div>
                </div>
                <div className="bg-[#0f0f0f] border border-white/[0.04] rounded p-2.5">
                  <div className="text-white/40 text-[8px] font-bold uppercase tracking-[0.15em] mb-1">Staking</div>
                  <div className="font-mono text-[11px] font-bold">5,120</div>
                </div>
                <div className="bg-[#0f0f0f] border border-white/[0.04] rounded p-2.5">
                  <div className="text-white/40 text-[8px] font-bold uppercase tracking-[0.15em] mb-1">Holders</div>
                  <div className="font-mono text-[11px] font-bold">1,284</div>
                </div>
              </div>

              <InteractiveBondingCurve maxPass={5120} currentPrice={13.39} />

              <div className="flex bg-[#0a0a0a] border border-white/[0.06] rounded p-1 mb-5">
                <input type="text" defaultValue="1" className="bg-transparent w-full px-3 font-mono text-[13px] text-white outline-none" readOnly />
                <button onClick={() => info('Max bid selected')} className="bg-white/[0.05] text-white/60 text-[9px] font-bold px-3 py-1.5 rounded hover:bg-white/[0.1] transition-colors tracking-wider">MAX</button>
              </div>

              <div className="space-y-2.5 font-mono text-[11px] mb-6">
                <div className="flex justify-between text-white/40">
                  <span>Subtotal (Treasury 92%)</span>
                  <span>12.40 MON</span>
                </div>
                <div className="flex justify-between text-white/40">
                  <span>KOL Royalty (5%)</span>
                  <span>0.62 MON</span>
                </div>
                <div className="flex justify-between text-white/40">
                  <span>Protocol Fee (3%)</span>
                  <span>0.37 MON</span>
                </div>
                <div className="flex justify-between font-bold text-white pt-3 border-t border-white/[0.04] mt-3">
                  <span>Total</span>
                  <span className="text-[#3ec470]">13.39 MON</span>
                </div>
              </div>

              <button onClick={() => success('Pass minted successfully!')} className="w-full bg-[#1e1e1e] border border-white/[0.05] text-white font-bold text-[12px] tracking-[0.1em] py-3.5 rounded hover:bg-[#252525] transition-colors uppercase">
                Mint Pass
              </button>

              <div className="text-center mt-5">
                <div className="text-white/30 text-[8px] font-bold tracking-[0.15em] uppercase mb-1.5">
                  Your Pass Holdings: <span className="text-white/60">12</span>
                </div>
                <div className="text-white/30 text-[9px] italic">Prices follow a bonding curve. Slippage may apply.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bid History */}
        {bids.length > 0 && (
          <div className="mt-12">
            <BidBoard bids={bids} leadingBidder={auction.lastBidder} />
          </div>
        )}
      </div>
    </div>
  );
}
