import { describe, it, expect } from 'vitest';
import { curvePriceAt, supplyAfterMint, supplyAfterBurn } from './bondingCurve';

describe('curvePriceAt（平方联合曲线 price = basePrice × (supply/1000)²）', () => {
  it('锚定基点', () => {
    expect(curvePriceAt(1000, 1000, 0.0001)).toBeCloseTo(0.0001, 10);
  });
  it('供应翻倍价格 ×4（平方）', () => {
    expect(curvePriceAt(2000, 1000, 0.0001)).toBeCloseTo(0.0004, 10);
  });
  it('供应减半价格 /4', () => {
    expect(curvePriceAt(500, 1000, 0.0001)).toBeCloseTo(0.000025, 10);
  });
  it('baseSupply<=0 或 supply<=0 返回 basePrice（防除零）', () => {
    expect(curvePriceAt(0, 1000, 5)).toBe(5);
    expect(curvePriceAt(1000, 0, 5)).toBe(5);
    expect(curvePriceAt(0, 0, 5)).toBe(5);
  });
  it('大供应量数值稳定', () => {
    expect(curvePriceAt(100_000, 1000, 0.0001)).toBeCloseTo(1, 6); // (100)² × 0.0001 = 1
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
