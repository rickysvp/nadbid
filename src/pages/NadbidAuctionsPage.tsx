import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gavel, Plus, Clock, Users, ShieldCheck } from 'lucide-react';
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

type Filter = 'all' | 'live' | 'settled' | 'cancelled';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live' },
  { key: 'settled', label: 'Settled' },
  { key: 'cancelled', label: 'Cancelled' },
];

/** 拍卖列表 — NADBIDAuction 新协议 */
export default function NadbidAuctionsPage() {
  const { isReady } = useNadbidAuctionContract();
  const { count, list, isLoading } = useAuctionList();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const sorted = useMemo(() => {
    if (!list) return [];
    return [...list].sort((a, b) => Number(b.id) - Number(a.id));
  }, [list]);

  const stats = useMemo(() => {
    if (!list) return { total: 0, live: 0, pool: 0n };
    return {
      total: list.length,
      live: list.filter((a) => a.status === AuctionStatus.LIVE).length,
      pool: list.reduce((acc, a) => acc + (a.totalPool > 0n ? a.totalPool : a.lastPrice), 0n),
    };
  }, [list]);

  const visible = useMemo(() => {
    if (filter === 'all') return sorted;
    if (filter === 'live') return sorted.filter((a) => a.status === AuctionStatus.LIVE);
    if (filter === 'settled') return sorted.filter((a) => a.status === AuctionStatus.SETTLED);
    return sorted.filter((a) => a.status === AuctionStatus.CANCELLED);
  }, [sorted, filter]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pt-28">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-black text-[#111]">
            <Gavel className="h-8 w-8 text-[#117a3d]" />
            NADBID Auctions
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#111]/50">
            Bid with USDC — retained bids are non-refundable, but every later bid pays dividends to earlier bidders.
            Last bid wins the asset.
          </p>
        </div>
        <Link
          to={ROUTES.NADBID_CREATE}
          className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl border-2 border-[#111] bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] px-6 py-3 text-sm font-black text-white shadow-[4px_4px_0_#111] transition-all duration-200 hover:-translate-y-1 hover:shadow-[6px_6px_0_#111]"
        >
          {/* 扫光 */}
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
          <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
          <span className="relative">Create Auction</span>
          <span className="absolute -top-2 -right-2 rounded-md border-2 border-[#111] bg-[#ffe94a] px-1.5 py-0.5 text-[10px] font-black text-[#111] shadow-[2px_2px_0_#111]">
            NEW
          </span>
        </Link>
      </div>

      {!isReady ? (
        <div className="nb-card border border-[#111]/15 bg-[#fffdf7] p-10 text-center">
          <p className="text-sm text-[#111]/50">
            Contract not deployed yet. Set{' '}
            <code className="rounded bg-[#111]/60 px-1.5 py-0.5 font-mono text-[#117a3d]">VITE_NADBID_AUCTION</code> in{' '}
            <code className="rounded bg-[#111]/60 px-1.5 py-0.5 font-mono text-[#111]/70">.env</code> after deployment.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-3 gap-3 md:gap-4">
            <StatCard label="Total auctions" value={isLoading ? '…' : String(stats.total)} />
            <StatCard label="Live now" value={isLoading ? '…' : String(stats.live)} accent />
            <StatCard label="Pooled USDC" value={isLoading ? '…' : fmtUsdc(stats.pool)} />
          </div>

          {/* 筛选 Tabs */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    'rounded-xl border-2 px-4 py-1.5 text-sm font-black transition',
                    active
                      ? 'border-[#111] bg-[#ffe94a] text-[#111] shadow-[2px_2px_0_#111]'
                      : 'border-transparent text-[#111]/40 hover:text-[#111] hover:bg-[#111]/5',
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-56 animate-pulse nb-card border border-[#111]/15 bg-[#fffdf7]" />
              ))}
            </div>
          ) : count === 0 ? (
            <div className="nb-card border border-[#111]/15 bg-[#fffdf7] p-16 text-center">
              <Gavel className="mx-auto mb-4 h-10 w-10 text-[#111]/15" />
              <p className="text-sm font-bold text-[#111]/60">No auctions yet</p>
              <p className="mt-1 text-sm text-[#111]/40">Be the first to list an asset on-chain.</p>
              <Link
                to={ROUTES.NADBID_CREATE}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#8b5cf6] px-5 py-2.5 text-sm font-black text-white hover:bg-[#a78bfa]"
              >
                <Plus className="h-4 w-4" />
                Create the first auction
              </Link>
            </div>
          ) : visible.length === 0 ? (
            <div className="nb-card border border-[#111]/15 bg-[#fffdf7] p-12 text-center text-sm text-[#111]/40">
              No {filter} auctions.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((a) => (
                <AuctionCard key={a.id.toString()} a={a} nowMs={nowMs} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="nb-card-flat p-4 md:p-5">
      <div className="text-[10px] font-black uppercase tracking-wider text-[#111]/40 md:text-xs">{label}</div>
      <div
        className={cn(
          'mt-1.5 font-mono text-2xl md:text-3xl font-black truncate',
          accent ? 'text-[#117a3d]' : 'text-[#111]',
        )}
      >
        {value}
      </div>
    </div>
  );
}

function AuctionCard({ a, nowMs }: { a: AuctionListRow; nowMs: number }) {
  const st = STATUS_LABEL[a.status];
  const isLive = a.status === AuctionStatus.LIVE;
  const ended = isLive && nowMs >= Number(a.deadline) * 1000;
  const secsLeft = Number(a.deadline) * 1000 - nowMs > 0 ? Math.ceil((Number(a.deadline) * 1000 - nowMs) / 1000) : 0;
  const price = a.lastPrice > 0n ? a.lastPrice : a.startPrice;
  const assetMeta = useAssetMeta(a.assetType, a.assetAddr, a.assetType === 1 ? a.assetTokenId : undefined);

  return (
    <Link
      to={nadbidDetailPath(a.id)}
      className="group relative overflow-hidden nb-card p-5 transition hover:-translate-y-1 hover:shadow-[6px_6px_0_#111]"
    >
      {/* 顶部：编号 + 状态徽章 */}
      <div className="mb-4 flex items-start justify-between gap-2">
        <span className="font-mono text-xs font-black text-[#111]/35">#{a.id.toString()}</span>
        <span
          className={cn(
            'rounded-md border-2 px-2 py-0.5 text-[11px] font-black shrink-0',
            isLive
              ? ended
                ? 'border-[#f5a623] bg-[#f5a623]/15 text-[#b45309]'
                : 'border-[#117a3d] bg-[#8b5cf6]/15 text-[#117a3d]'
              : st.tone === 'gray'
                ? 'border-[#111]/25 bg-[#111]/5 text-[#111]/50'
                : 'border-[#3ec4f0] bg-[#3ec4f0]/10 text-[#0e7490]',
          )}
        >
          {isLive ? (ended ? 'Ending' : 'Live') : st.text}
        </span>
      </div>

      {/* 左图右文：拍品 LOGO + 介绍 */}
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
            <span className="truncate text-base font-black text-[#111]">
              {assetMeta.data?.name ?? (assetMeta.isLoading ? '…' : 'Unnamed asset')}
            </span>
            {a.assetType === 1 && <span className="shrink-0 font-mono text-xs font-black text-[#117a3d]">#{a.assetTokenId.toString()}</span>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="nb-chip bg-[#8b5cf6]/15 px-1.5 py-0 text-[10px] text-white">
              {ASSET_LABEL[a.assetType] ?? `Type ${a.assetType}`}
            </span>
            <span className="font-mono text-[10px] text-[#111]/50">{shortenAddress(a.assetAddr)}</span>
          </div>

          {/* 主价 */}
          <div className="mt-auto pt-2 text-3xl font-black tracking-tight text-[#111]">
            {fmtUsdc(price)} <span className="text-sm font-normal text-[#111]/40">USDC</span>
          </div>
        </div>
      </div>

      {/* 底部 meta */}
      <div className="mt-5 flex items-center justify-between border-t-2 border-[#111]/10 pt-3 text-xs text-[#111]/45">
        <span className="flex items-center gap-1.5 font-bold">
          <Users className="h-3.5 w-3.5" />
          {a.batchCount.toString()} batches
        </span>
        {isLive ? (
          <span className={cn('flex items-center gap-1.5 font-mono font-black', ended ? 'text-[#b45309]' : 'text-[#117a3d]')}>
            <Clock className="h-3.5 w-3.5" />
            {ended ? '0s' : `${secsLeft}s`}
          </span>
        ) : (
          <span className="font-mono font-bold">Pool {fmtUsdc(a.totalPool)}</span>
        )}
      </div>

      {a.reservePrice > 0n && (
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-bold text-[#111]/40">
          <ShieldCheck className="h-3 w-3" />
          Reserve {fmtUsdc(a.reservePrice)} USDC
        </div>
      )}
    </Link>
  );
}
