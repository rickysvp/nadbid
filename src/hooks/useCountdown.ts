import { useState, useEffect } from 'react';
import { getTimeParts, type TimeParts } from '../utils/format';

/**
 * 统一倒计时 Hook — 消除 AuctionsView + AuctionDetailView 重复实现
 * @param targetDate 目标时间（Date 或 timestamp ms）
 * @param enabled 是否启用（默认 true，UPCOMING 状态可设 false）
 */
export function useCountdown(
  targetDate: Date | number | null,
  enabled = true,
): TimeParts & { formatted: string } {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled || !targetDate) return;

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [enabled, targetDate]);

  const parts = targetDate
    ? getTimeParts(targetDate, now)
    : { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };

  const formatted = parts.isExpired
    ? '00:00:00'
    : parts.days > 0
      ? `${parts.days}d ${String(parts.hours).padStart(2, '0')}:${String(parts.minutes).padStart(2, '0')}:${String(parts.seconds).padStart(2, '0')}`
      : `${String(parts.hours).padStart(2, '0')}:${String(parts.minutes).padStart(2, '0')}:${String(parts.seconds).padStart(2, '0')}`;

  return { ...parts, formatted };
}

/**
 * 简化版：只返回格式化字符串
 */
export function useCountdownString(targetDate: Date | number | null, enabled = true): string {
  const { formatted } = useCountdown(targetDate, enabled);
  return formatted;
}
