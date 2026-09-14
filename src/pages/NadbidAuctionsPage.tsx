import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Hammer, Plus, Clock, Users } from 'lucide-react';
import { useNadbidAuctionContract, useAuctionList, fmtUsdc, STATUS_LABEL, ASSET_LABEL, AuctionStatus, isAuctionEnded } from '../web3/hooks/useNadbidAuction';
import { shortenAddress } from '../utils/format';
import { cn } from '../utils/cn';

/** 拍卖列表 — NADBIDAuction 新协议 */
export default function NadbidAuctionsPage() {
  const { isReady } = useNadbidAuctionContract();
  const { count, list, isLoading } = useAuctionList();
  const [nowMs, setNowMs] = useState(() => Date.now());

  // 每秒刷新倒计时
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const sorted = useMemo(() => {
    if (!list) return [];
    return [...list].sort((a, b) => Number(b.id) - Number(a.id));
  }, [list]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
            <Hammer className="h-8 w-8 text-[#3ec470]" />
            NADBID Auctions
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/50">
            Bid with USDC. Your bid is non-refundable once retained — but if someone outbids you, you keep earning
            dividends as the price climbs. Last bid wins the asset.
          </p>
        </div>
        <Link
          to="/nadbid/create"
          className="inline-flex items-center gap-2 rounded-lg border border-[#3ec470]/40 bg-[#3ec470]/10 px-4 py-2 text-sm font-semibold text-[#3ec470] transition hover:bg-[#3ec470]/20"
        >
          <Plus className="h-4 w-4" />
          Create Auction
        </Link>
      </div>

      {!isReady ? (
        <div className="rounded-xl border border-white/5 bg-[#161616] p-10 text-center">
          <p className="text-sm text-white/50">
            Contract not deployed yet. Set <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[#3ec470]">VITE_NADBID_AUCTION</code>{' '}
            in <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-white/70">.env</code> after deployment.
          </p>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl border border-white/5 bg-[#161616]" />
          ))}
        </div>
      ) : count === 0 ? (
        <div className="rounded-xl border border-white/5 bg-[#161616] p-10 text-center">
          <p className="text-sm text-white/40">No auctions yet. Be the first to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sorted.map((a) => {
            const st = STATUS_LABEL[a.status];
            const ended = a.status === AuctionStatus.LIVE && isAuctionEnded(
              {
                status: a.status,
                seller: a.seller,
                assetType: a.assetType,
                assetAddr: a.assetAddr,
                assetTokenId: a.assetTokenId,
                assetAmount: a.assetAmount,
                startPrice: a.startPrice,
                incrementBps: a.incrementBps,
                reservePrice: a.reservePrice,
                lastPrice: a.lastPrice,
                deadline: a.deadline,
                lastBatchBlock: 0n,
                lastBatchId: 0n,
                batchStartId: 0n,
                batchCount: a.batchCount,
                totalPool: a.totalPool,
                candidatesPool: 0n,
                retainedFees: 0n,
                refunded: 0n,
                rpu: 0n,
                rpuFinal: 0n,
                finalPrice: a.finalPrice,
                winner: a.winner,
              } as never,
              nowMs,
            );
            const secsLeft = Number(a.deadline) * 1000 - nowMs > 0 ? Math.ceil((Number(a.deadline) * 1000 - nowMs) / 1000) : 0;
            return (
              <Link
                key={a.id.toString()}
                to={`/nadbid/${a.id}`}
                className="group rounded-xl border border-white/5 bg-[#161616] p-5 transition hover:border-[#3ec470]/30 hover:bg-[#1a1a1a]"
              >
                <div className="mb-3 flex items-start justify-between">
                  <span className="font-mono text-xs text-white/40">#{a.id.toString()}</span>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                      st.tone === 'green' && 'bg-[#3ec470]/10 text-[#3ec470]',
                      st.tone === 'blue' && 'bg-sky-500/10 text-sky-400',
                      st.tone === 'amber' && 'bg-amber-500/10 text-amber-400',
                      st.tone === 'red' && 'bg-red-500/10 text-red-400',
                      st.tone === 'gray' && 'bg-white/5 text-white/50',
                    )}
                  >
                    {st.text}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <span className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-xs">
                      {ASSET_LABEL[a.assetType] ?? `Type ${a.assetType}`}
                    </span>
                    <span className="font-mono text-xs">{shortenAddress(a.assetAddr)}</span>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-white">
                    {fmtUsdc(a.lastPrice > 0n ? a.lastPrice : a.startPrice)}{' '}
                    <span className="text-sm font-normal text-white/40">USDC</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-3 text-xs text-white/40">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {a.batchCount.toString()} batches
                  </span>
                  {a.status === AuctionStatus.LIVE ? (
                    <span className={cn('flex items-center gap-1 font-mono', ended ? 'text-amber-400' : 'text-white/50')}>
                      <Clock className="h-3.5 w-3.5" />
                      {ended ? 'Ending' : `${secsLeft}s`}
                    </span>
                  ) : (
                    <span className="font-mono">Pool {fmtUsdc(a.totalPool)}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
