import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Copy, Share2, Users, Wallet, CheckCircle2, AlertTriangle } from 'lucide-react';
import { KolAvatar } from '../components/kol/KolAvatar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CircularProgress } from '../components/ui/CircularProgress';
import { BidBoard } from '../components/auction/BidBoard';
import { TradeConfirmationModal, ConnectModal } from '../components/trade';
import type { TradeDetailItem } from '../components/trade';
import { useToast } from '../hooks/useToast';
import { useAuctionBid } from '../hooks/useAuctionBid';
import { useWalletStore } from '../stores/walletStore';
import { getAuctionById, getBidsByAuction } from '../data/mockAuctions';
import { kolProfilePath } from '../config/routes';
import { shortenAddress } from '../utils/format';
import { AUCTION } from '../utils/constants';
import { cn } from '../utils/cn';
import type { Bid } from '../types';

/** 便士拍卖：单次出价固定金额（MON），兜底取 auction.bidIncrement */
const DEFAULT_BID_AMOUNT = AUCTION.FIXED_BID_AMOUNT;
/** 出价成功后倒计时延长秒数 */
const BID_EXTEND_SECONDS = AUCTION.BID_EXTEND_SECONDS;
const BID_EXTEND_MS = BID_EXTEND_SECONDS * 1000;
/** 拍卖倒计时进度基准时长（ms）— 用于 CircularProgress 百分比计算 */
const COUNTDOWN_BASE_MS = AUCTION.COUNTDOWN_BASE_MS;

