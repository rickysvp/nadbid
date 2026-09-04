import { useCallback } from 'react';
import type { Hash } from 'viem';
import { contractAddresses, factoryAbi } from '../contracts';
import type { ToastLike } from '../web3Errors';
import { useWriteContractTx } from './useWriteContractTx';
import type { TxStatus } from './useWriteContractTx';
import { useReadContract } from './useReadContract';

/** createKolAuction 的参数 */
export interface CreateKolAuctionArgs {
  passContract: `0x${string}`;
  fixedBidAmount: bigint;
  duration: bigint;
  content: string;
}

/** createKolAuctionScheduled 的参数（多一个 startTime，秒级 Unix 时间戳） */
export interface CreateKolAuctionScheduledArgs extends CreateKolAuctionArgs {
  startTime: bigint;
}

/** 写入交易的通用选项 */
export interface FactoryTxOptions {
  /**
   * 交易成功确认后的回调。
   * 创建 PASS / 拍卖后需在此 refetch 对应 KOL 的 Registry 索引（getKol），
   * 以展示最新 passContracts / auctionContracts。
   */
  onSuccess?: (txHash: Hash, receipt: unknown) => void;
  /** 自定义 toast */
  toast?: ToastLike;
}

export interface UseFactoryResult {
  // ---- 链上写入 ----
  /** createKolPass(mintPrice)：为当前 KOL 创建 PASS NFT 合约（返回合约地址） */
  createKolPass: (mintPrice: bigint, opts?: FactoryTxOptions) => Promise<Hash | null>;
  /** createKolAuction({ passContract, fixedBidAmount, duration, content })：创建固定价拍卖合约（立即开始） */
  createKolAuction: (args: CreateKolAuctionArgs, opts?: FactoryTxOptions) => Promise<Hash | null>;
  /** createKolAuctionScheduled({ ...args, startTime })：创建预约开始的固定价拍卖（startTime 秒级 Unix 时间戳） */
  createKolAuctionScheduled: (
    args: CreateKolAuctionScheduledArgs,
    opts?: FactoryTxOptions,
  ) => Promise<Hash | null>;
  // ---- 交易状态（两条创建共享同一状态机） ----
  status: TxStatus;
  txHash: Hash | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  reset: () => void;
  /** 工厂合约地址未配置 */
  isAddressMissing: boolean;
  /** F1：固定出价金额（链上 FIXED_BID_AMOUNT，wei）——前端创建拍卖默认值
   *   必须取链上值（测试网 0.1 MON / 主网 99 MON），否则按 99 硬编码提交会
   *   触发合约 WRONG_FIXED_BID revert */
  fixedBidAmount: bigint | undefined;
}

/**
 * useFactory — NadbidFactory 工厂合约写入封装。
 *
 * @example
 * const { createKolPass, createKolAuction, isSuccess } = useFactory();
 * await createKolPass(parseEther('0.001'), { onSuccess: () => refetchRegistryIndex() });
 * await createKolAuction({ passContract, fixedBidAmount, duration, content });
 */
export function useFactory(): UseFactoryResult {
  const factoryAddress = contractAddresses.factory;
  const { write, status, txHash, error, isLoading, isSuccess, reset } = useWriteContractTx();
  // F1：固定出价金额（链上 immutable，随环境不同：测试网 0.1 / 主网 99）
  const { data: fixedBidAmount } = useReadContract({
    address: factoryAddress,
    abi: factoryAbi,
    functionName: 'FIXED_BID_AMOUNT',
  });

  const createKolPass = useCallback(
    (mintPrice: bigint, opts: FactoryTxOptions = {}): Promise<Hash | null> => {
      if (!factoryAddress) return Promise.resolve(null);
      return write({
        address: factoryAddress,
        abi: factoryAbi,
        functionName: 'createKolPass',
        args: [mintPrice],
        onSuccess: opts.onSuccess,
        toast: opts.toast,
      });
    },
    [write, factoryAddress],
  );

  const createKolAuction = useCallback(
    (args: CreateKolAuctionArgs, opts: FactoryTxOptions = {}): Promise<Hash | null> => {
      if (!factoryAddress) return Promise.resolve(null);
      return write({
        address: factoryAddress,
        abi: factoryAbi,
        functionName: 'createKolAuction',
        args: [args.passContract, args.fixedBidAmount, args.duration, args.content],
        onSuccess: opts.onSuccess,
        toast: opts.toast,
      });
    },
    [write, factoryAddress],
  );

  const createKolAuctionScheduled = useCallback(
    (args: CreateKolAuctionScheduledArgs, opts: FactoryTxOptions = {}): Promise<Hash | null> => {
      if (!factoryAddress) return Promise.resolve(null);
      return write({
        address: factoryAddress,
        abi: factoryAbi,
        functionName: 'createKolAuctionScheduled',
        args: [args.passContract, args.fixedBidAmount, args.duration, args.content, args.startTime],
        onSuccess: opts.onSuccess,
        toast: opts.toast,
      });
    },
    [write, factoryAddress],
  );

  return {
    createKolPass,
    createKolAuction,
    createKolAuctionScheduled,
    status,
    txHash,
    error,
    isLoading,
    isSuccess,
    reset,
    isAddressMissing: factoryAddress === undefined,
    fixedBidAmount: fixedBidAmount as bigint | undefined,
  };
}
