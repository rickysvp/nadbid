import { useCallback } from 'react';
import { Activity, ArrowRight, Hourglass, Layers, TrendingUp, Users2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { SectionTitle, StatDivider } from '@/components/ui';
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
        <div className="flex flex-col gap-5">
          {auctions.map((auction) => {
            const handle = normalizeKolHandle(auction.kol.handle);
            const kolLink = handle ? `/kols/${handle}` : '/kols';
            const cardIsOngoing = (auction.status ?? 'ongoing') === 'ongoing';
            const countdownTarget = cardIsOngoing ? auction.endsAtUtcMs : auction.startsAtUtcMs;
            const liveCountdown =
              countdownTarget !== undefined
                ? formatCountdown(countdownTarget, nowUtcMs)
                : auction.timeLeft;

            const cardStatusLabel = cardIsOngoing ? 'Ongoing' : 'Upcoming';
            const cardStatusBg = cardIsOngoing ? 'bg-secondary' : 'bg-primary';
            const cardStatusDot = cardIsOngoing ? 'bg-secondary pulse-live' : 'bg-primary animate-pulse';

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
                className="relative flex flex-col p-4 md:p-6 bg-white border-3 border-black rounded-xl shadow-neo-md hover:-translate-y-1 transition-transform group gap-5 cursor-pointer outline-none focus:ring-4 focus:ring-primary/40"
              >
                {/* ========== 左上角紧凑状态徽章（小尺寸） ==========
                      Ongoing  → 只显示 "Ongoing"
                      Upcoming → "Upcoming · 倒计时" 并列同框
                */}
                <div className="absolute -top-2.5 -left-2.5 md:-top-3 md:-left-3 z-10">
                  <div
                    className={cn(
                      'inline-flex items-center gap-1.5 md:gap-2 rounded-full text-black px-2.5 py-1 md:px-3 md:py-1.5 border-3 border-black shadow-neo-md',
                      cardStatusBg,
                    )}
                  >
                    <span
                      className={cn(
                        'rounded-full bg-white shrink-0 w-2 h-2 md:w-2.5 md:h-2.5 border-2 border-black',
                        cardStatusDot,
                      )}
                      aria-hidden="true"
                    />
                    <span className="font-mono font-black uppercase tracking-wider text-[10px] md:text-[11px]">
                      {cardStatusLabel}
                    </span>
                    {!cardIsOngoing && (
                      <>
                        <span className="block w-px h-3 md:h-3.5 bg-black/25" />
                        <span className="font-mono font-black text-[10px] md:text-[11px] text-black tabular-nums whitespace-nowrap">
                          {liveCountdown}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* ========== 内容主体 ========== */}
                <div className="flex flex-col lg:flex-row gap-5 lg:gap-8 pt-2">
                  {/* 左：KOL 基本信息（头像+昵称+粉丝/持有者） */}
                  <div className="flex items-center gap-4 w-full lg:w-[28%] min-w-0 shrink-0">
                    <Link
                      to={kolLink}
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        'w-14 h-14 md:w-16 md:h-16 rounded-full border-3 border-black p-0.5 shrink-0 hover:scale-105 transition-transform',
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
                    <div className="flex flex-col overflow-hidden min-w-0">
                      <Link
                        to={kolLink}
                        onClick={(e) => e.stopPropagation()}
                        className="font-display font-black text-xl md:text-2xl text-black truncate pr-2 hover:text-primary transition-colors leading-none mb-1.5"
                      >
                        {auction.kol.nickname}
                      </Link>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-black/70">
                        <span className="font-mono text-[11px] md:text-xs font-bold uppercase tracking-wider">
                          {auction.kol.followers} <span className="text-on-surface-variant/80">Follower</span>
                        </span>
                        <span className="w-1 h-1 rounded-full bg-black/30 hidden sm:inline-block" />
                        <span className="font-mono text-[11px] md:text-xs font-bold uppercase tracking-wider">
                          {auction.kol.holders} <span className="text-on-surface-variant/80">Holder</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 中：拍卖内容介绍（只有介绍，没有标题） */}
                  <div className="w-full lg:flex-1 min-w-0 flex flex-col justify-center">
                    <p className="font-body text-sm md:text-base text-black/75 font-bold leading-relaxed line-clamp-2 md:line-clamp-3">
                      {auction.description}
                    </p>
                  </div>

                  {/* 右：元数据 + 出价 + 出价按钮 */}
                  <div className="w-full lg:w-[30%] shrink-0 flex flex-col gap-3 lg:items-end">
                    {/* 元数据横排 */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 justify-start lg:justify-end w-full">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" />
                        <div className="flex flex-col leading-tight">
                          <span className="font-mono text-[9px] uppercase text-on-surface-variant font-bold tracking-wider">
                            Tvl
                          </span>
                          <span className="font-mono text-sm font-black text-black whitespace-nowrap">
                            {auction.tvl}
                          </span>
                        </div>
                      </div>
                      <StatDivider className="h-6 hidden sm:block" />
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Users2 className="w-3.5 h-3.5 text-secondary shrink-0" />
                        <div className="flex flex-col leading-tight">
                          <span className="font-mono text-[9px] uppercase text-on-surface-variant font-bold tracking-wider">
                            Bidders
                          </span>
                          <span className="font-mono text-sm font-black text-black whitespace-nowrap">
                            {auction.participants}
                          </span>
                        </div>
                      </div>
                      <StatDivider className="h-6 hidden sm:block" />
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Layers className="w-3.5 h-3.5 text-tertiary shrink-0" />
                        <div className="flex flex-col leading-tight">
                          <span className="font-mono text-[9px] uppercase text-on-surface-variant font-bold tracking-wider">
                            Bids
                          </span>
                          <span className="font-mono text-sm font-black text-black whitespace-nowrap">
                            {auction.totalBids}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 出价 + 出价按钮 */}
                    <div className="flex flex-row items-center justify-between lg:justify-end w-full gap-4 lg:gap-6 pt-1">
                      <div className="flex flex-col lg:items-end">
                        <span className="font-mono text-[10px] uppercase text-on-surface-variant font-bold tracking-wider">
                          Bid Price
                        </span>
                        <span className="font-mono text-xl md:text-2xl font-black text-monad whitespace-nowrap leading-none">
                          {auction.bidPrice}
                        </span>
                      </div>

                      <div className="hidden md:flex items-center justify-center w-11 h-11 shrink-0 rounded-full border-3 border-black bg-surface-container-low group-hover:bg-primary group-hover:text-black transition-colors shadow-neo-sm">
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>
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
