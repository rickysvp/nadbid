import { useCallback } from 'react';
import { Activity, ArrowRight, Clock, Hourglass } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { SectionTitle, StatDivider, StatItem } from '@/components/ui';
import { useKolHoldingsStore } from '@/stores';
import type { OngoingAuction } from '@/types';
import { cn } from '@/utils/cn';
import { formatCountdown, normalizeKolHandle } from '@/utils/format';

interface OngoingAuctionsListProps {
  auctions: OngoingAuction[];
  showCount?: boolean;
}

export default function OngoingAuctionsList({
  auctions,
  showCount = false,
}: OngoingAuctionsListProps) {
  const navigate = useNavigate();
  // 统一时钟驱动 timeLeft 实时走秒。
  const nowUtcMs = useKolHoldingsStore((s) => s.nowUtcMs);

  const openAuction = useCallback((id: string) => navigate(`/auctions/${id}`), [navigate]);

  return (
    <section className="w-full max-w-7xl mx-auto flex flex-col px-container-padding">
      <div className="flex justify-between items-end mb-6">
        <SectionTitle
          icon={Activity}
          iconClassName="text-secondary w-8 h-8 stroke-black stroke-2"
          title="Ongoing Auctions"
          count={showCount ? auctions.length : undefined}
        />
      </div>

      {auctions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 bg-white border-3 border-black rounded-2xl shadow-neo-md py-14 px-6 text-center">
          <Hourglass className="w-10 h-10 text-on-surface-variant" />
          <p className="font-display font-black text-xl text-black">No live auctions right now</p>
          <p className="font-body text-sm font-bold text-on-surface-variant max-w-sm leading-relaxed">
            Check the upcoming drops below, or browse KOL profiles to see who fires next.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {auctions.map((auction) => {
          const handle = normalizeKolHandle(auction.kol.handle);
          const kolLink = handle ? `/kols/${handle}` : '/kols';
          return (
            <div
              key={auction.id}
              role="link"
              tabIndex={0}
              onClick={() => openAuction(auction.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openAuction(auction.id);
                }
              }}
              className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 md:p-5 bg-white border-3 border-black rounded-2xl shadow-neo-md hover:-translate-y-1 transition-transform group gap-4 md:gap-4 cursor-pointer outline-none focus:ring-4 focus:ring-primary/40"
            >
              <div className="flex items-center gap-4 w-full md:w-[30%] min-w-0 shrink-0">
                <Link
                  to={kolLink}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    'w-12 h-12 rounded-full border-3 border-black p-0.5 shrink-0 hover:scale-105 transition-transform',
                    auction.avatarAccentClass,
                  )}
                  aria-label={`Open ${auction.kol.nickname} profile`}
                >
                  <img
                    src={auction.kol.avatarUrl}
                    alt={auction.kol.nickname}
                    className="w-full h-full rounded-full object-cover border border-black"
                    loading="lazy"
                  />
                </Link>
                <div className="flex flex-col overflow-hidden w-full">
                  <Link
                    to={kolLink}
                    onClick={(e) => e.stopPropagation()}
                    className="font-display font-black text-lg text-black truncate pr-2 hover:text-primary transition-colors"
                  >
                    {auction.kol.nickname}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <StatItem label="Followers" value={auction.kol.followers} />
                    <StatDivider />
                    <StatItem
                      label="Holders"
                      value={auction.kol.holders}
                      valueClass="text-secondary"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between md:justify-start w-full md:w-[35%] gap-4 md:gap-8 border-y-2 border-black/10 md:border-y-0 py-3 md:py-0 shrink-0">
                <div className="flex flex-col">
                  <span className="font-mono text-[10px] uppercase text-on-surface-variant font-bold">
                    TVL
                  </span>
                  <span className="font-mono text-lg font-black text-black whitespace-nowrap">
                    {auction.tvl} <span className="text-xs text-primary">$MON</span>
                  </span>
                </div>
                <div className="flex flex-col md:items-end">
                  <span className="font-mono text-[10px] uppercase text-on-surface-variant font-bold">
                    Bidders
                  </span>
                  <span className="font-mono text-lg font-black text-black whitespace-nowrap">
                    {auction.participants}
                  </span>
                </div>
                <div className="flex-col md:items-end hidden sm:flex">
                  <span className="font-mono text-[10px] uppercase text-on-surface-variant font-bold">
                    Total Bids
                  </span>
                  <span className="font-mono text-lg font-black text-black whitespace-nowrap">
                    {auction.totalBids}
                  </span>
                </div>
              </div>

              <div className="flex justify-between w-full md:w-auto md:flex-1 md:justify-end gap-4 md:gap-6 items-center shrink-0">
                <div className="flex flex-col md:items-end">
                  <span className="font-mono text-[10px] uppercase text-on-surface-variant font-bold">
                    Bid Price
                  </span>
                  <span className="font-mono text-lg font-black text-primary whitespace-nowrap">
                    {auction.bidPrice}
                  </span>
                </div>

                <div className="flex flex-col md:items-end">
                  <span className="font-mono text-[10px] uppercase text-on-surface-variant font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Timer
                  </span>
                  <span className="font-mono text-lg font-black text-error whitespace-nowrap tabular-nums">
                    {auction.endsAtUtcMs !== undefined
                      ? formatCountdown(auction.endsAtUtcMs, nowUtcMs)
                      : auction.timeLeft}
                  </span>
                </div>

                <div className="hidden md:flex items-center justify-center w-10 h-10 shrink-0 rounded-full border-3 border-black bg-zinc-100 group-hover:bg-primary group-hover:text-white transition-colors shadow-neo-sm md:ml-2">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
          })}
        </div>
      )}
    </section>
  );
}
