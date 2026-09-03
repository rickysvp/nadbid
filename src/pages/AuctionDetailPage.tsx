import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { formatUnits } from 'viem';
import { ArrowLeft, Copy, Share2, Users, Wallet, CheckCircle2, AlertTriangle, Crown, Sparkles } from 'lucide-react';
import { KolAvatar } from '../components/kol/KolAvatar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CircularProgress } from '../components/ui/CircularProgress';
import { ConnectModal } from '../components/trade';
import { useToast } from '../hooks/useToast';
import { useWalletStore } from '../stores/walletStore';
import { shortenAddress } from '../utils/format';
import { AUCTION } from '../utils/constants';
import { cn } from '../utils/cn';
import { useAuction } from '../web3/hooks/useAuction';
import { useKolPass } from '../web3/hooks/useKolPass';
import { contractAddresses, registryAbi } from '../web3/contracts';
import { useReadContract } from '../web3/hooks/useReadContract';
import { kolProfilePath } from '../config/routes';
import type { KolData } from '../web3/hooks/useRegistry';

/** 便士拍卖：单次出价固定金额（MON），兜底取 auction.bidIncrement */
const DEFAULT_BID_AMOUNT = AUCTION.FIXED_BID_AMOUNT;
/** 出价成功后倒计时延长秒数 */
const BID_EXTEND_SECONDS = AUCTION.BID_EXTEND_SECONDS;
/** 拍卖倒计时进度基准时长（ms）— 用于 CircularProgress 百分比计算 */
const COUNTDOWN_BASE_MS = AUCTION.COUNTDOWN_BASE_MS;

/** 浮点金额保留 2 位小数，规避二进制浮点误差 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * wei → MON 字符串（P3-4：不经 Number 转换，避免大额累计金额精度丢失）。
 * 整数部分手工加千分位，小数保留 2 位。
 */
function formatMonWei(value: bigint | undefined): string {
  if (value === undefined) return '0.00';
  const s = formatUnits(value, 18);
  const dot = s.indexOf('.');
  const intPart = dot === -1 ? s : s.slice(0, dot);
  const decPart = dot === -1 ? '' : s.slice(dot + 1);
  const intFmt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${intFmt}.${decPart.padEnd(2, '0').slice(0, 2)}`;
}

function useCountdownDetail(targetDate: number | undefined) {
  const [timeLeft, setTimeLeft] = useState(targetDate === undefined ? undefined : Math.max(0, targetDate - Date.now()));
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (targetDate === undefined) {
      // 数据加载期：目标时间未知，不启动倒计时，也不呈现已结束
      setTimeLeft(undefined);
      setProgress(100);
      return;
    }
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

  const hours = Math.floor(((timeLeft ?? 0) / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor(((timeLeft ?? 0) / 1000 / 60) % 60);
  const seconds = Math.floor(((timeLeft ?? 0) / 1000) % 60);
  const totalSeconds = Math.floor((timeLeft ?? 0) / 1000);
  const timeString =
    timeLeft === undefined
      ? '--:--:--'
      : `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return { timeString, progress, isOver: timeLeft !== undefined && timeLeft <= 0, totalSeconds, isPending: timeLeft === undefined };
}

