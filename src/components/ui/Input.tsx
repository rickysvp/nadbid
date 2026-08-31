import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  /** 左侧图标或前缀 */
  prefix?: ReactNode;
  /** 右侧后缀（如 MAX 按钮） */
  suffix?: ReactNode;
  /** 错误状态 */
  error?: boolean;
}

/**
 * 统一输入框组件 — 从 ProfileView/AuctionDetailView 提取
 * 样式：bg-[#0a0a0a] border border-white/10 rounded-lg
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ prefix, suffix, error, className, ...props }, ref) => {
    return (
      <div
        className={cn(
          'flex items-center bg-[#0a0a0a] border rounded-lg overflow-hidden transition-colors',
          error ? 'border-red-400/50' : 'border-white/10 focus-within:border-[#3ec470]/50',
          className,
        )}
      >
        {prefix && <div className="pl-4 text-white/40">{prefix}</div>}
        <input
          ref={ref}
          className={cn(
            'flex-1 bg-transparent px-4 py-3 text-white font-mono text-[14px] outline-none placeholder:text-white/20',
            prefix && 'pl-2',
          )}
          {...props}
        />
        {suffix && <div className="pr-2">{suffix}</div>}
      </div>
    );
  },
);

Input.displayName = 'Input';
