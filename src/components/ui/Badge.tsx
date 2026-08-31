import { type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export type BadgeVariant =
  | 'live'
  | 'upcoming'
  | 'ended'
  | 'settled'
  | 'arbitrating'
  | 'failed'
  | 'claimable'
  | 'stake_active'
  | 'stake_pending'
  | 'unlocking'
  | 'neutral'
  | 'amber';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** 是否显示脉冲点（用于 LIVE 状态） */
  pulse?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  live: 'bg-[#3ec470]/10 text-[#3ec470] border border-[#3ec470]/30',
  upcoming: 'bg-white/5 text-white/40 border border-white/10',
  ended: 'bg-white/5 text-white/30 border border-white/10',
  settled: 'bg-[#3ec470]/10 text-[#3ec470] border border-[#3ec470]/30',
  arbitrating: 'bg-orange-400/10 text-orange-400 border border-orange-400/30',
  failed: 'bg-red-400/10 text-red-400 border border-red-400/30',
  claimable: 'bg-[#3ec470]/10 text-[#3ec470] border border-[#3ec470]/30',
  stake_active: 'bg-[#3ec470]/10 text-[#3ec470] border border-[#3ec470]/30',
  stake_pending: 'bg-amber-400/10 text-amber-400 border border-amber-400/30',
  unlocking: 'bg-purple-500/10 text-purple-400 border border-purple-500/30',
  neutral: 'bg-white/5 text-white/60 border border-white/10',
  amber: 'bg-[#fbbf24]/10 text-[#fbbf24] border border-[#fbbf24]/20',
};

/**
 * 统一状态标签组件 — 从所有页面提取
 * 12 种固定状态色，不得每页改
 */
export function Badge({ variant = 'neutral', pulse, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.1em]',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3ec470] opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#3ec470]" />
        </span>
      )}
      {children}
    </span>
  );
}
