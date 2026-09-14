import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Gavel, Plus, Zap } from 'lucide-react';
import { ROUTES, nadbidDetailPath } from '../config/routes';
import { useAuctionList, fmtUsdc, STATUS_LABEL, ASSET_LABEL, AuctionStatus } from '../web3/hooks/useNadbidAuction';
import { shortenAddress } from '../utils/format';
import { cn } from '../utils/cn';
import { CircularProgress } from '../components/ui/CircularProgress';
import { AssetThumb } from '../components/ui/AssetThumb';
import { useAssetMeta } from '../web3/hooks/useAssetMeta';

const DURATION_SECONDS = 120;
const WARNING_SECONDS = 15;

/**
 * 首页 — NADBID 拍卖大厅
 * HERO 直接展示主推拍卖（最近创建的 LIVE 拍卖；无 LIVE 则最后一次拍卖），
 * 点击卡片进入详情页参与；下方为全部拍卖入口。
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
    <div className="text-[#111]">
      {/* ============ HERO：主推拍卖 ============ */}
      <section className="relative overflow-hidden pt-28 pb-10">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(17,17,17,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(17,17,17,0.08) 1px, transparent 1px)',
              backgroundSize: '72px 72px',
            }}
          />
          <div className="absolute -top-40 left-1/4 h-[460px] w-[460px] rounded-full bg-[#ffe94a]/20 blur-[140px]" />
          <div className="absolute bottom-0 right-1/5 h-[360px] w-[360px] rounded-full bg-[#3ec4f0]/15 blur-[120px]" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 md:px-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="nb-chip bg-[#ffe94a] px-3.5 py-1.5 text-xs font-black text-[#111]">
              <Zap className="mr-1 inline h-3.5 w-3.5" />
              ON-CHAIN AUCTIONS · MONAD TESTNET
            </div>
            {list && (
              <span
                className={cn(
                  'rounded-xl border-2 border-[#111] px-3 py-1 text-xs font-black shadow-[2px_2px_0_#111]',
                  liveCount > 0 ? 'bg-[#8b5cf6]/15 text-[#117a3d]' : 'bg-[#fffdf7] text-white/50',
                )}
              >
                {liveCount > 0 ? `${liveCount} LIVE NOW` : 'NO LIVE AUCTIONS'} · {list.length} TOTAL
              </span>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* 左：主拍大卡 */}
            <div className="lg:col-span-8">
              {featured ? <FeaturedAuctionCard auction={featured} nowMs={nowMs} /> : <EmptyStateCard />}
            </div>

            {/* 右：进入入口 + 规则速记 */}
            <div className="lg:col-span-4 flex flex-col gap-5">
              <div className="nb-card p-6">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-[#117a3d]">How it works</div>
                  <span className="rounded-md border-2 border-[#111]/25 bg-[#fffdf7] px-2 py-0.5 font-mono text-[10px] font-black text-[#111]/50">
                    3 STEPS
                  </span>
                </div>
                <ul className="mt-4 divide-y-2 divide-[#111]/10 text-sm leading-snug text-[#111]/70">
                  <li className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="mt-0.5 shrink-0 rounded-md border-2 border-[#111] bg-[#8b5cf6] px-2 py-0.5 font-mono text-[11px] font-black">1</span>
                    <span>
                      <span className="font-black text-[#111]">Bid</span> USDC at the next price — payment retained on-chain.
                    </span>
                  </li>
                  <li className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="mt-0.5 shrink-0 rounded-md border-2 border-[#111] bg-[#3ec4f0] px-2 py-0.5 font-mono text-[11px] font-black">2</span>
                    <span>
                      <span className="font-black text-[#111]">Outbid?</span> You still earn from 15% of every new bid.
                    </span>
                  </li>
                  <li className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="mt-0.5 shrink-0 rounded-md border-2 border-[#111] bg-[#ff6ba9] px-2 py-0.5 font-mono text-[11px] font-black">3</span>
                    <span>
                      <span className="font-black text-[#111]">Last bid</span> when the 120s clock ends wins. Seller keeps 85%.
                    </span>
                  </li>
                </ul>
              </div>

              <Link
                to={ROUTES.NADBID}
                className="nb-card-flat group flex items-center justify-between p-5 transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#111]"
              >
                <div>
                  <div className="text-sm font-black">Browse all auctions</div>
                  <div className="mt-0.5 text-xs text-[#111]/50">Every live, settled &amp; cancelled sale</div>
                </div>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                to={ROUTES.NADBID_CREATE}
                className="nb-card-flat group flex items-center justify-between border-2 border-[#111] bg-[#ffe94a] p-5 transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#111]"
              >
                <div>
                  <div className="text-sm font-black">List an asset</div>
                  <div className="mt-0.5 text-xs text-[#111]/60">ERC-20 · ERC-721 · ERC-1155</div>
                </div>
                <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 全部拍卖入口 ============ */}
      {recent && recent.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 md:px-10 pb-24">
          <div className="nb-card p-6 md:p-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-black tracking-tighter">Recent auctions</h2>
              <Link to={ROUTES.NADBID} className="group inline-flex items-center gap-1 text-sm font-bold text-[#117a3d]">
                View all <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recent.map((a) => {
                const st = STATUS_LABEL[a.status] ?? { text: 'Unknown', tone: 'gray' };
                const price = a.lastPrice > 0n ? a.lastPrice : a.startPrice;
                return (
                  <Link
                    key={a.id.toString()}
                    to={nadbidDetailPath(a.id)}
                    className="nb-card-flat flex items-center justify-between gap-3 px-4 py-3.5 transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#111]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs font-black text-[#111]/40">#{a.id.toString()}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-[#111]">
                          {fmtUsdc(price)} <span className="font-normal text-[#111]/40">USDC</span>
                        </div>
                        <div className="text-[11px] text-[#111]/50 truncate">
                          {ASSET_LABEL[a.assetType] ?? 'Asset'} · {shortenAddress(a.assetAddr)}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={cn(
                          'rounded-md border-2 px-2 py-0.5 text-[10px] font-black',
                          a.status === AuctionStatus.LIVE
                            ? 'border-[#117a3d] bg-[#8b5cf6]/15 text-[#117a3d]'
                            : a.status === AuctionStatus.SETTLED
                              ? 'border-[#3ec4f0] bg-[#3ec4f0]/10 text-[#0e7490]'
                              : 'border-[#111]/25 bg-[#111]/5 text-[#111]/50',
                        )}
                      >
                        {st.text}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-[#111]/40">Pool {fmtUsdc(a.totalPool)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

/* ============ 主推拍卖卡 ============ */
function FeaturedAuctionCard({ auction: a, nowMs }: { auction: NonNullable<ReturnType<typeof useAuctionList>['list']>[number]; nowMs: number }) {
  const price = a.lastPrice > 0n ? a.lastPrice : a.startPrice;
  const isLive = a.status === AuctionStatus.LIVE;
  const ended = isLive && nowMs >= Number(a.deadline) * 1000;
  const secsLeft = isLive ? Math.max(0, Math.ceil((Number(a.deadline) * 1000 - nowMs) / 1000)) : 0;
  const progress = isLive ? Math.min(100, Math.max(0, (secsLeft / DURATION_SECONDS) * 100)) : 0;
  const danger = isLive && !ended && secsLeft <= WARNING_SECONDS;
  const st = STATUS_LABEL[a.status] ?? { text: 'Unknown', tone: 'gray' };
  const assetMeta = useAssetMeta(a.assetType, a.assetAddr, a.assetType === 1 ? a.assetTokenId : undefined);

  return (
    <div className="relative nb-card overflow-hidden p-7 md:p-9 transition hover:-translate-y-1 hover:shadow-[8px_8px_0_#111]">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-[#8b5cf6]" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="nb-sticker bg-[#ffe94a] px-3 py-1 text-[11px] font-black text-[#111]">
            <Gavel className="mr-1 inline h-3 w-3" />
            FEATURED AUCTION
          </span>
          <span
            className={cn(
              'rounded-md border-2 px-2.5 py-0.5 text-xs font-black',
              isLive
                ? ended
                  ? 'border-[#f5a623] bg-[#f5a623]/15 text-[#b45309]'
                  : 'border-[#117a3d] bg-[#8b5cf6]/15 text-[#117a3d]'
                : st.tone === 'blue'
                  ? 'border-[#3ec4f0] bg-[#3ec4f0]/10 text-[#0e7490]'
                  : 'border-[#111]/25 bg-[#111]/5 text-[#111]/50',
            )}
          >
            {isLive ? (ended ? 'Ending — finalize' : 'Live') : st.text}
          </span>
        </div>
        <span className="font-mono text-xs font-black text-[#111]/35">AUCTION #{a.id.toString()}</span>
      </div>

      {/* 左图右文：拍品 LOGO + 介绍 */}
      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* 左：代币图标 / NFT 图片 */}
        <div>
          <AssetThumb
            assetType={a.assetType}
            assetAddr={a.assetAddr}
            tokenId={a.assetType === 1 ? a.assetTokenId : undefined}
            variant="hero"
            className="aspect-square w-full h-auto"
          />
        </div>

        {/* 右：介绍 */}
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-2xl font-black tracking-tighter md:text-3xl">
            {assetMeta.data?.name ?? (assetMeta.isLoading ? 'Loading asset…' : 'Unnamed asset')}
            {a.assetType === 1 && <span className="text-[#117a3d]"> #{a.assetTokenId.toString()}</span>}
            {a.assetType !== 1 && a.assetAmount > 0n && (
              <span className="text-[#111]/50"> × {fmtUsdc(a.assetAmount)}</span>
            )}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#111]/50">
            <span className="nb-chip bg-[#8b5cf6]/15 px-2 py-0.5 text-[11px] text-white">
              {ASSET_LABEL[a.assetType] ?? 'Asset'}
            </span>
            <span className="font-mono">{shortenAddress(a.assetAddr)}</span>
            {assetMeta.data?.symbol && <span className="font-mono">· {assetMeta.data.symbol}</span>}
            <span className="text-[#111]/20">·</span>
            <span>
              Seller <span className="font-mono font-bold text-[#111]/70">{shortenAddress(a.seller)}</span>
            </span>
            {a.reservePrice > 0n && (
              <span className="nb-chip bg-[#f5a623]/15 px-2 py-0.5 text-[11px] text-[#b45309]">
                Reserve {fmtUsdc(a.reservePrice)}
              </span>
            )}
          </div>

          {/* 数据行 */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="nb-card-flat p-3.5">
              <div className="text-[10px] font-black uppercase tracking-wider text-[#111]/40">Current price</div>
              <div className="mt-1 font-mono text-xl font-black">{fmtUsdc(price)}</div>
              <div className="text-[10px] text-[#111]/40">USDC</div>
            </div>
            <div className="nb-card-flat p-3.5">
              <div className="text-[10px] font-black uppercase tracking-wider text-[#111]/40">Total pool</div>
              <div className="mt-1 font-mono text-xl font-black">{fmtUsdc(a.totalPool)}</div>
              <div className="text-[10px] text-[#111]/40">USDC retained</div>
            </div>
            <div className="nb-card-flat p-3.5">
              <div className="text-[10px] font-black uppercase tracking-wider text-[#111]/40">Next bid</div>
              <div className="mt-1 font-mono text-xl font-black">
                {fmtUsdc(a.lastPrice > 0n ? a.lastPrice + (a.lastPrice * a.incrementBps) / 10000n : a.startPrice)}
              </div>
              <div className="text-[10px] text-[#111]/40">+{Number(a.incrementBps) / 100}%</div>
            </div>
          </div>

          {/* 倒计时 / 终局 + CTA */}
          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-5">
            <div className="flex items-center gap-4">
              {isLive ? (
                <CircularProgress
                  progress={ended ? 0 : progress}
                  size={88}
                  strokeWidth={6}
                  label={ended ? '0' : `${secsLeft}`}
                  sublabel={ended ? 'Ended' : danger ? 'Final seconds' : 'seconds left'}
                  danger={danger}
                />
              ) : (
                <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full border-2 border-[#111] bg-[#111] text-center text-[#fffdf7]">
                  <div>
                    <div className="font-mono text-lg font-black leading-none">{st.text}</div>
                    <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-[#fffdf7]/60">status</div>
                  </div>
                </div>
              )}
              <div className="max-w-[200px]">
                <div className="text-xs font-black uppercase tracking-wider text-[#111]/40">
                  {isLive ? 'Countdown' : 'Final result'}
                </div>
                <div className={cn('mt-1 text-sm font-bold leading-snug', danger ? 'text-[#ff4d4f]' : 'text-[#111]/70')}>
                  {isLive
                    ? ended
                      ? 'Timer ran out — finalize to settle the auction.'
                      : danger
                        ? 'Last 15 seconds! Bid to reset the 120s clock.'
                        : 'Timer resets to 120s on every bid.'
                    : a.winner !== '0x0000000000000000000000000000000000000000'
                      ? `Won at ${fmtUsdc(a.finalPrice)} USDC by ${shortenAddress(a.winner)}`
                      : 'Auction closed without a winner.'}
                </div>
              </div>
            </div>

            <Link
              to={nadbidDetailPath(a.id)}
              className="sm:ml-auto inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#111] bg-[#8b5cf6] px-8 py-4 text-base font-black text-white shadow-[4px_4px_0_#111] transition hover:bg-[#a78bfa] hover:shadow-[6px_6px_0_#111] hover:-translate-y-0.5"
            >
              {isLive && !ended ? 'Place a bid' : 'View auction'}
              <ArrowRight className="h-4.5 w-4.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ 空态 ============ */
function EmptyStateCard() {
  return (
    <div className="nb-card flex flex-col items-center justify-center p-12 text-center">
      <div className="nb-sticker bg-[#ffe94a] px-4 py-2 text-sm font-black text-[#111]">NO AUCTIONS YET</div>
      <p className="mt-5 max-w-sm text-sm leading-relaxed text-[#111]/60">
        Nothing on the block right now. List the first asset — any ERC-20, ERC-721 or ERC-1155 on Monad testnet — and
        bidders will follow.
      </p>
      <Link
        to={ROUTES.NADBID_CREATE}
        className="mt-7 inline-flex items-center gap-2 rounded-xl border-2 border-[#111] bg-[#ffe94a] px-7 py-3.5 font-black text-[#111] shadow-[4px_4px_0_#111] transition hover:shadow-[6px_6px_0_#111] hover:-translate-y-0.5"
      >
        <Plus className="h-4.5 w-4.5" />
        List the first auction
      </Link>
    </div>
  );
}
