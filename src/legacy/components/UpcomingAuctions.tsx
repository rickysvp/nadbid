import { useCallback } from 'react';
import { ArrowRight, CalendarClock, Megaphone } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { SectionTitle, StatDivider, StatItem, StatusBadge } from '@/components/ui';
import { useKolHoldingsStore } from '@/stores';
import type { UpcomingAuction } from '@/types';
import { cn } from '@/utils/cn';
import { formatCountdown, normalizeKolHandle } from '@/utils/format';

interface UpcomingAuctionsProps {
  auctions: UpcomingAuction[];
  showCount?: boolean;
}

export default function UpcomingAuctions({ auctions, showCount = false }: UpcomingAuctionsProps) {
  const navigate = useNavigate();
  // 统一时钟驱动 startsIn 实时走秒。
  const nowUtcMs = useKolHoldingsStore((s) => s.nowUtcMs);
  const openAuction = useCallback((id: string) => navigate(`/auctions/${id}`), [navigate]);

  return (
    <section className="w-full px-container-padding max-w-7xl mx-auto pb-8">
      <div className="flex justify-between items-end mb-6">
        <SectionTitle
          icon={Megaphone}
          iconClassName="text-primary w-8 h-8 fill-primary stroke-black stroke-2"
          title="Upcoming Auctions"
          count={showCount ? auctions.length : undefined}
        />
      </div>

      {auctions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 bg-white border-3 border-black rounded-2xl shadow-neo-md py-14 px-6 text-center">
          <CalendarClock className="w-10 h-10 text-on-surface-variant" />
          <p className="font-display font-black text-xl text-black">No drops scheduled yet</p>
          <p className="font-body text-sm font-bold text-on-surface-variant max-w-sm leading-relaxed">
            New auctions go live every week. Follow your favorite KOLs so you never miss a drop.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-card-gap">
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
              className={cn(
                'bg-surface-container-lowest rounded-xl p-6 shadow-neo-md relative overflow-hidden group cursor-pointer border-3 border-black transition-transform flex flex-col outline-none focus:ring-4 focus:ring-primary/40',
                auction.visibilityClass ?? '',
              )}
            >
              <StatusBadge
                label="Upcoming"
                className="absolute top-4 right-4 z-10 gap-1.5 px-3 py-1.5 text-[10px] border-2 border-black shadow-neo-sm"
              />

              <div className="flex items-start gap-4 mb-4 pr-24">
                <Link
                  to={kolLink}
                  onClick={(e) => e.stopPropagation()}
                  className="w-14 h-14 rounded-full border-2 border-black object-cover shrink-0 overflow-hidden hover:scale-105 transition-transform"
                  aria-label={`Open ${auction.kol.nickname} profile`}
                >
                  <img
                    className="w-full h-full object-cover"
                    alt={auction.kol.nickname}
                    src={auction.kol.avatarUrl}
                    loading="lazy"
                  />
                </Link>
                <div className="flex flex-col min-w-0 flex-grow">
                  <Link
                    to={kolLink}
                    onClick={(e) => e.stopPropagation()}
                    className="font-display font-black text-xl text-black leading-tight line-clamp-1 hover:text-primary transition-colors"
                  >
                    {auction.kol.nickname}
                  </Link>
                  <span className="font-mono text-sm text-on-surface-variant font-bold mb-1">
                    {auction.kol.handle ?? 'Unknown KOL'}
                  </span>
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

              <div className="mb-5 flex-grow">
                <p className="font-body text-sm text-on-surface-variant font-medium line-clamp-3">
                  {auction.description}
                </p>
              </div>

              <div className="bg-surface-container-low p-4 rounded-lg mb-5 border-2 border-black shadow-neo-md">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono font-black text-on-surface-variant text-[10px] uppercase">
                    Bid Price
                  </span>
                  <span className="font-mono font-black text-on-surface-variant text-[10px] uppercase">
                    Starts In
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="font-mono font-black text-[22px] text-monad leading-none">
                    {auction.bidPrice}
                  </span>
                  <span className="font-mono font-black text-[18px] text-black leading-none tabular-nums">
                    {auction.startsAtUtcMs !== undefined
                      ? formatCountdown(auction.startsAtUtcMs, nowUtcMs)
                      : auction.startsIn}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center border-t-3 border-black pt-4 mt-auto">
                <span className="font-mono font-black text-[12px] text-on-surface-variant">
                  View Auction Details
                </span>
                <div className="bg-primary text-black px-4 py-2 rounded-md font-mono font-black text-xs uppercase flex items-center gap-2 group-hover:scale-105 transition-transform border-2 border-black shadow-neo-sm">
                  Enter
                  <ArrowRight className="w-4 h-4 stroke-3" />
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
