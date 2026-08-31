import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** 是否有 hover 效果 */
  hoverable?: boolean;
  /** 内边距大小 */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

/**
 * 统一卡片容器 — 从所有页面提取
 * 样式：bg-[#161616] border border-white/[0.04] rounded-xl
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hoverable, padding = 'md', className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-[#161616] border border-white/[0.04] rounded-xl',
          hoverable && 'hover:border-white/[0.08] transition-all cursor-pointer',
          paddingStyles[padding],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';

/**
 * 卡片头部 — 标题 + 操作区
 */
export function CardHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between mb-6', className)}>
      <h3 className="text-lg font-bold text-white tracking-wide">{title}</h3>
      {action}
    </div>
  );
}
