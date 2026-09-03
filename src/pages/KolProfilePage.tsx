import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, TrendingUp, Info, Copy, ZoomIn } from 'lucide-react';
import { KolAvatar } from '../components/kol/KolAvatar';
import { Button } from '../components/ui/Button';
import { MintBurnPanel } from '../components/kol-profile/MintBurnPanel';
import type { MintBurnResultPayload } from '../components/kol-profile/MintBurnPanel';
import { useToast } from '../hooks/useToast';
import { getKolByHandle, mockKolStats } from '../data/mockKols';
import { CURVE_DEFAULTS } from '../utils/constants';
import { useWalletStore } from '../stores/walletStore';
import { useKolPass } from '../web3/hooks/useKolPass';
import { useRegistry, type KolData } from '../web3/hooks/useRegistry';
import { shortenAddress } from '../utils/format';
import { cn } from '../utils/cn';

// Interactive Bonding Curve with zoom and tooltip
function InteractiveBondingCurve({ currentSupply, currentPrice }: { currentSupply: number; currentPrice: number }) {
  const [curveHoverProgress, setCurveHoverProgress] = useState<number | null>(null);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [isZoomed] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsChartLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleInteraction = (clientX: number) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const rawX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const snappedProgress = Math.round(rawX * 100) / 100;
    setCurveHoverProgress(snappedProgress);
  };

  const handleMouseMove = (e: React.MouseEvent) => handleInteraction(e.clientX);
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) handleInteraction(e.touches[0].clientX);
  };

  const maxDisplaySupply = isZoomed ? 2000 : 10000;
  const getPrice = (supply: number) => currentPrice * Math.pow(supply / currentSupply, 2);
  const maxDisplayPrice = getPrice(maxDisplaySupply);

  const actualRawX = currentSupply / maxDisplaySupply;
  const hoverRawX = curveHoverProgress !== null ? curveHoverProgress : actualRawX;
  const hoverSupply = Math.floor(hoverRawX * maxDisplaySupply);
  const hoverMintPrice = getPrice(hoverSupply);
  const isMinting = hoverSupply > currentSupply;
  const isCurrent = Math.abs(hoverSupply - currentSupply) < 100 && curveHoverProgress === null;

  const cx = hoverRawX * 100;
  const cy = 100 - (hoverMintPrice / maxDisplayPrice) * 100;

  const curvePoints = Array.from({ length: 101 }, (_, i) => {
    const px = i;
    const supplyAtX = (i / 100) * maxDisplaySupply;
    const priceAtX = getPrice(supplyAtX);
    const py = 100 - (priceAtX / maxDisplayPrice) * 100;
    return `${px},${py}`;
  }).join(' ');

  const actualX = actualRawX * 100;

  return (
    <div className="w-full flex-1 min-h-[240px] bg-[#0a0a0a] border border-white/[0.04] rounded relative overflow-hidden mt-2">
      {isChartLoading ? (
        <div className="absolute inset-0">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none p-4 pb-0 opacity-50">
            <div className="w-full h-px bg-white/[0.02]"></div>
            <div className="w-full h-px bg-white/[0.02]"></div>
            <div className="w-full h-px bg-white/[0.02]"></div>
            <div className="w-full h-px bg-white/[0.02]"></div>
          </div>
          <motion.div
            className="absolute inset-y-0 left-0 w-[200%] bg-gradient-to-r from-transparent via-white/[0.05] to-transparent skew-x-[-20deg]"
            initial={{ x: '-100%' }}
            animate={{ x: '50%' }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#3ec470]/[0.02] to-transparent pointer-events-none"></div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          ref={chartRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setCurveHoverProgress(null)}
          onTouchStart={handleTouchMove}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => setCurveHoverProgress(null)}
          onTouchCancel={() => setCurveHoverProgress(null)}
          className="absolute inset-0 cursor-crosshair"
        >
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none p-4 pb-0">
            <div className="w-full h-px bg-white/[0.02]"></div>
            <div className="w-full h-px bg-white/[0.02]"></div>
            <div className="w-full h-px bg-white/[0.02]"></div>
            <div className="w-full h-px bg-white/[0.02]"></div>
          </div>

          <div className="absolute left-3 top-3 bottom-8 flex flex-col justify-between text-white/30 text-[9px] font-mono pointer-events-none z-0">
            <span>{maxDisplayPrice.toFixed(0)}</span>
            <span>{(maxDisplayPrice * 0.66).toFixed(0)}</span>
            <span>{(maxDisplayPrice * 0.33).toFixed(0)}</span>
            <span>0</span>
          </div>

          <div className="absolute bottom-2 left-10 right-4 flex justify-between text-white/30 text-[9px] font-mono pointer-events-none z-0">
            <span>0</span>
            <span>{(maxDisplaySupply * 0.33).toFixed(0)}</span>
            <span>{(maxDisplaySupply * 0.66).toFixed(0)}</span>
            <span>{maxDisplaySupply}</span>
          </div>

          <div
            className="absolute top-0 bottom-0 border-l border-white/10 pointer-events-none border-dashed z-0"
            style={{ left: `${actualX}%` }}
          >
            <div className="absolute top-2 -translate-x-1/2 bg-[#161616] border border-white/10 text-white/40 text-[7px] font-bold px-1.5 py-0.5 rounded tracking-widest whitespace-nowrap">CURRENT SUPPLY</div>
          </div>

          <svg viewBox="0 0 100 100" className="w-full h-full relative z-10" preserveAspectRatio="none">
            <defs>
              <linearGradient id="curveLineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3ec470" />
                <stop offset={`${actualX}%`} stopColor="#3ec470" />
              </linearGradient>
              <linearGradient id="curveGradientFull" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3ec470" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#3ec470" stopOpacity="0" />
              </linearGradient>
              <clipPath id="profileProgressClip">
                <rect x="0" y="0" width={cx} height="100" />
              </clipPath>
            </defs>

            <polyline points={curvePoints} fill="none" stroke="#3ec470" strokeWidth="0.3" strokeDasharray="1,1" opacity="0.3" />
            <polygon points={`0,100 ${curvePoints} 100,100`} fill="url(#curveGradientFull)" clipPath="url(#profileProgressClip)" />
            <polyline points={curvePoints} fill="none" stroke="url(#curveLineGradient)" strokeWidth="0.6" clipPath="url(#profileProgressClip)" />

            <circle cx={cx} cy={cy} r="1.5" fill="#3ec470" opacity={curveHoverProgress !== null ? 0 : 1} />

            {curveHoverProgress !== null && (
              <g>
                <line x1={cx} y1="0" x2={cx} y2="100" stroke="#3ec470" strokeWidth="0.5" strokeDasharray="1,1.5" opacity="0.6" />
                <motion.circle
                  cx={cx}
                  cy={cy}
                  fill="none"
                  stroke="#3ec470"
                  strokeWidth="0.5"
                  initial={{ r: 2, opacity: 1 }}
                  animate={{ r: 8, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: 'easeOut' }}
                />
                <circle cx={cx} cy={cy} r="2" fill="#000" stroke="#3ec470" strokeWidth="1.2" />
              </g>
            )}
          </svg>

          {(curveHoverProgress !== null || isCurrent) && (
            <div
              className="absolute pointer-events-none z-50 flex flex-col items-center"
              style={{
                left: `${cx}%`,
                top: `${cy}%`,
                transform: `translate(${cx > 80 ? '-100%' : cx < 20 ? '0%' : '-50%'}, ${cy < 40 ? '0%' : '-100%'})`,
                marginTop: cy < 40 ? '8px' : '-8px',
              }}
            >
              {cy < 40 && <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-white/10"></div>}
              <div className="bg-[#111] border border-white/10 rounded-lg p-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.8)] flex flex-col min-w-[140px]">
                <div className="flex justify-between items-center mb-2.5 border-b border-white/10 pb-2">
                  <div className="text-white/40 text-[9px] font-bold uppercase tracking-[0.1em]">Coordinates</div>
                  <div className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${isCurrent ? 'bg-white/10 text-white' : isMinting ? 'bg-[#3ec470]/20 text-[#3ec470]' : 'bg-red-500/20 text-red-400'}`}>
                    {isCurrent ? 'CURRENT' : isMinting ? 'MINTING' : 'BURNING'}
                  </div>
                </div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-white/50 text-[9px] font-bold uppercase tracking-wider">Supply</span>
                  <span className="text-white font-mono text-[11px] font-bold">{hoverSupply.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/50 text-[9px] font-bold uppercase tracking-wider">Price</span>
                  <span className="text-[#3ec470] font-mono text-[11px] font-bold">{hoverMintPrice.toFixed(2)} MON</span>
                </div>
              </div>
              {cy >= 40 && <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white/10"></div>}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

const historicalAuctions = [
  { round: '#42', bidders: '124', bids: '842', tvl: '4,250.00', status: 'ONGOING', statusColor: 'text-[#3ec470] border-[#3ec470]/30 bg-[#3ec470]/10' },
  { round: '#41', bidders: '89', bids: '567', tvl: '2,840.50', status: 'FULFILLED', statusColor: 'text-white/60 border-white/20 bg-white/5' },
  { round: '#40', bidders: '156', bids: '1,102', tvl: '5,120.00', status: 'ARBITRATING', statusColor: 'text-orange-400 border-orange-400/30 bg-orange-400/10' },
  { round: '#39', bidders: '42', bids: '215', tvl: '1,050.25', status: 'CLOSED', statusColor: 'text-white/40 border-white/10 bg-transparent' },
  { round: '#38', bidders: '-', bids: '-', tvl: '0.00', status: 'UPCOMING', statusColor: 'text-white/40 border-white/10 bg-transparent' },
  { round: '#37', bidders: '12', bids: '45', tvl: '120.00', status: 'FAILED', statusColor: 'text-red-400 border-red-400/30 bg-red-400/10' },
];

/**
 * 推断 KOL 的 KolPass 合约地址（Task 12 链上接入）。
 *
 * 路由 handle 有两种形态：
 *  1. 0x 钱包地址（链上 KOL 唯一身份，从链上拍卖卡片 /kol/0x... 进入）→
 *     直接视为 KOL 钱包地址，passAddress = getKol(wallet).passContracts[0]。
 *  2. 字符串 handle（mock KOL，如 @0xchine）→ 链上无法解析，保留 mock 展示。
 *
 * 返回 { kolAddress, passAddress, chainKolData }：
 *  - kolAddress：链上 KOL 钱包地址（handle 为 0x 时等于 handle，否则 undefined）
 *  - passAddress：该 KOL 最近部署的 PASS 合约地址（getKol(wallet).passContracts 最后一项）
 *  - chainKolData：链上 KOL 信息（twitterHandle / followers 等），供展示
 */
function resolveChainKol(handle: string | undefined): {
  kolAddress: `0x${string}` | undefined;
  passAddress: `0x${string}` | undefined;
  chainKolData: KolData | undefined;
} {
  if (!handle) return { kolAddress: undefined, passAddress: undefined, chainKolData: undefined };
  if (handle.startsWith('0x')) {
    return { kolAddress: handle as `0x${string}`, passAddress: undefined, chainKolData: undefined };
  }
  return { kolAddress: undefined, passAddress: undefined, chainKolData: undefined };
}

export default function KolProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const kol = handle ? getKolByHandle(handle) : undefined;
  const [stakeTerm, setStakeTerm] = useState('90');
  const [stakeAmount, setStakeAmount] = useState('');
  const [timeLeft, setTimeLeft] = useState(2 * 24 * 3600 + 14 * 3600 + 35 * 60);
  const { success, info } = useToast();

  // 债券曲线状态（供应量 / 价格）— 由页面统一维护，Mint/Burn 成功后通过
  // MintBurnPanel.onTradeSuccess 更新，驱动 Overview 卡片与曲线图联动。
  const [curveSupply, setCurveSupply] = useState<number>(CURVE_DEFAULTS.REFERENCE_SUPPLY);
  const [curvePrice, setCurvePrice] = useState<number>(CURVE_DEFAULTS.BASE_PRICE);

  // ---- 链上接入：handle 为 0x 钱包地址 → 走链上真实数据；否则 mock 双路径回退 ----
  const wallet = useWalletStore();
  const account =
    wallet.isConnected && wallet.address ? (wallet.address as `0x${string}`) : undefined;

  // 解析链上 KOL 身份：0x handle → 钱包地址 + Registry 数据
  const { kolAddress } = useMemo(() => {
    const resolved = resolveChainKol(handle);
    return { kolAddress: resolved.kolAddress, chainKolData: resolved.chainKolData };
  }, [handle]);

  // 查询链上 KOL（钱包地址）信息 → passContracts[0] 即其 PASS 合约
  const chainRegistry = useRegistry(kolAddress);
  const chainKolInfo = chainRegistry.kolData;
  const passAddress = useMemo(() => {
    const passContracts = chainKolInfo?.passContracts ?? [];
    if (passContracts.length > 0) return passContracts[passContracts.length - 1] as `0x${string}`;
    return undefined;
  }, [chainKolInfo]);

  const chainPass = useKolPass(passAddress, account);

  // 链上数据（wei → MON / 供应量整数）；undefined 时回退 mock 基线
  const chainSupply = chainPass.totalSupply !== undefined ? Number(chainPass.totalSupply) : undefined;
  const chainPrice =
    chainPass.curvePrice !== undefined ? Number(chainPass.curvePrice) / 1e18 : undefined;

  // 展示值：链上路径优先链上 curvePrice / totalSupply；mock 路径维持页面 useState 联动逻辑
  const actualSupply = chainSupply ?? curveSupply;
  const actualMintPrice = chainPrice ?? curvePrice;

  // 链上 KOL 展示信息（handle 为 0x 且链上已注册时，用链上 twitterHandle / followers 覆盖 mock 字段）
  const chainKolName =
    kolAddress && chainKolInfo?.registered && chainKolInfo.twitterHandle
      ? chainKolInfo.twitterHandle.replace(/^@/, '')
      : undefined;
  const chainKolFollowers =
    kolAddress && chainKolInfo?.registered ? Number(chainKolInfo.followers) : undefined;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 路由间切换 KOL 时重置曲线基线（交易产生的偏移不跨 KOL 保留）
  useEffect(() => {
    const stats = kol ? mockKolStats[kol.id] : undefined;
    setCurveSupply(stats?.passSupply ?? CURVE_DEFAULTS.REFERENCE_SUPPLY);
    setCurvePrice(stats?.currentPrice ?? CURVE_DEFAULTS.BASE_PRICE);
  }, [kol?.id]);

  /** 交易成功：用返回的新供应量 / 新价格刷新页面曲线状态（交易通知由弹窗 toast 处理） */
  const handleTradeSuccess = (result: MintBurnResultPayload) => {
    setCurveSupply(result.newSupply);
    setCurvePrice(result.newPrice);
  };

  // 展示用的 KOL 信息：链上优先，mock 回退
  const displayName = chainKolName ?? kol?.name ?? (kolAddress ? shortenAddress(kolAddress) : '');
  const displayHandle = chainKolName
    ? `@${chainKolName}`
    : kol?.handle ?? (kolAddress ? shortenAddress(kolAddress) : '');
  const displayFollowers = chainKolFollowers ?? kol?.followers ?? 0;
  const displayBio = kol?.bio;
  const displayRank = kol?.rank;
  const displayAvatarHandle = chainKolName ?? kol?.handle ?? (kolAddress ?? '');
  // 链上 KOL 页面：handle 为 0x 钱包地址且 Registry 已注册（区别于 mock KOL）
  const isChainKol = !!kolAddress && !!chainKolInfo?.registered;
  // Pass TVL 近似 = 链上 totalSupply × 当前曲线价（展示用，非权威累计值）
  const passTvl = isChainKol ? actualSupply * actualMintPrice : undefined;

  if (!kol && !kolAddress) {
    return (
      <div className="min-h-screen bg-transparent pt-32 pb-24">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <div className="text-6xl mb-6">👤</div>
          <h1 className="text-3xl font-black text-white mb-4">KOL Not Found</h1>
          <p className="text-white/40 mb-8">The KOL you're looking for doesn't exist.</p>
          <Link to="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const d = Math.floor(timeLeft / (3600 * 24));
  const h = Math.floor((timeLeft % (3600 * 24)) / 3600);
  const m = Math.floor((timeLeft % 3600) / 60);

  return (
    <div className="min-h-screen bg-transparent pt-32 pb-24 font-sans text-white relative">
      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        <Link to="/" className="flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors font-bold text-sm tracking-wide">
          <ArrowLeft className="w-4 h-4" /> BACK
        </Link>

        <motion.div
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.1 },
            },
          }}
        >
          {/* Profile Card */}
          <div className="lg:col-span-3 bg-[#161616] border border-white/[0.04] rounded-lg p-6 flex flex-col items-center text-center">
            <motion.div whileHover={{ scale: 1.05 }} transition={{ type: 'spring', stiffness: 300 }} className="relative w-24 h-24 mb-4 cursor-pointer">
              <div className="absolute inset-0 bg-white/5 rounded-full animate-pulse"></div>
              <KolAvatar handle={displayAvatarHandle} size="xl" name={displayName} className="w-24 h-24 rounded-full object-cover border-2 border-[#161616] relative z-10 bg-[#0a0a0a] shadow-xl" />
            </motion.div>
            <h1 className="text-2xl font-black tracking-tight mb-1">{displayName}</h1>
            <div className="text-white/40 text-sm font-mono mb-6">{displayHandle}</div>
            <button onClick={() => info('Opening X profile...')} className="w-full bg-[#3ec470] text-black font-bold text-[11px] uppercase tracking-[0.15em] py-3 rounded hover:bg-[#4ade80] transition-all">
              Follow on X
            </button>
          </div>

          {/* Overview */}
          <div className="lg:col-span-9 bg-[#161616] border border-white/[0.04] rounded-lg p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-[13px] font-bold uppercase tracking-[0.1em] mb-4">Overview</h2>
              <p className="text-white/60 text-[13px] leading-relaxed max-w-3xl">
                {displayBio || 'High-frequency trading analyst focused on emerging L1 ecosystems. Primary proponent of Monad yield strategies and automated liquidity provision. Author of the definitive guide to MEV protection for retail traders.'}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
              <div className="bg-[#0f0f0f] border border-white/[0.04] rounded p-3">
                <div className="text-white/40 text-[9px] font-bold uppercase tracking-[0.15em] mb-1.5">Followers</div>
                <div className="font-mono text-sm font-bold">{displayFollowers.toLocaleString()}</div>
              </div>
              <div className="bg-[#0f0f0f] border border-white/[0.04] rounded p-3">
                <div className="text-white/40 text-[9px] font-bold uppercase tracking-[0.15em] mb-1.5">Supply</div>
                <div className="font-mono text-sm font-bold">{actualSupply.toLocaleString()}</div>
              </div>
              <div className="bg-[#0f0f0f] border border-white/[0.04] rounded p-3">
                <div className="text-white/40 text-[9px] font-bold uppercase tracking-[0.15em] mb-1.5">Pass TVL</div>
                <div className="font-mono text-sm font-bold text-[#3ec470]">
                  {passTvl !== undefined
                    ? `${Math.round(passTvl).toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-[10px] text-white/50">MON</span>`
                    : '105,420 <span className="text-[10px] text-white/50">MON</span>'}
                </div>
              </div>
              <div className="bg-[#0f0f0f] border border-white/[0.04] rounded p-3">
                <div className="text-white/40 text-[9px] font-bold uppercase tracking-[0.15em] mb-1.5">Auction TVL</div>
                <div className="font-mono text-sm font-bold text-[#3ec470]">
                  {isChainKol ? '-- <span className="text-[10px] text-white/50">MON</span>' : '42,850 <span className="text-[10px] text-white/50">MON</span>'}
                </div>
              </div>
              <div className="bg-[#0f0f0f] border border-white/[0.04] rounded p-3">
                <div className="text-white/40 text-[9px] font-bold uppercase tracking-[0.15em] mb-1.5">KOL Rank</div>
                <div className="font-mono text-sm font-bold text-[#3ec470]">#{displayRank ?? '-'}</div>
              </div>
            </div>
          </div>

          {/* Bonding Curve */}
          <div className="lg:col-span-8 bg-[#161616] border border-white/[0.04] rounded-lg p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <h3 className="text-[13px] font-bold uppercase tracking-[0.1em]">Bonding Curve</h3>
                <button onClick={() => {}} className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-[#3ec470] bg-[#3ec470]/10 border border-[#3ec470]/20 px-2 py-1 rounded hover:bg-[#3ec470]/20 transition-colors">
                  <ZoomIn className="w-3 h-3" /> Zoom In
                </button>
              </div>
              <button onClick={() => info('Rules modal coming soon')} className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/50 bg-[#0f0f0f] border border-white/[0.04] px-3 py-1.5 rounded hover:text-white transition-colors">
                Rules
              </button>
            </div>

            <div className="flex flex-wrap gap-3 mb-6">
              <div className="bg-[#0f0f0f] border border-white/[0.04] rounded px-3 py-2 flex items-center gap-2">
                <span className="text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Latest Mint Price:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-white">{actualMintPrice.toFixed(2)} <span className="text-white/40">MON</span></span>
                  <div className="flex items-center gap-0.5 text-[#3ec470] bg-[#3ec470]/10 px-1.5 py-0.5 rounded ml-1 border border-[#3ec470]/20">
                    <TrendingUp className="w-2.5 h-2.5" />
                    <span className="font-mono text-[9px] font-bold">+14.2%</span>
                  </div>
                </div>
              </div>
              <div className="bg-[#0f0f0f] border border-white/[0.04] rounded px-3 py-2 flex items-center gap-2">
                <span className="text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Supply:</span>
                <span className="font-mono text-xs font-bold text-white">{actualSupply.toLocaleString()}</span>
              </div>
              <div className="bg-[#0f0f0f] border border-white/[0.04] rounded px-3 py-2 flex items-center gap-2">
                <span className="text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Staking:</span>
                <span className="font-mono text-xs font-bold text-white">{isChainKol ? '--' : '5,120'}</span>
              </div>
            </div>

            <InteractiveBondingCurve currentSupply={actualSupply} currentPrice={actualMintPrice} />

            <div className="mt-4 pt-4 border-t border-white/[0.04] flex justify-between items-center">
              <div className="text-white/40 text-[9px] font-bold uppercase tracking-[0.1em] flex items-center gap-2">
                <span>Contract</span>
                <span className="font-mono text-white/70 tracking-widest hidden sm:inline">
                  {passAddress ?? '0x742d...f44e'}
                </span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(passAddress ?? '0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
                  success('Address copied');
                }}
                className="text-white/40 hover:text-white transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Trade Pass — Mint / Burn 交易面板 */}
          <div className="lg:col-span-4">
            <MintBurnPanel
              kolHandle={displayHandle.replace(/^@/, '').toLowerCase()}
              kolName={displayName}
              supply={actualSupply}
              price={actualMintPrice}
              passAddress={passAddress}
              onTradeSuccess={handleTradeSuccess}
            />
          </div>

          {/* Dividend Pool */}
          <div className="lg:col-span-6 bg-[#161616] border border-white/[0.04] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-[13px] font-bold uppercase tracking-[0.1em]">Dividend Pool</h3>
              {isChainKol && <span className="text-[8px] font-bold uppercase tracking-wider text-white/30 bg-white/[0.04] border border-white/[0.04] px-1.5 py-0.5 rounded">Preview</span>}
              <Info className="w-3.5 h-3.5 text-white/30" />
            </div>
            <p className="text-white/50 text-[12px] mb-6">20% of all auction revenue is distributed to PASS holders.{isChainKol && ' (链上分红数据接入中 — 此区域为预览)'}</p>

            <div className="bg-[#0f0f0f] border border-white/[0.04] rounded p-5 mb-4">
              <div className="text-white/40 text-[9px] font-bold uppercase tracking-[0.15em] mb-2">Distribution Countdown</div>
              <div className="font-mono text-2xl font-bold text-[#3ec470] tracking-tight">
                {d.toString().padStart(2, '0')}d {h.toString().padStart(2, '0')}h {m.toString().padStart(2, '0')}m
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0f0f0f] border border-white/[0.04] rounded p-4">
                <div className="text-white/40 text-[9px] font-bold uppercase tracking-[0.15em] mb-1.5">Current Period</div>
                <div className="font-mono text-[13px] font-bold text-[#3ec470]">1,240.50 MON</div>
              </div>
              <div className="bg-[#0f0f0f] border border-white/[0.04] rounded p-4">
                <div className="text-white/40 text-[9px] font-bold uppercase tracking-[0.15em] mb-1.5">Previous Period</div>
                <div className="font-mono text-[13px] font-bold text-white">980.25 MON</div>
              </div>
            </div>
          </div>

          {/* Staking */}
          <div className="lg:col-span-6 bg-[#161616] border border-white/[0.04] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <KolAvatar handle={displayAvatarHandle} size="sm" name={displayName} className="w-4 h-4 rounded-full" />
              </div>
              <h3 className="text-[13px] font-bold uppercase tracking-[0.1em]">Staking</h3>
              {isChainKol && <span className="text-[8px] font-bold uppercase tracking-wider text-white/30 bg-white/[0.04] border border-white/[0.04] px-1.5 py-0.5 rounded">Preview</span>}
              <Info className="w-3.5 h-3.5 text-white/30 ml-1" />
            </div>
            <p className="text-white/50 text-[12px] mb-6">Stake PASS to earn 10% of auction revenue. Earnings vary based on activity.</p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { days: '7', mult: '1.0x' },
                { days: '30', mult: '1.5x' },
                { days: '90', mult: '2.0x', best: true },
              ].map((term) => (
                <button
                  key={term.days}
                  onClick={() => setStakeTerm(term.days)}
                  className={cn(
                    'relative flex flex-col items-center justify-center p-4 rounded border transition-all',
                    stakeTerm === term.days
                      ? 'bg-[#3ec470]/5 border-[#3ec470]/30 text-[#3ec470]'
                      : 'bg-[#0f0f0f] border-white/[0.04] text-white/50 hover:bg-white/[0.02]'
                  )}
                >
                  {term.best && (
                    <div className="absolute -top-2 bg-[#3ec470] text-black text-[7px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Best Yield</div>
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] mb-1">{term.days} Days</span>
                  <span className="font-mono font-bold">{term.mult}</span>
                </button>
              ))}
            </div>

            <div>
              <div className="text-white/40 text-[9px] font-bold uppercase tracking-[0.15em] mb-2">Amount</div>
              <div className="flex gap-4">
                <div className="flex-1 flex bg-[#0a0a0a] border border-white/[0.06] rounded p-1">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    className="bg-transparent w-full px-3 font-mono text-[14px] text-white outline-none placeholder-white/20"
                  />
                  <button onClick={() => setStakeAmount('10')} className="bg-white/[0.05] text-white/60 text-[9px] font-bold px-3 py-2 rounded hover:bg-white/[0.1] transition-colors tracking-[0.1em]">MAX</button>
                </div>
                <button onClick={() => success('Pass Staked Successfully!')} className="bg-[#3ec470] text-black font-bold text-[12px] tracking-[0.1em] px-8 rounded hover:bg-[#4ade80] transition-colors uppercase whitespace-nowrap">
                  Stake Now
                </button>
              </div>
            </div>
          </div>

          {/* Historical Auctions */}
          <div className="lg:col-span-12 bg-[#161616] border border-white/[0.04] rounded-lg p-6">
            <h3 className="text-[13px] font-bold uppercase tracking-[0.1em] mb-6">
              Historical Auctions
              {isChainKol && <span className="ml-2 text-[8px] font-bold uppercase tracking-wider text-white/30 bg-white/[0.04] border border-white/[0.04] px-1.5 py-0.5 rounded align-middle">Preview</span>}
            </h3>

            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-white/[0.08] text-white/30 text-[9px] font-bold uppercase tracking-[0.15em]">
                    <th className="pb-3 pt-1 px-4 w-24">Round</th>
                    <th className="pb-3 pt-1 px-4 text-center">Bidders</th>
                    <th className="pb-3 pt-1 px-4 text-center">Bids</th>
                    <th className="pb-3 pt-1 px-4 text-right">Total TVL (MON)</th>
                    <th className="pb-3 pt-1 px-4 text-right w-32">Status</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-[12px]">
                  {historicalAuctions.map((row, i) => (
                    <motion.tr
                      key={i}
                      className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.04] transition-colors relative z-0 hover:z-10 cursor-pointer"
                      whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.03)', boxShadow: '0px 10px 20px rgba(0,0,0,0.2)' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    >
                      <td className="py-4 px-4 font-bold text-white">{row.round}</td>
                      <td className="py-4 px-4 text-center text-white/80">{row.bidders}</td>
                      <td className="py-4 px-4 text-center text-white/80">{row.bids}</td>
                      <td className="py-4 px-4 text-right font-bold text-white">{row.tvl}</td>
                      <td className="py-4 px-4 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-sans font-bold uppercase tracking-[0.1em] border ${row.statusColor}`}>
                          {row.status}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
