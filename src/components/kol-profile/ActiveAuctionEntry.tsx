import { CalendarDays, ChevronRight, Clock, Gavel, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { KolAuctionsBundle } from '@/types';
import { cn } from '@/utils/cn';

interface ActiveAuctionEntryProps {
  bundle: KolAuctionsBundle;
}

/**
 * 页面顶部的显眼拍卖入口：当 KOL 存在正在进行（LIVE)或即将开始（SOON）的拍卖时，
 * 在页面顶部展示醒目的横幅入口，直达对应拍卖。
 */
export default function ActiveAuctionEntry({ bundle }: ActiveAuctionEntryProps) {
  const { handle, ongoing, upcoming } = bundle;
  const active = [...ongoing, ...upcoming];

  if (active.length === 0) return null;

  const hasLive = ongoing.length > 0;

  return (
    <section className="rounded-3xl border-3 border-black shadow-neo-xl overflow-hidden bg-white">
      {/* 顶部彩色条 */}
      <div
        className={cn(
          'h-2 w-full bg-[linear-gradient(90deg,#00F2EA,#FF0050,#FFDF3D,#7C3AED,#00F2EA)]',
        )}
        aria-hidden
      />

      <div className="px-5 md:px-7 py-5 md:py-6 flex flex-col gap-4">
        {/* Header：LIVE / SOON 状态 + handle */}
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full font-mono text-[11px] uppercase font-black border-2 border-black px-4 py-1.5 shadow-neo-md',
              hasLive
                ? 'bg-secondary text-black animate-pulse'
                : 'bg-primary text-white',
            )}
          >
            {hasLive ? (
              <>
                <span className="w-2 h-2 rounded-full bg-black animate-ping" /> Live Auction
              </>
            ) : (
              <>
                <CalendarDays className="w-3.5 h-3.5" /> Upcoming Auction
              </>
            )}
          </span>
          <h2 className="font-display font-black text-2xl md:text-3xl text-black tracking-tight leading-none">
            @{handle}
          </h2>
          <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[11px] uppercase font-black text-on-surface-variant">
            <Sparkles className="w-3.5 h-3.5 text-primary" /> Don't miss the drop
          </span>
        </div>

        {/* 拍卖条目 */}
        <div className="flex flex-col gap-3">
          {ongoing.map((a) => (
            <Link
              key={a.id}
              to={`/auctions/${a.id}`}
              className="group flex flex-wrap items-center gap-4 rounded-2xl border-2 border-black bg-secondary/15 p-4 shadow-neo-md hover:-translate-y-[1px] hover:shadow-neo-lg transition-all"
            >
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-secondary/40 border-2 border-black flex items-center justify-center text-black shadow-neo-sm">
                <Gavel className="w-6 h-6" strokeWidth={2.3} />
              </div>
              <div className="min-w-0 flex-grow">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-black text-white px-2.5 py-1 font-mono text-[10px] uppercase font-black border-2 border-black shadow-neo-sm">
                    <Clock className="w-3 h-3" /> Live Now · {a.timeLabel}
                  </span>
                </div>
                <h3 className="font-display font-black text-lg md:text-xl text-black leading-tight line-clamp-1">
                  {a.title}
                </h3>
                <p className="font-body text-sm text-on-surface-variant font-bold line-clamp-1">
                  {a.description}
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <div className="font-mono text-[10px] uppercase font-black text-on-surface-variant">
                    Bid Price
                  </div>
                  <div className="font-display font-black text-2xl text-black leading-tight">
                    {a.bidPrice}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 bg-primary text-white px-4 py-2.5 rounded-full font-mono font-black text-xs uppercase border-2 border-black shadow-neo-md btn-hover">
                  Enter <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}

          {upcoming.map((a) => (
            <Link
              key={a.id}
              to={`/auctions/${a.id}`}
              className="group flex flex-wrap items-center gap-4 rounded-2xl border-2 border-black bg-primary/10 p-4 shadow-neo-md hover:-translate-y-[1px] hover:shadow-neo-lg transition-all"
            >
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-primary/20 border-2 border-black flex items-center justify-center text-primary shadow-neo-sm">
                <CalendarDays className="w-6 h-6" strokeWidth={2.3} />
              </div>
              <div className="min-w-0 flex-grow">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary text-white px-2.5 py-1 font-mono text-[10px] uppercase font-black border-2 border-black shadow-neo-sm">
                    <Clock className="w-3 h-3" /> Starts {a.timeLabel}
                  </span>
                </div>
                <h3 className="font-display font-black text-lg md:text-xl text-black leading-tight line-clamp-1">
                  {a.title}
                </h3>
                <p className="font-body text-sm text-on-surface-variant font-bold line-clamp-1">
                  {a.description}
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <div className="font-mono text-[10px] uppercase font-black text-on-surface-variant">
                    Starting Bid
                  </div>
                  <div className="font-display font-black text-2xl text-primary leading-tight">
                    {a.bidPrice}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 bg-black text-white px-4 py-2.5 rounded-full font-mono font-black text-xs uppercase border-2 border-black shadow-neo-md btn-hover">
                  Preview <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}