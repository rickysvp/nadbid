import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Gavel, TrendingUp, Trophy, ShieldCheck, Plus, Zap } from 'lucide-react';
import { ROUTES, nadbidDetailPath } from '../config/routes';
import { useAuctionList, fmtUsdc, STATUS_LABEL, ASSET_LABEL, AuctionStatus } from '../web3/hooks/useNadbidAuction';
import { shortenAddress } from '../utils/format';
import { cn } from '../utils/cn';

/**
 * 首页 — NADBID 链上拍卖协议
 * HERO + 机制三步 + 资金分配 + 最新拍卖预览
 */
export default function HomePage() {
  const { list } = useAuctionList();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const stats = useMemo(() => {
    if (!list) return null;
    const live = list.filter((a) => a.status === AuctionStatus.LIVE);
    const totalPool = list.reduce((acc, a) => acc + (a.totalPool > 0n ? a.totalPool : a.lastPrice), 0n);
    return {
      total: list.length,
      live: live.length,
      pool: totalPool,
      latest: [...list].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 3),
    };
  }, [list]);

  const steps = [
    {
      icon: <Gavel className="h-5 w-5" />,
      title: 'Place your bid',
      desc: 'Bid in USDC at the next price level. Your payment is retained on-chain — losing same-block bids are refunded instantly.',
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      title: 'Outbid? Keep earning',
      desc: '15% of every later bid flows to earlier bidders as dividends. The earlier you join, the more rounds you earn — up to 100x your bid.',
    },
    {
      icon: <Trophy className="h-5 w-5" />,
      title: 'Last bid wins',
      desc: 'When the 120s countdown expires, the final bidder takes the asset. The seller receives 85% of the pool, net of fees.',
    },
  ];

  return (
    <div className="text-[#111]">
      {/* ============ HERO ============ */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden pt-24">
        {/* 背景网格 + 光晕 */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(17,17,17,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(17,17,17,0.07) 1px, transparent 1px)',
              backgroundSize: '72px 72px',
            }}
          />
          <div className="absolute -top-40 left-1/4 h-[480px] w-[480px] rounded-full bg-[#ffe94a]/25 blur-[140px]" />
          <div className="absolute bottom-0 right-1/5 h-[380px] w-[380px] rounded-full bg-[#3ec4f0]/20 blur-[120px]" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 md:px-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center py-16">
          {/* 左：文案 */}
          <div className="lg:col-span-7">
            <div className="nb-chip bg-[#ffe94a] px-3.5 py-1.5 text-xs text-[#111]">
              <Zap className="h-3.5 w-3.5" />
              ON-CHAIN AUCTIONS · MONAD TESTNET
            </div>
            <h1 className="mt-6 text-5xl md:text-6xl xl:text-7xl font-black tracking-tighter leading-[1.02]">
              Bid low.
              <br />
              <span className="nb-sticker px-3 py-0.5 text-[#111]">Win big.</span>
              <br />
              Keep earning.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-[#111]/60 leading-relaxed">
              NADBID is a USDC-settled auction protocol. Every bid is a ticket — if someone outbids you, you keep
              earning dividends as the price climbs. Last bid takes the asset.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                to={ROUTES.NADBID}
                className="group inline-flex items-center gap-2.5 rounded-xl border-2 border-[#111] bg-[#3ec470] px-7 py-3.5 text-base font-black text-[#111] shadow-[3px_3px_0_#111] transition-all hover:bg-[#4ade80] hover:shadow-[5px_5px_0_#111] hover:-translate-y-0.5"
              >
                Explore auctions
                <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to={ROUTES.NADBID_CREATE}
                className="inline-flex items-center gap-2.5 rounded-xl border-2 border-[#111] bg-[#fffdf7] px-7 py-3.5 text-base font-bold text-[#111] shadow-[3px_3px_0_#111] transition-all hover:bg-[#ffe94a] hover:shadow-[5px_5px_0_#111] hover:-translate-y-0.5"
              >
                <Plus className="h-4.5 w-4.5" />
                List an asset
              </Link>
            </div>
          </div>

          {/* 右：实时数据卡 */}
          <div className="lg:col-span-5">
            <div className="nb-card p-7">
              <div className="flex items-center justify-between mb-6">
                <div className="text-xs font-bold uppercase tracking-wider text-[#111]/40">Live protocol</div>
                <span className="flex items-center gap-1.5 text-xs font-bold text-[#117a3d]">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3ec470] opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#3ec470]" />
                  </span>
                  On-chain
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Stat label="Auctions" value={stats ? String(stats.total) : '—'} />
                <Stat label="Live now" value={stats ? String(stats.live) : '—'} accent />
                <Stat label="Total pool" value={stats ? fmtUsdc(stats.pool) : '—'} />
              </div>

              {/* 最新拍卖预览 */}
              <div className="mt-6 space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-[#111]/40">Latest auctions</div>
                {!stats || stats.latest.length === 0 ? (
                  <div className="nb-card-flat p-5 text-center text-sm text-[#111]/40">
                    No auctions yet — be the first to list.
                  </div>
                ) : (
                  stats.latest.map((a) => {
                    const st = STATUS_LABEL[a.status];
                    const ended = a.status === AuctionStatus.LIVE && nowMs >= Number(a.deadline) * 1000;
                    const secsLeft =
                      a.status === AuctionStatus.LIVE
                        ? Math.max(0, Math.ceil((Number(a.deadline) * 1000 - nowMs) / 1000))
                        : 0;
                    return (
                      <Link
                        key={a.id.toString()}
                        to={nadbidDetailPath(a.id)}
                        className="nb-card-flat flex items-center justify-between px-4 py-3 transition hover:translate-x-1"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-xs text-[#111]/40">#{a.id.toString()}</span>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-[#111]">
                              {fmtUsdc(a.lastPrice > 0n ? a.lastPrice : a.startPrice)}{' '}
                              <span className="font-normal text-[#111]/40">USDC</span>
                            </div>
                            <div className="text-[11px] text-[#111]/40 truncate">
                              {ASSET_LABEL[a.assetType] ?? 'Asset'} · {shortenAddress(a.assetAddr)}
                            </div>
                          </div>
                        </div>
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
                            a.status === AuctionStatus.LIVE
                              ? ended
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'bg-[#3ec470]/10 text-[#117a3d]'
                              : st.tone === 'gray'
                                ? 'bg-[#111]/5 text-[#111]/50'
                                : 'bg-sky-500/10 text-sky-400',
                          )}
                        >
                          {a.status === AuctionStatus.LIVE ? (ended ? 'Ending' : `${secsLeft}s`) : st.text}
                        </span>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 机制三步 ============ */}
      <section className="mx-auto max-w-7xl px-6 md:px-10 py-24">
        <div className="text-center mb-14">
          <div className="text-xs font-black uppercase tracking-[0.2em] text-[#117a3d]">How it works</div>
          <h2 className="mt-3 text-4xl md:text-5xl font-black tracking-tighter">One bid. Three ways to win.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="relative nb-card p-7 transition hover:-translate-y-1 hover:shadow-[6px_6px_0_#111]"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="nb-card-flat flex h-11 w-11 items-center justify-center bg-[#3ec470]/15 text-[#117a3d]">
                  {s.icon}
                </div>
                <span className="font-mono text-4xl font-black text-[#111]/[0.06]">0{i + 1}</span>
              </div>
              <h3 className="text-lg font-black text-[#111]">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#111]/50">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============ 资金分配 ============ */}
      <section className="mx-auto max-w-7xl px-6 md:px-10 pb-24">
        <div className="nb-card p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-12">
            <div className="md:w-1/2">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-[#117a3d]">Payout structure</div>
              <h3 className="mt-3 text-3xl font-black tracking-tighter">Where every bid goes</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#111]/50 max-w-md">
                Every retained bid enters the pool. At settlement the pool is split — the seller takes the majority,
                earlier bidders keep earning, and the protocol charges a flat fee on each side.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Pill>85% → Seller</Pill>
                <Pill>15% → Bidder dividends</Pill>
                <Pill>1% bid fee</Pill>
                <Pill>5% settle fee</Pill>
              </div>
              <p className="mt-5 flex items-start gap-2 text-xs text-[#111]/40">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#117a3d]" />
                Missed the reserve? The auction is cancelled and every bid is refunded in full.
              </p>
            </div>
            {/* 分配条 */}
            <div className="md:w-1/2">
              <div className="flex h-14 w-full overflow-hidden rounded-xl border-2 border-[#111] shadow-[3px_3px_0_#111]">
                <div className="flex items-center justify-center bg-[#3ec470] font-black text-sm text-[#111]" style={{ width: '85%' }}>
                  85%
                </div>
                <div className="flex items-center justify-center bg-[#ffe94a] font-black text-sm text-[#111]" style={{ width: '15%' }}>
                  15%
                </div>
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-[#111]/40">
                <span>Seller share</span>
                <span>Bidder dividend pool</span>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-3">
                <div className="nb-card-flat p-4">
                  <div className="text-[11px] text-[#111]/40">Auction duration</div>
                  <div className="mt-1 font-mono text-lg font-black text-[#111]">120s</div>
                  <div className="text-[11px] text-[#111]/40">reset on every bid</div>
                </div>
                <div className="nb-card-flat p-4">
                  <div className="text-[11px] text-[#111]/40">Dividend cap</div>
                  <div className="mt-1 font-mono text-lg font-black text-[#117a3d]">100x</div>
                  <div className="text-[11px] text-[#111]/40">max return on a bid</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 尾部 CTA ============ */}
      <section className="mx-auto max-w-7xl px-6 md:px-10 pb-28">
        <div className="relative overflow-hidden rounded-3xl border-2 border-[#111] bg-[#ffe94a] px-8 py-14 md:px-14 text-center shadow-[8px_8px_0_#111]">
          <div className="absolute -top-24 left-1/2 h-64 w-[560px] -translate-x-1/2 rounded-full bg-[#fffdf7]/60 blur-[80px]" />
          <h2 className="relative text-3xl md:text-5xl font-black tracking-tighter">Ready to bid?</h2>
          <p className="relative mt-4 text-[#111]/50 max-w-xl mx-auto text-sm md:text-base">
            Low entry, real assets, dividends while you wait. The next price level is one click away.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to={ROUTES.NADBID}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-[#111] bg-[#fffdf7] px-8 py-3.5 font-black text-[#111] shadow-[4px_4px_0_#111] transition hover:bg-[#3ec470] hover:shadow-[6px_6px_0_#111]"
            >
              Enter the auction room
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="nb-card-flat p-3.5">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#111]/40">{label}</div>
      <div className={cn('mt-1 font-mono text-lg font-black truncate', accent ? 'text-[#117a3d]' : 'text-[#111]')}>
        {value}
      </div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="nb-chip bg-[#3ec470]/15 px-3 py-1 text-xs text-[#111]">
      {children}
    </span>
  );
}
