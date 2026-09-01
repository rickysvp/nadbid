import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, Clock, AlertCircle } from 'lucide-react';
import { KolAvatar } from '../components/kol/KolAvatar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../hooks/useToast';
import { mockAuctions } from '../data/mockAuctions';
import { kolProfilePath, auctionDetailPath } from '../config/routes';
import { cn } from '../utils/cn';

type FilterTab = 'ALL' | 'LIVE' | 'UPCOMING';

// Countdown hook for auction cards
function useCountdown(targetDate: number) {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, targetDate - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = targetDate - Date.now();
      setTimeLeft(remaining > 0 ? remaining : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);
  const totalSeconds = Math.floor(timeLeft / 1000);
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return { timeString, totalSeconds };
}

function AuctionCard({ auction }: { auction: typeof mockAuctions[0] }) {
  const isLive = auction.status === 'LIVE';
  const targetTime = isLive ? auction.endTime : auction.startTime;
  const { timeString, totalSeconds } = useCountdown(targetTime);
  const { info } = useToast();

  return (
    <div className="bg-[#161616] border border-white/[0.04] p-6 rounded-2xl flex flex-col hover:border-white/10 transition-colors duration-300 relative overflow-hidden group">
      {/* Top: Avatar + Name + Status */}
      <div className="flex justify-between items-start mb-5 relative z-10">
        <Link to={kolProfilePath(auction.kol.handle)} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-14 h-14 rounded-full border-2 border-[#1a1a1a] bg-black/50 overflow-hidden flex items-center justify-center">
            <KolAvatar handle={auction.kol.handle} name={auction.kol.name} className="!w-full !h-full !rounded-full !border-0" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-white font-black text-lg tracking-tight leading-tight hover:text-[#3ec470] transition-colors">{auction.kol.name}</h3>
            <span className="text-white/40 text-[11px] font-mono">{auction.kol.handle}</span>
          </div>
        </Link>

        {isLive ? (
          <Badge variant="live" pulse>Live</Badge>
        ) : (
          <Badge variant="upcoming">Upcoming</Badge>
        )}
      </div>

      {/* Follow on X Button */}
      <button
        onClick={(e) => { e.stopPropagation(); info(`Follow ${auction.kol.handle} on X`); }}
        className="w-full bg-[#0a0a0a] border border-white/[0.06] text-white/70 hover:text-white text-[10px] font-bold uppercase tracking-[0.15em] py-2.5 rounded-lg hover:bg-white/[0.02] hover:border-white/10 transition-all mb-6 relative z-10"
      >
        Follow on X
      </button>

      {/* Data Blocks */}
      <div className="flex flex-col gap-2 mb-6 relative z-10">
        <div className="bg-[#0f0f0f] border border-white/[0.04] rounded-xl p-4 flex items-center justify-between">
          <span className="text-white/40 text-[10px] font-bold uppercase tracking-[0.15em]">{isLive ? 'Fixed Bid' : 'Starting Price'}</span>
          <span className="text-[#3ec470] font-mono text-lg font-bold">
            {isLive ? auction.currentBid.toFixed(1) : auction.minBid.toFixed(1)} <span className="text-[10px] text-[#3ec470]/50">MON</span>
          </span>
        </div>

        <div className="bg-[#0f0f0f] border border-white/[0.04] rounded-xl p-4 flex items-center justify-between">
          <span className="text-white/40 text-[10px] font-bold uppercase tracking-[0.15em]">Last Bidder</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-white/10 overflow-hidden flex items-center justify-center">
              {auction.lastBidder && <div className="w-2 h-2 rounded-full bg-[#3ec470]/50"></div>}
            </div>
            <span className="text-white/90 font-mono text-sm">
              {auction.lastBidder ? `${auction.lastBidder.slice(0, 6)}...${auction.lastBidder.slice(-4)}` : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Countdown */}
      <div className="flex items-center justify-between mb-5 pb-5 border-b border-white/[0.04] mt-auto relative z-10">
        <span className="text-white/40 text-[10px] font-bold tracking-[0.15em] uppercase">{isLive ? 'Status' : 'Starts In'}</span>
        <div className={cn('flex items-center gap-1.5 font-mono text-sm font-bold', isLive ? 'text-[#3ec470]' : 'text-white/70')}>
          {isLive ? (
            <span className="animate-pulse">IN PROGRESS ({totalSeconds}s)</span>
          ) : (
            <>
              <Clock className="w-3.5 h-3.5 opacity-70" />
              <span>{timeString}</span>
            </>
          )}
        </div>
      </div>

      {/* CTA Button */}
      <Link to={auctionDetailPath(auction.id)} className="relative z-10">
        <Button fullWidth variant={isLive ? 'default' : 'secondary'}>
          Enter Auction
        </Button>
      </Link>
    </div>
  );
}

export default function AuctionsPage() {
  const [filter, setFilter] = useState<FilterTab>('ALL');
  const [search, setSearch] = useState('');

  const filteredAuctions = useMemo(() => {
    return mockAuctions.filter((a) => {
      if (filter !== 'ALL' && a.status !== filter) return false;
      if (search && !a.kol.name.toLowerCase().includes(search.toLowerCase()) && !a.kol.handle.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [filter, search]);

  return (
    <div className="min-h-screen bg-transparent pt-32 pb-24 font-sans relative">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white mb-3">Live Auctions</h1>
            <p className="text-white/50 text-sm max-w-xl leading-relaxed">
              Discover and bid on exclusive KOL PASS distributions.
              Secure your yield and priority access through our fair-launch auction mechanism.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search KOLs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#161616] border border-white/10 rounded-full py-3 pl-12 pr-6 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#3ec470] transition-colors"
              />
              <Search className="w-4 h-4 text-white/30 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 bg-[#161616] p-1.5 rounded-full border border-white/10 w-full sm:w-auto">
              {(['ALL', 'LIVE', 'UPCOMING'] as FilterTab[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'flex-1 sm:flex-none px-6 py-2 rounded-full text-xs font-bold tracking-wider transition-colors',
                    filter === f
                      ? 'bg-white/10 text-white'
                      : 'text-white/40 hover:text-white/80'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Auction Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAuctions.map((auction, index) => (
            <motion.div
              key={auction.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <AuctionCard auction={auction} />
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {filteredAuctions.length === 0 && (
          <div className="text-center py-24 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
            <AlertCircle className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40 font-medium">No auctions found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
