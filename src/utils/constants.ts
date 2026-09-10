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
// 产品规则（2026-09）：KOL PASS 最低 10 MON 起铸，满供应（2000）达 10000 MON（1000 倍涨幅）。
// 与链上 KolPass.sol 保持一致：P(n) = basePrice + (maxPrice − basePrice)·(n/2000)²
export const CURVE_DEFAULTS = {
  /** 起铸价（第 1 枚，MON）— 链上 MIN_BASE_PRICE = 10 ether */
  BASE_PRICE: 10,
  /** 满供应顶部价格（MON）— 涨幅锚点（1000 倍） */
  MAX_PRICE: 10000,
  /** 曲线指数（2 = 二次曲线，与链上 exponent 一致） */
  EXPONENT: 2,
  /** 满供应量（曲线归一化基准，与链上 baseSupply = 2000 一致） */
  REFERENCE_SUPPLY: 2000,
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
  /** 便士拍卖（Penny Auction）单次固定出价金额（MON），兜底取 auction.bidIncrement */
  FIXED_BID_AMOUNT: 99,
  /** 每次出价成功后倒计时重置秒数（便士拍卖：出价即重置倒计时） */
  BID_EXTEND_SECONDS: 40,
  /** 拍卖倒计时进度基准时长（ms）— 用于 CircularProgress 百分比计算。
   *  便士拍卖为 40 秒重置机制：出价后 endTime = now + 40s，环形进度应以 40s 为
   *  完整一圈。此前误用 5 分钟基准导致进度环只走 13% 就归零，视觉上倒计时
   *  从不完整显示一圈。 */
  COUNTDOWN_BASE_MS: 40 * 1000,
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
