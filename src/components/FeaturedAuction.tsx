import { Gavel, Users2, TrendingUp, Layers, CalendarClock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatDivider, StatItem } from '@/components/ui';
import { useKolHoldingsStore } from '@/stores';
import type { FeaturedAuction as FeaturedAuctionModel } from '@/types';
import { cn } from '@/utils/cn';
import { formatCountdown, normalizeKolHandle } from '@/utils/format';

interface FeaturedAuctionProps {
  auction: FeaturedAuctionModel;
}

export default function FeaturedAuction({ auction }: FeaturedAuctionProps) {
  const { kol, description, countdown, bidPrice, routeId, tvl, participants, totalBids } = auction;
  const kolLink = `/kols/${normalizeKolHandle(kol.handle)}`;
  const isOngoing = auction.status === 'ongoing';
  // 统一时钟（全局 ticker 每秒更新）驱动倒计时实时走秒。
  const nowUtcMs = useKolHoldingsStore((s) => s.nowUtcMs);
  const liveCountdown =
    auction.countdownTargetUtcMs !== undefined
      ? formatCountdown(auction.countdownTargetUtcMs, nowUtcMs)
      : countdown;

  const statusLabel = isOngoing ? 'Ongoing' : 'Upcoming';
  const statusDotClass = isOngoing ? 'bg-secondary pulse-live' : 'bg-primary animate-pulse';
  const statusBgClass = isOngoing ? 'bg-secondary' : 'bg-primary';
  const priceLabel = isOngoing ? 'Bid Price' : 'Starting Bid';
  const ctaLabel = isOngoing ? 'Bid Now' : 'Register Bid';

  return (
    <div className="w-full bg-surface-container-lowest rounded-xl p-5 md:p-9 border-3 border-black shadow-neo-lg relative">
      {/* ======= 左上角主状态徽章（放大的拍品状态） =======
            Ongoing  → 只显示 "Ongoing"
            Upcoming → "Upcoming · 倒计时" 并列同框
      */}
      <div className="absolute -top-4 -left-4 z-10">
        <div
          className={cn(
            'inline-flex items-center gap-2.5 md:gap-3 rounded-full text-black px-5 py-2.5 md:px-6 md:py-3 border-3 border-black shadow-neo-md',
            statusBgClass,
          )}
        >
          <span
            className={cn(
              'rounded-full bg-white shrink-0 w-3.5 h-3.5 md:w-4 md:h-4 border-2 border-black',
              statusDotClass,
            )}
            aria-hidden="true"
          />
          <span className="font-mono font-black uppercase tracking-widest text-sm md:text-base">
            {statusLabel}
          </span>
          {!isOngoing && (
            <>
              <span className="block w-px h-4 md:h-5 bg-black/25" />
              <span className="font-mono font-black text-sm md:text-base text-black tabular-nums whitespace-nowrap">
                {liveCountdown}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center lg:items-stretch">
        {/* 左侧：KOL 形象区 */}
        <div className="w-full lg:w-[38%] flex flex-col items-center justify-center">
          <Link
            to={kolLink}
            className="w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-black shadow-neo-lg mb-5 group hover:scale-[1.02] transition-transform"
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
              className="font-mono text-lg font-bold text-black mb-2.5 px-1 hover:text-primary transition-colors"
            >
              {kol.handle}
            </Link>
            <div className="flex gap-5 items-center">
              <StatItem orientation="vertical" label="Followers" value={kol.followers} />
              <StatDivider className="h-9" />
              <StatItem orientation="vertical" label="Holders" value={kol.holders} />
            </div>
          </div>
        </div>

        {/* 右侧：拍卖信息（完整描述 + 元数据 + 出价 CTA） */}
        <div className="w-full lg:w-[62%] flex flex-col justify-between">
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <Link
              to={kolLink}
              className="font-display text-4xl md:text-5xl xl:text-6xl font-black text-black mb-3 md:mb-4 leading-[1.05] hover:text-primary transition-colors"
            >
              {kol.nickname}
            </Link>

            {/* 本场拍卖描述框：角标表达"这是本场拍卖"，框内 = 完整描述 */}
            <div className="relative w-full bg-white rounded-2xl border-3 border-black shadow-neo-md px-4 md:px-6 pt-6 pb-4 md:pt-7 md:pb-5 mt-4 md:mt-5 mb-5 md:mb-6 text-left">
              <div className="absolute -top-3.5 left-3 md:left-4 inline-flex items-center gap-1.5 bg-tertiary text-black px-3 py-1 font-mono text-[10px] md:text-xs uppercase font-black border-2 border-black rounded-full shadow-neo-sm whitespace-nowrap">
                <Gavel className="w-3.5 h-3.5" strokeWidth={2.5} />
                This Auction
              </div>
              <p className="font-body text-base md:text-lg text-black/80 font-bold leading-relaxed text-balance">
                {description}
              </p>
            </div>

            {/* 元数据横条：TVL / 参与人数 / 总出价数 */}
            <div className="w-full flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 rounded-xl bg-surface-container-low border-2 border-black px-4 py-3 shadow-neo-sm mb-5 md:mb-6">
              <div className="flex items-center gap-2 shrink-0">
                <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-primary shrink-0" />
                <div className="flex flex-col leading-tight">
                  <span className="font-mono text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
                    Tvl
                  </span>
                  <span className="font-mono font-black text-base md:text-lg text-black whitespace-nowrap">
                    {tvl}
                    <span className="ml-1 text-[11px] text-monad">$MON</span>
                  </span>
                </div>
              </div>
              <StatDivider className="h-8 hidden sm:block" />
              <div className="flex items-center gap-2 shrink-0">
                <Users2 className="w-4 h-4 md:w-5 md:h-5 text-secondary shrink-0" />
                <div className="flex flex-col leading-tight">
                  <span className="font-mono text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
                    Bidders
                  </span>
                  <span className="font-mono font-black text-base md:text-lg text-black whitespace-nowrap">
                    {participants}
                  </span>
                </div>
              </div>
              <StatDivider className="h-8 hidden sm:block" />
              <div className="flex items-center gap-2 shrink-0">
                {isOngoing ? (
                  <Layers className="w-4 h-4 md:w-5 md:h-5 text-tertiary shrink-0" />
                ) : (
                  <CalendarClock className="w-4 h-4 md:w-5 md:h-5 text-tertiary shrink-0" />
                )}
                <div className="flex flex-col leading-tight">
                  <span className="font-mono text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
                    {isOngoing ? 'Total Bids' : 'Pre-bids'}
                  </span>
                  <span className="font-mono font-black text-base md:text-lg text-black whitespace-nowrap">
                    {totalBids}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 底部行：出价（横排） + CTA（加宽凸显） */}
          <div className="flex flex-col sm:flex-row flex-wrap justify-between items-center sm:items-end gap-4 md:gap-6 mt-auto w-full">
            <div className="flex flex-row items-baseline gap-3 md:gap-4 shrink-0">
              <span className="font-body font-bold text-on-surface-variant text-base md:text-lg leading-none">
                {priceLabel}
              </span>
              <span className="font-display font-black text-3xl md:text-4xl xl:text-5xl text-monad leading-none whitespace-nowrap">
                {bidPrice}
              </span>
            </div>

            <Link
              to={`/auctions/${routeId}`}
              className="bg-primary text-black px-6 py-3 md:px-8 md:py-3.5 rounded-lg font-display font-black text-lg md:text-xl btn-hover active:scale-95 flex items-center justify-center gap-2.5 border-3 border-black shadow-neo-lg whitespace-nowrap w-full sm:flex-1 sm:max-w-md sm:min-w-[240px]"
            >
              <Gavel className="w-5 h-5 md:w-6 md:h-6 fill-black shrink-0" />
              {ctaLabel}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
