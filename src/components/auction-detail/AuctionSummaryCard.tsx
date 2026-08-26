import { Clock, Gavel } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '@/components/ui';
import type { AuctionKolWithHandle, AuctionLiveStats, KolAuctionStatus } from '@/types';
import { normalizeKolHandle } from '@/utils/format';

const STATUS_LABEL: Record<KolAuctionStatus, string> = {
  ongoing: 'Ongoing',
  upcoming: 'Upcoming',
  past: 'Settled',
};

interface AuctionSummaryCardProps {
  kol: AuctionKolWithHandle;
  description: string;
  liveStats: AuctionLiveStats;
  /** Live-state of this auction; drives the corner pill label. */
  status?: KolAuctionStatus;
  onPlaceBid?: () => void;
}

/** Main auction card: KOL identity, description, live stats and bid CTA. */
export default function AuctionSummaryCard({
  kol,
  description,
  liveStats,
  status = 'ongoing',
  onPlaceBid,
}: AuctionSummaryCardProps) {
  const kolLink = `/kols/${normalizeKolHandle(kol.handle)}`;

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-5 md:p-6 border-3 border-black shadow-neo-lg relative">
      <StatusBadge
        label={STATUS_LABEL[status]}
        className="absolute top-4 right-4 gap-2 px-4 py-1.5 text-[10px] border-2 border-black shadow-neo-sm"
      />

      <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6 mb-5 mt-2 md:mt-0">
        <Link
          to={kolLink}
          className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-black shrink-0 shadow-neo-md hover:scale-[1.03] transition-transform"
          aria-label={`Open ${kol.nickname} profile`}
        >
          <img
            alt={`${kol.nickname} avatar`}
            className="w-full h-full object-cover"
            src={kol.avatarUrl}
            loading="lazy"
          />
        </Link>
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <Link
            to={kolLink}
            className="font-display text-3xl md:text-4xl font-black text-black mb-1 hover:text-primary transition-colors"
          >
            {kol.nickname}
          </Link>
          <Link
            to={kolLink}
            className="font-mono text-base font-bold text-primary mb-3 hover:text-black transition-colors"
          >
            {kol.handle}
          </Link>

          <div className="flex items-center gap-2">
            <div className="border border-black/10 rounded-md px-2 py-0.5 flex items-baseline gap-1">
              <span className="font-mono text-sm font-black text-black">{kol.followers}</span>
              <span className="font-mono text-[9px] uppercase text-on-surface-variant font-bold">
                Followers
              </span>
            </div>
            <div className="border border-black/10 rounded-md px-2 py-0.5 flex items-baseline gap-1">
              <span className="font-mono text-sm font-black text-secondary">{kol.holders}</span>
              <span className="font-mono text-[9px] uppercase text-on-surface-variant font-bold">
                Holders
              </span>
            </div>
          </div>
        </div>
      </div>

      <p className="font-body text-sm text-on-surface-variant mb-5 bg-bg-deep p-4 rounded-xl border-2 border-black shadow-neo-md">
        {description}
      </p>

      <div className="bg-white rounded-xl p-4 border-3 border-black mb-5 flex flex-col md:flex-row justify-between items-center gap-4 shadow-neo-md">
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <span className="font-mono font-black text-on-surface-variant text-[10px] uppercase mb-1">
            Cost Per Bid (X)
          </span>
          <span className="font-mono font-black text-2xl text-primary">{liveStats.costPerBid}</span>
        </div>

        <div className="w-px h-10 bg-black/20 hidden md:block" />

        <div className="flex flex-col items-center text-center">
          <span className="font-mono font-black text-on-surface-variant text-[10px] uppercase mb-1">
            Total Bids
          </span>
          <span className="font-mono font-black text-2xl text-black">{liveStats.totalBids}</span>
        </div>

        <div className="w-px h-10 bg-black/20 hidden md:block" />

        <div className="flex flex-col items-center md:items-end text-center md:text-right">
          <span className="font-mono font-black text-on-surface-variant text-[10px] uppercase mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Timer
          </span>
          <span className="font-mono font-black text-2xl text-error">{liveStats.timeLeft}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onPlaceBid}
        className="bg-primary text-black w-full px-6 py-3 rounded-lg font-display font-black text-xl btn-hover active:scale-95 flex items-center justify-center gap-3 border-2 border-black shadow-neo-lg"
      >
        <Gavel className="w-6 h-6 fill-black stroke-black stroke-2" />
        PLACE BID
      </button>
    </div>
  );
}
