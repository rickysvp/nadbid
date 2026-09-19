import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Gavel, Plus, TrendingUp, Trophy, BarChart3, Users } from 'lucide-react';
import { ROUTES, nadbidDetailPath } from '../config/routes';
import { useAuctionList, fmtMon, STATUS_LABEL, ASSET_LABEL, AuctionStatus } from '../web3/hooks/useNadbidAuction';
import { shortenAddress } from '../utils/format';
import { cn } from '../utils/cn';
import { CircularProgress } from '../components/ui/CircularProgress';
import { AssetThumb } from '../components/ui/AssetThumb';
import { useAssetMeta } from '../web3/hooks/useAssetMeta';

const DURATION_SECONDS = 120;
const WARNING_SECONDS = 15;

/**
 * 首页 — ICE TERMINAL 风格
 * 首屏就是正在进行的拍卖，拍卖本身是唯一主角
 */
export default function HomePage() {
  const { list } = useAuctionList();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const featured = useMemo(() => {
    if (!list || list.length === 0) return undefined;
    const sorted = [...list].sort((a, b) => Number(b.id) - Number(a.id));
    return sorted.find((a) => a.status === AuctionStatus.LIVE) ?? sorted[0];
  }, [list]);

  const recent = useMemo(() => {
    if (!list) return undefined;
    return [...list].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 6);
  }, [list]);

  const liveCount = useMemo(() => (list ? list.filter((a) => a.status === AuctionStatus.LIVE).length : 0), [list]);

  return (
    <div className="text-white">
      {/* ============ 首屏：拍卖大卡（M1: 一个主角占画面 ≥50%） ============ */}
      <section className="relative min-h-[calc(100vh-80px)] flex items-center">
        {/* 背景微光 — 冰青色径向光晕 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-[#9333ea]/[0.04] blur-[120px]" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 md:px-10 py-12">
          {/* 顶部状态行 */}
          <div className="flex items-center justify-between mb-6 animate-fade-in-up">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#a855f7] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#a855f7]" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c4b5fd]">
                {liveCount > 0 ? `${liveCount} LIVE` : 'NO ACTIVE AUCTIONS'}
              </span>
            </div>
            <span className="font-mono text-[11px] text-white/25">
              {list?.length ?? 0} total · Monad
            </span>
          </div>

          {/* 主推拍卖大卡 */}
          {featured ? (
            <FeaturedAuctionHero auction={featured} nowMs={nowMs} />
          ) : (
            <EmptyStateHero />
          )}
        </div>
      </section>

      {/* ============ 盈利计算器 ============ */}
      <section className="mx-auto max-w-7xl px-6 md:px-10 pb-20">
        <ProfitCalculator />
      </section>

      {/* ============ 如何工作 ============ */}
      <section className="mx-auto max-w-7xl px-6 md:px-10 pb-24">
        <HowItWorks />
      </section>

      {/* ============ 最近拍卖 ============ */}
      {recent && recent.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 md:px-10 pb-24">
          <RecentAuctionsGrid list={recent} />
        </section>
      )}
    </div>
  );
}

