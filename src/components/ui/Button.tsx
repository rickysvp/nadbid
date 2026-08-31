import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[#3ec470] text-black hover:bg-[#4ade80] shadow-[0_0_10px_rgba(62,196,112,0.1)] hover:shadow-[0_0_15px_rgba(62,196,112,0.2)] active:scale-[0.98]',
  secondary:
    'bg-white/[0.05] border border-white/[0.08] text-white/80 hover:bg-white/[0.04] hover:text-white',
  ghost:
    'bg-transparent text-white/50 hover:text-white hover:bg-white/5',
  danger:
    'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-5 py-2 text-[11px]',
  md: 'px-5 py-2.5 text-[12px]',
  lg: 'px-6 py-3.5 text-xs',
};

/**
 * 统一按钮组件 — 4 级变体
 * Primary: 绿色 CTA
 * Secondary: 白底黑边次要操作
 * Ghost: 文字按钮
 * Danger: 红色危险操作
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, fullWidth, className, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded font-bold tracking-wider transition-all uppercase',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
