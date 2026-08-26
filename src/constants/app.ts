import { env } from '@/lib/env';
import type { BondingCurveKind, StakeLockDays } from '@/types';

/**
 * Single source of truth for brand strings rendered across the app.
 * Change these once instead of hunting through components.
 */
export const APP_NAME = 'nadbid.fun';
export const APP_TAGLINE = 'Gamifying the Social Graph';

/* =========================================================
 * APP VERSION（单一真源：package.json → vite.config.ts define → env.VITE_APP_VERSION）
 *   升级版本：只需修改 package.json 中的 "version" 字段，其他地方自动同步。
 * =======================================================*/
export const APP_VERSION = env.VITE_APP_VERSION;

/** 解析成 { major, minor, patch, prerelease } 方便在 UI 上展示（如 "v0.1.0"）。 */
export function parseAppVersion(
  v: string = APP_VERSION,
): { major: number; minor: number; patch: number; prerelease: string } {
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)(?:[-.](.+))?$/);
  if (!m) return { major: 0, minor: 0, patch: 0, prerelease: '' };
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    prerelease: m[4] ?? '',
  };
}

/** 常见展示形式："v0.1.0" 或带后缀 "v0.2.0-beta.1"。 */
export const APP_VERSION_DISPLAY = `v${APP_VERSION}`;

/* =========================================================
 * NFT MINT / BURN CONFIG (对应 SPEC §12)
 * 单一配置源：所有费率改这里，组件层零硬编码
 * =======================================================*/
export const NFT_FEES = {
  /** 总手续费率 (SPEC §12.2: 8%) */
  TOTAL_BPS: 800 as const,
  /** KOL 分成 BPS (SPEC §12.2: 5%) */
  KOL_SHARE_BPS: 500 as const,
  /** 平台国库分成 BPS (SPEC §12.2: 3%) */
  TREASURY_SHARE_BPS: 300 as const,
  /** 精度常量：10_000 BPS = 100% */
  BASIS_POINTS: 10_000 as const,
} as const;

export const NFT_FEE_RATES = {
  TOTAL: NFT_FEES.TOTAL_BPS / NFT_FEES.BASIS_POINTS,
  KOL: NFT_FEES.KOL_SHARE_BPS / NFT_FEES.BASIS_POINTS,
  TREASURY: NFT_FEES.TREASURY_SHARE_BPS / NFT_FEES.BASIS_POINTS,
} as const;

/* =========================================================
 * BONDING CURVE CONFIG (SPEC §4.3 / §12.1 曲线参数)
 * =======================================================*/
export const BONDING_CURVE = {
  /** SPEC 起始价：100 MON（第 1 枚 NFT 的 mint 价） */
  BASE_PRICE_MON: 100,
  /** 默认斜率（线性曲线：每增发 1 枚价格增加 slope 个 MON） */
  DEFAULT_SLOPE: 15,
  DEFAULT_KIND: 'linear' as BondingCurveKind,
  PREVIEW_POINT_COUNT: 10,
} as const;

/* =========================================================
 * STAKING CONFIG (SPEC §5 质押市场规则)
 * =======================================================*/
export const STAKING = {
  LOCK_DAYS: [7, 30, 90] as const satisfies StakeLockDays[],
  PENDING_HOURS: 24,
  UNSTAKE_PENDING_HOURS: 24,
  LOCK_LABELS: {
    7: 'Flex · 7d',
    30: 'Growth · 30d',
    90: 'Max · 90d',
  } as const satisfies Record<StakeLockDays, string>,
  /** 等权承诺提示：权重与档位无关，仅表达锁定期承诺（SPEC §11 等分规则）。 */
  LOCK_HINT: {
    7: 'Equal weight · unlock after 7d',
    30: 'Equal weight · unlock after 30d',
    90: 'Equal weight · unlock after 90d',
  } as const satisfies Record<StakeLockDays, string>,
} as const;

/* =========================================================
 * DIVIDEND POOL CONFIG (SPEC §11 + 每周日 UTC 00:00 结算)
 * =======================================================*/
export const DIVIDEND_POOL = {
  DEFAULT_RATIO_BPS: 1500 as const,
  BPS: 10_000 as const,
  SETTLEMENT_UTC_DAY: 0,
  SETTLEMENT_UTC_HOUR: 0,
  SETTLEMENT_UTC_MINUTE: 0,
  WEEKDAY_UTC_LABELS: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const,
} as const;

export const DIVIDEND_RATIO_DEFAULT = DIVIDEND_POOL.DEFAULT_RATIO_BPS / DIVIDEND_POOL.BPS;
