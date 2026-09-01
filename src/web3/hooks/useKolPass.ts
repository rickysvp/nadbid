import { useCallback } from 'react';
import type { Hash } from 'viem';
import { kolPassAbi } from '../contracts';
import type { ToastLike } from '../web3Errors';
import { useReadContract } from './useReadContract';
import { useWriteContractTx } from './useWriteContractTx';
import type { TxStatus } from './useWriteContractTx';

/** KolPass.getCurveConfig 返回的曲线参数 */
export interface CurveConfig {
  basePrice: bigint;
  baseSupply: bigint;
  exponent: bigint;
}

/** 写入交易的通用选项 */
export interface KolPassTxOptions {
  /** 交易成功确认后的回调（可用于刷新余额 / 失效 query） */
  onSuccess?: (txHash: Hash, receipt: unknown) => void;
  /** 自定义 toast */
  toast?: ToastLike;
}

export interface UseKolPassResult {
  // ---- 链上读取 ----
  /** 当前曲线价格（下一个 mint 的成本，单位 wei） */
  curvePrice: bigint | undefined;
  /** 当前总供应量 */
  totalSupply: bigint | undefined;
  /** 指定账户持有的 PASS 数量 */
  balanceOf: bigint | undefined;
  /** 曲线参数（basePrice / baseSupply / exponent） */
  curveConfig: CurveConfig | undefined;
  // ---- 链上写入 ----
  /**
   * mint(quantity, opts)：铸造 quantity 个 PASS。
   * value 默认按 curvePrice × quantity 兜底（单币精确）；多币 mint 请调用方通过 opts.value
   * 传入精确累计成本（可逐 supply 累加 curvePriceAt）。
   */
  mint: (quantity: bigint, opts?: { value?: bigint } & KolPassTxOptions) => Promise<Hash | null>;
  /** burn(tokenIds)：销毁指定 tokenId 的 PASS */
  burn: (tokenIds: readonly bigint[], opts?: KolPassTxOptions) => Promise<Hash | null>;
  // ---- 交易状态（mint / burn 共享同一状态机） ----
  status: TxStatus;
  txHash: Hash | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  reset: () => void;
  /** PASS 合约地址未配置（合约未部署） */
  isAddressMissing: boolean;
}

/**
 * useKolPass — 单个 KOL 的 PASS NFT 合约读写封装。
 *
 * @param passAddress KolPass 合约地址（来自 Registry.getKol().passContracts，动态获取）
 * @param account 可选，用于查询持仓 balanceOf
 *
 * @example
 * const { curvePrice, totalSupply, balanceOf, mint, burn, isLoading } = useKolPass(passAddress, address);
 * await mint(1n, { value: curvePrice });
 */
export function useKolPass(
  passAddress: `0x${string}` | undefined,
  account?: `0x${string}` | undefined,
): UseKolPassResult {
  const curvePriceRes = useReadContract({
    address: passAddress,
    abi: kolPassAbi,
    functionName: 'curvePrice',
  });
  const totalSupplyRes = useReadContract({
    address: passAddress,
    abi: kolPassAbi,
    functionName: 'totalSupply',
  });
  const balanceOfRes = useReadContract({
    address: passAddress,
    abi: kolPassAbi,
    functionName: 'balanceOf',
    args: [account ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: account !== undefined },
  });
  const curveConfigRes = useReadContract({
    address: passAddress,
    abi: kolPassAbi,
    functionName: 'getCurveConfig',
  });

  const { write, status, txHash, error, isLoading, isSuccess, reset } = useWriteContractTx();

  const mint = useCallback(
    (quantity: bigint, opts: { value?: bigint } & KolPassTxOptions = {}): Promise<Hash | null> => {
      if (!passAddress) return Promise.resolve(null);
      const { value, onSuccess, toast } = opts;
      const curvePrice = curvePriceRes.data as bigint | undefined;
      const cost = value ?? (curvePrice ?? 0n) * quantity;
      return write({
        address: passAddress,
        abi: kolPassAbi,
        functionName: 'mint',
        args: [quantity],
        value: cost,
        onSuccess,
        toast,
      });
    },
    [write, passAddress, curvePriceRes.data],
  );

  const burn = useCallback(
    (tokenIds: readonly bigint[], opts: KolPassTxOptions = {}): Promise<Hash | null> => {
      if (!passAddress) return Promise.resolve(null);
      return write({
        address: passAddress,
        abi: kolPassAbi,
        functionName: 'burn',
        args: [tokenIds],
        onSuccess: opts.onSuccess,
        toast: opts.toast,
      });
    },
    [write, passAddress],
  );

  return {
    curvePrice: curvePriceRes.data as bigint | undefined,
    totalSupply: totalSupplyRes.data as bigint | undefined,
    balanceOf: balanceOfRes.data as bigint | undefined,
    curveConfig: curveConfigRes.data as CurveConfig | undefined,
    mint,
    burn,
    status,
    txHash,
    error,
    isLoading,
    isSuccess,
    reset,
    isAddressMissing: passAddress === undefined,
  };
}
