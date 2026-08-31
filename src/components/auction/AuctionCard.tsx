import { Link } from 'react-router-dom';
import { KolAvatar } from '../kol/KolAvatar';
import { Badge } from '../ui/Badge';
import { Countdown } from '../ui/Countdown';
import { kolProfilePath, auctionDetailPath } from '../../config/routes';
import { cn } from '../../utils/cn';
import type { Auction } from '../../types';

export interface AuctionCardProps {
  auction: Auction;
  className?: string;
}

/**
 * 拍卖卡片 — 严格匹配原 DEMO 视觉风格
 * 原样式：bg-[#161616] p-6 rounded-2xl / w-14 头像 / bg-[#0f0f0f] 数据块 / rounded-xl shadow-lg CTA
 */
export function AuctionCard({ auction, className }: AuctionCardProps) {
  const isLive = auction.status === 'LIVE';
  const isUpcoming = auction.status === 'UPCOMING';

  const ctaText = isLive ? 'Place Bid' : isUpcoming ? 'View Auction' : 'View Results';
  const ctaStyle = isLive
    ? 'bg-[#3ec470] text-black hover:bg-[#4ade80]'
    : 'bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10';

  return (
    <div
      className={cn(
        'bg-[#161616] border border-white/[0.04] p-6 rounded-2xl flex flex-col hover:border-white/10 transition-colors duration-300 relative overflow-hidden group',
        className,
      )}
    >
      {/* 顶部：KOL 头像 + 名称 + 状态 */}
      <div className="flex items-start justify-between mb-6">
        <Link to={kolProfilePath(auction.kol.handle)} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-14 h-14 rounded-full border-2 border-[#1a1a1a] bg-black/50 overflow-hidden flex items-center justify-center">
            <KolAvatar handle={auction.kol.handle} name={auction.kol.name} className="!w-full !h-full !rounded-full !border-0" />
          </div>
          <div>
            <div className="font-bold text-white tracking-tight text-lg group-hover:text-[#3ec470] transition-colors">
              {auction.kol.name}
            </div>
            <div className="text-[11px] text-white/40 font-mono">{auction.kol.handle}</div>
          </div>
        </Link>
        <Badge variant={isLive ? 'live' : isUpcoming ? 'upcoming' : 'ended'} pulse={isLive}>
          {auction.status}
        </Badge>
      </div>

      {/* 标题 */}
      <div className="text-[13px] text-white/60 font-medium mb-1">{auction.title}</div>
      <div className="text-[11px] text-white/30 mb-6">{auction.passName} × {auction.passQuantity}</div>

      {/* 数据块：Current Bid */}
      <div className="bg-[#0f0f0f] border border-white/[0.04] rounded-xl p-4 flex items-center justify-between mb-3">
        <div>
          <div className="text-[9px] text-white/40 font-bold uppercase tracking-[0.15em] mb-1">
            {isLive ? 'Current Bid' : isUpcoming ? 'Starting Bid' : 'Final Bid'}
          </div>
          <div className="font-mono text-xl font-bold text-white tracking-tight">
            {auction.currentBid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            <span className="text-xs text-white/50 ml-1">$MON</span>
          </div>
        </div>
        {isLive && <Countdown target={auction.endTime} size="sm" />}
        {isUpcoming && <Countdown target={auction.startTime} size="sm" />}
      </div>

      {/* 数据块：Last Bidder */}
      <div className="bg-[#0f0f0f] border border-white/[0.04] rounded-xl p-4 flex items-center justify-between mb-6">
        <div className="text-[9px] text-white/40 font-bold uppercase tracking-[0.15em]">Last Bidder</div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-white/10 overflow-hidden flex items-center justify-center">
            {auction.lastBidder && <div className="w-2 h-2 rounded-full bg-[#3ec470]/50"></div>}
          </div>
          <span className="font-mono text-[11px] text-white/60">
            {auction.lastBidder ? `${auction.lastBidder.slice(0, 6)}...${auction.lastBidder.slice(-4)}` : '-'}
          </span>
        </div>
      </div>

      {/* CTA 按钮 */}
      <Link to={auctionDetailPath(auction.id)} className="mt-auto">
        <button
          className={cn(
            'w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-[0.15em] transition-all relative z-10 shadow-lg',
            ctaStyle,
          )}
        >
          {ctaText}
        </button>
      </Link>
    </div>
  );
}
