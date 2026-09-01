import { useCallback } from 'react';
import type { Hash } from 'viem';
import { contractAddresses, factoryAbi } from '../contracts';
import type { ToastLike } from '../web3Errors';
import { useWriteContractTx } from './useWriteContractTx';
import type { TxStatus } from './useWriteContractTx';

/** createKolAuction 的参数 */
export interface CreateKolAuctionArgs {
  passContract: `0x${string}`;
  fixedBidAmount: bigint;
  duration: bigint;
  content: string;
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
  /** createKolAuction({ passContract, fixedBidAmount, duration, content })：创建固定价拍卖合约 */
  createKolAuction: (args: CreateKolAuctionArgs, opts?: FactoryTxOptions) => Promise<Hash | null>;
  // ---- 交易状态（两条创建共享同一状态机） ----
  status: TxStatus;
  txHash: Hash | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  reset: () => void;
  /** 工厂合约地址未配置 */
  isAddressMissing: boolean;
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

  return {
    createKolPass,
    createKolAuction,
    status,
    txHash,
    error,
    isLoading,
    isSuccess,
    reset,
    isAddressMissing: factoryAddress === undefined,
  };
}
