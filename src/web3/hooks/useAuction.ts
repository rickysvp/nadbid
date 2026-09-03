import { useCallback } from 'react';
import { useWatchContractEvent } from 'wagmi';
import type { Hash } from 'viem';
import { kolAuctionAbi } from '../contracts';
import type { ToastLike } from '../web3Errors';
import { useReadContract } from './useReadContract';
import { useWriteContractTx } from './useWriteContractTx';
import type { TxStatus } from './useWriteContractTx';

/** KolAuction.getAuction 返回的拍卖状态（AuctionStatus 枚举值为 uint8） */
export interface AuctionData {
  id: bigint;
  kol: `0x${string}`;
  passContract: `0x${string}`;
  fixedBidAmount: bigint;
  content: string;
  itemCategory: number;
  startTime: bigint;
  endTime: bigint;
  lastBidder: `0x${string}`;
  totalBids: bigint;
  totalVolume: bigint;
  status: number;
  settled: boolean;
}

/** 写入交易的通用选项 */
export interface AuctionTxOptions {
  /** 交易成功确认后的回调 */
  onSuccess?: (txHash: Hash, receipt: unknown) => void;
  /** 自定义 toast */
  toast?: ToastLike;
}

export interface UseAuctionResult {
  // ---- 链上读取 ----
  /** 完整拍卖状态（含固定出价金额、结束时间、结算状态等） */
  auctionData: AuctionData | undefined;
  /** 指定账户累计出价金额 */
  cumulativeBid: bigint | undefined;
  /** 指定账户出价次数 */
  bidCount: bigint | undefined;
  /** 最后出价人（当前领先者）的累计出价金额 */
  lastBidderCumulative: bigint | undefined;
  /** 最后出价人（当前领先者）的出价次数 */
  lastBidderBidCount: bigint | undefined;
  // ---- 链上写入 ----
  /**
   * placeBid(opts)：以固定价出价。
   * value 默认取链上 auctionData.fixedBidAmount；调用方也可通过 opts.value 显式传入。
   */
  placeBid: (opts?: { value?: bigint } & AuctionTxOptions) => Promise<Hash | null>;
  /** settle()：结算拍卖 */
  settle: (opts?: AuctionTxOptions) => Promise<Hash | null>;
  // ---- 交易状态（placeBid / settle 共享同一状态机） ----
  status: TxStatus;
  txHash: Hash | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  reset: () => void;
  /** 手动刷新拍卖状态 */
  refetchAuction: () => void;
  /** 拍卖合约地址未配置 */
  isAddressMissing: boolean;
}

/**
 * useAuction — 单个 KOL 拍卖合约读写封装。
 * 订阅 BidPlaced 事件，任何新出价会自动 refetch 拍卖状态。
 *
 * @param auctionAddress KolAuction 合约地址（来自 Registry.getKol().auctionContracts，动态获取）
 * @param account 可选，用于查询该账户的累计出价 / 出价次数
 *
 * @example
 * const { auctionData, placeBid, settle } = useAuction(auctionAddress, address);
 * await placeBid({ value: auctionData.fixedBidAmount });
 */
export function useAuction(
  auctionAddress: `0x${string}` | undefined,
  account?: `0x${string}` | undefined,
): UseAuctionResult {
  const auctionRes = useReadContract({
    address: auctionAddress,
    abi: kolAuctionAbi,
    functionName: 'getAuction',
  });
  const cumulativeRes = useReadContract({
    address: auctionAddress,
    abi: kolAuctionAbi,
    functionName: 'getCumulativeBid',
    args: [account ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: account !== undefined },
  });
  const bidCountRes = useReadContract({
    address: auctionAddress,
    abi: kolAuctionAbi,
    functionName: 'getBidCount',
    args: [account ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: account !== undefined },
  });
  // 最后出价人（当前领先者）的累计数据：无论是否本人，前端都可展示高价值信息
  const lastBidderCumulativeRes = useReadContract({
    address: auctionAddress,
    abi: kolAuctionAbi,
    functionName: 'lastBidderCumulative',
  });
  const lastBidderBidCountRes = useReadContract({
    address: auctionAddress,
    abi: kolAuctionAbi,
    functionName: 'lastBidderBidCount',
  });

  const { write, status, txHash, error, isLoading, isSuccess, reset } = useWriteContractTx();

  // 事件驱动：任何 BidPlaced 都会刷新拍卖状态 / 累计出价 / 出价次数 / lastBidder 累计
  useWatchContractEvent({
    address: auctionAddress,
    abi: kolAuctionAbi,
    eventName: 'BidPlaced',
    enabled: auctionAddress !== undefined,
    onLogs: () => {
      auctionRes.refetch();
      cumulativeRes.refetch();
      bidCountRes.refetch();
      lastBidderCumulativeRes.refetch();
      lastBidderBidCountRes.refetch();
    },
  });

  const placeBid = useCallback(
    (opts: { value?: bigint } & AuctionTxOptions = {}): Promise<Hash | null> => {
      if (!auctionAddress) return Promise.resolve(null);
      const { value, onSuccess, toast } = opts;
      const fixedBid = value ?? (auctionRes.data as AuctionData | undefined)?.fixedBidAmount;
      if (fixedBid === undefined) return Promise.resolve(null); // 尚未读到固定价，由调用方重试
      return write({
        address: auctionAddress,
        abi: kolAuctionAbi,
        functionName: 'placeBid',
        args: [],
        value: fixedBid,
        onSuccess,
        toast,
      });
    },
    [write, auctionAddress, auctionRes.data],
  );

  const settle = useCallback(
    (opts: AuctionTxOptions = {}): Promise<Hash | null> => {
      if (!auctionAddress) return Promise.resolve(null);
      return write({
        address: auctionAddress,
        abi: kolAuctionAbi,
        functionName: 'settle',
        args: [],
        onSuccess: opts.onSuccess,
        toast: opts.toast,
      });
    },
    [write, auctionAddress],
  );

  return {
    auctionData: auctionRes.data as AuctionData | undefined,
    cumulativeBid: cumulativeRes.data as bigint | undefined,
    bidCount: bidCountRes.data as bigint | undefined,
    lastBidderCumulative: lastBidderCumulativeRes.data as bigint | undefined,
    lastBidderBidCount: lastBidderBidCountRes.data as bigint | undefined,
    placeBid,
    settle,
    status,
    txHash,
    error,
    isLoading,
    isSuccess,
    reset,
    refetchAuction: auctionRes.refetch,
    isAddressMissing: auctionAddress === undefined,
  };
}
