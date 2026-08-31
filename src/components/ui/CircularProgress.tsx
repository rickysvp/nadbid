import { cn } from '../../utils/cn';

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
}

/**
 * 环形进度组件 — 从 AuctionDetailView 提取
 */
export function CircularProgress({
  progress,
  size = 120,
  strokeWidth = 6,
  label,
  sublabel,
  className,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* 背景环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* 进度环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#3ec470"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      {/* 中心文字 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label && <span className="font-mono text-xl font-bold text-white">{label}</span>}
        {sublabel && <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider mt-1">{sublabel}</span>}
      </div>
    </div>
  );
}
