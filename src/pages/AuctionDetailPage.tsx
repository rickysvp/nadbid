import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { formatUnits, keccak256, parseAbiItem } from 'viem';
import { usePublicClient } from 'wagmi';
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
import { useKolPass, type CurveConfig } from '../web3/hooks/useKolPass';
import { contractAddresses, registryAbi } from '../web3/contracts';
import { useReadContract } from '../web3/hooks/useReadContract';
import { kolProfilePath } from '../config/routes';
import { normalizeKolData } from '../web3/hooks/useRegistry';

/** 便士拍卖：单次出价固定金额（MON），兜底取 auction.bidIncrement */
const DEFAULT_BID_AMOUNT = AUCTION.FIXED_BID_AMOUNT;
/** 出价成功后倒计时延长秒数 */
const BID_EXTEND_SECONDS = AUCTION.BID_EXTEND_SECONDS;
/** 拍卖倒计时进度基准时长（ms）— 用于 CircularProgress 百分比计算 */
const COUNTDOWN_BASE_MS = AUCTION.COUNTDOWN_BASE_MS;

/**
 * 履约/争议证据 = X 推文链接（KOL 通过 X 推文完成交付，推文 URL 即证据载体）。
 * evidenceHash = keccak256(推文URL) 上链防篡改；evidenceUri = 推文URL 供仲裁点击核验。
 * 支持 x.com / twitter.com 的 /status/<id> 短链及带查询参数的长链。
 */
const TWEET_URL_RE = /^https?:\/\/(?:x|twitter)\.com\/[A-Za-z0-9_]{1,30}\/status\/\d{10,30}(?:\?.*)?$/;

/** 浮点金额保留 2 位小数，规避二进制浮点误差 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * 极小金额自适应精度显示。
 * 联合曲线早期 mint 价可低至 1e-8 MON 量级，toFixed(4) 会显示 0.0000（看起来"没有价格"）。
 * 按数量级逐级提升精度，极小值用科学计数法。
 */
