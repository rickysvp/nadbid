/**
 * 全局常量 — 消除组件内硬编码
 */

// ============ 费用结构 ============
export const FEES = {
  /** Mint/Burn 协议费 */
  PROTOCOL_FEE: 0.03,
  /** 拍卖 KOL 分成 */
  KOL_ROYALTY: 0.05,
  /** 拍卖国库分成 */
  TREASURY_SHARE: 0.92,
  /** Burn 买卖价差 */
  BURN_SPREAD: 0.03,
  /** Claim 领取费 */
  CLAIM_FEE: 0.01,
} as const;

// ============ Bonding Curve 默认参数 ============
export const CURVE_DEFAULTS = {
  /** 第 1 枚价格（MON） */
  BASE_PRICE: 12.4,
  /** 曲线指数（2 = 二次曲线） */
  EXPONENT: 2,
  /** 参考供应量（用于归一化） */
  REFERENCE_SUPPLY: 8492,
} as const;

// ============ 质押参数 ============
export const STAKING = {
  /** 激活期（秒）— stake 后到开始计息 */
  ACTIVATION_PERIOD: 86400, // 24h
  /** 解押冷却期（秒） */
  UNLOCK_PERIOD: 604800, // 7d
} as const;

// ============ 拍卖参数 ============
export const AUCTION = {
  /** 最低出价增幅（%） */
  MIN_BID_INCREMENT: 0.05,
  /** 延长时间（秒）— 最后 5 分钟内出价自动延长 */
  EXTENSION_WINDOW: 300,
  EXTENSION_DURATION: 300,
} as const;

// ============ 积分参数 ============
export const POINTS = {
  /** 推荐奖励比例（被推荐人基础积分的 %） */
  REFERRAL_BONUS: 0.05,
} as const;

// ============ 链上配置 ============
export const CHAIN = {
  /** 原生代币符号 */
  NATIVE_SYMBOL: 'MON',
  /** 原生代币 decimals */
  NATIVE_DECIMALS: 18,
  /** 区块浏览器前缀（Monad） */
  EXPLORER_URL: 'https://explorer.monad.xyz',
} as const;

// ============ 分页 ============
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  AUCTION_PAGE_SIZE: 12,
} as const;
