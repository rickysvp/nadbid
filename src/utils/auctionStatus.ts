/**
 * 拍卖展示状态派生（SP-2 履约状态机 → UI 标签）。
 * 从链上 AuctionData（KolAuction.getAuction）推导用于展示的状态：
 *  - 履约状态机终态优先：AWAITING(2) / COMPLETED(3) / DISPUTED(4) / REFUNDED(5)
 *  - SETTLED(1) → 'SETTLED'
 *  - ACTIVE(0)：按 endTime / startTime 判定 ENDED / UPCOMING / LIVE
 */

/** 链上拍卖展示状态（UI 标签） */
export type AuctionDisplayStatus =
  | 'LIVE'
  | 'UPCOMING'
  | 'ENDED'
  | 'SETTLED'
  | 'AWAITING'
  | 'COMPLETED'
  | 'DISPUTED'
  | 'REFUNDED';

/** KolAuction 状态枚举（AuctionStatus，uint8） */
export const AUCTION_STATUS_ENUM = {
  ACTIVE: 0,
  SETTLED: 1,
  AWAITING_CONFIRMATION: 2,
  COMPLETED: 3,
  DISPUTED: 4,
  REFUNDED: 5,
} as const;

/** getAuction 所需的字段子集（status/settled/endTime/startTime） */
export interface AuctionStatusData {
  status: number;
  settled: boolean;
  startTime: bigint;
  endTime: bigint;
}

export function deriveChainStatus(
  data: AuctionStatusData,
  nowMs: number = Date.now(),
): AuctionDisplayStatus {
  switch (data.status) {
    case AUCTION_STATUS_ENUM.AWAITING_CONFIRMATION:
      return 'AWAITING';
    case AUCTION_STATUS_ENUM.COMPLETED:
      return 'COMPLETED';
    case AUCTION_STATUS_ENUM.DISPUTED:
      return 'DISPUTED';
    case AUCTION_STATUS_ENUM.REFUNDED:
      return 'REFUNDED';
    default:
      break;
  }
  if (data.settled) return 'SETTLED';
  const nowSec = Math.floor(nowMs / 1000);
  if (nowSec >= Number(data.endTime)) return 'ENDED';
  if (nowSec < Number(data.startTime)) return 'UPCOMING';
  return 'LIVE';
}
