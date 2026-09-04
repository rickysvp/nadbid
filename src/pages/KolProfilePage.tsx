import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { ArrowLeft, Info, Copy, ZoomIn } from 'lucide-react';
import { KolAvatar } from '../components/kol/KolAvatar';
import { Button } from '../components/ui/Button';
import { MintBurnPanel } from '../components/kol-profile/MintBurnPanel';
import type { MintBurnResultPayload } from '../components/kol-profile/MintBurnPanel';
import { useToast } from '../hooks/useToast';
import { CURVE_DEFAULTS } from '../utils/constants';
import { useWalletStore } from '../stores/walletStore';
import { useKolPass } from '../web3/hooks/useKolPass';
import { useReadContract } from '../web3/hooks/useReadContract';
import { kolPassAbi } from '../web3/contracts';
import { useRegistry, type KolData } from '../web3/hooks/useRegistry';
import { shortenAddress, formatMon } from '../utils/format';

// Interactive Bonding Curve with zoom and tooltip
function InteractiveBondingCurve({ currentSupply, currentPrice }: { currentSupply: number; currentPrice: number }) {
  const [curveHoverProgress, setCurveHoverProgress] = useState<number | null>(null);
  const [isChartLoading, setIsChartLoading] = useState(true);
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

  // 联合曲线只显示"已铸造"区间（0 → 当前供应量）：
  // 未铸造的未来段不再绘制，曲线终点即当前 supply / 当前价。
  const maxDisplaySupply = Math.max(currentSupply, 1);
  const getPrice = (supply: number) => currentPrice * Math.pow(supply / currentSupply, 2);
  const maxDisplayPrice = getPrice(maxDisplaySupply);

  const actualRawX = currentSupply / maxDisplaySupply;
  const hoverRawX = curveHoverProgress !== null ? curveHoverProgress : actualRawX;
  const hoverSupply = Math.floor(hoverRawX * maxDisplaySupply);
  const hoverMintPrice = getPrice(hoverSupply);
  const isCurrent =
    Math.abs(hoverSupply - currentSupply) < Math.max(1, currentSupply * 0.05) && curveHoverProgress === null;

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
  /** 价格标签：小数值保留足够精度（当前 KOL 测试 PASS mint 价极低时避免全显示 0） */
  const fmtPrice = (v: number) => (v >= 1 ? v.toFixed(0) : v >= 0.01 ? v.toFixed(2) : v.toFixed(6));
  /** 供应量标签：整数直接显示，小数保留 2 位 */
  const fmtSupply = (v: number) => (Number.isInteger(v) ? v.toLocaleString() : v.toFixed(2));

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
            <span>{fmtPrice(maxDisplayPrice)}</span>
            <span>{fmtPrice(maxDisplayPrice * 0.66)}</span>
            <span>{fmtPrice(maxDisplayPrice * 0.33)}</span>
            <span>0</span>
          </div>

          <div className="absolute bottom-2 left-10 right-4 flex justify-between text-white/30 text-[9px] font-mono pointer-events-none z-0">
            <span>0</span>
            <span>{fmtSupply(maxDisplaySupply * 0.33)}</span>
            <span>{fmtSupply(maxDisplaySupply * 0.66)}</span>
            <span>{fmtSupply(maxDisplaySupply)}</span>
          </div>

          <div
            className="absolute top-0 bottom-0 border-l border-white/10 pointer-events-none border-dashed z-0"
            style={{ left: `${actualX}%` }}
          >
            <div className="absolute top-2 right-0 translate-x-1/2 bg-[#161616] border border-white/10 text-white/40 text-[7px] font-bold px-1.5 py-0.5 rounded tracking-widest whitespace-nowrap">CURRENT SUPPLY</div>
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
                  <div className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${isCurrent ? 'bg-white/10 text-white' : 'bg-white/[0.06] text-white/60'}`}>
                    {isCurrent ? 'CURRENT' : 'PAST'}
                  </div>
                </div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-white/50 text-[9px] font-bold uppercase tracking-wider">Supply</span>
                  <span className="text-white font-mono text-[11px] font-bold">{hoverSupply.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/50 text-[9px] font-bold uppercase tracking-wider">Price</span>
                  <span className="text-[#3ec470] font-mono text-[11px] font-bold">{formatMon(BigInt(Math.round(hoverMintPrice*1e18)))} MON</span>
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

/**
 * 解析 KOL 的链上身份（纯链上，无 mock）。
 *
 * handle 路由仅支持 0x 钱包地址（链上 KOL 唯一身份）：
 *  → 钱包地址 + Registry.getKol(wallet) 读取真实 KOL 信息与 passContracts。
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
  const { success, info, error } = useToast();

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

  // ---- F5 Pull 模式：KOL 本人可见的待领取手续费 + 领取入口 ----
  // 手续费在 mint/burn 时记账到 pendingKolFees[kol]，不即时转账；本区块让 KOL
  // 在个人主页直接领取。仅当访问者即该 KOL（钱包一致）时展示，他人不可见。
  const isSelf = !!account && !!kolAddress && account.toLowerCase() === kolAddress.toLowerCase();
  const { data: pendingFeesRaw } = useReadContract({
    address: isSelf && passAddress ? passAddress : undefined,
    abi: kolPassAbi,
    functionName: 'pendingKolFees',
    args: [kolAddress ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: isSelf && passAddress !== undefined },
  });
  const pendingFees = pendingFeesRaw as bigint | undefined;
  const queryClient = useQueryClient();
  const handleClaimFees = async () => {
    if (!passAddress) return;
    info('Please confirm the claim in your wallet — signing in progress…');
    const res = await chainPass.claimKolFees({
      onSuccess: () => {
        queryClient.invalidateQueries();
        success('KOL fees claimed!');
      },
    });
    if (!res && chainPass.error) error(chainPass.error);
  };

  // 链上数据（wei → MON / 供应量整数）；undefined 时回退 mock 基线
  const chainSupply = chainPass.totalSupply !== undefined ? Number(chainPass.totalSupply) : undefined;
  const chainPrice =
    chainPass.curvePrice !== undefined ? Number(chainPass.curvePrice) / 1e18 : undefined;

  // 展示值：链上真实 curvePrice / totalSupply（无 mock 回退）
  const actualSupply = chainSupply ?? curveSupply;
  const actualMintPrice = chainPrice ?? curvePrice;


  /** 交易成功：用返回的新供应量 / 新价格刷新页面曲线状态（交易通知由弹窗 toast 处理） */
  const handleTradeSuccess = (result: MintBurnResultPayload) => {
    setCurveSupply(result.newSupply);
    setCurvePrice(result.newPrice);
  };

  // 展示用的 KOL 信息 — 全部来自链上 Registry.getKol（无 mock 回退）
  const hasChainHandle = chainKolInfo?.twitterHandle && chainKolInfo.twitterHandle.trim() !== '';
  const displayName = hasChainHandle
    ? chainKolInfo!.twitterHandle.replace(/^@/, '')
    : kolAddress
      ? shortenAddress(kolAddress)
      : '';
  const displayHandle = hasChainHandle
    ? chainKolInfo!.twitterHandle
    : kolAddress
      ? shortenAddress(kolAddress)
      : '';
  const displayFollowers =
    chainKolInfo?.registered && chainKolInfo.followers !== undefined && chainKolInfo.followers !== 0n
      ? Number(chainKolInfo.followers)
      : 0;
  const displayAvatarHandle = hasChainHandle ? chainKolInfo!.twitterHandle : (kolAddress ?? '');
  // 链上 KOL 页面：handle 为 0x 钱包地址且 Registry 已注册
  const isChainKol = !!kolAddress && !!chainKolInfo?.registered;
  // Pass TVL 近似 = 链上 totalSupply × 当前曲线价（展示用，非权威累计值）
  const passTvl = isChainKol ? actualSupply * actualMintPrice : undefined;

  // KOL 推特资料（bio + 头像）：优先本地持久化（X 授权时写入）；
  // 未授权过时 server 用 App-only API 按 handle 拉公开资料（GET /api/kol/meta?wallet=&handle=）。
  // 生产同域（nadbid.fun）；本地 dev 无 proxy 时 fetch 失败 → 降级展示链上摘要 + 默认头像。
  const [kolBio, setKolBio] = useState<string | undefined>(undefined);
  const [kolAvatar, setKolAvatar] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!kolAddress) {
      setKolBio(undefined);
      setKolAvatar(undefined);
      return;
    }
    let cancelled = false;
    const handle = chainKolInfo?.twitterHandle?.replace(/^@/, '') ?? '';
    fetch(`/api/kol/meta?wallet=${kolAddress}&handle=${encodeURIComponent(handle)}`)
      .then((r) => r.json())
      .then((d: { found?: boolean; bio?: string; avatar?: string }) => {
        if (cancelled) return;
        setKolBio(d?.found && typeof d.bio === 'string' ? d.bio : undefined);
        setKolAvatar(d?.found && typeof d.avatar === 'string' ? d.avatar : undefined);
      })
      .catch(() => {
        if (!cancelled) {
          setKolBio(undefined);
          setKolAvatar(undefined);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [kolAddress, chainKolInfo?.twitterHandle]);
  const displayBio = kolBio && kolBio.trim() !== '' ? kolBio.trim() : undefined;
  /** X 头像（48px 默认 → 400px），加载失败时回退默认头像组件 */
  const [avatarFailed, setAvatarFailed] = useState(false);
  useEffect(() => {
    setAvatarFailed(false);
  }, [kolAvatar]);
  const displayAvatar = !avatarFailed && kolAvatar ? kolAvatar.replace(/_normal(\.\w+)$/, '_400x400$1') : undefined;

  if (!kolAddress) {
    return (
      <div className="min-h-screen bg-transparent pt-32 pb-24">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <div className="text-6xl mb-6">👤</div>
          <h1 className="text-3xl font-black text-white mb-4">KOL Not Found</h1>
          <p className="text-white/40 mb-8">Chain KOL profiles use the KOL's wallet address as the route (e.g. /kols/0x…).</p>
          <div className="flex gap-3 justify-center">
            <Link to="/">
              <Button>Back to Home</Button>
            </Link>
            <Link to="/auctions">
              <Button variant="secondary">Browse Auctions</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={displayName}
                  onError={() => setAvatarFailed(true)}
                  className="w-24 h-24 rounded-full object-cover border-2 border-[#161616] relative z-10 bg-[#0a0a0a] shadow-xl"
                />
              ) : (
                <KolAvatar handle={displayAvatarHandle} size="xl" name={displayName} className="w-24 h-24 rounded-full object-cover border-2 border-[#161616] relative z-10 bg-[#0a0a0a] shadow-xl" />
              )}
            </motion.div>
            <h1 className="text-2xl font-black tracking-tight mb-1">{displayName}</h1>
            <div className="text-white/40 text-sm font-mono mb-6">{displayHandle}</div>
            <button
              onClick={() => {
                if (hasChainHandle) window.open(`https://x.com/${chainKolInfo!.twitterHandle.replace(/^@/, '')}`, '_blank');
                else info('No X handle on-chain yet');
              }}
              className="w-full bg-[#3ec470] text-black font-bold text-[11px] uppercase tracking-[0.15em] py-3 rounded hover:bg-[#4ade80] transition-all"
            >
              Follow on X
            </button>
          </div>

          {/* Overview */}
          <div className="lg:col-span-9 bg-[#161616] border border-white/[0.04] rounded-lg p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-[13px] font-bold uppercase tracking-[0.1em] mb-4">Overview</h2>
              {displayBio ? (
                <p className="text-white/60 text-[13px] leading-relaxed max-w-3xl">{displayBio}</p>
              ) : (
                <p className="text-white/60 text-[13px] leading-relaxed max-w-3xl">
                  Verified on-chain KOL
                  {displayName ? ` — @${displayName}` : ''} runs penny auctions on nadbid.fun: bid a fixed
                  amount, each bid resets the 40s countdown, and the last bidder when time runs out wins the
                  auction. Hold a PASS to place bids.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
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
                    ? `${Math.round(passTvl).toLocaleString(undefined, { maximumFractionDigits: 0 })} MON`
                    : '-- MON'}
                </div>
              </div>
              <div className="bg-[#0f0f0f] border border-white/[0.04] rounded p-3">
                <div className="text-white/40 text-[9px] font-bold uppercase tracking-[0.15em] mb-1.5">Auctions</div>
                <div className="font-mono text-sm font-bold text-[#3ec470]">
                  {chainKolInfo?.auctionContracts?.length ?? 0}
                </div>
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
                  <span className="font-mono text-xs font-bold text-white">{formatMon(BigInt(Math.round(actualMintPrice*1e18)))} <span className="text-white/40">MON</span></span>
                </div>
              </div>
              <div className="bg-[#0f0f0f] border border-white/[0.04] rounded px-3 py-2 flex items-center gap-2">
                <span className="text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">Supply:</span>
                <span className="font-mono text-xs font-bold text-white">{actualSupply.toLocaleString()}</span>
              </div>
            </div>

            <InteractiveBondingCurve currentSupply={actualSupply} currentPrice={actualMintPrice} />

            <div className="mt-4 pt-4 border-t border-white/[0.04] flex justify-between items-center">
              <div className="text-white/40 text-[9px] font-bold uppercase tracking-[0.1em] flex items-center gap-2">
                <span>Contract</span>
                <span className="font-mono text-white/70 tracking-widest hidden sm:inline">
                  {passAddress ?? 'N/A'}
                </span>
              </div>
              <button
                onClick={() => {
                  if (passAddress) {
                    navigator.clipboard.writeText(passAddress);
                    success('Address copied');
                  }
                }}
                className="text-white/40 hover:text-white transition-colors disabled:opacity-30"
                disabled={!passAddress}
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

            {/* F5 Pull 模式：KOL 本人领取累计手续费（mint/burn 记账，不即时转账） */}
            {isSelf && passAddress && (
              <div className="mt-3 bg-[#161616] border border-white/[0.04] rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[13px] font-bold uppercase tracking-[0.1em] text-white">
                    Claim KOL Fees
                  </h3>
                  <span className="text-[8px] font-bold uppercase tracking-wider text-white/30 bg-white/[0.04] border border-white/[0.04] px-1.5 py-0.5 rounded">
                    Pull Mode
                  </span>
                </div>
                <p className="text-white/40 text-xs mb-4 leading-relaxed">
                  Fees earned from PASS mint/burn are held on the contract — claim them anytime.
                </p>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-white/40 text-[9px] font-bold uppercase tracking-[0.15em] mb-1">
                      Available
                    </div>
                    <div className="font-mono text-lg font-bold text-[#3ec470]">
                      {pendingFees !== undefined
                        ? `${(Number(pendingFees) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 4 })} MON`
                        : '…'}
                    </div>
                  </div>
                  <Button
                    onClick={handleClaimFees}
                    disabled={pendingFees === undefined || pendingFees === 0n || chainPass.isLoading}
                    loading={chainPass.isLoading}
                  >
                    Claim
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Dividend Pool — 未上链，占位 */}
          <div className="lg:col-span-6 bg-[#161616] border border-white/[0.04] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-[13px] font-bold uppercase tracking-[0.1em]">Dividend Pool</h3>
              <span className="text-[8px] font-bold uppercase tracking-wider text-white/30 bg-white/[0.04] border border-white/[0.04] px-1.5 py-0.5 rounded">Coming Soon</span>
              <Info className="w-3.5 h-3.5 text-white/30" />
            </div>
            <p className="text-white/50 text-[12px] mb-6">20% of auction revenue is distributed to PASS holders. On-chain distribution is not yet live.</p>
            <div className="bg-[#0f0f0f] border border-white/[0.04] rounded p-5 text-center">
              <p className="text-white/30 text-[11px] font-mono">Awaiting on-chain distribution contract</p>
            </div>
          </div>

          {/* Staking — 未上链，占位 */}
          <div className="lg:col-span-6 bg-[#161616] border border-white/[0.04] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <KolAvatar handle={displayAvatarHandle} size="sm" name={displayName} className="w-4 h-4 rounded-full" />
              </div>
              <h3 className="text-[13px] font-bold uppercase tracking-[0.1em]">Staking</h3>
              <span className="text-[8px] font-bold uppercase tracking-wider text-white/30 bg-white/[0.04] border border-white/[0.04] px-1.5 py-0.5 rounded">Coming Soon</span>
              <Info className="w-3.5 h-3.5 text-white/30 ml-1" />
            </div>
            <p className="text-white/50 text-[12px] mb-6">Stake PASS to earn a share of auction revenue. Staking contract is not yet live.</p>
            <div className="bg-[#0f0f0f] border border-white/[0.04] rounded p-5 text-center">
              <p className="text-white/30 text-[11px] font-mono">Awaiting on-chain staking contract</p>
            </div>
          </div>

          {/* Historical Auctions — 链上数据接入中，占位 */}
          <div className="lg:col-span-12 bg-[#161616] border border-white/[0.04] rounded-lg p-6">
            <h3 className="text-[13px] font-bold uppercase tracking-[0.1em] mb-6">
              Historical Auctions
              <span className="ml-2 text-[8px] font-bold uppercase tracking-wider text-white/30 bg-white/[0.04] border border-white/[0.04] px-1.5 py-0.5 rounded align-middle">Coming Soon</span>
            </h3>
            <div className="bg-[#0f0f0f] border border-white/[0.04] rounded p-8 text-center">
              <p className="text-white/30 text-[12px] font-mono">
                {isChainKol
                  ? `${chainKolInfo?.auctionContracts?.length ?? 0} auction(s) on-chain. Full history list coming soon.`
                  : 'No on-chain history yet.'}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