/* ============ 主推拍卖 HERO ============ */
function FeaturedAuctionHero({
  auction: a,
  nowMs,
}: {
  auction: NonNullable<ReturnType<typeof useAuctionList>['list']>[number];
  nowMs: number;
}) {
  const price = a.lastPrice > 0n ? a.lastPrice : a.startPrice;
  const isLive = a.status === AuctionStatus.LIVE;
  const ended = isLive && nowMs >= Number(a.deadline) * 1000;
  const secsLeft = isLive ? Math.max(0, Math.ceil((Number(a.deadline) * 1000 - nowMs) / 1000)) : 0;
  const progress = isLive ? Math.min(100, Math.max(0, (secsLeft / DURATION_SECONDS) * 100)) : 0;
  const danger = isLive && !ended && secsLeft <= WARNING_SECONDS;
  const st = STATUS_LABEL[a.status] ?? { text: 'Unknown', tone: 'gray' };
  const assetMeta = useAssetMeta(a.assetType, a.assetAddr, a.assetType === 1 ? a.assetTokenId : undefined);

  return (
    <div className="nb-card overflow-hidden animate-fade-in-up delay-100">
      <div className="grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* 左：拍品图（M6: 真实影像，视觉主角之一） */}
        <div className="relative p-5 md:p-6 bg-black/30">
          <AssetThumb
            assetType={a.assetType}
            assetAddr={a.assetAddr}
            tokenId={a.assetType === 1 ? a.assetTokenId : undefined}
            variant="hero"
            className="aspect-square w-full h-auto rounded-lg"
          />
          {/* 状态标签 — 浮在拍品图上 */}
          <div className="absolute top-8 left-8">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-semibold backdrop-blur-md uppercase tracking-wider",
                isLive
                  ? ended
                    ? "bg-[#f97316]/20 text-[#fb923c] border border-[#f97316]/30"
                    : "bg-[#9333ea]/20 text-[#a855f7] border border-[#9333ea]/30"
                  : "bg-white/10 text-white/50 border border-white/10",
              )}
            >
              {isLive ? (
                <>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
                  </span>
                  {ended ? 'Ending' : 'Live'}
                </>
              ) : (
                st.text
              )}
            </span>
          </div>
        </div>

        {/* 右：拍卖信息 */}
        <div className="p-6 md:p-8 flex flex-col">
          {/* 元信息行 */}
          <div className="flex items-center gap-2 mb-4">
            <span className="nb-chip text-[10px]">{ASSET_LABEL[a.assetType] ?? 'Asset'}</span>
            <span className="font-mono text-[10px] text-white/25">#{a.id.toString()}</span>
          </div>

          {/* 拍品名称 */}
          <h1 className="text-2xl md:text-3xl font-bold text-white font-display leading-tight mb-3">
            {assetMeta.data?.name ?? (assetMeta.isLoading ? 'Loading…' : 'Unnamed asset')}
            {a.assetType === 1 && <span className="text-[#9333ea]"> #{a.assetTokenId.toString()}</span>}
          </h1>

          {/* 卖家 + 保留价 */}
          <div className="flex items-center gap-2 text-xs text-white/35 mb-8">
            <span>Seller</span>
            <span className="font-mono text-white/55">{shortenAddress(a.seller)}</span>
            {a.reservePrice > 0n && (
              <>
                <span className="text-white/15">·</span>
                <span className="text-[#f97316]">Reserve {fmtMon(a.reservePrice)}</span>
              </>
            )}
          </div>

          {/* 价格数据区（M4: 卡片尺寸不等，主数字最大） */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {/* 当前出价 — 最大最醒目 */}
            <div className="rounded-lg bg-white/[0.025] border border-white/[0.06] p-4">
              <div className="text-[9px] font-medium uppercase tracking-[0.1em] text-white/35 mb-1.5">Current Bid</div>
              <div className="font-mono text-2xl md:text-3xl font-bold text-[#9333ea] leading-none">
                {fmtMon(price)}
              </div>
              <div className="text-[9px] text-white/25 mt-1.5">MON</div>
            </div>
            {/* 资金池 */}
            <div className="rounded-lg bg-white/[0.025] border border-white/[0.06] p-4">
              <div className="text-[9px] font-medium uppercase tracking-[0.1em] text-white/35 mb-1.5">Pool</div>
              <div className="font-mono text-2xl md:text-3xl font-bold text-[#ccff00] leading-none">
                {fmtMon(a.totalPool)}
              </div>
              <div className="text-[9px] text-white/25 mt-1.5">MON retained</div>
            </div>
            {/* 下一出价 */}
            <div className="rounded-lg bg-white/[0.025] border border-white/[0.06] p-4">
              <div className="text-[9px] font-medium uppercase tracking-[0.1em] text-white/35 mb-1.5">Next Bid</div>
              <div className="font-mono text-2xl md:text-3xl font-bold text-[#9333ea] leading-none">
                {fmtMon(a.lastPrice > 0n ? a.lastPrice + (a.lastPrice * a.incrementBps) / 10000n : a.startPrice)}
              </div>
              <div className="text-[9px] text-white/25 mt-1.5">+{Number(a.incrementBps) / 100}%</div>
            </div>
          </div>

          {/* 倒计时 + CTA */}
          <div className="mt-auto flex items-center gap-5">
            {isLive ? (
              <CircularProgress
                progress={ended ? 0 : progress}
                size={76}
                strokeWidth={5}
                label={ended ? '0' : `${secsLeft}`}
                sublabel={ended ? 'Ended' : danger ? 'FINAL' : 'sec'}
                danger={danger}
              />
            ) : (
              <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-center">
                <div>
                  <div className="font-mono text-xs font-bold leading-none">{st.text}</div>
                  <div className="mt-1 text-[8px] font-medium uppercase tracking-wider text-white/30">status</div>
                </div>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className={cn('text-xs leading-relaxed', danger ? 'text-[#fb923c]' : 'text-white/40')}>
                {isLive
                  ? ended
                    ? 'Timer ran out — finalize to settle.'
                    : danger
                      ? 'LAST 15 SECONDS! Bid to reset clock.'
                      : 'Every bid resets to 120s.'
                  : a.winner !== '0x0000000000000000000000000000000000000000'
                    ? `Won at ${fmtMon(a.finalPrice)} MON`
                    : 'Auction closed without winner.'}
              </div>
            </div>

            <Link
              to={nadbidDetailPath(a.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-6 py-3.5 text-sm font-bold transition-all flex-shrink-0',
                'bg-[#9333ea] text-white hover:bg-[#a855f7] hover:shadow-[0_0_32px_rgba(147,51,234,0.4)]',
                danger && 'animate-pulse',
              )}
            >
              {isLive && !ended ? 'Place Bid' : 'View Auction'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ 空态 HERO ============ */
function EmptyStateHero() {
  return (
    <div className="nb-card flex flex-col items-center justify-center py-20 text-center animate-fade-in-up delay-100">
      <div className="w-14 h-14 rounded-xl bg-[#9333ea]/10 flex items-center justify-center mb-5">
        <Gavel className="h-7 w-7 text-[#9333ea]" />
      </div>
      <h2 className="text-xl font-bold text-white font-display mb-2">No active auctions</h2>
      <p className="max-w-md text-sm text-white/40 leading-relaxed">
        Nothing on the block right now. List the first asset — any ERC-20, ERC-721 or ERC-1155 on Monad testnet.
      </p>
      <Link
        to={ROUTES.NADBID_CREATE}
        className="mt-6 inline-flex items-center gap-2 rounded-lg px-6 py-3 font-bold bg-[#9333ea] text-white hover:bg-[#a855f7] hover:shadow-[0_0_24px_rgba(147,51,234,0.3)]"
      >
        <Plus className="h-4 w-4" />
        List first auction
      </Link>
    </div>
  );
}

/* ============ 盈利计算器 ============ */
function ProfitCalculator() {
  const [bidAmount, setBidAmount] = useState(50);

  const rewardPool = bidAmount * 0.15;
  const sellerShare = bidAmount * 0.85;
  const platformFee = bidAmount * 0.01;
  const nextBid = bidAmount * 1.01;

  return (
    <div className="nb-card p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-[#9333ea]/10 flex items-center justify-center">
          <BarChart3 className="h-4 w-4 text-[#9333ea]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white font-display">Profit Calculator</h2>
          <p className="text-xs text-white/35 mt-0.5">See what happens when you bid</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 左侧：滑块 */}
        <div>
          <label className="text-[10px] font-medium uppercase tracking-[0.1em] text-white/35 mb-3 block">
            Your bid amount
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={10}
              max={500}
              value={bidAmount}
              onChange={(e) => setBidAmount(Number(e.target.value))}
              className="flex-1 cursor-pointer"
            />
            <div className="w-24 text-right">
              <span className="font-mono text-xl font-bold text-[#9333ea]">{bidAmount}</span>
              <span className="text-xs text-white/35 ml-1">MON</span>
            </div>
          </div>

          <div className="mt-5 p-3.5 rounded-lg bg-white/[0.025] border border-white/[0.06]">
            <div className="text-[10px] text-white/35 mb-1.5">Next bid required</div>
            <div className="font-mono text-base font-semibold text-white">
              {nextBid.toFixed(1)} <span className="text-white/30 text-xs">MON</span>
            </div>
            <div className="text-[10px] text-white/25 mt-0.5">+1% increment</div>
          </div>
        </div>

        {/* 右侧：分配明细 */}
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-white/35 mb-3">
            Where your bid goes
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.025] border border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md bg-[#9333ea]/10 flex items-center justify-center">
                  <Trophy className="h-3.5 w-3.5 text-[#9333ea]" />
                </div>
                <span className="text-sm text-white/60">Seller share</span>
              </div>
              <span className="font-mono font-semibold text-[#9333ea]">{sellerShare.toFixed(1)} MON</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.025] border border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md bg-[#ccff00]/10 flex items-center justify-center">
                  <Users className="h-3.5 w-3.5 text-[#ccff00]" />
                </div>
                <span className="text-sm text-white/60">Previous bidders</span>
              </div>
              <span className="font-mono font-semibold text-[#ccff00]">{rewardPool.toFixed(1)} MON</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.025] border border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md bg-white/[0.06] flex items-center justify-center">
                  <TrendingUp className="h-3.5 w-3.5 text-white/40" />
                </div>
                <span className="text-sm text-white/60">Platform fee</span>
              </div>
              <span className="font-mono font-semibold text-white/40">{platformFee.toFixed(1)} MON</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ 如何工作 ============ */
function HowItWorks() {
  const steps = [
    {
      num: '01',
      icon: <Gavel className="h-4 w-4 text-[#9333ea]" />,
      title: 'Place a bid',
      desc: 'Bid MON at the next price level. Your bid is retained on-chain — no refunds.',
    },
    {
      num: '02',
      icon: <TrendingUp className="h-4 w-4 text-[#ccff00]" />,
      title: 'Get dividends',
      desc: 'Outbid? Still earn 15% of every new bid. Your stake keeps paying as the auction grows.',
    },
    {
      num: '03',
      icon: <Trophy className="h-4 w-4 text-[#ccff00]" />,
      title: 'Last bid wins',
      desc: '120s clock ends. Final bidder wins the asset. Seller takes 85% of the total pool.',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white font-display">How it works</h2>
        <p className="mt-1.5 text-sm text-white/35">Three simple steps. One wild ride.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {steps.map((step, i) => (
          <div
            key={step.num}
            className="nb-card-hover relative p-5 rounded-lg"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center">
                {step.icon}
              </div>
              <span className="font-mono text-3xl font-bold text-white/[0.06]">{step.num}</span>
            </div>
            <h3 className="text-base font-bold text-white font-display">{step.title}</h3>
            <p className="mt-1.5 text-xs text-white/45 leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ 最近拍卖网格 ============ */
function RecentAuctionsGrid({
  list,
}: {
  list: NonNullable<ReturnType<typeof useAuctionList>['list']>;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-white font-display">Recent auctions</h2>
        <Link to={ROUTES.NADBID} className="group inline-flex items-center gap-1 text-xs text-[#9333ea] hover:text-[#a855f7]">
          View all <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map((a) => {
          const st = STATUS_LABEL[a.status] ?? { text: 'Unknown', tone: 'gray' };
          const price = a.lastPrice > 0n ? a.lastPrice : a.startPrice;
          return (
            <Link
              key={a.id.toString()}
              to={nadbidDetailPath(a.id)}
              className="nb-card-hover p-4 rounded-lg group"
            >
              <div className="flex items-center justify-between mb-2.5">
                <span className="font-mono text-[10px] text-white/25">#{a.id.toString()}</span>
                <span
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-[9px] font-medium',
                    a.status === AuctionStatus.LIVE
                      ? 'border-[#9333ea]/30 bg-[#9333ea]/10 text-[#a855f7]'
                      : a.status === AuctionStatus.SETTLED
                        ? 'border-[#ccff00]/30 bg-[#ccff00]/10 text-[#d9ff33]'
                        : 'border-white/10 bg-white/5 text-white/35',
                  )}
                >
                  {st.text}
                </span>
              </div>

              <div className="font-mono text-xl font-bold text-white">
                {fmtMon(price)} <span className="text-xs text-white/25">MON</span>
              </div>

              <div className="mt-1.5 flex items-center justify-between text-[11px] text-white/35">
                <span className="truncate">{ASSET_LABEL[a.assetType] ?? 'Asset'}</span>
                <span className="font-mono">{fmtMon(a.totalPool)} pool</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
