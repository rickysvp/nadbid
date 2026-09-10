import { describe, it, expect } from 'vitest';
import { curvePriceAt, supplyAfterMint, supplyAfterBurn } from './bondingCurve';

describe('curvePriceAt（带偏移二次曲线 P(n) = basePrice + (maxPrice−basePrice)·(n/baseSupply)²）', () => {
  it('起点 = basePrice（10 MON 起铸，产品规则）', () => {
    expect(curvePriceAt(1, 2000, 10, 10000)).toBeCloseTo(10 + 9990 / 4_000_000, 8);
  });
  it('满供应（2000）价格 = maxPrice（1000 倍涨幅）', () => {
    expect(curvePriceAt(2000, 2000, 10, 10000)).toBeCloseTo(10000, 6);
  });
  it('半供应（1000）价格 = 中间锚点', () => {
    // 10 + 9990 × (1000/2000)² = 10 + 9990 × 0.25 = 2507.5
    expect(curvePriceAt(1000, 2000, 10, 10000)).toBeCloseTo(2507.5, 6);
  });
  it('供应翻倍涨幅呈二次加速（500 → 1000 价格 ×4 的偏移版本）', () => {
    const p500 = curvePriceAt(500, 2000, 10, 10000);
    const p1000 = curvePriceAt(1000, 2000, 10, 10000);
    // (1000/500)² = 4，偏移部分 ×4
    expect(p1000 - 10).toBeCloseTo((p500 - 10) * 4, 6);
  });
  it('baseSupply<=0 或 supply<=0 返回 basePrice（防除零）', () => {
    expect(curvePriceAt(0, 1000, 5)).toBe(5);
    expect(curvePriceAt(1000, 0, 5)).toBe(5);
    expect(curvePriceAt(0, 0, 5)).toBe(5);
  });
  it('无 maxPrice 时退回纯幂律（旧调用兼容）', () => {
    expect(curvePriceAt(1000, 1000, 0.0001)).toBeCloseTo(0.0001, 10);
    expect(curvePriceAt(2000, 1000, 0.0001)).toBeCloseTo(0.0004, 10);
  });
});

describe('supplyAfterMint / supplyAfterBurn', () => {
  it('mint 累加', () => {
    expect(supplyAfterMint(10, 5)).toBe(15);
  });
  it('mint 负增量钳制为 0', () => {
    expect(supplyAfterMint(10, -3)).toBe(10);
  });
  it('burn 扣减', () => {
    expect(supplyAfterBurn(10, 4)).toBe(6);
  });
  it('burn 不低于 1（防除零）', () => {
    expect(supplyAfterBurn(3, 10)).toBe(1);
    expect(supplyAfterBurn(1, 5)).toBe(1);
  });
});
