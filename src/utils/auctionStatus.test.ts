import { describe, it, expect } from 'vitest';
import { deriveChainStatus, AUCTION_STATUS_ENUM } from './auctionStatus';

const base = {
  status: AUCTION_STATUS_ENUM.ACTIVE,
  settled: false,
  startTime: 1_700_000_000n,
  endTime: 1_700_003_600n,
};
const NOW = 1_700_001_000_000; // ms → 秒 1700001000，落在 [start,end)

describe('deriveChainStatus（六态派生）', () => {
  it('ACTIVE + 进行中 → LIVE', () => {
    expect(deriveChainStatus(base, NOW)).toBe('LIVE');
  });

  it('ACTIVE + 未开始 → UPCOMING', () => {
    expect(deriveChainStatus({ ...base, startTime: 1_700_002_000n }, NOW)).toBe('UPCOMING');
  });

  it('ACTIVE + 已过 endTime → ENDED（未结算）', () => {
    expect(deriveChainStatus({ ...base, endTime: 1_700_000_500n }, NOW)).toBe('ENDED');
  });

  it('SETTLED → SETTLED（等待履约）', () => {
    expect(
      deriveChainStatus({ ...base, status: AUCTION_STATUS_ENUM.SETTLED, settled: true }, NOW),
    ).toBe('SETTLED');
  });

  it('AWAITING_CONFIRMATION → AWAITING（终态优先级高于 settled 标记）', () => {
    expect(
      deriveChainStatus(
        { ...base, status: AUCTION_STATUS_ENUM.AWAITING_CONFIRMATION, settled: true, endTime: 1n },
        NOW,
      ),
    ).toBe('AWAITING');
  });

  it('COMPLETED → COMPLETED', () => {
    expect(
      deriveChainStatus({ ...base, status: AUCTION_STATUS_ENUM.COMPLETED, settled: true }, NOW),
    ).toBe('COMPLETED');
  });

  it('DISPUTED → DISPUTED', () => {
    expect(
      deriveChainStatus({ ...base, status: AUCTION_STATUS_ENUM.DISPUTED, settled: true }, NOW),
    ).toBe('DISPUTED');
  });

  it('REFUNDED → REFUNDED', () => {
    expect(
      deriveChainStatus({ ...base, status: AUCTION_STATUS_ENUM.REFUNDED, settled: true }, NOW),
    ).toBe('REFUNDED');
  });

  it('未知 status 且未结算 → 按时间兜底', () => {
    expect(
      deriveChainStatus({ ...base, status: 99, settled: false }, NOW),
    ).toBe('LIVE');
  });
});
