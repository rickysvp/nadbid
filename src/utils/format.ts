/**
 * 数字 / 地址 / 时间格式化工具
 */

/** 格式化大数字，带千分位 */
export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** 格式化货币金额 */
export function formatCurrency(value: number, symbol = '$', decimals = 2): string {
  return `${symbol}${formatNumber(value, decimals)}`;
}

/** 缩写钱包地址：0x4F8a...3aB9 */
export function shortenAddress(address: string, prefixLen = 6, suffixLen = 4): string {
  if (!address || address.length <= prefixLen + suffixLen) return address;
  return `${address.slice(0, prefixLen)}...${address.slice(-suffixLen)}`;
}

/** 格式化秒数为 HH:MM:SS 或 DD:HH:MM:SS */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00:00';

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (days > 0) {
    return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** 格式化倒计时为对象（用于自定义渲染） */
export interface TimeParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export function getTimeParts(targetDate: Date | number, now: Date | number = new Date()): TimeParts {
  const target = typeof targetDate === 'number' ? targetDate : targetDate.getTime();
  const current = typeof now === 'number' ? now : now.getTime();
  const diff = Math.max(0, Math.floor((target - current) / 1000));

  return {
    days: Math.floor(diff / 86400),
    hours: Math.floor((diff % 86400) / 3600),
    minutes: Math.floor((diff % 3600) / 60),
    seconds: diff % 60,
    isExpired: diff <= 0,
  };
}

/** 格式化相对时间："2 days ago" */
export function formatRelativeTime(date: Date | number): string {
  const target = typeof date === 'number' ? date : date.getTime();
  const diff = Date.now() - target;
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(target).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
