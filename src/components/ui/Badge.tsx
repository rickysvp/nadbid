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
  | 'amber'
  | 'default';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** 是否显示脉冲点（用于 LIVE 状态） */
  pulse?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  live: 'bg-[#3ec470]/15 text-[#117a3d] border-2 border-[#117a3d]',
  upcoming: 'bg-[#111]/5 text-[#111]/50 border-2 border-[#111]/25',
  ended: 'bg-[#111]/5 text-[#111]/40 border-2 border-[#111]/20',
  settled: 'bg-[#3ec470]/15 text-[#117a3d] border-2 border-[#117a3d]',
  arbitrating: 'bg-[#f5a623]/15 text-[#b45309] border-2 border-[#f5a623]',
  failed: 'bg-[#ff4d4f]/10 text-[#ff4d4f] border-2 border-[#ff4d4f]/60',
  claimable: 'bg-[#3ec470]/15 text-[#117a3d] border-2 border-[#117a3d]',
  stake_active: 'bg-[#3ec470]/15 text-[#117a3d] border-2 border-[#117a3d]',
  stake_pending: 'bg-[#111]/5 text-[#111]/50 border-2 border-[#111]/25',
  unlocking: 'bg-[#f5a623]/15 text-[#b45309] border-2 border-[#f5a623]',
  neutral: 'bg-[#111]/5 text-[#111]/60 border-2 border-[#111]/25',
  amber: 'bg-[#f5a623]/15 text-[#b45309] border-2 border-[#f5a623]',
  default: 'bg-[#111]/5 text-[#111]/60 border-2 border-[#111]/25',
};

/**
 * 统一状态标签组件 — 从所有页面提取
 * 13 种固定状态色，不得每页改
 */
export function Badge({ variant = 'default', pulse, className, children, ...props }: BadgeProps) {
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