/** 金额展示：千分位 + 2 位小数（支持 0.05 步进） */
function formatBid(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** 秒 → HH:MM:SS */
function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/** 浮点金额 + 步进，规避二进制浮点误差 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

interface LeaderboardRow {
  rank: number;
  bidder: string;
  isYou?: boolean;
  isLatest?: boolean;
  bids: number;
  tvl: string;
}

/** 出价成功后更新 leaderboard：已有行累加，否则插入新行（钱包地址），重排 rank */
function upsertLeaderboardRow(rows: LeaderboardRow[], address: string, amount: number): LeaderboardRow[] {
  const key = shortenAddress(address);
  const existingIdx = rows.findIndex((r) => r.bidder === key);
  const cleared = rows.map((r) => ({ ...r, isYou: false, isLatest: false }));
  const next =
    existingIdx >= 0
      ? cleared.map((r, i) =>
          i === existingIdx
            ? { ...r, bids: r.bids + 1, tvl: (parseFloat(r.tvl) + amount).toFixed(2), isYou: true, isLatest: true }
            : r,
        )
      : [{ rank: 1, bidder: key, isYou: true, isLatest: true, bids: 1, tvl: amount.toFixed(2) }, ...cleared];
  return next.map((r, i) => ({ ...r, rank: i + 1 }));
}

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
    const interval = setInterval(() => {
      const remaining = targetDate - Date.now();
      if (remaining > 0) {
        setTimeLeft(remaining);
        setProgress(Math.max(0, Math.min(100, (remaining / COUNTDOWN_BASE_MS) * 100)));
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

const mockBidders: LeaderboardRow[] = [
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
  const { success, info } = useToast();
  const wallet = useWalletStore();
  const bid = useAuctionBid();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [pulse, setPulse] = useState(false);

  // 拍卖运行态（可被出价更新）
  const [endTime, setEndTime] = useState<number>(auction?.endTime ?? Date.now());
  const [currentBid, setCurrentBid] = useState<number>(auction?.currentBid ?? 0);
  const [lastBidder, setLastBidder] = useState<string | null>(auction?.lastBidder ?? null);
  const [totalBids, setTotalBids] = useState<number>(auction?.totalBids ?? 0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>(() => mockBidders.map((r) => ({ ...r })));
  const [bidHistory, setBidHistory] = useState<Bid[]>(() => (id ? getBidsByAuction(id) : []));

  // 路由间切换（不同拍卖）时重置本地状态
  useEffect(() => {
    if (!auction) return;
    setEndTime(auction.endTime);
    setCurrentBid(auction.currentBid);
    setLastBidder(auction.lastBidder ?? null);
    setTotalBids(auction.totalBids);
    setLeaderboard(mockBidders.map((r) => ({ ...r })));
    setBidHistory(getBidsByAuction(auction.id));
  }, [auction]);

  const isLive = auction?.status === 'LIVE';
  const countdown = useCountdownDetail(isLive ? endTime : (auction?.startTime ?? Date.now()));
  const { timeString, progress, totalSeconds, isOver } = countdown;

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

  // 单次出价固定金额
  const fixedBid = auction.bidIncrement > 0 ? auction.bidIncrement : DEFAULT_BID_AMOUNT;
  const latestBid = isLive ? currentBid : auction.minBid;
  const countdownEnded = isLive && isOver;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    success('Auction link copied to clipboard!');
  };

  /** 点击出价：未连接钱包 → ConnectModal；已连接 → 打开确认弹窗 */
  const handleBidClick = () => {
    if (!isLive || countdownEnded) return;
    if (!wallet.isConnected) {
      setConnectOpen(true);
      return;
    }
    bid.reset();
    setConfirmOpen(true);
  };

  /** 连接成功后的续接：回到出价流程 */
  const handleConnected = () => {
    bid.reset();
    setConfirmOpen(true);
  };

  /** 确认出价：执行 mock/real 交易 → 成功后更新页面数据 */
  const handleConfirmBid = async () => {
    const result = await bid.placeBid(auction, fixedBid);
    if (!result) return; // 错误已由 TradeConfirmationModal 展示；用户拒绝 → 静默

    // 出价成功：更新当前最高价 / 最后出价者 / 倒计时 / 出价次数
    setCurrentBid((v) => round2(v + fixedBid));
    setLastBidder(wallet.address);
    setEndTime((t) => t + BID_EXTEND_MS);
    setTotalBids((n) => n + 1);
    // leaderboard 新增/更新一条出价记录
    setLeaderboard((rows) => upsertLeaderboardRow(rows, wallet.address ?? '', fixedBid));
    // bid history 新增一条记录
    setBidHistory((prev) => [
      {
        id: `bid-${Date.now()}`,
        auctionId: auction.id,
        bidder: wallet.address ?? '',
        amount: fixedBid,
        timestamp: Date.now(),
        txHash: result.txHash,
      },
      ...prev,
    ]);
    // 刷新钱包余额
    await wallet.refreshBalance(fixedBid);

    // 视觉反馈 + 自动关闭弹窗
    setPulse(true);
    setTimeout(() => setPulse(false), 500);
    setTimeout(() => {
      setConfirmOpen(false);
      bid.reset();
    }, 1400);
  };

  const newTimeString = formatClock(totalSeconds + BID_EXTEND_SECONDS);

  const bidDetails: TradeDetailItem[] = [
    { label: 'Auction', value: auction.passName },
    { label: 'KOL', value: `${auction.kol.name} (${auction.kol.handle})` },
    { label: 'Bid Amount', value: `${fixedBid.toFixed(2)} MON`, highlight: true },
    { label: 'Current Highest', value: `${formatBid(currentBid)} MON` },
    { label: 'Est. New Countdown', value: `+${BID_EXTEND_SECONDS}s → ${newTimeString}`, highlight: true },
  ];

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
            <div className="bg-[#161616] border border-white/[0.04] rounded-xl p-8 relative overflow-hidden">
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
                      <Badge variant="live" pulse>Live</Badge>
                    ) : (
                      <Badge variant="upcoming">Upcoming</Badge>
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

            {/* Current Highest & Last Bidder */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#161616] border border-white/[0.04] rounded-xl p-6">
                <div className="text-white/40 text-[10px] font-bold uppercase tracking-[0.15em] mb-2">Current Highest</div>
                <div className="text-[#3ec470] font-mono text-3xl font-bold">
                  {formatBid(latestBid)} <span className="text-sm font-medium text-[#3ec470]/60">MON</span>
                </div>
              </div>

              <div className="bg-[#161616] border border-white/[0.04] rounded-xl p-6">
                <div className="text-white/40 text-[10px] font-bold uppercase tracking-[0.15em] mb-2">Last Bidder</div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/10 overflow-hidden flex items-center justify-center">
                    {lastBidder && <div className="w-3 h-3 rounded-full bg-[#3ec470]/50"></div>}
                  </div>
                  <span className="text-white/90 font-mono text-xl">{lastBidder ? shortenAddress(lastBidder) : '-'}</span>
                </div>
              </div>
            </div>

            {/* Live Leaderboard */}
            <div className="bg-[#161616] border border-white/[0.04] rounded-xl p-8">
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
                    {isLive ? leaderboard.map((row) => (
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
            <div className="bg-[#161616] border border-white/[0.04] rounded-xl p-8 flex flex-col items-center">
              <CircularProgress
                progress={progress}
                size={160}
                strokeWidth={4}
                label={isLive ? `${totalSeconds}s` : timeString}
                sublabel={countdownEnded ? 'Ended' : isLive ? 'In Progress' : 'Starts In'}
              />

              <div className="w-full grid grid-cols-3 gap-2 border-y border-white/[0.04] py-5 my-6 text-center">
                <div>
                  <div className="text-white/40 text-[8px] font-bold uppercase tracking-[0.15em] mb-1.5">Bidders</div>
                  <div className="font-black text-sm">{isLive ? '456' : '-'}</div>
                </div>
                <div>
                  <div className="text-white/40 text-[8px] font-bold uppercase tracking-[0.15em] mb-1.5">Total Bids</div>
                  <div className="font-black text-sm">{isLive ? totalBids.toLocaleString() : '-'}</div>
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
                  className="text-[32px] font-black mb-3 flex items-baseline justify-center gap-1.5"
                >
                  {fixedBid.toFixed(2)} <span className="text-sm font-medium text-[#3ec470]">MON</span>
                </motion.div>

                {/* 当前最高价 + 最后出价者 */}
                <div className="grid grid-cols-2 gap-2 mb-6">
                  <div className="bg-[#0f0f0f] border border-white/[0.04] rounded-lg py-2.5 px-3">
                    <div className="text-white/30 text-[8px] font-bold uppercase tracking-[0.15em] mb-1">Current Highest</div>
                    <div className="font-mono text-[12px] font-bold text-white">{formatBid(latestBid)} MON</div>
                  </div>
                  <div className="bg-[#0f0f0f] border border-white/[0.04] rounded-lg py-2.5 px-3">
                    <div className="text-white/30 text-[8px] font-bold uppercase tracking-[0.15em] mb-1">Last Bidder</div>
                    <div className="font-mono text-[12px] font-bold text-white truncate">{lastBidder ? shortenAddress(lastBidder) : '-'}</div>
                  </div>
                </div>

                <button
                  onClick={handleBidClick}
                  disabled={!isLive || countdownEnded}
                  className={cn(
                    'w-full font-black text-[15px] py-3.5 rounded transition-all active:scale-[0.98]',
                    isLive && !countdownEnded
                      ? 'bg-[#3ec470] text-black hover:bg-[#4ade80] shadow-[0_0_15px_rgba(62,196,112,0.1)] hover:shadow-[0_0_25px_rgba(62,196,112,0.2)]'
                      : 'bg-white/10 text-white cursor-not-allowed hover:bg-white/15'
                  )}
                >
                  {!isLive
                    ? 'WAITING TO START...'
                    : countdownEnded
                      ? 'AUCTION ENDED'
                      : wallet.isConnected
                        ? 'PLACE BID'
                        : 'ENTER AUCTION'}
                </button>

                <div className="text-white/40 text-[9px] font-bold tracking-[0.15em] uppercase mt-5">
                  Your Pass Holdings: <span className="text-white">{isLive ? '12' : '0'}</span>
                </div>
              </div>
            </div>

            {/* Pass Info */}
            <div className="bg-[#161616] border border-white/[0.04] rounded-xl p-6">
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
        {bidHistory.length > 0 && (
          <div className="mt-12">
            <BidBoard bids={bidHistory} leadingBidder={lastBidder ?? undefined} />
          </div>
        )}
      </div>

      {/* 出价确认弹窗 */}
      <TradeConfirmationModal
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          bid.reset();
        }}
        title="Confirm Bid"
        description={`Place a fixed bid on ${auction.passName}. Each bid costs ${fixedBid.toFixed(2)} MON and extends the countdown by ${BID_EXTEND_SECONDS}s.`}
        details={bidDetails}
        confirmText="Confirm Bid"
        cancelText="Cancel"
        onConfirm={handleConfirmBid}
        status={bid.status}
        txHash={bid.txHash ?? undefined}
        error={bid.error ?? undefined}
      />

      {/* 钱包连接引导弹窗 */}
      <ConnectModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        onConnected={handleConnected}
      />
    </div>
  );
}
