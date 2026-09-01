/**
 * 债券曲线（Bonding Curve）纯函数工具 — Mint / Burn 共享的唯一计价来源。
 *
 * 曲线模型：price(supply) = basePrice × (supply / baseSupply) ^ EXPONENT
 *   - 与 KolProfilePage 内 InteractiveBondingCurve 的渲染公式保持一致（EXPONENT = 2）。
 *   - Mint 增加供应量 → 价格沿曲线上涨；Burn 减少供应量 → 价格沿曲线下跌。
 *
 * 约定：所有 Mint / Burn 的「新供应量」「新价格」都必须经过本模块计算，
 * 避免页面 / 弹窗 / hook 各自推导导致的数据不一致。
 */
import { CURVE_DEFAULTS } from './constants';

/** 曲线指数（2 = 二次曲线，与全局 CURVE_DEFAULTS 一致） */
const EXPONENT = CURVE_DEFAULTS.EXPONENT;

/** 某供应量下的曲线价格；锚定在 (baseSupply, basePrice) 点 */
export function curvePriceAt(supply: number, baseSupply: number, basePrice: number): number {
  if (baseSupply <= 0 || supply <= 0) return Math.max(0, basePrice);
  return basePrice * Math.pow(supply / baseSupply, EXPONENT);
}

/** Mint Δ 后的新供应量（Δ 会被钳制为非负数） */
export function supplyAfterMint(supply: number, delta: number): number {
  return supply + Math.max(0, delta);
}

/** Burn Δ 后的新供应量（不低于 1，避免除零 / 负供应） */
export function supplyAfterBurn(supply: number, delta: number): number {
  return Math.max(1, supply - Math.max(0, delta));
}
