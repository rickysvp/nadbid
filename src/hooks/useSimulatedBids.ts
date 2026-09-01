import { useCallback, useEffect, useRef } from 'react';
import { AUCTION } from '../utils/constants';

/**
 * 模拟出价者 — 混合身份池（假钱包地址 + @昵称）
 * 供便士拍卖详情页模拟他人出价，营造真实竞争氛围。
 */
export interface SimulatedBidder {
  /** 出价者标识（钱包地址或 @昵称） */
  address: string;
  /** 该出价者历史累计出价次数（用于 leaderboard 累加） */
  bids: number;
}

export interface UseSimulatedBidsOptions {
  /** 是否启用（拍卖 LIVE 且倒计时未结束时为 true） */
  enabled: boolean;
  /** 每次模拟出价触发：通知页面更新 lastBidder/endTime/totalBids/leaderboard/history */
  onSimulatedBid: (bidder: SimulatedBidder, amount: number) => void;
  /** 单次出价金额（默认取 AUCTION.FIXED_BID_AMOUNT） */
  bidAmount?: number;
}

export interface UseSimulatedBidsReturn {
  /** 暂停模拟（用户自己出价时可调用；本设计不使用，保留 API） */
  pause: () => void;
  /** 恢复模拟 */
  resume: () => void;
}

/** 随机从地址池选一个模拟出价者 */
function pickSimulatedBidder(): SimulatedBidder {
  const pool: SimulatedBidder[] = [
    { address: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b', bids: 2 },
    { address: '0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e', bids: 1 },
    { address: '@DegenKing', bids: 8 },
    { address: '@AlphaHunter', bids: 12 },
    { address: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c', bids: 4 },
    { address: '@WhaleWatcher', bids: 5 },
    { address: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d', bids: 3 },
    { address: '@MoonShot', bids: 3 },
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}

/** 随机间隔 9~18s（避免机械感） */
function randomDelay(): number {
  return 9000 + Math.random() * 9000;
}

/**
 * 模拟他人出价 Hook — 便士拍卖详情页专用。
 *
 * - enabled 时启动定时器，每 9~18s 随机触发一次模拟出价。
 * - 每次触发：随机选一个混合身份池出价者，回调 onSimulatedBid。
 * - 用户自己出价后【不暂停】模拟（真实竞争压力，保持页面活跃）。
 * - 页面卸载 / enabled 变 false 时清理定时器。
 */
export function useSimulatedBids(options: UseSimulatedBidsOptions): UseSimulatedBidsReturn {
  const { enabled, onSimulatedBid, bidAmount = AUCTION.FIXED_BID_AMOUNT } = options;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);
  // 用 ref 持有最新回调，避免定时器闭包过期
  const onBidRef = useRef(onSimulatedBid);
  onBidRef.current = onSimulatedBid;
  const amountRef = useRef(bidAmount);
  amountRef.current = bidAmount;

  const fire = useCallback(() => {
    if (pausedRef.current) return;
    const bidder = pickSimulatedBidder();
    onBidRef.current(bidder, amountRef.current);
  }, []);

  // 定时调度：每次触发后重排下一次
  useEffect(() => {
    if (!enabled) return;
    const schedule = () => {
      timerRef.current = setTimeout(() => {
        fire();
        schedule();
      }, randomDelay());
    };
    schedule();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, fire]);

  const pause = useCallback(() => {
    pausedRef.current = true;
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
  }, []);

  return { pause, resume };
}