/** 链上拍卖详情页 — id 为 KolAuction 合约地址（0x 开头），数据来自 useAuction（内置 BidPlaced 事件订阅自动刷新） */
function ChainAuctionDetail({ address }: { address: string }) {
  const { success, error, info } = useToast();
  const wallet = useWalletStore();
  const auctionAddress = address as `0x${string}`;
  const account = wallet.isConnected && wallet.address ? (wallet.address as `0x${string}`) : undefined;

  const [connectOpen, setConnectOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [mintQty, setMintQty] = useState(1); // PASS mint 数量（详情页快速 mint）

  // 链上拍卖状态：placeBid 默认取链上 fixedBidAmount；BidPlaced 事件自动 refetch
  const {
    auctionData,
    cumulativeBid,
    bidCount,
    lastBidderCumulative,
    lastBidderBidCount,
    placeBid,
    settle,
    isLoading: txLoading,
    refetchAuction,
  } = useAuction(auctionAddress, account);

  // PASS 持仓检查（出价前置条件：balanceOf > 0 才可出价）+ 详情页快速 mint
  const {
    balanceOf,
    totalSupply,
    curvePrice: passCurvePrice,
    estimateMintCost,
    mint,
    isLoading: mintLoading,
  } = useKolPass(auctionData?.passContract, account);
  const holdPass = balanceOf !== undefined && balanceOf > 0n;
  // 当前 mint 成本（wei → MON，含手续费缓冲）
  const mintCostWei = auctionData && mintQty > 0 ? estimateMintCost(BigInt(mintQty)) : undefined;
  const mintCostMon = mintCostWei !== undefined ? Number(mintCostWei) / 1e18 : undefined;
  const mintUnitMon =
    passCurvePrice !== undefined ? Number(passCurvePrice) / 1e18 : undefined;

  // KOL 展示信息：链上 Registry.getKol(kol) 读取真实 twitterHandle（KOL 入驻时链上登记）
  const kolRes = useReadContract({
    address: contractAddresses.registry,
    abi: registryAbi,
    functionName: 'getKol',
    args: [auctionData?.kol ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: auctionData !== undefined },
  });
  const kolOnChain = kolRes.data as KolData | undefined;
  const kolTwitterHandle = kolOnChain?.twitterHandle ?? '';
  const hasKolHandle = kolTwitterHandle.trim() !== '';
  const kolName = hasKolHandle ? kolTwitterHandle.replace(/^@/, '') : (auctionData?.kol ? shortenAddress(auctionData.kol) : 'On-Chain KOL');
  const kolHandle = hasKolHandle ? kolTwitterHandle : (auctionData?.kol ? shortenAddress(auctionData.kol) : '@kol');
  const kolFollowers = kolOnChain?.followers !== undefined && kolOnChain.followers !== 0n ? Number(kolOnChain.followers) : undefined;

  // 倒计时：从链上 endTime（秒级 Unix 时间戳）推算，沿用现有 CircularProgress 逻辑。
  // 数据加载期（auctionData 未就绪）不传入时间 → useCountdownDetail 返回 isPending，
  // 避免加载期倒计时被置为 now 而误显示 "AUCTION ENDED"。
  // UPCOMING（预约未开始）时倒计时显示距 startTime 的剩余时间。
  const startTimeMs = auctionData ? Number(auctionData.startTime) * 1000 : undefined;
  const endTimeMs = auctionData ? Number(auctionData.endTime) * 1000 : undefined;
  const nowSec = Math.floor(Date.now() / 1000);
  const isUpcoming =
    !!auctionData && Number(auctionData.startTime) > nowSec;
  const countdownTarget = isUpcoming ? startTimeMs : endTimeMs;
  const countdown = useCountdownDetail(countdownTarget);
  const { timeString, progress, totalSeconds, isOver, isPending } = countdown;

  const fixedBid = auctionData ? Number(auctionData.fixedBidAmount) / 1e18 : DEFAULT_BID_AMOUNT;
  const totalBids = auctionData ? Number(auctionData.totalBids) : 0;
  const lastBidder =
    auctionData && auctionData.lastBidder !== '0x0000000000000000000000000000000000000000'
      ? auctionData.lastBidder
      : null;
  const isEnded = !isPending && isOver;
  const isSettled = auctionData?.settled ?? false;
  const isLive = !!auctionData && !isEnded && !isSettled && !isUpcoming;
  const isLastBidderYou = !!account && !!lastBidder && account.toLowerCase() === lastBidder.toLowerCase();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    success('Auction link copied to clipboard!');
  };

  /** Share：优先系统分享面板（P3-9），不支持时退化为复制链接 */
  const handleShare = async () => {
    const shareData = {
      title: `NADBID · ${auctionData?.content ? auctionData.content.slice(0, 60) : 'KOL Auction'}`,
      text: `Bid on this KOL penny auction on NADBID — ${fixedBid.toFixed(2)} MON per bid`,
      url: window.location.href,
    };
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // 用户取消分享面板不视为错误；其余失败回退复制链接
      }
    }
    await handleCopyLink();
  };

  /** 出价流程三分支：未连接 → ConnectModal 引导；已连接未持 PASS → toast；已连接且持有 → placeBid */
  const attemptBid = async () => {
    if (!auctionData || isEnded || isSettled || txLoading) return;
    if (!wallet.isConnected) {
      setConnectOpen(true);
      return;
    }
    if (!holdPass) {
      error('需持有该 KOL 的 PASS');
      return;
    }
    await placeBid({
      value: auctionData.fixedBidAmount,
      onSuccess: () => {
        success(`Bid placed! Countdown reset to ${BID_EXTEND_SECONDS}s.`);
        setPulse(true);
        setTimeout(() => setPulse(false), 500);
        refetchAuction();
      },
    });
  };

  const handleConnected = attemptBid;

  /** 结束且未结算 → 结算（加分项） */
  const handleSettle = async () => {
    if (!auctionData || !isEnded || isSettled || txLoading) return;
    if (!wallet.isConnected) {
      setConnectOpen(true);
      return;
    }
    await settle({
      onSuccess: () => {
        success('Auction settled!');
        refetchAuction();
      },
    });
  };

  /** 详情页快速 mint PASS：未连接 → ConnectModal；已连接 → mint(mintQty) */
  const handleMintPass = async () => {
    if (!auctionData || mintQty <= 0 || mintLoading) return;
    if (!wallet.isConnected) {
      setConnectOpen(true);
      return;
    }
    await mint(BigInt(mintQty), {
      onSuccess: () => {
        success(`Minted ${mintQty} ${kolName} PASS!`);
        refetchAuction();
      },
    });
  };

  /** FOLLOW ON X：有链上 twitterHandle → 跳转真实推特；无 → 提示 */
  const followOnX = () => {
    if (hasKolHandle) {
      window.open(`https://x.com/${kolTwitterHandle.replace(/^@/, '')}`, '_blank', 'noopener,noreferrer');
    } else {
      info('No X handle registered on-chain yet');
    }
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
            <Button size="sm" variant="secondary" onClick={handleShare}>
              <Share2 className="w-3.5 h-3.5" /> Share
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 拍卖内容 — 主体信息 */}
            <div className="bg-[#161616] border border-white/[0.04] rounded-xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#3ec470]/[0.02] rounded-full blur-[80px] pointer-events-none"></div>

              <div className="flex items-start justify-between gap-4 mb-4 relative z-10">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  {auctionData?.content || 'KOL Auction'}
                </h1>
                {!auctionData ? (
                  <Badge variant="neutral">Loading</Badge>
                ) : isUpcoming ? (
                  <Badge variant="upcoming">Upcoming</Badge>
                ) : isLive ? (
                  <Badge variant="live" pulse>Live</Badge>
                ) : isSettled ? (
                  <Badge variant="settled">Settled</Badge>
                ) : (
                  <Badge variant="ended">Ended</Badge>
                )}
              </div>

              {/* KOL 紧凑信息条（弱化展示；可点击进入 KOL Profile） */}
              <Link
                to={auctionData?.kol ? kolProfilePath(auctionData.kol) : '#'}
                className="flex items-center gap-3 bg-[#0f0f0f] border border-white/5 rounded-lg px-4 py-3 mb-5 relative z-10 group transition-colors hover:border-[#3ec470]/30 hover:bg-[#111]"
              >
                <KolAvatar handle={kolHandle} size="md" name={kolName} className="!w-9 !h-9 !rounded-full border border-white/10" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white/90 group-hover:text-[#3ec470] transition-colors">{kolName}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#3ec470]/70" />
                    <span className="font-mono text-white/40 text-[11px]">{kolHandle}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[9px] font-bold tracking-wider">
                    <span className="flex items-center gap-1 text-white/40">
                      <Users className="w-3 h-3 text-white/30" /> {kolFollowers !== undefined ? kolFollowers.toLocaleString() : '-'} FOLLOWERS
                    </span>
                    <span className="flex items-center gap-1 text-white/40">
                      <Wallet className="w-3 h-3 text-white/30" /> Auction {auctionData ? shortenAddress(auctionAddress) : '-'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.preventDefault(); followOnX(); }}
                  className="shrink-0 bg-[#0a0a0a] border border-white/[0.06] text-white/60 hover:text-[#3ec470] text-[10px] font-bold uppercase tracking-[0.15em] py-1.5 px-3 rounded-lg hover:bg-white/[0.02] hover:border-[#3ec470]/30 transition-all text-center"
                >
                  Follow on X
                </button>
              </Link>

              {/* 拍卖描述 */}
              <div className="text-white/50 text-[13px] leading-relaxed relative z-10">
                Penny auction on-chain. Each bid costs {fixedBid.toFixed(2)} MON and extends the countdown by {BID_EXTEND_SECONDS}s.
                Hold a PASS of this KOL to participate.
              </div>
            </div>

            {/* 最后出价人（当前赢家）— 紧凑长条 */}
            <div className="overflow-hidden rounded-xl bg-[#161616] border border-[#3ec470]/30 relative">
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#3ec470]/[0.08] rounded-full blur-[30px] pointer-events-none"></div>
              <div className="flex items-center gap-3 py-3.5 px-5 relative z-10">
                <Crown className="w-4 h-4 text-[#3ec470] shrink-0" />
                <span className="text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Last Bidder</span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={lastBidder ?? 'empty'}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.25 }}
                    className="font-mono text-[15px] font-bold text-[#3ec470] truncate"
                  >
                    {lastBidder ? shortenAddress(lastBidder) : '-'}
                  </motion.span>
                </AnimatePresence>
                {isLastBidderYou && (
                  <motion.span
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className="bg-[#1a2f22] text-[#3ec470] text-[8px] px-2 py-0.5 rounded-sm font-sans font-bold tracking-wider"
                  >
                    YOU
                  </motion.span>
                )}
                <span className="ml-auto flex items-center gap-4 shrink-0">
                  <span className="text-right">
                    <span className="block text-white/30 text-[8px] font-bold uppercase tracking-[0.15em]">Bids</span>
                    <span className="font-mono text-[13px] font-bold text-white">
                      {lastBidderBidCount !== undefined
                        ? Number(lastBidderBidCount).toLocaleString()
                        : lastBidder
                          ? (isLastBidderYou ? Number(bidCount ?? 0n).toLocaleString() : '-')
                          : '-'}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-white/30 text-[8px] font-bold uppercase tracking-[0.15em]">Total Spent</span>
                    <span className="font-mono text-[13px] font-bold text-white">
                      {lastBidderCumulative !== undefined
                        ? `${formatMonWei(lastBidderCumulative)} MON`
                        : lastBidder
                          ? (isLastBidderYou
                              ? `${round2(Number(cumulativeBid ?? 0n) / 1e18).toLocaleString(undefined, { minimumFractionDigits: 2 })} MON`
                              : '-')
                          : '-'}
                    </span>
                  </span>
                </span>
              </div>
            </div>

            {/* On-Chain Activity（链上无逐出价者排行，展示聚合数据） */}
            <div className="bg-[#161616] border border-white/[0.04] rounded-xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[13px] font-bold uppercase tracking-[0.1em] text-white">On-Chain Activity</h3>
                <div className="flex items-center gap-1.5 text-[#3ec470] text-[10px] font-bold tracking-[0.15em] uppercase bg-[#3ec470]/10 px-3 py-1 rounded">
                  <AlertTriangle className="w-3 h-3" /> Live
                </div>
              </div>
              <div className="space-y-2.5 font-mono text-[12px]">
                <div className="flex justify-between text-white/40">
                  <span>Last Bidder</span>
                  <span className="text-white font-bold">{lastBidder ? shortenAddress(lastBidder) : '-'}</span>
                </div>
                <div className="flex justify-between text-white/40">
                  <span>Total Bids</span>
                  <span className="text-white font-bold">{totalBids.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-white/40">
                  <span>Total Volume (MON)</span>
                  <span className="text-white font-bold">{formatMonWei(auctionData?.totalVolume)}</span>
                </div>
                {account && (
                  <>
                    <div className="flex justify-between text-white/40">
                      <span>Your Bids</span>
                      <span className="text-[#3ec470] font-bold">{Number(bidCount ?? 0n).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-white/40">
                      <span>Your Cumulative (MON)</span>
                      <span className="text-[#3ec470] font-bold">{round2(Number(cumulativeBid ?? 0n) / 1e18).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}
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
                sublabel={isSettled ? 'Settled' : isEnded ? 'Ended' : isUpcoming ? 'Starts In' : isLive ? 'In Progress' : 'Loading'}
              />

              <div className="w-full grid grid-cols-3 gap-2 border-y border-white/[0.04] py-5 my-6 text-center">
                <div>
                  <div className="text-white/40 text-[8px] font-bold uppercase tracking-[0.15em] mb-1.5">Leader Bids</div>
                  <div className="font-black text-sm">{lastBidder ? Number(lastBidderBidCount ?? 0n).toLocaleString() : '-'}</div>
                </div>
                <div>
                  <div className="text-white/40 text-[8px] font-bold uppercase tracking-[0.15em] mb-1.5">Total Bids</div>
                  <div className="font-black text-sm">{isLive ? totalBids.toLocaleString() : '-'}</div>
                </div>
                <div>
                  <div className="text-white/40 text-[8px] font-bold uppercase tracking-[0.15em] mb-1.5">TVL (MON)</div>
                  <div className="font-black text-sm">{isLive ? formatMonWei(auctionData?.totalVolume) : '-'}</div>
                </div>
              </div>

              <div className="text-center w-full">
                <div className="text-[#3ec470] text-[9px] font-bold uppercase tracking-[0.15em] mb-2">Fixed Bid Amount</div>
                <motion.div
                  animate={pulse ? { scale: [1, 1.05, 1], color: ['#fff', '#3ec470', '#fff'] } : {}}
                  transition={{ duration: 0.3 }}
                  className="text-[32px] font-black mb-3 flex items-baseline justify-center gap-1.5"
                >
                  {fixedBid.toFixed(2)} <span className="text-sm font-medium text-[#3ec470]">MON</span>
                </motion.div>

                <button
                  onClick={attemptBid}
                  disabled={!auctionData || !isLive || txLoading}
                  className={cn(
                    'w-full font-black text-[15px] py-3.5 rounded transition-all active:scale-[0.98]',
                    auctionData && isLive && !txLoading
                      ? 'bg-[#3ec470] text-black hover:bg-[#4ade80] shadow-[0_0_15px_rgba(62,196,112,0.1)] hover:shadow-[0_0_25px_rgba(62,196,112,0.2)]'
                      : 'bg-white/10 text-white cursor-not-allowed hover:bg-white/15'
                  )}
                >
                  {!auctionData
                    ? 'LOADING...'
                    : isSettled
                      ? 'AUCTION SETTLED'
                      : isEnded
                        ? 'AUCTION ENDED'
                        : isUpcoming
                          ? 'STARTS SOON'
                          : txLoading
                            ? 'BIDDING...'
                            : wallet.isConnected
                              ? 'PLACE BID'
                              : 'ENTER AUCTION'}
                </button>

                {/* 结束且未结算 → 结算按钮（加分项） */}
                {isEnded && !isSettled && (
                  <button
                    onClick={handleSettle}
                    className="w-full mt-3 bg-[#1e1e1e] border border-[#3ec470]/30 text-[#3ec470] font-bold text-[12px] tracking-[0.1em] py-3 rounded hover:bg-[#252525] transition-colors uppercase"
                  >
                    Settle Auction
                  </button>
                )}

                <div className="text-white/40 text-[9px] font-bold tracking-[0.15em] uppercase mt-5">
                  Your Pass Holdings: <span className="text-white">{account ? (balanceOf ?? 0n).toString() : '0'}</span>
                </div>
              </div>
            </div>

            {/* Pass Info（链上真实：balance / supply）+ 快速 Mint PASS 入口 */}
            <div className="bg-[#161616] border border-white/[0.04] rounded-xl p-6">
              <h3 className="text-[13px] font-bold uppercase tracking-[0.1em] mb-5">{kolName} PASS</h3>

              <div className="grid grid-cols-2 gap-2 mb-5">
                <div className="bg-[#0f0f0f] border border-white/[0.04] rounded p-2.5">
                  <div className="text-white/40 text-[8px] font-bold uppercase tracking-[0.15em] mb-1">Pass Contract</div>
                  <div className="font-mono text-[11px] font-bold">{auctionData ? shortenAddress(auctionData.passContract) : '-'}</div>
                </div>
                <div className="bg-[#0f0f0f] border border-white/[0.04] rounded p-2.5">
                  <div className="text-white/40 text-[8px] font-bold uppercase tracking-[0.15em] mb-1">Supply</div>
                  <div className="font-mono text-[11px] font-bold">{totalSupply !== undefined ? totalSupply.toString() : '-'}</div>
                </div>
              </div>

              {/* 快速 Mint：数量 + 成本 + CTA（曲线价计价，与 KOL Profile 面板一致） */}
              {auctionData ? (
                <div className="bg-[#0f0f0f] border border-white/[0.04] rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Mint Price</span>
                    <span className="font-mono text-[12px] font-bold text-[#3ec470]">
                      {mintUnitMon !== undefined ? `${mintUnitMon.toFixed(4)} MON` : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Quantity</span>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setMintQty(n)}
                          className={cn(
                            'w-7 h-7 rounded text-[11px] font-bold font-mono transition-colors border',
                            mintQty === n
                              ? 'bg-[#3ec470] text-black border-[#3ec470]'
                              : 'bg-white/[0.04] text-white/60 border-white/[0.06] hover:border-[#3ec470]/40',
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
                    <span className="text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Total Cost</span>
                    <span className="font-mono text-[12px] font-bold text-white">
                      {mintCostMon !== undefined ? `${mintCostMon.toFixed(4)} MON` : '-'}
                    </span>
                  </div>
                  <button
                    onClick={handleMintPass}
                    disabled={mintQty <= 0 || mintLoading || mintCostWei === undefined}
                    className={cn(
                      'w-full flex items-center justify-center gap-1.5 font-black text-[12px] py-2.5 rounded transition-all active:scale-[0.98]',
                      !wallet.isConnected || mintLoading || mintCostWei === undefined
                        ? 'bg-white/[0.06] text-white/40 cursor-pointer hover:bg-white/10'
                        : 'bg-[#3ec470] text-black hover:bg-[#4ade80]',
                    )}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {mintLoading
                      ? 'MINTING...'
                      : mintCostWei === undefined
                        ? 'CALCULATING PRICE...'
                        : !wallet.isConnected
                          ? 'CONNECT TO MINT PASS'
                          : `MINT ${mintQty} PASS`}
                  </button>
                  <div className="text-white/30 text-[9px] text-center">
                    You hold <span className="text-white/60">{account ? (balanceOf ?? 0n).toString() : '0'}</span> PASS
                    {' · '}
                    <Link to={auctionData ? kolProfilePath(auctionData.kol) : '#'} className="text-[#3ec470]/80 hover:text-[#3ec470] font-bold">
                      Full trade panel
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center mt-5">
                  <div className="text-white/30 text-[8px] font-bold tracking-[0.15em] uppercase mb-1.5">
                    Your Pass Holdings: <span className="text-white/60">{account ? (balanceOf ?? 0n).toString() : '0'}</span>
                  </div>
                  <div className="text-white/30 text-[9px] italic">Loading PASS data...</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 钱包连接引导弹窗 */}
      <ConnectModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        onConnected={handleConnected}
      />
    </div>
  );
}

/** 拍卖详情页 — 仅链上真实数据：id 必须为 KolAuction 合约地址（0x 开头）；否则显示无效提示 */
export default function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>();
  if (id && id.startsWith('0x')) return <ChainAuctionDetail address={id} />;
  return (
    <div className="min-h-screen bg-transparent pt-32 pb-24 font-sans text-white relative">
      <div className="max-w-[1200px] mx-auto px-6 relative z-10 text-center py-24">
        <AlertTriangle className="w-12 h-12 text-white/20 mx-auto mb-4" />
        <p className="text-white/40 font-medium">Invalid auction. On-chain auctions use the contract address as the ID.</p>
        <Link to="/auctions" className="inline-block mt-6 text-[#3ec470] font-bold text-sm hover:opacity-80">
          ← Back to Live Auctions
        </Link>
      </div>
    </div>
  );
}
