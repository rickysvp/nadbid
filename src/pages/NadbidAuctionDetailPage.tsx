import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  HandCoins,
  ShieldCheck,
  Trophy,
  Wallet,
  AlertTriangle,
  Users,
  TrendingUp,
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
  const allowance = useUsdcAllowance(address, useNadbidAuctionContract().address);
  const approveTx = useApproveUsdc();
  const bidTx = usePlaceBid();
  const finalizeTx = useFinalizeAuction();
  const sellerTx = useClaimSeller();

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
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/50 transition hover:text-[#3ec470]"
      >
        <ArrowLeft className="h-4 w-4" />
        All auctions
      </Link>

      {!meta ? (
        <div className="rounded-2xl border border-white/5 bg-[#161616] p-10 text-center text-sm text-white/40">
          {isReady ? 'Auction not found or loading…' : 'Contract not deployed. Set VITE_NADBID_AUCTION after deployment.'}
        </div>
      ) : (
        <>
          {/* ===== 顶部信息 ===== */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-white">Auction #{idParam}</h1>
                <StatusBadge status={meta.status} />
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/50">
                <span className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-xs">
                  {ASSET_LABEL[meta.assetType] ?? `Type ${meta.assetType}`}
                </span>
                <span className="font-mono text-xs">{shortenAddress(meta.assetAddr)}</span>
                {meta.assetType === 1 && <span className="font-mono text-xs">#{meta.assetTokenId.toString()}</span>}
                {meta.assetType !== 1 && <span className="font-mono text-xs">× {fmtUsdc(meta.assetAmount)}</span>}
              </p>
              <p className="mt-1.5 text-xs text-white/40">
                Seller <span className="font-mono">{shortenAddress(meta.seller)}</span>
                {meta.reservePrice > 0n && <> · Reserve {fmtUsdc(meta.reservePrice)} USDC</>}
                {meta.incrementBps > 0n && <> · +{Number(meta.incrementBps) / 100}% per bid</>}
              </p>
            </div>

            {/* 倒计时 */}
            {meta.status === AuctionStatus.LIVE && (
              <div
                className={cn(
                  'flex items-center gap-4 rounded-2xl border px-6 py-4',
                  ended
                    ? 'border-amber-500/40 bg-amber-500/10'
                    : danger
                      ? 'border-red-500/40 bg-red-500/5'
                      : 'border-white/5 bg-[#161616]',
                )}
              >
                <CircularProgress
                  progress={ended ? 0 : progress}
                  size={104}
                  strokeWidth={7}
                  label={ended ? '0' : `${secsLeft}`}
                  sublabel={ended ? 'Ended' : danger ? 'Final seconds' : 'seconds left'}
                  danger={danger}
                />
                <div className="hidden sm:block max-w-[180px]">
                  <div className="text-xs font-bold uppercase tracking-wider text-white/40">Countdown</div>
                  <div className={cn('mt-1 text-sm font-bold leading-snug', danger ? 'text-red-400' : 'text-white/70')}>
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

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            {/* ===== 左栏：资金 + 批次 ===== */}
            <div className="space-y-6 lg:col-span-3">
              {/* 资金统计 */}
              <div className="grid grid-cols-3 gap-3">
                <StatBox label="Current price" value={fmtUsdc(curPrice)} sub="USDC" />
                <StatBox label="Total pool" value={fmtUsdc(meta.totalPool)} sub="USDC retained" accent />
                <StatBox label="Batches" value={meta.batchCount.toString()} sub="price levels" />
              </div>

              {/* 批次列表（BidBoard） */}
              <div className="rounded-2xl border border-white/[0.07] bg-[#161616] p-5">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-white/70">
                  <Users className="h-4 w-4 text-[#3ec470]" />
                  Bid history{' '}
                  {batchIds.length < Number(meta.batchCount) && (
                    <span className="text-xs font-normal text-white/40">(latest {batchIds.length})</span>
                  )}
                </h2>
                {batchIds.length === 0 ? (
                  <p className="py-6 text-center text-sm text-white/40">No bids yet.</p>
                ) : (
                  <div className="space-y-2">
                    {batchIds.map((bId) => (
                      <BatchRow key={bId.toString()} auctionId={auctionId!} batchId={bId} address={address} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ===== 右栏：出价 / 操作 ===== */}
            <div className="space-y-4 lg:col-span-2">
              {/* 余额 */}
              <div className="rounded-2xl border border-white/[0.07] bg-[#161616] p-5">
                <h2 className="mb-2 flex items-center gap-2 text-sm font-black text-white/70">
                  <Wallet className="h-4 w-4 text-[#3ec470]" />
                  Your USDC
                </h2>
                <div className="text-2xl font-black text-white">{fmtUsdc(bal?.data as bigint | undefined)}</div>
                <div className="text-xs text-white/40">USDC balance</div>
              </div>

              {meta.status === AuctionStatus.LIVE && (
                <div
                  className={cn(
                    'rounded-2xl border p-5',
                    danger && !ended ? 'border-red-500/40 bg-red-500/[0.04]' : 'border-[#3ec470]/20 bg-[#161616]',
                  )}
                >
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-white/70">
                    <HandCoins className="h-4 w-4 text-[#3ec470]" />
                    Place bid
                  </h2>
                  <div className="mb-4 space-y-1.5 rounded-xl bg-[#0f0f0f] p-3.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/50">Next price</span>
                      <span className="font-mono font-bold text-white">{fmtUsdc(nextPriceVal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Bid fee (1%)</span>
                      <span className="font-mono text-white/80">{fmtUsdc(nextPriceVal > 0n ? nextPriceVal / 100n : 0n)}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/5 pt-1.5">
                      <span className="text-white/50">You pay</span>
                      <span className="font-mono font-black text-[#3ec470]">{fmtUsdc(payVal)}</span>
                    </div>
                  </div>

                  {!address ? (
                    <p className="text-sm text-white/40">Connect your wallet to bid.</p>
                  ) : needApprove ? (
                    <button
                      disabled={approveTx.isLoading}
                      onClick={() =>
                        approveTx.write({
                          address: contractAddresses.usdc,
                          abi: usdcAbi,
                          functionName: 'approve',
                          args: [useNadbidAuctionContract().address, payVal],
                          onSuccess: invalidateAll,
                          successMessage: 'USDC approved',
                        })
                      }
                      className="w-full rounded-xl bg-white px-4 py-3 text-sm font-black text-black transition hover:bg-white/90 disabled:opacity-50"
                    >
                      {approveTx.isLoading ? 'Approving…' : `Approve ${fmtUsdc(payVal)} USDC`}
                    </button>
                  ) : (
                    <button
                      disabled={bidTx.isLoading || ended}
                      onClick={() =>
                        bidTx.write({
                          address: useNadbidAuctionContract().address!,
                          abi: nadbidAuctionAbi,
                          functionName: 'placeBid',
                          args: [auctionId!, nextPriceVal],
                          onSuccess: invalidateAll,
                          successMessage: 'Bid placed — 120s timer reset',
                        })
                      }
                      className={cn(
                        'w-full rounded-xl px-4 py-3 text-sm font-black text-black transition disabled:opacity-40',
                        danger && !ended
                          ? 'animate-pulse bg-red-500 hover:bg-red-400'
                          : 'bg-[#3ec470] hover:bg-[#4ade80]',
                      )}
                    >
                      {bidTx.isLoading ? 'Placing bid…' : ended ? 'Auction ended' : `Bid ${fmtUsdc(payVal)} USDC`}
                    </button>
                  )}

                  <p className="mt-3 flex items-start gap-1.5 text-xs text-white/40">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3ec470]/60" />
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
                      onSuccess: invalidateAll,
                      successMessage: 'Auction finalized',
                    })
                  }
                  className="w-full rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-black text-amber-400 transition hover:bg-amber-500/20 disabled:opacity-40"
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
                      onSuccess: invalidateAll,
                      successMessage: 'Seller earnings claimed',
                    })
                  }
                  className="w-full rounded-xl bg-white px-4 py-3 text-sm font-black text-black transition hover:bg-white/90 disabled:opacity-50"
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
    <div className="rounded-2xl border border-white/[0.07] bg-[#161616] p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 md:text-xs">{label}</div>
      <div className={cn('mt-1.5 font-mono text-xl md:text-2xl font-black truncate', accent ? 'text-[#3ec470]' : 'text-white')}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-white/30">{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: number }) {
  const st = STATUS_LABEL[status];
  return (
    <span
      className={cn(
        'rounded-full px-3 py-1 text-xs font-black',
        st.tone === 'green' && 'bg-[#3ec470]/10 text-[#3ec470]',
        st.tone === 'blue' && 'bg-sky-500/10 text-sky-400',
        st.tone === 'amber' && 'bg-amber-500/10 text-amber-400',
        st.tone === 'red' && 'bg-red-500/10 text-red-400',
        st.tone === 'gray' && 'bg-white/5 text-white/50',
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
    <div className="rounded-2xl border border-white/[0.07] bg-[#161616] p-5 text-sm">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-white/70">
        <Trophy className="h-4 w-4 text-[#3ec470]" />
        Result
      </h2>
      {meta.status === AuctionStatus.SETTLED ? (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-white">{shortenAddress(meta.winner)}</span>
            <span className="rounded bg-[#3ec470]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#3ec470]">WINNER</span>
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
            <span className="font-mono text-[#3ec470]">{fmtUsdc(sellerNet)}</span>
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
    return <div className="h-14 animate-pulse rounded-xl bg-[#0f0f0f]" />;
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
        mine ? 'border-[#3ec470]/30 bg-[#3ec470]/[0.05]' : 'border-white/[0.06] bg-[#0f0f0f]',
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {/* 排名 */}
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] font-mono text-xs font-black text-white/50">
          #{batchId.toString()}
        </div>
        <div className="min-w-0">
          <div className="font-mono text-sm font-black text-white">
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
                isWinner ? 'bg-[#3ec470]/15 text-[#3ec470]' : 'bg-white/5 text-white/50',
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

        {canRefund && (
          <button
            onClick={() =>
              refundTx.write({
                address: useNadbidAuctionContract().address!,
                abi: nadbidAuctionAbi,
                functionName: 'claimRefund',
                args: [auctionId, batchId],
                onSuccess: invalidateAll,
                successMessage: 'Refund claimed',
              })
            }
            disabled={refundTx.isLoading}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-black text-white transition hover:bg-white/20 disabled:opacity-40"
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
                onSuccess: invalidateAll,
                successMessage: 'Dividends claimed',
              })
            }
            disabled={rewardTx.isLoading}
            className="rounded-lg bg-[#3ec470]/15 px-3 py-1.5 text-xs font-black text-[#3ec470] transition hover:bg-[#3ec470]/25 disabled:opacity-40"
          >
            {rewardTx.isLoading ? '…' : 'Claim dividends'}
          </button>
        )}
        {(st.refundClaimed || st.rewardClaimed) && (
          <span className="rounded bg-white/5 px-2 py-1 text-xs text-white/30">claimed</span>
        )}
      </div>
    </div>
  );
}
