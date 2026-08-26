import { Trophy } from 'lucide-react';
import type { Bidder } from '@/types';

interface BidBoardProps {
  bidders: Bidder[];
}

/** Ranked list of all auction participants. */
export default function BidBoard({ bidders }: BidBoardProps) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 md:p-8 border-3 border-black shadow-neo-md">
      <h3 className="font-display text-2xl font-black mb-2 flex items-center gap-2 text-black">
        <Trophy className="w-6 h-6 text-tertiary fill-tertiary stroke-black stroke-2" />
        Bid Board
      </h3>
      <p className="font-mono text-xs text-on-surface-variant mb-6 font-bold leading-relaxed">
        All participants are shown below. Only the final valid bid wins the auction.
      </p>

      <div className="flex flex-col gap-3">
        {bidders.map((bidder) => {
          const displayName = bidder.nickname ?? bidder.address;
          return (
            <div
              key={bidder.rank}
              className={`flex items-center justify-between p-3 rounded-xl border-2 border-black shadow-neo-sm ${
                bidder.rank === 1 ? 'bg-tertiary/20' : 'bg-white'
              }`}
            >
              <div className="flex items-center gap-3 md:gap-4">
                <span className="font-mono font-black text-lg w-4 text-black">{bidder.rank}</span>

                {bidder.avatarUrl ? (
                  <img
                    src={bidder.avatarUrl}
                    alt={displayName}
                    className="w-10 h-10 rounded-full border-2 border-black object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-surface-dim border-2 border-black flex items-center justify-center shrink-0">
                    <span className="font-mono text-[10px] font-black">
                      {bidder.address.slice(2, 4)}
                    </span>
                  </div>
                )}

                <div className="flex flex-col">
                  <span className="font-display font-black text-base text-black leading-tight">
                    {displayName}
                  </span>
                  {bidder.handle && (
                    <span className="font-mono text-[10px] font-bold text-primary uppercase mt-0.5">
                      {bidder.handle}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end">
                <span className="font-mono font-black text-black text-lg leading-none mb-1">
                  {bidder.totalAmount} <span className="text-[10px] text-primary">$MON</span>
                </span>
                <span className="font-mono text-[10px] font-bold text-on-surface-variant uppercase">
                  {bidder.bidCount} bids placed
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
