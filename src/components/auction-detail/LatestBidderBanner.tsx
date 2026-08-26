import type { Bidder } from '@/types';

interface LatestBidderBannerProps {
  bidder: Bidder;
}

/** Yellow banner highlighting the most recent bidder. */
export default function LatestBidderBanner({ bidder }: LatestBidderBannerProps) {
  const displayName = bidder.nickname ?? bidder.address;

  return (
    <div className="bg-tertiary rounded-xl p-4 border-3 border-black shadow-neo-md flex flex-row justify-between items-center transform rotate-1 transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full border-2 border-black overflow-hidden bg-white shrink-0 shadow-neo-sm">
          {bidder.avatarUrl ? (
            <img src={bidder.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="font-mono text-[10px] font-black">{bidder.address.slice(2, 4)}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <span className="font-mono text-[10px] uppercase font-black text-black/70 tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-error pulse-live" aria-hidden="true" />
            Latest Bidder
          </span>
          <span className="font-display text-lg md:text-xl font-black text-black leading-none mt-0.5">
            {displayName}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end text-right">
        <span className="font-mono text-[10px] font-bold text-black/70 uppercase mb-1">
          Total Cost ({bidder.bidCount} Bids)
        </span>
        <span className="font-mono font-black text-2xl text-black leading-none">
          {bidder.totalAmount} <span className="text-sm">$MON</span>
        </span>
      </div>
    </div>
  );
}