function fmtMonFlex(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (value >= 1) return value.toFixed(2);
  if (value >= 0.001) return value.toFixed(4);
  if (value >= 1e-6) return value.toFixed(8);
  if (value <= 0) return '0';
  return value.toExponential(2);
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
    // 立即同步一次：targetDate 变化（如出价后链上 endTime 重置）时倒计时立刻生效，
    // 不等 1s 后的首个 interval 滴答
    const remaining0 = targetDate - Date.now();
    if (remaining0 > 0) {
      setTimeLeft(remaining0);
      setProgress(Math.max(0, Math.min(100, (remaining0 / COUNTDOWN_BASE_MS) * 100)));
    } else {
      setTimeLeft(0);
      setProgress(0);
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

/**
 * PASS 联合曲线图（纯 SVG，无外部依赖）。
 * 只绘制"已铸造区间"（0 → 当前 supply），未铸造的未来段不画：
 * 曲线终点即当前供应量 / 当前链上价格（P2-3：此前画到 2×baseSupply 的全曲线，
 * 包含大量未铸造的假数据段，且 x 轴刻度误导用户）。
 * 曲线形状沿用平方模型 P(s) = price * (s/supply)^2（与链上 basePrice*(s/baseSupply)^2
 * 数学等价，且保证终点精确落在链上当前价）。
 */
function PassBondingCurve({
  curveConfig,
  currentSupply,
  currentPrice,
}: {
  curveConfig: CurveConfig | undefined;
  currentSupply: bigint | undefined;
  currentPrice: bigint | undefined;
}) {
  const supply = currentSupply !== undefined ? Number(currentSupply) : undefined;
  const price = currentPrice !== undefined ? Number(currentPrice) / 1e18 : undefined;

  // 数据未就绪 / 尚无铸造记录（supply=0 或价格 0）→ 空态：曲线无法标定
  if (!curveConfig || !supply || supply <= 0 || price === undefined || price <= 0) {
    return (
      <div className="text-white/30 text-[9px] italic py-8 text-center leading-relaxed">
        No PASS minted yet — the curve starts at the first mint.
      </div>
    );
  }

  const W = 320;
  const H = 150;
  const PAD_L = 46;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 24;
  // 只画已铸造区间：x 轴 0 → 当前 supply，曲线终点 = 当前价（真实链上值）
  const maxSupply = Math.max(supply, 1);
  const maxPrice = Math.max(price, 1e-18);
  const px = (s: number) => PAD_L + (s / maxSupply) * (W - PAD_L - PAD_R);
  const py = (p: number) => H - PAD_B - (p / maxPrice) * (H - PAD_T - PAD_B);

  // 曲线采样点（60 段折线足够平滑），平方模型终点精确等于当前价
  const STEPS = 60;
  const pts: string[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const s = (maxSupply * i) / STEPS;
    const p = price * Math.pow(s / maxSupply, 2);
    pts.push(`${px(s).toFixed(1)},${py(p).toFixed(1)}`);
  }

  // 当前点即曲线终点（右上角）
  const curX = px(maxSupply);
  const curY = py(maxPrice);

  // 轴刻度：基于已铸造区间
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((k) => ({ s: maxSupply * k, label: `${Math.round(maxSupply * k).toLocaleString()}` }));
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((k) => ({ p: maxPrice * k, label: `${fmtMonFlex(maxPrice * k)}` }));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="PASS bonding curve (minted range)">
        {/* 网格 + Y 轴刻度 */}
        {yTicks.map((t, i) => (
          <g key={`y${i}`}>
            <line x1={PAD_L} x2={W - PAD_R} y1={py(t.p)} y2={py(t.p)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={PAD_L - 6} y={py(t.p) + 3} textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.35)" fontFamily="monospace">
              {t.label}
            </text>
          </g>
        ))}
        {/* X 轴刻度 */}
        {xTicks.map((t, i) => (
          <g key={`x${i}`}>
            <line x1={px(t.s)} x2={px(t.s)} y1={PAD_T} y2={H - PAD_B} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={px(t.s)} y={H - PAD_B + 12} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.35)" fontFamily="monospace">
              {t.label}
            </text>
          </g>
        ))}
        {/* 轴标签 */}
        <text x={PAD_L + 2} y={PAD_T - 2} fontSize="7.5" fill="rgba(255,255,255,0.4)" fontFamily="monospace">
          PRICE (MON)
        </text>
        <text x={W - PAD_R} y={H - 4} textAnchor="end" fontSize="7.5" fill="rgba(255,255,255,0.4)" fontFamily="monospace">
          SUPPLY →
        </text>
        {/* 曲线（已铸造区间） */}
        <polyline points={pts.join(' ')} fill="none" stroke="#3ec470" strokeWidth="1.8" strokeLinejoin="round" />
        {/* 当前点（曲线终点，链上真实 supply/price） */}
        <g>
          <line x1={curX} x2={curX} y1={PAD_T} y2={H - PAD_B} stroke="rgba(62,196,112,0.35)" strokeWidth="1" strokeDasharray="3 3" />
          <line x1={PAD_L} x2={curX} y1={curY} y2={curY} stroke="rgba(62,196,112,0.35)" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx={curX} cy={curY} r="3.5" fill="#3ec470" stroke="#0a0a0a" strokeWidth="1.5" />
          <text x={curX - 6} y={curY - 5} textAnchor="end" fontSize="8.5" fill="#3ec470" fontFamily="monospace" fontWeight="bold">
            {supply.toLocaleString()} SUPPLY · {fmtMonFlex(price)} MON
          </text>
        </g>
      </svg>
      <div className="flex justify-between text-white/30 text-[8px] font-bold uppercase tracking-[0.15em] mt-1 px-1">
        <span>0</span>
        <span>{maxSupply.toLocaleString()} minted</span>
      </div>
    </div>
  );
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
  // 乐观倒计时：出价交易确认瞬间立即把倒计时重置为 40s（合约保证 endTime=now+40s，
  // 与乐观值一致），避免 Monad 测试网 RPC 索引延迟导致 refetch 拿到旧 endTime、
  // 用户看不到倒计时重置。链上 endTime 同步到位后自动接管。
  const [optimisticEndMs, setOptimisticEndMs] = useState<number | undefined>(undefined);

  // 链上拍卖状态：placeBid 默认取链上 fixedBidAmount；BidPlaced 事件自动 refetch
  const {
    auctionData,
    cumulativeBid,
    bidCount,
    lastBidderCumulative,
    lastBidderBidCount,
    pendingKol,
    refundable,
    kolBreached,
    placeBid,
    settle,
    submitFulfillment,
    confirmFulfillment,
    autoConfirm,
    dispute,
    claimRefund,
    finalizeBreach,
    claimKol,
    isLoading: txLoading,
    refetchAuction,
  } = useAuction(auctionAddress, account);

  // PASS 持仓检查（出价前置条件：balanceOf > 0 才可出价）+ 详情页快速 mint
  const {
    balanceOf,
    totalSupply,
    curvePrice: passCurvePrice,
    curveConfig,
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
  const kolOnChain = normalizeKolData(kolRes.data);
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
  // 链上 endTime 接管乐观值：refetch 后链上已重置（≥ 乐观值 - 2s）即清除乐观状态
  useEffect(() => {
    if (optimisticEndMs !== undefined && endTimeMs !== undefined && endTimeMs >= optimisticEndMs - 2000) {
      setOptimisticEndMs(undefined);
    }
  }, [endTimeMs, optimisticEndMs]);
  const countdownTarget = isUpcoming ? startTimeMs : (optimisticEndMs ?? endTimeMs);
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
  // 警示倒计时：拍卖进行中且剩余 <= 15 秒 → 红环 + 光环脉冲 + 数字跳动
  const isUrgent = isLive && totalSeconds > 0 && totalSeconds <= 15;
  const isLastBidderYou = !!account && !!lastBidder && account.toLowerCase() === lastBidder.toLowerCase();

  // ---- 出价排名（Leaderboard）：从链上 BidPlaced 事件日志聚合每个竞拍者的
  //      累计出价金额，按累计总价值降序排序（真实链上数据，非 mock）。
  //      Monad 测试网 RPC 限制 eth_getLogs 单次最多 100 区块范围（413 错误），
  //      因此从 latest 往回按 100 区块窗口分页拉取，直到收集到的事件数 ≥ totalBids
  //      （即所有出价都被覆盖）或回溯到拍卖开始时间估算区块。 ----
  const publicClient = usePublicClient();
  const [leaderboard, setLeaderboard] = useState<{ address: `0x${string}`; total: bigint; count: number }[]>([]);
  useEffect(() => {
    if (!auctionAddress || !publicClient) return;
    let cancelled = false;
    (async () => {
      try {
        const eventAbi = parseAbiItem(
          'event BidPlaced(uint256 auctionId, uint256 bidSeq, address indexed bidder, uint256 amount, uint256 timestamp)',
        );
        const latest = await publicClient.getBlockNumber();
        let latestBlock: { timestamp: bigint } | undefined;
        try {
          latestBlock = await publicClient.getBlock({ blockNumber: latest });
        } catch {
          latestBlock = undefined;
        }
        const nowTs = latestBlock ? Number(latestBlock.timestamp) : 0;
        const startTs = auctionData ? Number(auctionData.startTime) : 0;
        const endTs = auctionData ? Number(auctionData.endTime) : 0;
        // 未开始或异常：无出价
        if (startTs <= 0 || startTs >= nowTs) {
          if (!cancelled) setLeaderboard([]);
          return;
        }
        // 二分定位 startTime / endTime（或 now）对应的区块，再在
        // [startBlock - 200, endBlock + 100] 窗口分页扫描出价事件。
        // 出价只发生在 [start, end]，窗口通常仅数百块、2-5 页即可覆盖全部事件，
        // 且不受 Monad 测试网 eth_getLogs 单次 100 区块范围限制影响。
        const findBlockAtTs = async (targetTs: number): Promise<bigint> => {
          let lo = 0n;
          let hi = latest;
          while (lo < hi) {
            const mid = (lo + hi) / 2n;
            const blk = await publicClient.getBlock({ blockNumber: mid });
            if (Number(blk.timestamp) < targetTs) lo = mid + 1n;
            else hi = mid;
          }
          return lo;
        };
        const endBlock = endTs > 0 && endTs < nowTs ? await findBlockAtTs(endTs) : latest;
        const startBlock = await findBlockAtTs(startTs);
        const PAGE = 100n;
        const from = startBlock > 200n ? startBlock - 200n : 0n;
        const to = endBlock + 100n < latest ? endBlock + 100n : latest;
        const targetBids = auctionData ? Number(auctionData.totalBids) : 0;
        const agg = new Map<string, { total: bigint; count: number }>();
        let eventsFound = 0;
        let curTo = to;
        let curFrom = curTo - PAGE + 1n > from ? curTo - PAGE + 1n : from;
        for (let i = 0; i < 200; i++) {
          const page = await publicClient.getLogs({
            address: auctionAddress,
            event: eventAbi,
            fromBlock: curFrom,
            toBlock: curTo,
          });
          for (const log of page) {
            const bidder = log.args.bidder;
            const amount = log.args.amount;
            if (!bidder || amount === undefined || amount === null) continue;
            const cur = agg.get(bidder) ?? { total: 0n, count: 0 };
            agg.set(bidder, { total: cur.total + amount, count: cur.count + 1 });
            eventsFound++;
          }
          // 已覆盖全部出价 → 提前停止
          if (targetBids > 0 && eventsFound >= targetBids) break;
          if (curFrom <= from) break;
          curTo = curFrom - 1n;
          curFrom = curTo - PAGE + 1n > from ? curTo - PAGE + 1n : from;
        }
        const rows = [...agg.entries()]
          .map(([addr, v]) => ({ address: addr as `0x${string}`, total: v.total, count: v.count }))
          .sort((a, b) => (a.total < b.total ? 1 : a.total > b.total ? -1 : 0))
          .slice(0, 10);
        if (!cancelled) setLeaderboard(rows);
      } catch {
        // RPC 日志查询失败不阻塞页面（出价/结算仍可用）
        if (!cancelled) setLeaderboard([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auctionAddress, publicClient, auctionData?.totalBids]);

  // ---- SP-2 履约状态机：状态派生 + 权限判断 ----
  const auctionStatus = auctionData?.status;
  const isKol = !!account && !!auctionData && account.toLowerCase() === auctionData.kol.toLowerCase();
  const winner = auctionData && auctionData.winner !== '0x0000000000000000000000000000000000000000' ? auctionData.winner : null;
  const isWinner = !!account && !!winner && account.toLowerCase() === winner.toLowerCase();
  const nowSec2 = Math.floor(Date.now() / 1000);
  const kolSubmitted = !!auctionData && auctionData.fulfillmentTime > 0n;
  const confirmWindowOpen = !!auctionData && Number(auctionData.autoConfirmDeadline) > nowSec2;
  const fulfillmentExpired = !!auctionData && !kolSubmitted && Number(auctionData.fulfillmentDeadline) > 0 && Number(auctionData.fulfillmentDeadline) <= nowSec2;
  const [evidenceInput, setEvidenceInput] = useState('');

  /** 推文链接 → 链上证据哈希（keccak256(URL)）；推文 URL 同时作为 evidenceUri 供点击核验 */
  const tweetToEvidence = (url: string): `0x${string}` => keccak256(new TextEncoder().encode(url.trim()));

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
        // 乐观重置倒计时（合约保证 endTime=now+40s）；RPC 索引延迟时用户也能立即看到重置
        setOptimisticEndMs(Date.now() + BID_EXTEND_SECONDS * 1000);
        refetchAuction();
        // RPC 索引补偿：1.5s 后二次 refetch，确保链上 endTime 同步到位并接管乐观值
        setTimeout(() => refetchAuction(), 1500);
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
        success('Auction settled! Funds locked pending fulfillment.');
        refetchAuction();
      },
    });
  };

  /** SP-2 履约动作分发：根据当前身份/状态执行对应链上调用 */
  const handleFulfillmentAction = async (action: 'submit' | 'confirm' | 'autoconfirm' | 'dispute' | 'finalize' | 'refund' | 'claimkol') => {
    if (!auctionData || txLoading) return;
    if (!wallet.isConnected) {
      setConnectOpen(true);
      return;
    }
    const toastCfg = {
      onSuccess: () => {
        refetchAuction();
        setTimeout(refetchAuction, 1500);
        // 审计修复（P2-2）：交易成功（确认/争议/退款/领取）后统一刷新真实余额
        void wallet.refreshBalance();
      },
    };
    switch (action) {
      case 'submit': {
        const url = evidenceInput.trim();
        if (!TWEET_URL_RE.test(url)) {
          error('请粘贴有效的 X 推文链接，例如 https://x.com/<handle>/status/<tweet-id>');
          return;
        }
        // 证据 = 履约推文链接：哈希上链防篡改，URL 供仲裁点击核验
        await submitFulfillment(tweetToEvidence(url), url, { onSuccess: () => { success('Fulfillment submitted!'); toastCfg.onSuccess(); } });
        break;
      }
      case 'confirm':
        await confirmFulfillment({ onSuccess: () => { success('Fulfillment confirmed! Funds released to KOL.'); toastCfg.onSuccess(); } });
        break;
      case 'autoconfirm':
        await autoConfirm({ onSuccess: () => { success('Auto-confirmed (window expired).'); toastCfg.onSuccess(); } });
        break;
      case 'dispute': {
        const url = evidenceInput.trim();
        if (!TWEET_URL_RE.test(url)) {
          error('请粘贴有效的 X 推文链接作为争议证据，例如 https://x.com/<handle>/status/<tweet-id>');
          return;
        }
        await dispute(tweetToEvidence(url), url, { onSuccess: () => { success('Dispute raised. Awaiting arbitration.'); toastCfg.onSuccess(); } });
        break;
      }
      case 'finalize':
        await finalizeBreach({ onSuccess: () => { success('Breach settled! Refund pool created. Bidders can now claim.'); toastCfg.onSuccess(); } });
        break;
      case 'refund':
        await claimRefund({ onSuccess: () => { success('Refund claimed!'); toastCfg.onSuccess(); } });
        break;
      case 'claimkol':
        await claimKol({ onSuccess: () => { success('KOL earnings claimed!'); toastCfg.onSuccess(); } });
        break;
    }
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
                ) : auctionStatus === 2 ? (
                  <Badge variant="settled">Awaiting Confirmation</Badge>
                ) : auctionStatus === 3 ? (
                  <Badge variant="live">Completed</Badge>
                ) : auctionStatus === 4 ? (
                  <Badge variant="ended">Disputed</Badge>
                ) : auctionStatus === 5 ? (
                  <Badge variant="neutral">Refunded</Badge>
                ) : isLive ? (
                  <Badge variant="live" pulse>Live</Badge>
                ) : isSettled ? (
                  <Badge variant="settled">{kolBreached ? 'Breached' : 'Settled'}</Badge>
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

            {/* 出价排名（Leaderboard）— 按每个竞拍者累计出价总价值排序（链上事件聚合） */}
            <div className="bg-[#161616] border border-white/[0.04] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[13px] font-bold uppercase tracking-[0.1em] text-white">Bid Leaderboard</h3>
                <span className="text-white/30 text-[8px] font-bold uppercase tracking-[0.15em]">by cumulative spent</span>
              </div>
              {leaderboard.length === 0 ? (
                <div className="text-white/30 text-[11px] py-4 text-center">
                  {isLive ? 'No bids yet — be the first!' : 'No bids were placed in this auction.'}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {leaderboard.map((row, i) => {
                    const isLeader = lastBidder !== null && row.address.toLowerCase() === lastBidder.toLowerCase();
                    const isYou = !!account && row.address.toLowerCase() === account.toLowerCase();
                    return (
                      <div
                        key={row.address}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${
                          isLeader
                            ? 'border-[#3ec470]/30 bg-[#3ec470]/[0.06]'
                            : 'border-white/[0.03] bg-white/[0.01]'
                        }`}
                      >
                        <span className={`w-5 text-center font-mono font-bold text-[12px] ${i === 0 ? 'text-[#3ec470]' : 'text-white/40'}`}>
                          {i + 1}
                        </span>
                        <KolAvatar handle={row.address} size="sm" />
                        <span className="font-mono text-[12px] text-white/80 flex-1 truncate">
                          {shortenAddress(row.address)}
                          {isYou && <span className="ml-1.5 text-[#3ec470] text-[9px] font-bold">YOU</span>}
                        </span>
                        {isLeader && (
                          <span className="flex items-center gap-1 text-[#3ec470] text-[9px] font-bold uppercase tracking-wider shrink-0">
                            <Crown className="w-3 h-3" /> Leading
                          </span>
                        )}
                        <span className="text-right shrink-0">
                          <span className="block font-mono text-[12px] font-bold text-white">{formatMonWei(row.total)} MON</span>
                          <span className="block text-white/30 text-[9px] font-mono text-right">{row.count} bids</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
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
                danger={isUrgent}
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
                    : auctionStatus === 2
                      ? 'AWAITING CONFIRMATION'
                      : auctionStatus === 3
                        ? 'COMPLETED'
                        : auctionStatus === 4
                          ? 'DISPUTED'
                          : auctionStatus === 5
                            ? 'REFUNDED'
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

                {/* SP-2 履约状态机操作区（SETTLED=1 见下方；AWAITING_CONFIRMATION=2） */}
                {auctionStatus === 2 && (
                  <div className="w-full mt-4 bg-[#0f0f0f] border border-white/[0.06] rounded-lg p-4 text-left space-y-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#3ec470]">
                      ⚖️ Fulfillment — KOL submitted, awaiting winner confirmation
                    </div>

                    {isWinner && kolSubmitted && confirmWindowOpen && (
                      <>
                        <div className="text-white/40 text-[10px] leading-relaxed">
                          KOL 已提交履约推文。请确认履约质量，或粘贴违约反证推文链接发起仲裁（48h 窗口内）。
                        </div>
                        {/* 显示 KOL 履约推文链接 */}
                        {auctionData?.fulfillmentEvidenceUri && (
                          <a
                            href={auctionData.fulfillmentEvidenceUri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-[#161616] border border-[#3ec470]/30 rounded px-2.5 py-2 hover:bg-[#3ec470]/5 transition-colors"
                          >
                            <div className="text-[10px] text-[#3ec470] font-bold">🔗 View KOL Fulfillment Evidence (X post)</div>
                            <div className="text-[9px] font-mono text-white/40 truncate mt-0.5">{auctionData.fulfillmentEvidenceHash}</div>
                          </a>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleFulfillmentAction('confirm')}
                            disabled={txLoading}
                            className="flex-1 bg-[#3ec470] text-black font-black text-[11px] py-2.5 rounded hover:bg-[#4ade80] transition-colors uppercase"
                          >
                            {txLoading ? 'Confirming...' : 'Confirm Fulfillment'}
                          </button>
                          <button
                            onClick={() => handleFulfillmentAction('dispute')}
                            disabled={txLoading}
                            className="flex-1 bg-[#7a2d2d]/40 border border-[#ea6668]/40 text-[#ff8a8c] font-bold text-[11px] py-2.5 rounded hover:bg-[#7a2d2d]/60 transition-colors uppercase"
                          >
                            Dispute
                          </button>
                        </div>
                        <div className="text-[9px] text-white/30 leading-relaxed">
                          发起争议需粘贴证据推文链接（如履约承诺未兑现的反证推文），该链接将哈希后上链。
                        </div>
                        <input
                          value={evidenceInput}
                          onChange={(e) => setEvidenceInput(e.target.value)}
                          placeholder="https://x.com/<handle>/status/<tweet-id> (dispute evidence)"
                          className="w-full bg-[#161616] border border-white/10 rounded px-3 py-2.5 text-[11px] font-mono text-white placeholder:text-white/25 focus:border-[#ea6668]/50 outline-none"
                        />
                      </>
                    )}

                    {!confirmWindowOpen && kolSubmitted && (
                      <button
                        onClick={() => handleFulfillmentAction('autoconfirm')}
                        disabled={txLoading}
                        className="w-full bg-white/[0.06] border border-white/10 text-white/70 font-bold text-sm py-2.5 rounded hover:bg-white/10 transition-colors uppercase"
                      >
                        {txLoading ? 'Confirming...' : 'Auto Confirm (window expired)'}
                      </button>
                    )}
                  </div>
                )}

                {/* SP-2：SETTLED(1) — KOL 提交履约的唯一入口（submitFulfillment 要求
                    status==SETTLED）。修复前表单误放在 AWAITING_CONFIRMATION(2) 块内——
                    提交后才变 2，导致 KOL 在 settle 后永远找不到提交入口（死锁）。
                    超时未提交 → 违约态，任何人可触发违约结算。 */}
                {auctionStatus === 1 && (
                  <div className="w-full mt-4 bg-[#0f0f0f] border border-white/[0.06] rounded-lg p-4 text-left space-y-3">
                    <div className="text-sm font-bold uppercase tracking-[0.15em] text-white/60">
                      ⚖️ Settled — {kolSubmitted ? 'KOL submitted' : 'Awaiting KOL fulfillment'}
                    </div>
                    {!kolSubmitted && !fulfillmentExpired && isKol && (
                      <>
                        <div className="text-white/40 text-sm leading-relaxed">
                          Auction settled. Winner locked. 交付通过 X 推文完成——粘贴你发布的履约推文链接
                          （如宣传帖 / 置顶帖 / 交付帖）。推文 URL 将哈希后上链（防篡改），并保存原始链接供
                          中标者与仲裁者点击核验。
                        </div>
                        <input
                          value={evidenceInput}
                          onChange={(e) => setEvidenceInput(e.target.value)}
                          placeholder="https://x.com/<handle>/status/<tweet-id>"
                          className="w-full bg-[#161616] border border-white/10 rounded px-3 py-2.5 text-[11px] font-mono text-white placeholder:text-white/25 focus:border-[#3ec470]/50 outline-none"
                        />
                        <div className="text-[9px] text-white/30 leading-relaxed">
                          支持 x.com / twitter.com 的推文链接。提交后 48h 内中标者确认或发起争议，超时自动确认。
                        </div>
                        <button
                          onClick={() => handleFulfillmentAction('submit')}
                          disabled={txLoading}
                          className="w-full bg-[#3ec470]/15 border border-[#3ec470]/40 text-[#3ec470] font-bold text-[11px] py-2.5 rounded hover:bg-[#3ec470]/25 transition-colors uppercase"
                        >
                          {txLoading ? 'Submitting...' : 'Submit Fulfillment'}
                        </button>
                      </>
                    )}
                    {!kolSubmitted && !fulfillmentExpired && !isKol && (
                      <div className="text-white/40 text-sm leading-relaxed">
                        Auction settled. Winner locked. KOL must submit fulfillment evidence within the
                        fulfillment window.
                      </div>
                    )}
                    {!kolSubmitted && fulfillmentExpired && (
                      <>
                        <div className="text-[#ff8a8c] text-sm font-bold leading-relaxed">
                          KOL 未在期限内提交履约 → 已违约。任何人可点击下方按钮触发违约结算
                          （80% 拍卖资金 + KOL 押金罚没进入退款池），结算后竞拍者各自领取应退份额。
                        </div>
                        <button
                          onClick={() => handleFulfillmentAction('finalize')}
                          disabled={txLoading}
                          className="w-full bg-[#ea6668] text-black font-black text-sm py-2.5 rounded hover:bg-[#ff8a8c] transition-colors uppercase"
                        >
                          {txLoading ? 'Processing...' : 'Trigger Breach Settlement'}
                        </button>
                        <div className="text-white/30 text-[10px]">
                          触发结算后，状态将变为 Refunded，竞拍者可在下方领取本人应退份额。
                        </div>
                      </>
                    )}
                  </div>
                )}

                {auctionStatus === 4 && (
                  <div className="w-full mt-4 bg-[#0f0f0f] border border-[#ea6668]/30 rounded-lg p-4 text-left space-y-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#ff8a8c]">⚖️ Disputed</div>
                    <div className="text-white/40 text-[10px] leading-relaxed">
                      争议已提交仲裁。资金保持锁定，等待平台仲裁结果。双方证据如下：
                    </div>
                    {/* 显示 KOL 履约推文链接 */}
                    {auctionData?.fulfillmentEvidenceUri ? (
                      <a
                        href={auctionData.fulfillmentEvidenceUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-[#161616] border border-[#3ec470]/30 rounded px-2.5 py-2 hover:bg-[#3ec470]/5 transition-colors"
                      >
                        <div className="text-[10px] text-[#3ec470] font-bold">🔗 KOL Fulfillment Evidence (X post)</div>
                        <div className="text-[9px] font-mono text-white/40 truncate mt-0.5">{auctionData.fulfillmentEvidenceUri}</div>
                        <div className="text-[9px] font-mono text-white/25 truncate mt-0.5">hash: {auctionData.fulfillmentEvidenceHash}</div>
                      </a>
                    ) : (
                      <div className="text-[9px] text-white/30">KOL fulfillment evidence: {auctionData?.fulfillmentEvidenceHash ?? 'N/A'}</div>
                    )}
                    {/* 显示 winner 争议推文链接 */}
                    {auctionData?.disputeEvidenceUri ? (
                      <a
                        href={auctionData.disputeEvidenceUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-[#161616] border border-[#ea6668]/30 rounded px-2.5 py-2 hover:bg-[#ea6668]/5 transition-colors"
                      >
                        <div className="text-[10px] text-[#ff8a8c] font-bold">🔗 Winner Dispute Evidence (X post)</div>
                        <div className="text-[9px] font-mono text-white/40 truncate mt-0.5">{auctionData.disputeEvidenceUri}</div>
                        <div className="text-[9px] font-mono text-white/25 truncate mt-0.5">hash: {auctionData.disputeEvidenceHash}</div>
                      </a>
                    ) : (
                      <div className="text-[9px] text-white/30">Dispute evidence: {auctionData?.disputeEvidenceHash ?? 'N/A'}</div>
                    )}
                  </div>
                )}

                {auctionStatus === 3 && (
                  <div className="w-full mt-4 bg-[#0f0f0f] border border-[#3ec470]/30 rounded-lg p-4 text-left space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#3ec470]">✅ Completed</div>
                    {isKol && pendingKol !== undefined && pendingKol > 0n && (
                      <button
                        onClick={() => handleFulfillmentAction('claimkol')}
                        disabled={txLoading}
                        className="w-full bg-[#3ec470] text-black font-black text-[11px] py-2.5 rounded hover:bg-[#4ade80] transition-colors uppercase"
                      >
                        {txLoading ? 'Claiming...' : `Claim KOL Earnings (${formatMonWei(pendingKol)} MON)`}
                      </button>
                    )}
                    <div className="flex justify-between text-white/40 text-[10px] font-mono">
                      <span>KOL earnings</span>
                      <span className="text-white font-bold">{formatMonWei(pendingKol)} MON</span>
                    </div>
                    <div className="text-white/30 text-[9px] font-mono">
                      Platform 20% fee was auto-credited to treasury at settlement.
                    </div>
                  </div>
                )}

                {auctionStatus === 5 && (
                  <div className="w-full mt-4 bg-[#0f0f0f] border border-white/[0.06] rounded-lg p-4 text-left">
                    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#ff8a8c] mb-2">Refunded</div>
                    {account && refundable !== undefined && refundable > 0n && (
                      <button
                        onClick={() => handleFulfillmentAction('refund')}
                        disabled={txLoading}
                        className="w-full bg-[#3ec470] text-black font-black text-[11px] py-2.5 rounded hover:bg-[#4ade80] transition-colors uppercase"
                      >
                        {txLoading ? 'Claiming...' : `Claim Refund (${formatMonWei(refundable)} MON)`}
                      </button>
                    )}
                    <div className="text-white/40 text-[10px] mt-2">
                      {account && refundable !== undefined && refundable === 0n
                        ? '你没有可领取的退款（未出价或已领取）。'
                        : '违约退款池已分配，按出价金额比例领取。'}
                    </div>
                  </div>
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
                      {mintUnitMon !== undefined ? `${fmtMonFlex(mintUnitMon)} MON` : '-'}
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
                      {mintCostMon !== undefined ? `${fmtMonFlex(mintCostMon)} MON` : '-'}
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

              {/* 联合曲线：PASS 价格随供应量增长（越早 mint 越便宜） */}
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/40 text-[8px] font-bold uppercase tracking-[0.15em]">Bonding Curve</span>
                  <span className="text-white/25 text-[8px]">price grows with supply</span>
                </div>
                <PassBondingCurve curveConfig={curveConfig} currentSupply={totalSupply} currentPrice={passCurvePrice} />
              </div>
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
