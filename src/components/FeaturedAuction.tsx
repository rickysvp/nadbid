import { Gavel } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatDivider, StatItem, StatusBadge } from '@/components/ui';
import { useKolHoldingsStore } from '@/stores';
import type { FeaturedAuction as FeaturedAuctionModel } from '@/types';
import { formatCountdown, normalizeKolHandle } from '@/utils/format';

interface FeaturedAuctionProps {
  auction: FeaturedAuctionModel;
}

export default function FeaturedAuction({ auction }: FeaturedAuctionProps) {
  const { kol, title, countdown, bidPrice, routeId } = auction;
  const kolLink = `/kols/${normalizeKolHandle(kol.handle)}`;
  // 统一时钟（全局 ticker 每秒更新）驱动倒计时实时走秒。
  const nowUtcMs = useKolHoldingsStore((s) => s.nowUtcMs);
  const liveCountdown =
    auction.countdownTargetUtcMs !== undefined
      ? formatCountdown(auction.countdownTargetUtcMs, nowUtcMs)
      : countdown;

  return (
    <div className="w-full bg-surface-container-lowest rounded-[2.5rem] p-6 md:p-10 border-3 border-black shadow-neo-lg relative transform rotate-1">
      <div className="absolute -top-4 -left-4 bg-tertiary text-black px-4 py-2 font-mono text-sm uppercase font-black z-10 border-3 border-black shadow-neo-md">
        ⭐ FEATURED AUCTION
      </div>

      <StatusBadge
        label={auction.status === 'ongoing' ? 'Live Now' : 'Upcoming'}
        className="absolute top-6 right-6 gap-2 px-5 py-2 text-sm border-3 border-black shadow-neo-md transform rotate-2"
        dotClassName="w-2.5 h-2.5 border-2 border-black"
      />

      <div className="flex flex-col lg:flex-row gap-10 items-center lg:items-stretch mt-6">
        <div className="w-full lg:w-[45%] flex flex-col items-center justify-center">
          <Link
            to={kolLink}
            className="w-56 h-56 md:w-64 md:h-64 rounded-full overflow-hidden border-4 border-black shadow-neo-lg mb-6 group hover:scale-[1.02] transition-transform"
            aria-label={`Open ${kol.nickname} profile`}
          >
            <img
              alt={`${kol.nickname} avatar`}
              className="w-full h-full object-cover bg-primary-fixed"
              src={kol.avatarUrl}
              loading="lazy"
            />
          </Link>
          <div className="flex flex-col items-center">
            <Link
              to={kolLink}
              className="font-mono text-xl font-bold text-primary mb-3 px-1 hover:text-black transition-colors"
            >
              {kol.handle}
            </Link>
            <div className="flex gap-6 items-center">
              <StatItem orientation="vertical" label="Followers" value={kol.followers} />
              <StatDivider className="h-10" />
              <StatItem orientation="vertical" label="Holders" value={kol.holders} />
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[55%] flex flex-col justify-center">
          <div className="flex flex-col mb-8 items-center lg:items-start text-center lg:text-left">
            <Link
              to={kolLink}
              className="font-display text-5xl md:text-[4rem] font-black text-black mb-3 leading-none hover:text-primary transition-colors"
            >
              {kol.nickname}
            </Link>
            <p className="font-body text-xl text-on-surface-variant font-bold leading-snug">
              {title}
            </p>
          </div>

          <div className="bg-zinc-100 rounded-[2rem] py-6 px-4 border-3 border-black mb-10 w-full flex flex-col justify-center items-center transform -rotate-1 shadow-neo-lg">
            <span className="font-mono text-xs md:text-sm uppercase font-black text-on-surface-variant mb-2 tracking-[0.2em]">
              Countdown
            </span>
            <span className="font-mono font-black text-5xl md:text-7xl tracking-tighter text-black tabular-nums">
              {liveCountdown}
            </span>
          </div>

          <div className="flex flex-row justify-between items-center gap-4 mt-auto w-full">
            <div className="flex flex-col items-start shrink-0">
              <span className="font-body font-bold text-on-surface-variant text-xl leading-none mb-2">
                Bid Price
              </span>
              <span className="font-display font-black text-3xl xl:text-5xl text-primary leading-none whitespace-nowrap">
                {bidPrice}
              </span>
            </div>

            <Link
              to={`/auctions/${routeId}`}
              className="bg-primary text-white px-10 xl:px-14 py-5 xl:py-6 rounded-[2.5rem] font-display font-black text-2xl xl:text-3xl btn-hover active:scale-95 flex items-center justify-center gap-3 border-3 border-black shrink-0 shadow-neo-lg whitespace-nowrap"
            >
              <Gavel className="w-7 h-7 xl:w-8 xl:h-8 fill-white shrink-0" />
              Bid
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
