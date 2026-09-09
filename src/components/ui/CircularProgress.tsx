import { cn } from '../../utils/cn';
import { motion } from 'motion/react';

export interface CircularProgressProps {
  /** 进度百分比 0-100 */
  progress: number;
  /** 尺寸（px） */
  size?: number;
  /** 圆环宽度 */
  strokeWidth?: number;
  /** 中心文字 */
  label?: string;
  /** 中心子文字 */
  sublabel?: string;
  className?: string;
  /** 警示模式（倒计时最后 15 秒）：红色进度环 + 光环脉冲扩散 + 中心数字跳动 */
  danger?: boolean;
}

/**
 * 环形进度组件 — 从 AuctionDetailView 提取
 * danger 模式用于倒计时最后 15 秒：红环 + 双层光环（常驻描边 + ping 扩散脉冲）
 * + 中心秒数红色跳动，制造紧迫警示效果。
 */
export function CircularProgress({
  progress,
  size = 120,
  strokeWidth = 6,
  label,
  sublabel,
  className,
  danger = false,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      {/* 警示光环：常驻红描边 + ping 扩散脉冲（仅最后 15 秒） */}
      {danger && (
        <>
          <span className="absolute inset-0 rounded-full border-2 border-red-500/70" aria-hidden="true" />
          <span
            className="absolute inset-0 rounded-full border-2 border-red-500/50 animate-ping"
            aria-hidden="true"
          />
        </>
      )}
      <svg width={size} height={size} className="-rotate-90">
        {/* 背景环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={danger ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)'}
          strokeWidth={strokeWidth}
        />
        {/* 进度环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={danger ? '#ef4444' : '#3ec470'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      {/* 中心文字 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label && (
          <motion.span
            key={danger ? 'danger' : 'normal'}
            animate={
              danger
                ? { scale: [1, 1.18, 1], color: ['#fca5a5', '#ef4444', '#fca5a5'] }
                : { scale: 1, color: '#ffffff' }
            }
            transition={danger ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
            className={cn('font-mono text-xl font-bold', danger ? 'text-red-500' : 'text-white')}
          >
            {label}
          </motion.span>
        )}
        {sublabel && (
          <span
            className={cn(
              'text-[9px] font-bold uppercase tracking-wider mt-1',
              danger ? 'text-red-400/90' : 'text-white/40',
            )}
          >
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
