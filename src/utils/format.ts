/**
 * Formatting utilities.
 * Keep display concerns out of data layers.
 */
import { BONDING_CURVE, DIVIDEND_POOL, NFT_FEES, STAKING } from '@/constants/app';
import type { KolNftCurveParams, StakeLockDays } from '@/types';

const SI_SUFFIXES = ['', 'K', 'M', 'B', 'T'] as const;

/** Compact format for large numbers (e.g. 1200 -> "1.2K"). */
export function formatCompactNumber(value: number, fractionDigits = 1): string {
  if (!Number.isFinite(value) || value === 0) return '0';
  const absValue = Math.abs(value);
  const tier = Math.min(Math.floor(Math10(absValue) / 3), SI_SUFFIXES.length - 1);
  const scaled = value / Math.pow(10, tier * 3);
  const suffix = SI_SUFFIXES[tier];
  return `${scaled.toFixed(fractionDigits)}${suffix}`;
}
function Math10(x: number) {
  return Math.log(x) / Math.log(10);
}

/** Shorten an Ethereum-style address. */
export function shortenAddress(address: string, start = 4, end = 4): string {
  if (address.length <= start + end + 2) return address;
  return `${address.slice(0, start + 2)}...${address.slice(-end)}`;
}

/** Format a currency amount with token symbol suffix. */
export function formatTokenAmount(amount: number, symbol = '$MON'): string {
  return `${amount.toFixed(2)} ${symbol}`;
}

