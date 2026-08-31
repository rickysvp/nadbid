import { cn } from '../../utils/cn';

export interface KolAvatarProps {
  /** KOL handle（用于 dicebear seed） */
  handle: string;
  /** 头像尺寸 */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** 自定义头像 URL（优先于 dicebear） */
  src?: string;
  /** KOL 名称（用于 alt） */
  name?: string;
  className?: string;
}

const sizeStyles = {
  sm: 'w-8 h-8',
  md: 'w-9 h-9',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

/**
 * 统一 KOL 头像组件 — 消除 5+ 处拼 dicebear URL
 * 默认使用 dicebear avataaars，支持自定义 URL
 */
export function KolAvatar({ handle, size = 'md', src, name, className }: KolAvatarProps) {
  const avatarUrl = src || `https://api.dicebear.com/7.x/avataaars/svg?seed=${handle.replace(/^@/, '')}`;

  return (
    <img
      src={avatarUrl}
      alt={name || handle}
      className={cn(
        'rounded-full bg-[#0a0a0a] border border-white/5 object-cover',
        sizeStyles[size],
        className,
      )}
      loading="lazy"
    />
  );
}
