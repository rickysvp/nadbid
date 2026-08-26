import { Trophy, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { KolAuction } from '@/types';
import { cn } from '@/utils/cn';

/** 历史拍卖时间线列表（供 Records 容器复用）。 */
export function PastAuctionList({ auctions }: { auctions: KolAuction[] }) {
  return (
    <ol className="relative border-l-3 border-black pl-5 md:pl-6 space-y-5 ml-3">
      {auctions.map((a, idx) => (
        <li key={a.id} className="relative">
          {/* Timeline dot */}
          <span
            aria-hidden="true"
            className={cn(
              'absolute -left-[30px] md:-left-[34px] top-4 w-5 h-5 rounded-full border-3 border-black shadow-neo-sm',
              idx === 0 ? 'bg-primary' : idx === 1 ? 'bg-secondary' : 'bg-tertiary',
            )}
          />
          <div className="rounded-2xl border-2 border-black shadow-neo-md bg-surface-container-lowest p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="min-w-0 flex-grow">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-tertiary text-black px-2.5 py-1 font-mono text-[10px] uppercase font-black border-2 border-black shadow-neo-sm">
                  <Trophy className="w-3 h-3" /> Finalized
                </span>
                <span className="font-mono text-[10px] uppercase text-on-surface-variant font-black">
                  {a.timeLabel}
                </span>
              </div>
              <h3 className="font-display font-black text-lg md:text-xl text-black leading-tight mb-1">
                {a.title}
              </h3>
              <p className="font-body text-sm text-on-surface-variant font-bold line-clamp-2 mb-3">
                {a.description}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white text-black px-2.5 py-1 font-mono text-[10px] uppercase font-black border-2 border-black shadow-neo-sm">
                  <Users className="w-3.5 h-3.5" /> {a.participants} bidders · {a.totalBids} bids
                </span>
                {a.tvl && (
                  <span className="font-mono text-[10px] uppercase font-black text-primary">
                    TVL {a.tvl}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 shrink-0">
              <div className="rounded-xl border-2 border-black bg-white p-4 shadow-neo-sm min-w-[180px]">
                <span className="block font-mono text-[10px] uppercase font-black text-on-surface-variant mb-1">
                  Winning Bid
                </span>
                <span className="block font-display font-black text-2xl text-primary leading-none">
                  {a.winningBid ?? '—'}
                </span>
                {a.winnerAddress && (
                  <span className="block font-mono text-[10px] uppercase text-black/60 font-bold mt-1 truncate">
                    winner {a.winnerAddress}
                  </span>
                )}
              </div>
              <Link
                to={`/auctions/${a.id}`}
                className="inline-flex items-center justify-center gap-2 bg-black text-white px-4 py-3 rounded-full font-mono font-black text-[11px] uppercase border-2 border-black shadow-neo-md btn-hover md:ml-2"
              >
                View Receipt
              </Link>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** 拍卖条目上的迷你数值（共享）。 */
export function MiniStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-[9px] uppercase font-black text-on-surface-variant leading-none">
        {label}
      </span>
      <span
        className={cn(
          'font-display font-black text-lg md:text-xl leading-tight mt-1',
          accent ?? 'text-black',
        )}
      >
        {value}
      </span>
    </div>
  );
}