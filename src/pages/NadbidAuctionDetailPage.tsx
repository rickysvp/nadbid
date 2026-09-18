import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  HandCoins,
  ShieldCheck,
  Trophy,
  AlertTriangle,
  Users,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import {
  useConnectedAddress,
  useAuctionMeta,
  useBatchMeta,
  useBatchUserState,
  useUsdcBalance,
  useUsdcAllowance,
  usePlaceBid,
  useFinalizeAuction,
  useClaimRefund,
  useClaimReward,
  useClaimSeller,
  useApproveUsdc,
  useNadbidAuctionContract,
  fmtUsdc,
  nextPrice,
  bidPay,
  isAuctionEnded,
  STATUS_LABEL,
  ASSET_LABEL,
  AuctionStatus,
  type AuctionMeta,
} from '../web3/hooks/useNadbidAuction';
import { contractAddresses, nadbidAuctionAbi, usdcAbi } from '../web3/contracts';
import { shortenAddress } from '../utils/format';
import { cn } from '../utils/cn';
import { CircularProgress } from '../components/ui/CircularProgress';
import { AssetThumb } from '../components/ui/AssetThumb';
import { useAssetMeta } from '../web3/hooks/useAssetMeta';

const DURATION_SECONDS = 120;
const WARNING_SECONDS = 15;
const MAX_BATCHES_TO_SHOW = 50;
const ZERO = '0x0000000000000000000000000000000000000000' as `0x${string}`;

