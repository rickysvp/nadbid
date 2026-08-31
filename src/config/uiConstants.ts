/**
 * UI 常量统一管理
 * 所有颜色、间距、字体等设计令牌集中在此
 */

// 颜色
export const COLORS = {
  background: '#0a0a0a',
  card: '#161616',
  cardHover: '#1a1a1a',
  border: 'rgba(255, 255, 255, 0.04)',
  borderHover: 'rgba(255, 255, 255, 0.08)',
  primary: '#3ec470',
  primaryHover: '#4ade80',
  primaryDim: 'rgba(62, 196, 112, 0.1)',
  primaryBorder: 'rgba(62, 196, 112, 0.3)',
  danger: '#ef4444',
  warning: '#fbbf24',
  text: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  textFaint: 'rgba(255, 255, 255, 0.3)',
} as const;

// 圆角
export const RADIUS = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  xl: 'rounded-3xl',
  full: 'rounded-full',
} as const;

// 间距
export const SPACING = {
  cardPadding: 'p-6',
  sectionGap: 'gap-6',
} as const;

// 字体
export const TYPOGRAPHY = {
  mono: 'font-mono',
  title: 'font-black tracking-tight',
  label: 'text-[10px] font-bold uppercase tracking-[0.15em]',
} as const;

// 阴影
export const SHADOWS = {
  card: 'shadow-lg',
  primaryGlow: 'shadow-[0_0_15px_rgba(62,196,112,0.1)]',
  primaryGlowHover: 'shadow-[0_0_25px_rgba(62,196,112,0.2)]',
} as const;

// 动画时长
export const ANIMATION = {
  fast: 'duration-150',
  normal: 'duration-300',
  slow: 'duration-500',
} as const;
