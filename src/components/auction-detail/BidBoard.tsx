import { Trophy } from 'lucide-react';
import type { Bidder } from '@/types';

interface BidBoardProps {
  bidders: Bidder[];
}

/**
 * Vertically ranked bid board.
 *
 * SPEC §6.4 + §6.5 — every bidder that placed a successful paid bid must be
 * visible (recorded via recordBidder / emit BidPlaced). Layout is a single
 * vertical list with a bounded max-height + native vertical scroll, so users
 * can swipe / scroll down to see every rank (including ranks far below the
 * top card on small screens) without the section ever taking the whole page.
 */
export default function BidBoard({ bidders }: BidBoardProps) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 md:p-8 border-3 border-black shadow-neo-md">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h3 className="font-display text-2xl font-black flex items-center gap-2 text-black">
            <Trophy className="w-6 h-6 text-tertiary fill-tertiary stroke-black stroke-2" />
            Bid Board
          </h3>
          <p className="font-mono text-xs text-on-surface-variant mt-1 font-bold leading-relaxed">
            All paid bidders ranked by their cumulative amount in this auction.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase font-black text-on-surface-variant">
          <span className="px-2 py-1 rounded bg-white border-2 border-black shadow-neo-sm">
            {bidders.length} bidders
          </span>
        </div>
      </div>

      {/* ======= 竖向列表：可滚动，下滑查看所有排名 ======= */}
      <div className="flex flex-col gap-3 max-h-[560px] overflow-y-auto pr-1 scrollbar-thin pb-1">
        {bidders.map((bidder) => {
          const displayName = bidder.nickname ?? bidder.address;
          const isLeader = bidder.rank === 1;
          return (
            <div
              key={bidder.rank}
              className={`flex items-center justify-between p-3 md:p-4 rounded-xl border-2 border-black shadow-neo-sm ${
                isLeader ? 'bg-tertiary/25 ring-2 ring-secondary ring-offset-1 ring-offset-surface-container-lowest' : 'bg-white'
              }`}
            >
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono font-black text-lg md:text-xl w-6 text-right tabular-nums text-black">
                    {bidder.rank}
                  </span>
                  {isLeader && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-tertiary px-2 py-0.5 border-2 border-black shadow-neo-sm">
                      <Trophy className="w-3 h-3 stroke-black stroke-2" />
                      <span className="font-mono text-[9px] font-black uppercase leading-none tracking-wider">
                        Winner now
                      </span>
                    </span>
                  )}
                </div>

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

                <div className="flex flex-col min-w-0">
                  <span className="font-display font-black text-base md:text-lg text-black leading-tight truncate">
                    {displayName}
                  </span>
                  {bidder.handle ? (
                    <span className="font-mono text-[10px] font-bold text-black uppercase mt-0.5 truncate">
                      {bidder.handle}
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] font-bold text-on-surface-variant truncate">
                      {bidder.address}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end shrink-0 ml-3">
                <span className="font-mono font-black text-black text-lg md:text-xl leading-none mb-1 whitespace-nowrap">
                  {bidder.totalAmount} <span className="text-[10px] md:text-xs text-monad">$MON</span>
                </span>
                <span className="font-mono text-[10px] font-bold text-on-surface-variant uppercase">
                  {bidder.bidCount} bids placed
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 md:hidden flex items-center justify-center gap-1.5 font-mono text-[10px] font-bold uppercase text-on-surface-variant">
        Scroll down for all {bidders.length} ranks
      </p>
    </div>
  );
}
