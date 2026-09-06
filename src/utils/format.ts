/**
 * 数字 / 地址 / 时间格式化工具
 */

import { formatUnits } from 'viem';

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

/**
 * P2-6 修复：使用 viem formatUnits 格式化 MON 金额（wei → 显示字符串），
 * 避免 Number(bigint) / 1e18 在大额场景下精度丢失。
 * 全程字符串处理，仅在最终显示时做小数截断，不经过 JavaScript Number。
 *  - >=1 MON：最多 2 位小数（千分位）
 *  - 0.001..1：保留到有效位（最多 6 位）
 *  - <0.001：显示科学计数（如 1e-5），避免 0.000001 冗长
 *  - 0 / 负数安全
 */
export function formatMon(wei: bigint | number | undefined | null, maxDecimals = 2): string {
  if (wei === undefined || wei === null) return '—';
  // number 类型直接走旧逻辑（小额场景无精度风险）
  if (typeof wei === 'number') {
    if (!Number.isFinite(wei)) return '—';
    if (wei === 0) return '0';
    if (wei < 0) return `-${formatMon(-wei, maxDecimals)}`;
    return formatMonNumber(wei, maxDecimals);
  }
  // bigint 类型：全程字符串处理，避免精度丢失
  if (wei === 0n) return '0';
  const isNegative = wei < 0n;
  const absWei = isNegative ? -wei : wei;
  // formatUnits 返回完整字符串（如 "1234.567890123456789012"）
  const full = formatUnits(absWei, 18);
  const [intPart, decPart = ''] = full.split('.');
  // 判断金额量级
  const intValue = BigInt(intPart);
  if (intValue >= 1n) {
    // >=1 MON：整数部分加千分位，小数保留 maxDecimals 位（四舍五入+补零，如 1,234.57）
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (maxDecimals === 0) {
      // 0 位小数：对第一位小数四舍五入到整数
      const firstDec = (decPart || '0').charAt(0);
      if (firstDec >= '5') {
        // 进位：整数部分加 1（处理 999 -> 1000 的情况）
        const newInt = (BigInt(intPart) + 1n).toString();
        return isNegative ? `-${newInt.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` : newInt.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      }
      return isNegative ? `-${withCommas}` : withCommas;
    }
    // 四舍五入：取前 maxDecimals+1 位，第 maxDecimals+1 位 >=5 则进位
    const paddedDec = (decPart || '').padEnd(maxDecimals + 1, '0');
    let decimals = paddedDec.slice(0, maxDecimals);
    const roundDigit = paddedDec.charAt(maxDecimals);
    if (roundDigit >= '5') {
      // 小数部分进位
      const decNum = BigInt(decimals) + 1n;
      const decStr = decNum.toString().padStart(maxDecimals, '0');
      if (decStr.length > maxDecimals) {
        // 进位到整数部分（如 0.99 + 0.01 = 1.00）
        const newInt = (BigInt(intPart) + 1n).toString();
        const newCommas = newInt.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return `${isNegative ? '-' : ''}${newCommas}.${'0'.repeat(maxDecimals)}`;
      }
      decimals = decStr;
    }
    return `${isNegative ? '-' : ''}${withCommas}.${decimals}`;
  }
  // <1 MON：转换为 number 做科学计数（小额无精度风险）
  const numValue = Number(full);
  return isNegative ? `-${formatMonNumber(numValue, maxDecimals)}` : formatMonNumber(numValue, maxDecimals);
}

/** 内部：number 类型的 MON 金额格式化（小额场景专用） */
function formatMonNumber(value: number, maxDecimals: number): string {
  if (value >= 1) {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: maxDecimals,
      maximumFractionDigits: maxDecimals,
    });
  }
  if (value >= 0.001) {
    return value.toFixed(4).replace(/\.?0+$/, '');
  }
  return value.toExponential(1).replace('e', 'e');
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