/** Format a percentage change with an explicit +/- sign. */
export function formatPercentChange(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/** Strip leading "@" from a KOL handle. */
export function normalizeKolHandle(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.replace(/^@+/, '').trim();
}

/* =========================================================
 * BONDING CURVE ALGORITHM (单一算法源，组件层不写价格)
 * 采用线性曲线（可扩展为 exponential 不改调用方）
 * price = BASE + slope * supply^exponent
 * =======================================================*/

/** 计算第 supplyIndex 枚 NFT 的单价（1-indexed，supplyIndex=1 即第 1 枚）。 */
export function calcNftUnitPrice(
  supplyIndex: number,
  params: KolNftCurveParams = {
    kind: BONDING_CURVE.DEFAULT_KIND,
    basePriceMon: BONDING_CURVE.BASE_PRICE_MON,
    slope: BONDING_CURVE.DEFAULT_SLOPE,
    exponent: 1.05,
  },
): number {
  const n = Math.max(1, Math.floor(supplyIndex));
  if (params.kind === 'linear') {
    return params.basePriceMon + params.slope * (n - 1);
  }
  // exponential
  return params.basePriceMon * Math.pow(n, params.exponent ?? 1.05);
}

/** 连续铸造 qty 枚时，总 MON 成本（不含手续费）—— 求和 Σ第 (supply+1)...(supply+qty) 枚单价。 */
export function calcMintTotalCost(
  currentSupply: number,
  qty: number,
  params?: KolNftCurveParams,
): number {
  let total = 0;
  for (let i = 1; i <= qty; i += 1) {
    total += calcNftUnitPrice(currentSupply + i, params);
  }
  return roundMon(total);
}

/** 连续销毁 qty 枚时，回收 MON（不含手续费前的曲线返还）—— Σ从 supply 递减。 */
export function calcBurnTotalReturn(
  currentSupply: number,
  qty: number,
  params?: KolNftCurveParams,
): number {
  if (qty <= 0) return 0;
  const safeQty = Math.min(qty, currentSupply);
  let total = 0;
  for (let i = 0; i < safeQty; i += 1) {
    const idx = currentSupply - i;
    if (idx <= 0) break;
    total += calcNftUnitPrice(idx, params);
  }
  return roundMon(total);
}

/** 生成一条预览曲线点（用于 AreaChart 展示 + currentPrice 推算）。 */
export function buildCurvePreview(
  currentSupply: number,
  count = BONDING_CURVE.PREVIEW_POINT_COUNT,
  params?: KolNftCurveParams,
): { t: string; price: number }[] {
  const out: { t: string; price: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    const supplyIdx = Math.max(1, currentSupply - (count - 1) + i);
    out.push({
      t: `#${supplyIdx}`,
      price: roundMon(calcNftUnitPrice(supplyIdx, params)),
    });
  }
  return out;
}

/** 当前最新一枚 NFT 的单价 = 最新 supply 位置单价（作为展示 floor/currentPrice 使用）。 */
export function calcCurrentNftPrice(currentSupply: number, params?: KolNftCurveParams): number {
  if (currentSupply <= 0) return params?.basePriceMon ?? BONDING_CURVE.BASE_PRICE_MON;
  return roundMon(calcNftUnitPrice(currentSupply, params));
}

/* =========================================================
 * NFT FEE SPLIT (SPEC §12.2 · 8% = 5% KOL + 3% Treasury)
 * =======================================================*/
export interface NftFeeSplit {
  /** 总手续费 */
  feeMon: number;
  /** KOL 收入部分 */
  kolShareMon: number;
  /** 平台国库部分 */
  treasuryShareMon: number;
}

/** Mint 场景：税前 totalCost → 返回含总手续费的总应付 + 拆分。 */
export function calcMintFeeSplit(totalCostBeforeFee: number): {
  totalPayMon: number;
  baseCost: number;
} & NftFeeSplit {
  const fee = roundMon(totalCostBeforeFee * (NFT_FEES.TOTAL_BPS / NFT_FEES.BASIS_POINTS));
  const kol = roundMon(totalCostBeforeFee * (NFT_FEES.KOL_SHARE_BPS / NFT_FEES.BASIS_POINTS));
  const treasury = roundMon(
    totalCostBeforeFee * (NFT_FEES.TREASURY_SHARE_BPS / NFT_FEES.BASIS_POINTS),
  );
  return {
    baseCost: roundMon(totalCostBeforeFee),
    feeMon: fee,
    kolShareMon: kol,
    treasuryShareMon: treasury,
    totalPayMon: roundMon(totalCostBeforeFee + fee),
  };
}

/** Burn 场景：税前 return → 返回用户实收 + 扣费拆分。 */
export function calcBurnFeeSplit(grossReturn: number): {
  netReceiveMon: number;
  grossReturn: number;
} & NftFeeSplit {
  const fee = roundMon(grossReturn * (NFT_FEES.TOTAL_BPS / NFT_FEES.BASIS_POINTS));
  const kol = roundMon(grossReturn * (NFT_FEES.KOL_SHARE_BPS / NFT_FEES.BASIS_POINTS));
  const treasury = roundMon(grossReturn * (NFT_FEES.TREASURY_SHARE_BPS / NFT_FEES.BASIS_POINTS));
  return {
    grossReturn: roundMon(grossReturn),
    feeMon: fee,
    kolShareMon: kol,
    treasuryShareMon: treasury,
    netReceiveMon: roundMon(grossReturn - fee),
  };
}

/* =========================================================
 * DIVIDEND POOL HELPERS (每周日 UTC 00:00 结算)
 * =======================================================*/

/** 返回下一个"每周日 UTC 00:00"的 Date 对象（如果今天是周日且还没到 00:00，则返回今天，否则下周日）。 */
export function getNextDividendSettlement(fromDate: Date = new Date()): Date {
  const d = new Date(
    Date.UTC(
      fromDate.getUTCFullYear(),
      fromDate.getUTCMonth(),
      fromDate.getUTCDate(),
      DIVIDEND_POOL.SETTLEMENT_UTC_HOUR,
      DIVIDEND_POOL.SETTLEMENT_UTC_MINUTE,
      0,
      0,
    ),
  );
  const currentDay = d.getUTCDay();
  // 距离周日还有几天（0=周日）
  let deltaDays = (DIVIDEND_POOL.SETTLEMENT_UTC_DAY - currentDay + 7) % 7;
  if (deltaDays === 0 && d.getTime() <= fromDate.getTime()) {
    deltaDays = 7;
  }
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d;
}

/** 人类可读的"距离下次分红"倒计时字符串（自动省略 0 段）。 */
export function formatCountdown(targetUtcMs: number, fromMs: number = Date.now()): string {
  const diff = Math.max(0, targetUtcMs - fromMs);
  const totalSec = Math.floor(diff / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (d || h) parts.push(`${h}h`);
  if (d || h || m) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

/**
 * 每枚 STAKE_ACTIVE NFT 占分红池的份额（等权规则：1 / 全市场质押中的 NFT 数）。
 * 锁定档位不影响权重，多质押 = 多分红（SPEC §11 统一口径）。
 */
export function calcDividendSharePerNft(totalStakedNfts: number, digits = 3): string {
  if (!Number.isFinite(totalStakedNfts) || totalStakedNfts <= 0) return '—';
  const pct = (1 / totalStakedNfts) * 100;
  return `${pct.toFixed(digits)}%`;
}

/* =========================================================
 * STAKING HELPERS
 * =======================================================*/

/** 质押 → 预计可首次请求分红生效的日期（stakeAt + 24h 激活 + 下一个周日结算）。 */
export function calcEstimatedFirstDividendDate(stakeAt: Date = new Date()): Date {
  const activeAt = new Date(stakeAt.getTime() + STAKING.PENDING_HOURS * 3600 * 1000);
  return getNextDividendSettlement(activeAt);
}

/** 质押到期日。 */
export function calcStakeReleaseDate(lockDays: StakeLockDays, stakeAt: Date = new Date()): Date {
  const d = new Date(stakeAt.getTime());
  d.setUTCDate(d.getUTCDate() + lockDays);
  return d;
}

/* =========================================================
 * ROUNDING HELPERS（统一 4 位，避免浮点漂移）
 * =======================================================*/
export function roundMon(value: number, digits = 4): number {
  if (!Number.isFinite(value)) return 0;
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}
