import { useCountdown } from '../../hooks/useCountdown';
import { cn } from '../../utils/cn';

export interface CountdownProps {
  /** 目标时间（Date 或 timestamp ms） */
  target: Date | number;
  /** 是否启用倒计时 */
  enabled?: boolean;
  /** 尺寸变体 */
  size?: 'sm' | 'md' | 'lg';
  /** 标签（如 "Time Left"） */
  label?: string;
  className?: string;
}

const sizeStyles = {
  sm: 'text-[13px]',
  md: 'text-[16px]',
  lg: 'text-[24px]',
};

/**
 * 统一倒计时组件 — 消除 AuctionsView + AuctionDetailView 重复实现
 * 使用 useCountdown hook
 */
export function Countdown({ target, enabled = true, size = 'md', label, className }: CountdownProps) {
  const { days, hours, minutes, seconds, isExpired } = useCountdown(target, enabled);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className={cn('font-mono', className)}>
      {label && (
        <div className="text-[9px] text-white/40 font-bold uppercase tracking-[0.15em] mb-2">
          {label}
        </div>
      )}
      <div className={cn('flex items-center gap-1 font-bold tracking-tight', sizeStyles[size])}>
        {days > 0 && (
          <>
            <span className={isExpired ? 'text-white/30' : 'text-white'}>{days}</span>
            <span className="text-white/30 text-[0.8em]">d</span>
            <span className="text-white/20 mx-0.5">·</span>
          </>
        )}
        <span className={isExpired ? 'text-white/30' : 'text-white'}>{pad(hours)}</span>
        <span className="text-white/20">:</span>
        <span className={isExpired ? 'text-white/30' : 'text-white'}>{pad(minutes)}</span>
        <span className="text-white/20">:</span>
        <span className={isExpired ? 'text-white/30' : 'text-[#3ec470]'}>{pad(seconds)}</span>
      </div>
    </div>
  );
}