export default function NadbidAuctionDetailPage() {
  const { id: idParam } = useParams<{ id: string }>();
  const auctionId = useMemo(() => (idParam ? BigInt(idParam) : undefined), [idParam]);
  const { isReady } = useNadbidAuctionContract();
  const { meta } = useAuctionMeta(auctionId);
  const address = useConnectedAddress();
  const queryClient = useQueryClient();

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries();
  }, [queryClient]);

  const bal = useUsdcBalance(address);
  const assetMeta = useAssetMeta(meta?.assetType, meta?.assetAddr, meta?.assetTokenId, !!meta);
  const allowance = useUsdcAllowance(address, useNadbidAuctionContract().address);
  const approveTx = useApproveUsdc();
  const bidTx = usePlaceBid();
  const finalizeTx = useFinalizeAuction();
  const sellerTx = useClaimSeller();
  const isSeller =
    !!address && !!meta?.seller && address.toLowerCase() === meta.seller.toLowerCase();

  const ended = meta ? isAuctionEnded(meta, nowMs) : false;
  const secsLeft = meta ? Math.max(0, Math.ceil((Number(meta.deadline) * 1000 - nowMs) / 1000)) : 0;
  const progress = meta ? Math.min(100, (secsLeft / DURATION_SECONDS) * 100) : 0;
  const danger = !!meta && meta.status === AuctionStatus.LIVE && secsLeft <= WARNING_SECONDS;
  const curPrice = meta && meta.lastPrice > 0n ? meta.lastPrice : meta?.startPrice ?? 0n;
  const nextPriceVal =
    meta && meta.lastPrice > 0n ? nextPrice(meta.lastPrice, meta.incrementBps) : meta?.startPrice ?? 0n;
  const payVal = bidPay(nextPriceVal);
  const needApprove = allowance?.data !== undefined && (allowance.data as bigint) < payVal;

  const batchIds = useMemo(() => {
    if (!meta || meta.batchStartId === 0n || meta.batchCount === 0n) return [] as bigint[];
    const start = Number(meta.batchStartId);
    const cnt = Number(meta.batchCount);
    const ids: bigint[] = [];
    for (let i = 0; i < Math.min(cnt, MAX_BATCHES_TO_SHOW); i++) ids.push(BigInt(start + i));
    return ids;
  }, [meta]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pt-28">
      <Link
        to="/nadbid"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/50 transition hover:text-[#117a3d]"
      >
        <ArrowLeft className="h-4 w-4" />
        All auctions
      </Link>

      {!meta ? (
        <div className="nb-card border border-white/10/15 bg-white/5 p-10 text-center text-sm text-white/40">
          {isReady ? 'Auction not found or loading…' : 'Contract not deployed. Set VITE_NADBID_AUCTION after deployment.'}
        </div>
      ) : (
        <>
          {/* ===== 头部聚合卡：标题 + 资产 + 倒计时 ===== */}
          <div className="nb-card p-6 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-mono text-3xl md:text-4xl font-bold tracking-tighter">
                    Auction <span className="text-[#117a3d]">#{idParam}</span>
                  </h1>
                  <StatusBadge status={meta.status} />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <AssetThumb
                    assetType={meta.assetType}
                    assetAddr={meta.assetAddr}
                    tokenId={meta.assetType === 1 ? meta.assetTokenId : undefined}
                    className="h-16 w-16"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-lg font-bold leading-tight text-white">
                        {assetMeta.data?.name ?? (assetMeta.isLoading ? 'Loading asset…' : 'Unnamed asset')}
                        {meta.assetType === 1 && (
                          <span className="text-[#117a3d]"> #{meta.assetTokenId.toString()}</span>
                        )}
                        {meta.assetType !== 1 && meta.assetAmount > 0n && (
                          <span className="text-white/50"> × {fmtUsdc(meta.assetAmount)}</span>
                        )}
                      </span>
                      <span className="nb-chip bg-[#8b5cf6]/15 px-2.5 py-0.5 text-xs text-white">
                        {ASSET_LABEL[meta.assetType] ?? `Type ${meta.assetType}`}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/50">
                      <span className="font-mono">{shortenAddress(meta.assetAddr)}</span>
                      {assetMeta.data?.symbol && <span className="font-mono">· {assetMeta.data.symbol}</span>}
                      <span className="text-white/20">·</span>
                      <span>
                        Seller <span className="font-mono font-bold text-white/70">{shortenAddress(meta.seller)}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3.5 flex flex-wrap items-center gap-2 text-sm">
                  {meta.reservePrice > 0n && (
                    <span className="nb-chip bg-[#f5a623]/15 px-2.5 py-0.5 text-xs text-[#b45309]">
                      Reserve {fmtUsdc(meta.reservePrice)} USDC
                    </span>
                  )}
                  {meta.incrementBps > 0n && (
                    <span className="text-xs text-white/40">+{Number(meta.incrementBps) / 100}% per bid</span>
                  )}
                </div>
              </div>

              {/* 倒计时 */}
              {meta.status === AuctionStatus.LIVE && (
                <div
                  className={cn(
                    'flex items-center gap-4 rounded-xl border-2 px-5 py-4',
                    ended
                      ? 'border-[#f5a623] bg-[#f5a623]/10 shadow-[4px_4px_0_#f5a623]'
                      : danger
                        ? 'border-[#ff4d4f] bg-[#ff4d4f]/5 shadow-[4px_4px_0_#ff4d4f]'
                        : 'border-white/10 bg-white/5 shadow-[4px_4px_0_#111]',
                  )}
                >
                  <CircularProgress
                    progress={ended ? 0 : progress}
                    size={96}
                    strokeWidth={7}
                    label={ended ? '0' : `${secsLeft}`}
                    sublabel={ended ? 'Ended' : danger ? 'Final seconds' : 'seconds left'}
                    danger={danger}
                  />
                  <div className="hidden sm:block max-w-[170px]">
                    <div className="text-xs font-bold uppercase tracking-wider text-white/40">Countdown</div>
                    <div className={cn('mt-1 text-sm font-bold leading-snug', danger ? 'text-[#ff4d4f]' : 'text-white/70')}>
                      {ended
                        ? 'Auction ended — finalize to settle.'
                        : danger
                          ? 'Last 15 seconds! No bid resets the clock.'
                          : 'Timer resets to 120s on every bid.'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 数据四列 */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatBox label="Current price" value={fmtUsdc(curPrice)} sub="USDC" />
              <StatBox label="Total pool" value={fmtUsdc(meta.totalPool)} sub="USDC retained" accent />
              <StatBox label="Next bid" value={fmtUsdc(nextPriceVal)} sub={`+${Number(meta.incrementBps) / 100}%`} />
              <StatBox label="Batches" value={meta.batchCount.toString()} sub="price levels" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* ===== 左：出价历史 ===== */}
            <div className="space-y-6 lg:col-span-2">
              <div className="nb-card p-6">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-white/70">
                  <Users className="h-4 w-4 text-[#117a3d]" />
                  Bid history{' '}
                  {batchIds.length < Number(meta.batchCount) && (
                    <span className="text-xs font-normal text-white/40">(latest {batchIds.length})</span>
                  )}
                </h2>
                {batchIds.length === 0 ? (
                  <p className="py-8 text-center text-sm text-white/40">No bids yet.</p>
                ) : (
                  <div className="space-y-2">
                    {batchIds.map((bId) => (
                      <BatchRow key={bId.toString()} auctionId={auctionId!} batchId={bId} address={address} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ===== 右：出价 / 操作 ===== */}
            <div className="space-y-4">
              {meta.status === AuctionStatus.LIVE && (
                <div
                  className={cn(
                    'nb-card p-5',
                    danger && !ended ? 'border-[#ff4d4f] shadow-[4px_4px_0_#ff4d4f]' : '',
                  )}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-sm font-bold text-white/70">
                      <HandCoins className="h-4 w-4 text-[#117a3d]" />
                      Place bid
                    </h2>
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">Your USDC</div>
                      <div className="font-mono text-lg font-bold leading-tight text-white">{fmtUsdc(bal?.data as bigint | undefined)}</div>
                    </div>
                  </div>

                  <div className="mb-4 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/50">Next price</span>
                      <span className="font-mono font-bold text-white">{fmtUsdc(nextPriceVal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Bid fee (1%)</span>
                      <span className="font-mono text-white/80">{fmtUsdc(nextPriceVal > 0n ? nextPriceVal / 100n : 0n)}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/10/15 pt-1.5">
                      <span className="text-white/50">You pay</span>
                      <span className="font-mono font-bold text-[#117a3d]">{fmtUsdc(payVal)}</span>
                    </div>
                  </div>

                  {!address ? (
                    <p className="rounded-xl border-2 border-dashed border-white/15 px-3 py-3 text-center text-sm text-white/40">
                      Connect your wallet to bid.
                    </p>
                  ) : needApprove ? (
                    <button
                      disabled={approveTx.isLoading}
                      onClick={() =>
                        approveTx.write({
                          address: contractAddresses.usdc,
                          abi: usdcAbi,
                          functionName: 'approve',
                          args: [useNadbidAuctionContract().address, payVal],
                          gas: 150_000n,
                          onSuccess: invalidateAll,
                          successMessage: 'USDC approved',
                        })
                      }
                      className="w-full rounded-xl border-2 border-white/10 bg-white/5 px-4 py-3.5 text-sm font-bold text-white shadow-[3px_3px_0_#111] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#111] disabled:opacity-50 disabled:translate-y-0 disabled:shadow-[3px_3px_0_#111]"
                    >
                      {approveTx.isLoading ? 'Approving…' : `Approve ${fmtUsdc(payVal)} USDC`}
                    </button>
                  ) : (
                    <button
                      disabled={bidTx.isLoading || ended || isSeller}
                      onClick={() =>
                        bidTx.write({
                          address: useNadbidAuctionContract().address!,
                          abi: nadbidAuctionAbi,
                          functionName: 'placeBid',
                          args: [auctionId!, nextPriceVal],
                          gas: 500_000n,
                          onSuccess: invalidateAll,
                          successMessage: 'Bid placed — 120s timer reset',
                        })
                      }
                      className={cn(
                        'w-full rounded-xl border-2 border-white/10 px-4 py-3.5 text-sm font-bold text-white transition disabled:opacity-40 disabled:translate-y-0',
                        danger && !ended
                          ? 'animate-pulse bg-[#ff4d4f] shadow-[3px_3px_0_#ff4d4f] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#ff4d4f]'
                          : 'bg-[#8b5cf6] shadow-[3px_3px_0_#111] hover:-translate-y-0.5 hover:bg-[#a78bfa] hover:shadow-[5px_5px_0_#111]',
                      )}
                    >
                      {bidTx.isLoading
                        ? 'Placing bid…'
                        : ended
                          ? 'Auction ended'
                          : isSeller
                            ? "You can't bid on your own auction"
                            : `Bid ${fmtUsdc(payVal)} USDC`}
                    </button>
                  )}

                  <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-white/40">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#117a3d]/60" />
                    Retained bids are non-refundable. If outbid later, you keep earning dividends from 15% of each new
                    bid. Same-block losers get their full payment refunded instantly.
                  </p>
                </div>
              )}

              {meta.status === AuctionStatus.LIVE && (
                <button
                  disabled={!ended || finalizeTx.isLoading}
                  onClick={() =>
                    finalizeTx.write({
                      address: useNadbidAuctionContract().address!,
                      abi: nadbidAuctionAbi,
                      functionName: 'finalize',
                      args: [auctionId!],
                      gas: 5_000_000n,
                      onSuccess: invalidateAll,
                      successMessage: 'Auction finalized',
                    })
                  }
                  className="w-full rounded-xl border-2 border-white/10 bg-[#ffe94a] px-4 py-3.5 text-sm font-bold text-white shadow-[3px_3px_0_#111] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#111] disabled:opacity-40 disabled:translate-y-0 disabled:shadow-[3px_3px_0_#111]"
                >
                  {finalizeTx.isLoading ? 'Finalizing…' : ended ? 'Finalize / Settle auction' : `Finalize after countdown (${secsLeft}s)`}
                </button>
              )}

              {meta.status === AuctionStatus.SETTLED && address && address.toLowerCase() === meta.seller.toLowerCase() && (
                <button
                  disabled={sellerTx.isLoading}
                  onClick={() =>
                    sellerTx.write({
                      address: useNadbidAuctionContract().address!,
                      abi: nadbidAuctionAbi,
                      functionName: 'claimSeller',
                      args: [auctionId!],
                      gas: 1_000_000n,
                      onSuccess: invalidateAll,
                      successMessage: 'Seller earnings claimed',
                    })
                  }
                  className="w-full rounded-xl border-2 border-white/10 bg-white/5 px-4 py-3.5 text-sm font-bold text-white shadow-[3px_3px_0_#111] transition hover:-translate-y-0.5 hover:bg-[#8b5cf6]/15 hover:shadow-[5px_5px_0_#111] disabled:opacity-50 disabled:translate-y-0 disabled:shadow-[3px_3px_0_#111]"
                >
                  {sellerTx.isLoading ? 'Claiming…' : 'Claim seller earnings'}
                </button>
              )}

              {meta.status !== AuctionStatus.LIVE && <ResultPanel meta={meta} />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatBox({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="nb-card-flat p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 md:text-xs">{label}</div>
      <div className={cn('mt-1.5 font-mono text-2xl md:text-3xl font-bold truncate', accent ? 'text-[#117a3d]' : 'text-white')}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-white/40">{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: number }) {
  const st = STATUS_LABEL[status];
  return (
    <span
      className={cn(
        'rounded-md border-2 px-2.5 py-0.5 text-xs font-bold',
        st.tone === 'green' && 'border-[#117a3d] bg-[#8b5cf6]/15 text-[#117a3d]',
        st.tone === 'blue' && 'border-[#3ec4f0] bg-[#3ec4f0]/10 text-[#0e7490]',
        st.tone === 'amber' && 'border-[#f5a623] bg-[#f5a623]/15 text-[#b45309]',
        st.tone === 'red' && 'border-[#ff4d4f] bg-[#ff4d4f]/10 text-[#ff4d4f]',
        st.tone === 'gray' && 'border-white/15 bg-white/5 text-white/50',
      )}
    >
      {st.text}
    </span>
  );
}

function ResultPanel({ meta }: { meta: AuctionMeta }) {
  const pool = meta.totalPool;
  const sellerShare = (pool * 8500n) / 10000n;
  const sellerNet = (sellerShare * 9500n) / 10000n;
  const platformFee = (pool * 500n) / 10000n;
  const rewardPool = (pool * 1500n) / 10000n;
  return (
    <div className="nb-card border border-white/10/15 bg-white/5 p-5 text-sm">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-white/70">
        <Trophy className="h-4 w-4 text-[#117a3d]" />
        Result
      </h2>
      {meta.status === AuctionStatus.SETTLED ? (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-white">{shortenAddress(meta.winner)}</span>
            <span className="rounded bg-[#8b5cf6]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#117a3d]">WINNER</span>
          </div>
          <div className="flex justify-between text-white/50">
            <span>Final price</span>
            <span className="font-mono text-white">{fmtUsdc(meta.finalPrice)}</span>
          </div>
          <div className="flex justify-between text-white/50">
            <span>Pool</span>
            <span className="font-mono text-white">{fmtUsdc(pool)}</span>
          </div>
          <div className="flex justify-between text-white/50">
            <span>Seller share (net 80.75%)</span>
            <span className="font-mono text-[#117a3d]">{fmtUsdc(sellerNet)}</span>
          </div>
          <div className="flex justify-between text-white/50">
            <span>Bidder dividend pool (15%)</span>
            <span className="font-mono text-white">{fmtUsdc(rewardPool)}</span>
          </div>
          <div className="flex justify-between text-white/50">
            <span>Protocol fee (5%)</span>
            <span className="font-mono text-white">{fmtUsdc(platformFee)}</span>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 text-amber-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Auction cancelled{meta.reservePrice > 0n ? ' — reserve not met' : ' — no bids'}. All bid payments fully
            refunded.
          </span>
        </div>
      )}
    </div>
  );
}

function BatchRow({
  auctionId,
  batchId,
  address,
}: {
  auctionId: bigint;
  batchId: bigint;
  address: `0x${string}` | undefined;
}) {
  const queryClient = useQueryClient();
  const { batch } = useBatchMeta(batchId);
  const st = useBatchUserState(batchId, address);
  const refundTx = useClaimRefund();
  const rewardTx = useClaimReward();

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries();
  }, [queryClient]);

  if (!batch) {
    return <div className="h-14 animate-pulse rounded-xl bg-white/5" />;
  }

  const selected = batch.selectedBidder !== ZERO;
  const isWinner = address !== undefined && batch.selectedBidder.toLowerCase() === address.toLowerCase();
  const canRefund = st.isCandidate && !st.refundClaimed && !isWinner && batch.resolved;
  const canReward = st.isCandidate && !st.rewardClaimed && isWinner;
  const mine = (st.isCandidate && isWinner) || canRefund || canReward || st.refundClaimed || st.rewardClaimed;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 transition',
        mine ? 'border-[#1a7f37]/30 bg-[#8b5cf6]/[0.05]' : 'border-white/10/15 bg-white/5',
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {/* 排名 */}
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] font-mono text-xs font-bold text-white/50">
          #{batchId.toString()}
        </div>
        <div className="min-w-0">
          <div className="font-mono text-sm font-bold text-white">
            {fmtUsdc(batch.price)} <span className="text-xs font-normal text-white/40">USDC</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-white/40">
            <span>{batch.candidateCount.toString()} candidate{batch.candidateCount > 1n ? 's' : ''}</span>
            {batch.snapshotRpu > 0n && (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                RPU {formatUnits(batch.snapshotRpu, 18)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {batch.resolved ? (
          selected ? (
            <span
              className={cn(
                'flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold',
                isWinner ? 'bg-[#8b5cf6]/15 text-[#117a3d]' : 'bg-white/5 text-white/50',
              )}
            >
              <Trophy className="h-3 w-3" />
              {isWinner ? 'You won this round' : shortenAddress(batch.selectedBidder)}
            </span>
          ) : (
            <span className="rounded bg-white/5 px-2 py-0.5 text-xs text-white/40">no winner</span>
          )
        ) : (
          <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400">resolving…</span>
        )}

        {batch.resolved && selected && address === undefined && (
          <span className="flex items-center gap-1.5 rounded-lg bg-[#8b5cf6]/10 px-2.5 py-1 text-xs font-bold text-[#6d28d9]">
            <Wallet className="h-3 w-3" />
            Connect wallet to claim
          </span>
        )}
        {canRefund && (
          <button
            onClick={() =>
              refundTx.write({
                address: useNadbidAuctionContract().address!,
                abi: nadbidAuctionAbi,
                functionName: 'claimRefund',
                args: [auctionId, batchId],
                gas: 500_000n,
                onSuccess: invalidateAll,
                successMessage: 'Refund claimed',
              })
            }
            disabled={refundTx.isLoading}
            className="rounded-lg bg-[#111]/10 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/20 disabled:opacity-40"
          >
            {refundTx.isLoading ? '…' : 'Refund'}
          </button>
        )}
        {canReward && (
          <button
            onClick={() =>
              rewardTx.write({
                address: useNadbidAuctionContract().address!,
                abi: nadbidAuctionAbi,
                functionName: 'claimReward',
                args: [auctionId, batchId],
                gas: 500_000n,
                onSuccess: invalidateAll,
                successMessage: 'Dividends claimed',
              })
            }
            disabled={rewardTx.isLoading}
            className="rounded-lg bg-[#8b5cf6]/15 px-3 py-1.5 text-xs font-bold text-[#117a3d] transition hover:bg-[#8b5cf6]/25 disabled:opacity-40"
          >
            {rewardTx.isLoading ? '…' : 'Claim dividends'}
          </button>
        )}
        {(st.refundClaimed || st.rewardClaimed) && (
          <span className="rounded bg-white/5 px-2 py-1 text-xs text-white/40">claimed</span>
        )}
      </div>
    </div>
  );
}
