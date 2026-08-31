import { type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  /** 标签（如 TVL, Total Staked） */
  label: string;
  /** 数值 */
  value: string | number;
  /** 单位（如 $MON） */
  unit?: string;
  /** 数值颜色变体 */
  variant?: 'default' | 'green' | 'white';
  /** 趋势变化（如 +12.5%） */
  trend?: string;
  /** 趋势方向 */
  trendDirection?: 'up' | 'down' | 'neutral';
}

const valueVariants = {
  default: 'text-white/80',
  green: 'text-[#3ec470]',
  white: 'text-white',
};

/**
 * KPI 数据卡 — 从 StakingView/PointsView 提取
 * 样式：bg-[#161616] border border-white/[0.04] rounded-lg p-5
 */
export function StatCard({
  label,
  value,
  unit,
  variant = 'default',
  trend,
  trendDirection = 'neutral',
  className,
  ...props
}: StatCardProps) {
  return (
    <div
      className={cn('bg-[#161616] border border-white/[0.04] rounded-lg p-5 min-w-[160px]', className)}
      {...props}
    >
      <div className="text-[9px] text-white/40 font-bold uppercase tracking-[0.15em] mb-2">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={cn('font-mono text-xl font-bold tracking-tight', valueVariants[variant])}>
          {typeof value === 'number' ? value.toLocaleString('en-US') : value}
        </span>
        {unit && <span className="text-sm text-white/50 font-mono">{unit}</span>}
      </div>
      {trend && (
        <div
          className={cn(
            'mt-2 text-[10px] font-bold',
            trendDirection === 'up' && 'text-[#3ec470]',
            trendDirection === 'down' && 'text-red-400',
            trendDirection === 'neutral' && 'text-white/40',
          )}
        >
          {trend}
        </div>
      )}
    </div>
  );
}
