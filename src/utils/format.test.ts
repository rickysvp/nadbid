import { describe, it, expect } from 'vitest';
import { formatMon, shortenAddress, formatDuration, getTimeParts } from './format';

describe('formatMon（wei → MON 显示）', () => {
  it('0 / 空值 / 非法值', () => {
    expect(formatMon(0n)).toBe('0');
    expect(formatMon(undefined)).toBe('—');
    expect(formatMon(null)).toBe('—');
    expect(formatMon(Number.NaN)).toBe('—');
  });

  it('≥1 MON 保留 2 位小数并千分位', () => {
    expect(formatMon(1n * 10n ** 18n)).toBe('1.00');
    expect(formatMon(1_234_567_890_000_000_000_000n)).toBe('1,234.57');
    expect(formatMon(1000n * 10n ** 18n)).toBe('1,000.00');
  });

  it('0.001..1 保留有效位', () => {
    expect(formatMon(5n * 10n ** 15n)).toBe('0.005'); // 0.005 MON
    expect(formatMon(10n ** 17n)).toBe('0.1');        // 0.1 MON
    expect(formatMon(125n * 10n ** 15n)).toBe('0.125'); // 0.125 MON
  });

  it('<0.001 使用科学计数', () => {
    expect(formatMon(10n ** 13n)).toBe('1.0e-5'); // 0.00001 MON
  });

  it('负数安全', () => {
    expect(formatMon(-2n * 10n ** 18n)).toBe('-2.00');
  });

  it('【已知 P2 精度风险】超大 wei 转 Number 可能失真（记录行为，勿用于金额计算）', () => {
    // Number(999_999...n*1e18)/1e18 在 >2^53 时丢失低位精度；
    // 展示层可接受 ±0.01 级偏差，但计算/比较必须用 bigint + formatUnits
    const huge = 1_000_000_000_000_000_000_000_000n * 10n ** 18n; // 1e24 MON
    const out = formatMon(huge);
    expect(typeof out).toBe('string');
    expect(Number.isNaN(Number(out.replace(/,/g, '')))).toBe(false);
    // 精确值（string 路径）不应依赖 Number：此处仅断言输出仍是合法数字文本
    expect(out).toMatch(/^[\d,]+\.\d{2}$/);
  });
});

describe('shortenAddress', () => {
  it('标准缩写（前6后4）', () => {
    expect(shortenAddress('0x4F8a2B5c3D6e7F8a9B0c1D2e3F4a5B6c7D8e9F0a')).toBe(
      '0x4F8a...9F0a',
    );
  });
  it('短地址原样返回', () => {
    expect(shortenAddress('0x1234')).toBe('0x1234');
  });
  it('空地址安全', () => {
    expect(shortenAddress('')).toBe('');
  });
});

describe('formatDuration', () => {
  it('基本时分秒', () => {
    expect(formatDuration(0)).toBe('00:00:00');
    expect(formatDuration(40)).toBe('00:00:40');
    expect(formatDuration(3661)).toBe('01:01:01');
  });
  it('超过 24h 显示天数', () => {
    expect(formatDuration(90061)).toBe('1d 01:01:01');
  });
  it('负值安全', () => {
    expect(formatDuration(-5)).toBe('00:00:00');
  });
});

describe('getTimeParts', () => {
  it('剩余时间拆解', () => {
    const t = getTimeParts(86400 * 1000 + 3600 * 1000 + 61 * 1000, 0);
    expect(t).toMatchObject({ days: 1, hours: 1, minutes: 1, seconds: 1, isExpired: false });
  });
  it('已过期', () => {
    expect(getTimeParts(0, 5000).isExpired).toBe(true);
    expect(getTimeParts(0, 5000).days).toBe(0);
  });
});
