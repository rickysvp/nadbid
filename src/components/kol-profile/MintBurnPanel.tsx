import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CircleDot,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Flame,
  BookOpen,
  Lock,
  X,
} from 'lucide-react';
import { useKolHolding, useWalletStore, useUiStore, useKolHoldingsStore, selectActiveStakedQty, selectFreeQty } from '@/stores';
import { BONDING_CURVE, NFT_FEE_RATES } from '@/constants/app';
import type { KolProfile } from '@/types';
import {
  buildCurvePreview,
  calcBurnFeeSplit,
  calcBurnTotalReturn,
  calcCurrentNftPrice,
  calcMintFeeSplit,
  calcMintTotalCost,
  cn,
  formatTokenAmount,
  roundMon,
} from '@/utils';

interface MintBurnPanelProps {
  profile: KolProfile;
  onTrade?: (kind: 'mint' | 'burn', quantity: number, amountMon: number) => void;
}

/** 规则弹窗：MINT / BURN 铸造销毁说明，点击遮罩 / ESC / 右上角关闭。 */
function RulesModal({
  handle,
  onClose,
}: {
  handle: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Trading rules"
    >
      <button
        type="button"
        aria-label="Close rules"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-2xl max-h-[86vh] overflow-y-auto rounded-2xl border-3 border-black bg-white shadow-neo-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b-2 border-black bg-[#FFF8E7] px-5 md:px-6 py-4">
          <div className="flex items-center gap-2 font-mono text-xs uppercase font-black tracking-wider text-black">
            <BookOpen className="w-4 h-4 text-tertiary" strokeWidth={2.4} /> Rules · @{handle}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-white text-black shadow-neo-sm transition-transform hover:scale-[1.05]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 p-5 md:gap-4 md:p-6 sm:grid-cols-2">
          <div className="rounded-2xl border-2 border-black bg-white p-4 shadow-neo-sm">
            <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase font-black text-black">
              <Sparkles className="w-4 h-4 text-secondary" /> ① 铸造 Mint
            </div>
            <p className="font-body text-[13px] leading-snug text-black/80">
              曲线起步 <strong>100 $MON</strong>，每铸 1 枚递增。扣 <strong>8%</strong>（5% 给
              KOL，3% 给金库）。铸 1 枚 = 1 竞拍权 + 1 分红权。
            </p>
          </div>
          <div className="rounded-2xl border-2 border-black bg-white p-4 shadow-neo-sm">
            <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase font-black text-black">
              <Flame className="w-4 h-4 text-error" /> ② 销毁 Burn
            </div>
            <p className="font-body text-[13px] leading-snug text-black/80">
              只处理 <strong>FREE_HOLD</strong> 状态。质押中需先到 <strong>Staking</strong> 解押（24h
              冷）。按曲线回 $MON，同样扣 8%。
            </p>
          </div>
        </div>

        <div className="border-t-2 border-black/10 px-5 py-4 md:px-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border-2 border-black bg-black px-5 py-3 font-mono text-xs uppercase font-black tracking-wider text-white shadow-neo-md transition-transform hover:scale-[1.01] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function MintBurnPanel({ profile, onTrade }: MintBurnPanelProps) {
  const { handle, curveParams } = profile;
  const pushToast = useUiStore((s) => s.pushToast);
  const wallet = useWalletStore();
  const seedHoldings = useKolHoldingsStore((s) => s.seed);
  const mintThen = useKolHoldingsStore((s) => s.mint);
  const burnThen = useKolHoldingsStore((s) => s.burn);
  // 以 profile.market 为基线合并动态持仓；保留 change24hPercent 等静态字段。
  const holding = useKolHolding(handle, profile.market);
  // 用户 mint/burn 的曲线偏移（supplyDelta / treasuryDeltaMon）。
  const curveDelta = useKolHoldingsStore((s) => s.curveDeltas[handle]);

  // 首次挂载时以 profile.market 基线 seed 该 KOL 持仓。
  useEffect(() => {
    seedHoldings(handle, {
      userNftBalance: profile.market.userNftBalance,
      stakedNfts: profile.market.stakedNfts,
      dividendsClaimedMon: profile.market.dividendsClaimedMon,
      dividendsPendingMon: profile.market.dividendsPendingMon,
    });
  }, [handle, profile.market, seedHoldings]);

  const [mintQty, setMintQty] = useState(1);
  const [burnQty, setBurnQty] = useState(0);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showFeeSplitMint, setShowFeeSplitMint] = useState(false);
  const [showFeeSplitBurn, setShowFeeSplitBurn] = useState(false);

  /* ---------- 派生计算（全部来自 utils 算法与 constants 配置，零硬编码） ---------- */

  /** 有效供应量 = mock 基线 + 用户 mint/burn 净偏移；所有计价/图表统一用它。 */
  const effectiveSupply = Math.max(
    1,
    profile.market.totalSupplyNfts + (curveDelta?.supplyDelta ?? 0),
  );

  /** 当前价与曲线图随供应量实时联动。 */
  const currentPriceNumber = calcCurrentNftPrice(effectiveSupply, curveParams);
  const curve = useMemo(
    () => buildCurvePreview(effectiveSupply, BONDING_CURVE.PREVIEW_POINT_COUNT, curveParams),
    [effectiveSupply, curveParams],
  );

  const market = useMemo(
    () => ({
      ...profile.market,
      ...holding,
      currentPrice: formatTokenAmount(currentPriceNumber),
      totalSupplyNfts: effectiveSupply,
    }),
    [profile.market, holding, currentPriceNumber, effectiveSupply],
  );

  const isPositive = profile.market.change24hPercent >= 0;

  /** Mint 总成本（曲线求和 + 8% 手续费拆分）——按最新有效供应量计价。 */
  const mint = useMemo(
    () => calcMintFeeSplit(calcMintTotalCost(effectiveSupply, mintQty, curveParams)),
    [effectiveSupply, mintQty, curveParams],
  );

  /** Burn 总回收（曲线求和 - 8% 手续费拆分）。 */
  const burn = useMemo(
    () => calcBurnFeeSplit(calcBurnTotalReturn(effectiveSupply, burnQty, curveParams)),
    [effectiveSupply, burnQty, curveParams],
  );

  /** 余额内可精确 mint 的最大数量（逐枚累加含 8% 费用，非单价近似）。 */
  const maxMintQty = useMemo(() => {
    const balance = wallet.balanceMon || 0;
    let qty = 0;
    while (qty < 9_999) {
      const nextPay =
        calcMintTotalCost(effectiveSupply, qty + 1, curveParams) * (1 + NFT_FEE_RATES.TOTAL);
      if (roundMon(nextPay) > balance) break;
      qty += 1;
    }
    return qty;
  }, [wallet.balanceMon, effectiveSupply, curveParams]);

  const activeStaked = selectActiveStakedQty(holding);
  const liquidNfts = selectFreeQty(holding);
  const maxBurnQty = Math.max(0, liquidNfts);

  /* ---------- 提交函数 ---------- */

  const submitMintBurn = (kind: 'mint' | 'burn') => {
    const qty = kind === 'mint' ? mintQty : burnQty;

    if (!qty || qty <= 0) {
      pushToast({
        kind: 'warn',
        title: kind === 'mint' ? 'Choose how many NFT to mint' : 'Choose how many NFT to burn',
        description: `Pick at least 1 NFT (FREE_HOLD) to ${kind}.`,
        ttlMs: 2800,
      });
      return;
    }

    if (kind === 'mint' && mint.totalPayMon > (wallet.balanceMon || 0)) {
      pushToast({
        kind: 'error',
        title: 'Not enough $MON',
        description: `Need ${formatTokenAmount(mint.totalPayMon)} (incl. 8% fee), balance is ${formatTokenAmount(
          wallet.balanceMon,
        )} — deposit or reduce quantity.`,
        ttlMs: 3600,
      });
      return;
    }

    if (kind === 'burn' && qty > maxBurnQty) {
      pushToast({
        kind: 'error',
        title: `Only ${maxBurnQty} liquid NFT`,
        description: `You hold ${market.userNftBalance} total, ${activeStaked} STAKE_ACTIVE, ${liquidNfts} FREE_HOLD. Unstake in Staking to burn more.`,
        ttlMs: 3600,
      });
      return;
    }

    // TASK 3: 移除乐观余额扣减。余额由 WalletStateSyncer 从链上同步，
    // 交易确认后自动更新（TASK 6 将实现交易后主动刷新余额）。

    // 同步更新该 KOL 的动态持仓与曲线偏移（铸造 + / 销毁 −），供应量、价格、图表随之联动。
    if (kind === 'mint') mintThen(handle, qty, mint.treasuryShareMon);
    else burnThen(handle, qty, burn.treasuryShareMon);

    pushToast({
      kind: kind === 'mint' ? 'success' : 'info',
      title:
        kind === 'mint' ? `Minted ${qty} @${handle} NFT ✨` : `Burned ${qty} @${handle} NFT 🔥`,
      description:
        kind === 'mint'
          ? `−${formatTokenAmount(mint.totalPayMon)} (base ${formatTokenAmount(
              mint.baseCost,
            )} · fee 8% = KOL 5% ${formatTokenAmount(mint.kolShareMon)} + Treasury 3% ${formatTokenAmount(
              mint.treasuryShareMon,
            )})`
          : `+${formatTokenAmount(burn.netReceiveMon)} (gross ${formatTokenAmount(
              burn.grossReturn,
            )} · fee 8% = KOL 5% ${formatTokenAmount(burn.kolShareMon)} + Treasury 3% ${formatTokenAmount(
              burn.treasuryShareMon,
            )})`,
      ttlMs: 5000,
    });

    onTrade?.(kind, qty, kind === 'mint' ? -mint.totalPayMon : burn.netReceiveMon);

    if (kind === 'mint') setMintQty(1);
    else setBurnQty(0);
  };

  return (
    <section className="rounded-2xl border-3 border-black shadow-neo-xl bg-white overflow-hidden">
      {/* Header：左标题+次要元信息 · 右上角 RULES 弹窗入口 */}
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-6 md:px-8 py-5 md:py-6 border-b-2 border-black bg-surface-container-lowest">
        <div className="min-w-0">
          <h2 className="font-display font-black text-xl md:text-2xl uppercase tracking-tight text-black leading-tight">
            Bonding Curve · Mint / Burn
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] font-bold text-black/55">
            <span className="inline-flex items-center gap-1.5">
              <CircleDot className="w-3.5 h-3.5 text-primary animate-pulse" /> Live · supply #
              {effectiveSupply}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-primary" />
              {market.totalStakedNfts.toLocaleString()} staked ·{' '}
              {((market.totalStakedNfts / Math.max(1, effectiveSupply)) * 100).toFixed(1)}% of
              supply
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1',
                isPositive ? 'text-secondary' : 'text-error',
              )}
            >
              {isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              {isPositive ? '↑' : '↓'} {Math.abs(market.change24hPercent).toFixed(1)}% (24h)
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowRulesModal(true)}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-black bg-white px-4 py-2 font-mono text-[11px] md:text-xs uppercase font-black text-black shadow-neo-md btn-hover"
        >
          <BookOpen className="w-4 h-4 text-tertiary" strokeWidth={2.4} /> Rules
        </button>
      </header>

      {showRulesModal && <RulesModal handle={handle} onClose={() => setShowRulesModal(false)} />}

      {/* 质押唯一入口：汇总当前持仓，指引到 /staking */}
      <Link to="/staking" className="block px-5 md:px-7 pt-5 md:pt-6">
        <div className="w-full flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border-2 border-black bg-primary/10 text-black px-4 py-3 shadow-neo-sm transition-all hover:-translate-y-[1px] hover:shadow-neo-md hover:bg-primary/15">
          <div className="flex items-center gap-2.5 font-mono text-[11px] md:text-xs uppercase font-black tracking-wider">
            <Lock className="w-4 h-4 text-primary" /> Holdings ·{' '}
            {market.userNftBalance} total ·{' '}
            <span className="text-black">{activeStaked} staked</span> ·{' '}
            <span className="text-secondary">{liquidNfts} FREE_HOLD</span>
          </div>
          <span className="font-mono text-[11px] md:text-xs uppercase font-black text-black underline decoration-dotted underline-offset-4">
            Stake to earn weekly dividends →
          </span>
        </div>
      </Link>

      {/* Curve Chart */}
      <div className="px-5 md:px-7 pt-5 md:pt-6 pb-3 md:pb-4">
        <div className="relative rounded-2xl border-2 border-black bg-[#e8e6f6] overflow-hidden">
          <div className="absolute top-4 right-5 z-10 bg-black text-white font-mono font-black text-xs px-3 py-1.5 rounded-full shadow-neo-md">
            {market.currentPrice}
          </div>
          <div className="w-full h-44 md:h-52">
            <ResponsiveContainer>
              <AreaChart data={curve} margin={{ top: 20, right: 14, left: -24, bottom: 4 }}>
                <defs>
                  <linearGradient id="curveGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#C4B5FD" stopOpacity={0.18} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 4"
                  stroke="#5B21B6"
                  strokeOpacity={0.18}
                  vertical
                  horizontal
                />
                <XAxis
                  dataKey="t"
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fill: '#5B21B6',
                    fontSize: 11,
                    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                    fontWeight: 700,
                  }}
                  opacity={0.7}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fill: '#5B21B6',
                    fontSize: 11,
                    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                    fontWeight: 700,
                  }}
                  opacity={0.7}
                  domain={['dataMin - 20', 'dataMax + 20']}
                  width={46}
                />
                <Tooltip
                  contentStyle={{
                    border: '2px solid #000',
                    borderRadius: 12,
                    boxShadow: '4px 4px 0 0 #000',
                    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                    fontWeight: 700,
                    background: '#fff',
                  }}
                  formatter={(value) => [`${Number(value ?? 0).toFixed(2)} $MON`, 'NFT price']}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#6D28D9"
                  strokeWidth={3.5}
                  fill="url(#curveGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ------- MINT / BURN ------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-7 px-5 md:px-8 pb-8 pt-3 md:pt-4">
        {/* MINT */}
        <div className="rounded-2xl border-2 border-black shadow-neo-md p-4 md:p-5 bg-secondary/15">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-mono text-xs uppercase font-black text-black">
              <Sparkles className="w-4 h-4 text-secondary" /> Mint NFT
            </div>
            <div className="font-mono text-[11px] uppercase font-bold text-on-surface-variant">
              Bal:&nbsp;
              <span className="text-black">{formatTokenAmount(wallet.balanceMon)}</span>
            </div>
          </div>
          {/* Qty 行：居中输入 + 单位 */}
          <div className="rounded-xl border-2 border-black bg-white shadow-neo-sm overflow-hidden mb-3">
            <div className="flex items-stretch">
              <input
                type="number"
                min={0}
                max={maxMintQty || undefined}
                value={mintQty}
                onChange={(e) => {
                  const n = Math.floor(Number(e.target.value));
                  setMintQty(Number.isFinite(n) && n > 0 ? n : 0);
                }}
                className="flex-1 bg-transparent px-3 py-3 font-display font-black text-xl text-black text-center focus:outline-none placeholder:text-on-surface-variant/40"
                aria-label={`Mint quantity for ${handle}`}
              />
              <div className="px-4 flex items-center border-l-2 border-black bg-surface-container-lowest font-mono text-[11px] uppercase font-black text-on-surface-variant">
                NFT
              </div>
            </div>
          </div>

          {/* Estimate: 默认只显示 Bottom line，点击 Info badge 展开 4 行拆分 */}
          <div className="rounded-xl border-2 border-black bg-surface-container-lowest p-3.5 mb-3 space-y-2.5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] uppercase font-black text-black/60">
                  Est. total
                </span>
                <button
                  type="button"
                  onClick={() => setShowFeeSplitMint((v) => !v)}
                  title="8% fee = KOL 5% + Treasury 3%"
                  className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-black/40 underline decoration-dotted underline-offset-2 transition-colors hover:text-black/80"
                >
                  incl. 8% fee
                </button>
              </div>
              <div className="font-display font-black text-xl md:text-2xl text-black tabular-nums">
                {formatTokenAmount(mint.totalPayMon)}
              </div>
            </div>
            {showFeeSplitMint && (
              <div className="border-t-2 border-dashed border-black/30 pt-2.5 grid grid-cols-[1fr_auto] text-[11px] font-mono uppercase font-black gap-y-1">
                <div className="text-black/60">Curve base · {mintQty || 0} NFT</div>
                <div className="text-black text-right tabular-nums">
                  {formatTokenAmount(mint.baseCost)}
                </div>
                <div className="text-black/60">
                  KOL share · {Math.round(NFT_FEE_RATES.KOL * 100)}%
                </div>
                <div className="text-error text-right tabular-nums">
                  −{formatTokenAmount(mint.kolShareMon)}
                </div>
                <div className="text-black/60">
                  Treasury · {Math.round(NFT_FEE_RATES.TREASURY * 100)}%
                </div>
                <div className="text-monad text-right tabular-nums">
                  −{formatTokenAmount(mint.treasuryShareMon)}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => submitMintBurn('mint')}
            className="w-full btn-hover font-display font-black uppercase text-lg rounded-xl border-3 border-black shadow-neo-lg bg-secondary text-black py-3.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Mint {mintQty ? `· ${mintQty} NFT` : ''}
          </button>
        </div>

        {/* BURN */}
        <div className="rounded-2xl border-2 border-black shadow-neo-md p-4 md:p-5 bg-error/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-mono text-xs uppercase font-black text-black">
              <Flame className="w-4 h-4 text-error" /> Burn NFT
            </div>
            <div className="font-mono text-[11px] uppercase font-bold text-on-surface-variant">
              FREE_HOLD:&nbsp;<span className="text-black">{liquidNfts} NFT</span>
            </div>
          </div>
          <div className="rounded-xl border-2 border-black bg-white shadow-neo-sm overflow-hidden mb-3">
            <div className="flex items-stretch">
              <input
                type="number"
                min={0}
                max={maxBurnQty || undefined}
                value={burnQty}
                onChange={(e) => {
                  const n = Math.floor(Number(e.target.value));
                  setBurnQty(Number.isFinite(n) && n > 0 ? n : 0);
                }}
                className="flex-1 bg-transparent px-3 py-3 font-display font-black text-xl text-black text-center focus:outline-none placeholder:text-on-surface-variant/40"
                aria-label={`Burn quantity for ${handle}`}
              />
              <div className="px-4 flex items-center border-l-2 border-black bg-surface-container-lowest font-mono text-[11px] uppercase font-black text-on-surface-variant">
                NFT
              </div>
            </div>
          </div>

          {/* 默认 Bottom line；点击 Info badge 展开明细 */}
          <div className="rounded-xl border-2 border-black bg-surface-container-lowest p-3.5 mb-3 space-y-2.5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] uppercase font-black text-black/60">
                  Est. net
                </span>
                <button
                  type="button"
                  onClick={() => setShowFeeSplitBurn((v) => !v)}
                  title="8% fee = KOL 5% + Treasury 3%"
                  className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-black/40 underline decoration-dotted underline-offset-2 transition-colors hover:text-black/80"
                >
                  incl. 8% fee
                </button>
              </div>
              <div className="font-display font-black text-xl md:text-2xl text-secondary tabular-nums">
                +{formatTokenAmount(burn.netReceiveMon)}
              </div>
            </div>
            {showFeeSplitBurn && (
              <div className="border-t-2 border-dashed border-black/30 pt-2.5 grid grid-cols-[1fr_auto] text-[11px] font-mono uppercase font-black gap-y-1">
                <div className="text-black/60">Gross curve · {burnQty || 0} NFT</div>
                <div className="text-black text-right tabular-nums">
                  {formatTokenAmount(burn.grossReturn)}
                </div>
                <div className="text-black/60">
                  KOL share · {Math.round(NFT_FEE_RATES.KOL * 100)}%
                </div>
                <div className="text-error text-right tabular-nums">
                  −{formatTokenAmount(burn.kolShareMon)}
                </div>
                <div className="text-black/60">
                  Treasury · {Math.round(NFT_FEE_RATES.TREASURY * 100)}%
                </div>
                <div className="text-monad text-right tabular-nums">
                  −{formatTokenAmount(burn.treasuryShareMon)}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => submitMintBurn('burn')}
            className="w-full btn-hover font-display font-black uppercase text-lg rounded-xl border-3 border-black shadow-neo-lg bg-white text-black py-3.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Burn {burnQty ? `· ${burnQty} NFT` : ''}
          </button>
        </div>
      </div>
    </section>
  );
}