import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gavel, Plus, Clock, Users, ShieldCheck, Hourglass, History } from 'lucide-react';
import {
  useNadbidAuctionContract,
  useAuctionList,
  fmtUsdc,
  STATUS_LABEL,
  ASSET_LABEL,
  AuctionStatus,
  type AuctionListRow,
} from '../web3/hooks/useNadbidAuction';
import { shortenAddress } from '../utils/format';
import { AssetThumb } from '../components/ui/AssetThumb';
import { useAssetMeta } from '../web3/hooks/useAssetMeta';
import { cn } from '../utils/cn';
import { ROUTES, nadbidDetailPath } from '../config/routes';
import ProtocolAnalytics from '../components/analytics/ProtocolAnalytics';

/**
 * 拍卖列表页 — 按权重分区展示
 *   1. LIVE NOW  正在竞价（LIVE + 已有出价 + 未超时）—— 权重最高
 *   2. UPCOMING  即将开始（LIVE + 等待首出价）      —— 次之
 *   3. HISTORY   历史（已结束 / 已取消 / 超时待结算） —— 折叠式
 * 各区内部按紧急度 / 时间倒序。
 */
export default function NadbidAuctionsPage() {
  const { isReady } = useNadbidAuctionContract();
  const { count, list, isLoading } = useAuctionList();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const sorted = useMemo(() => {
    if (!list) return [];
    return [...list].sort((a, b) => Number(b.id) - Number(a.id));
  }, [list]);

  /** 分区：正在 / 即将 / 历史 */
  const groups = useMemo(() => {
    if (!sorted.length) return { liveNow: [], upcoming: [], history: [] };
    const ended = (a: AuctionListRow) =>
      a.status === AuctionStatus.LIVE && nowMs >= Number(a.deadline) * 1000;
    const liveNow = sorted
      .filter((a) => a.status === AuctionStatus.LIVE && !ended(a) && a.batchCount > 0n)
      .sort((a, b) => Number(a.deadline) - Number(b.deadline)); // 越紧急越靠前
    const upcoming = sorted
      .filter((a) => a.status === AuctionStatus.LIVE && !ended(a) && a.batchCount === 0n)
      .sort((a, b) => Number(a.deadline) - Number(b.deadline));
    const history = sorted.filter((a) => a.status !== AuctionStatus.LIVE || ended(a));
    return { liveNow, upcoming, history };
  }, [sorted, nowMs]);

  const stats = useMemo(() => {
    if (!list) return { total: 0, live: 0, pool: 0n };
    return {
      total: list.length,
      live: groups.liveNow.length,
      pool: list.reduce((acc, a) => acc + (a.totalPool > 0n ? a.totalPool : a.lastPrice), 0n),
    };
  }, [list, groups]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pt-28">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
            <Gavel className="h-8 w-8 text-[#117a3d]" />
            NADBID Auctions
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/50">
            Bid with USDC — retained bids are non-refundable, but every later bid pays dividends to earlier bidders.
            Last bid wins the asset.
          </p>
        </div>
        <Link
          to={ROUTES.NADBID_CREATE}
          className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl border-2 border-white/10 bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] px-6 py-3 text-sm font-bold text-white shadow-[4px_4px_0_#111] transition-all duration-200 hover:-translate-y-1 hover:shadow-[6px_6px_0_#111]"
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
          <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
          <span className="relative">Create Auction</span>
          <span className="absolute -top-2 -right-2 rounded-md border-2 border-white/10 bg-[#ffe94a] px-1.5 py-0.5 text-[10px] font-bold text-white ">
            NEW
          </span>
        </Link>
      </div>

      {!isReady ? (
        <div className="nb-card border border-white/10/15 bg-white/5 p-10 text-center">
          <p className="text-sm text-white/50">
            Contract not deployed yet. Set{' '}
            <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[#117a3d]">VITE_NADBID_AUCTION</code> in{' '}
            <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-white/70">.env</code> after deployment.
          </p>
        </div>
      ) : (
        <>
          <ProtocolAnalytics />

          <div className="mb-10 mt-4 grid grid-cols-3 gap-3 md:gap-4">
            <StatCard label="Total auctions" value={isLoading ? '…' : String(stats.total)} />
            <StatCard label="Live now" value={isLoading ? '…' : String(stats.live)} accent />
            <StatCard label="Pooled USDC" value={isLoading ? '…' : fmtUsdc(stats.pool)} />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-56 animate-pulse nb-card border border-white/10/15 bg-white/5" />
              ))}
            </div>
          ) : count === 0 ? (
            <div className="nb-card border border-white/10/15 bg-white/5 p-16 text-center">
              <Gavel className="mx-auto mb-4 h-10 w-10 text-white/15" />
              <p className="text-sm font-bold text-white/60">No auctions yet</p>
              <p className="mt-1 text-sm text-white/40">Be the first to list an asset on-chain.</p>
              <Link
                to={ROUTES.NADBID_CREATE}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#8b5cf6] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#a78bfa]"
              >
                <Plus className="h-4 w-4" />
                Create the first auction
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-14">
              {/* ===== 1. 正在竞价 ===== */}
              <section>
                <SectionTitle
                  icon={<span className="h-2.5 w-2.5 rounded-full bg-[#117a3d] animate-pulse" />}
                  title="Live now"
                  count={groups.liveNow.length}
                  desc="Bidding in progress — the clock resets on every bid."
                />
                {groups.liveNow.length === 0 ? (
                  <EmptyBlock text="No auctions are live right now." />
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {groups.liveNow.map((a) => (
                      <AuctionCard key={a.id.toString()} a={a} nowMs={nowMs} live />
                    ))}
                  </div>
                )}
              </section>

              {/* ===== 2. 即将开始 ===== */}
              <section>
                <SectionTitle
                  icon={<Hourglass className="h-4 w-4 text-[#b45309]" />}
                  title="Upcoming"
                  count={groups.upcoming.length}
                  desc="Listed on-chain, waiting for the first bid."
                />
                {groups.upcoming.length === 0 ? (
                  <EmptyBlock text="No upcoming auctions." />
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {groups.upcoming.map((a) => (
                      <AuctionCard key={a.id.toString()} a={a} nowMs={nowMs} upcoming />
                    ))}
                  </div>
                )}
              </section>

              {/* ===== 3. 历史 ===== */}
              <section>
                <SectionTitle
                  icon={<History className="h-4 w-4 text-white/40" />}
                  title="History"
                  count={groups.history.length}
                  desc="Settled, cancelled or timed-out auctions."
                />
                {groups.history.length === 0 ? (
                  <EmptyBlock text="No past auctions yet." />
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {groups.history.map((a) => (
                      <HistoryRow key={a.id.toString()} a={a} nowMs={nowMs} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 区块标题                                                            */
/* ------------------------------------------------------------------ */
function SectionTitle({
  icon,
  title,
  count,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  desc: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2.5">
        {icon}
        <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
        <span className="rounded-md border-2 border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs font-bold text-white">
          {count}
        </span>
      </div>
      <span className="text-xs text-white/40">{desc}</span>
    </div>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="nb-card border border-dashed border-white/10 bg-transparent p-8 text-center text-sm text-white/35">
      {text}
    </div>
  );
}

function StatCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="nb-card-flat p-4 md:p-5">
      <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 md:text-xs">{label}</div>
      <div
        className={cn(
          'mt-1.5 font-mono text-2xl md:text-3xl font-bold truncate',
          accent ? 'text-[#117a3d]' : 'text-white',
        )}
      >
        {value}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 正在 / 即将 — 卡片                                                  */
/* ------------------------------------------------------------------ */
function AuctionCard({ a, nowMs, live, upcoming }: { a: AuctionListRow; nowMs: number; live?: boolean; upcoming?: boolean }) {
  const st = STATUS_LABEL[a.status];
  const secsLeft = Number(a.deadline) * 1000 - nowMs > 0 ? Math.ceil((Number(a.deadline) * 1000 - nowMs) / 1000) : 0;
  const price = a.lastPrice > 0n ? a.lastPrice : a.startPrice;
  const assetMeta = useAssetMeta(a.assetType, a.assetAddr, a.assetType === 1 ? a.assetTokenId : undefined);

  return (
    <Link
      to={nadbidDetailPath(a.id)}
      className={cn(
        'group relative overflow-hidden nb-card p-5 transition hover:-translate-y-1 hover:shadow-[6px_6px_0_#111]',
        live && 'border-2 border-[#117a3d]',
        upcoming && 'border border-dashed border-[#b45309]/50',
      )}
    >
      {/* 顶部：编号 + 状态徽章 */}
      <div className="mb-4 flex items-start justify-between gap-2">
        <span className="font-mono text-xs font-bold text-white/35">#{a.id.toString()}</span>
        {live && (
          <span className="flex items-center gap-1.5 rounded-md border-2 border-[#117a3d] bg-[#117a3d]/10 px-2 py-0.5 text-[11px] font-bold text-[#117a3d]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#117a3d] animate-pulse" />
            Live
          </span>
        )}
        {upcoming && (
          <span className="rounded-md border-2 border-[#b45309] bg-[#b45309]/10 px-2 py-0.5 text-[11px] font-bold text-[#b45309]">
            Starting
          </span>
        )}
        {!live && !upcoming && (
          <span
            className={cn(
              'rounded-md border-2 px-2 py-0.5 text-[11px] font-bold shrink-0',
              st.tone === 'gray'
                ? 'border-white/15 bg-white/5 text-white/50'
                : 'border-[#3ec4f0] bg-[#3ec4f0]/10 text-[#0e7490]',
            )}
          >
            {st.text}
          </span>
        )}
      </div>

      {/* 左图右文 */}
      <div className="flex gap-4">
        <AssetThumb
          assetType={a.assetType}
          assetAddr={a.assetAddr}
          tokenId={a.assetType === 1 ? a.assetTokenId : undefined}
          variant="hero"
          className="h-28 w-28 shrink-0 md:h-32 md:w-32"
        />
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-base font-bold text-white">
              {assetMeta.data?.name ?? (assetMeta.isLoading ? '…' : 'Unnamed asset')}
            </span>
            {a.assetType === 1 && (
              <span className="shrink-0 font-mono text-xs font-bold text-[#117a3d]">#{a.assetTokenId.toString()}</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="nb-chip bg-[#8b5cf6]/15 px-1.5 py-0 text-[10px] text-white">
              {ASSET_LABEL[a.assetType] ?? `Type ${a.assetType}`}
            </span>
            <span className="font-mono text-[10px] text-white/50">{shortenAddress(a.assetAddr)}</span>
          </div>

          <div className="mt-auto pt-2 text-3xl font-bold tracking-tight text-white">
            {fmtUsdc(price)} <span className="text-sm font-normal text-white/40">USDC</span>
          </div>
        </div>
      </div>

      {/* 底部 meta */}
      <div className="mt-5 flex items-center justify-between border-t-2 border-white/10/10 pt-3 text-xs text-white/45">
        <span className="flex items-center gap-1.5 font-bold">
          <Users className="h-3.5 w-3.5" />
          {a.batchCount.toString()} batches
        </span>
        {live ? (
          <span className="flex items-center gap-1.5 font-mono font-bold text-[#117a3d]">
            <Clock className="h-3.5 w-3.5" />
            {secsLeft}s
          </span>
        ) : (
          <span className="font-mono font-bold">Pool {fmtUsdc(a.totalPool)}</span>
        )}
      </div>

      {a.reservePrice > 0n && (
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-bold text-white/40">
          <ShieldCheck className="h-3 w-3" />
          Reserve {fmtUsdc(a.reservePrice)} USDC
        </div>
      )}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* 历史 — 紧凑行                                                       */
/* ------------------------------------------------------------------ */
function HistoryRow({ a, nowMs }: { a: AuctionListRow; nowMs: number }) {
  const st = STATUS_LABEL[a.status];
  const ended = a.status === AuctionStatus.LIVE && nowMs >= Number(a.deadline) * 1000;
  const price = a.lastPrice > 0n ? a.lastPrice : a.startPrice;
  const assetMeta = useAssetMeta(a.assetType, a.assetAddr, a.assetType === 1 ? a.assetTokenId : undefined);
  const statusText = ended ? 'Ending — finalize' : st.text;

  return (
    <Link
      to={nadbidDetailPath(a.id)}
      className="group flex items-center gap-4 rounded-xl border-2 border-white/10/10 bg-white/5 px-4 py-3 transition hover:-translate-y-0.5 hover:border-white/10 hover:shadow-[4px_4px_0_#111]"
    >
      <span className="font-mono text-xs font-bold text-white/35">#{a.id.toString()}</span>
      <AssetThumb
        assetType={a.assetType}
        assetAddr={a.assetAddr}
        tokenId={a.assetType === 1 ? a.assetTokenId : undefined}
        variant="hero"
        className="h-11 w-11 shrink-0"
      />
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-sm font-bold text-white">
          {assetMeta.data?.name ?? (assetMeta.isLoading ? '…' : 'Unnamed asset')}
        </span>
        <span className="hidden shrink-0 font-mono text-[10px] text-white/40 sm:inline">
          {ASSET_LABEL[a.assetType] ?? `Type ${a.assetType}`} · {shortenAddress(a.assetAddr)}
        </span>
      </div>
      <span className="shrink-0 text-sm font-bold text-white">{fmtUsdc(price)} <span className="text-[10px] font-normal text-white/40">USDC</span></span>
      <span
        className={cn(
          'shrink-0 rounded-md border-2 px-2 py-0.5 text-[11px] font-bold',
          ended
            ? 'border-[#f5a623] bg-[#f5a623]/15 text-[#b45309]'
            : st.tone === 'gray'
              ? 'border-white/15 bg-white/5 text-white/50'
              : 'border-[#3ec4f0] bg-[#3ec4f0]/10 text-[#0e7490]',
        )}
      >
        {statusText}
      </span>
    </Link>
  );
}
