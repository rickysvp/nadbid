import { useCallback } from 'react';
import type { Hash } from 'viem';
import { useReadContracts } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
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
  /**
   * 指定账户持有的 tokenId 列表（ERC721Enumerable.tokenOfOwnerByIndex 枚举，长度 = balanceOf）。
   * 曲线数据已加载但 balanceOf 为 0 或未连接时返回 []；burn 依赖此枚举选择 token。
   */
  userTokenIds: bigint[] | undefined;
  // ---- 链上写入 ----
  /**
   * mint(quantity, opts)：铸造 quantity 个 PASS。
   * value 默认按曲线逐枚累加（与链上 mint 完全一致），可自行传入 opts.value 覆盖。
   */
  mint: (quantity: bigint, opts?: { value?: bigint } & KolPassTxOptions) => Promise<Hash | null>;
  /** burn(tokenIds)：销毁指定 tokenId 的 PASS */
  burn: (tokenIds: readonly bigint[], opts?: KolPassTxOptions) => Promise<Hash | null>;
  /**
   * estimateMintCost(quantity)：估算 mint quantity 个 PASS 的精确链上成本（wei，含 8% 手续费缓冲），
   * 与 mint 默认 value 完全一致。供 UI 在确认弹窗展示与实际扣款一致的金额。
   * 曲线参数未加载（curveConfig 为 undefined）时返回 undefined。
   */
  estimateMintCost: (quantity: bigint) => bigint | undefined;
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
 * 计算 mint quantity 个 PASS 的精确成本（wei，含 8% 手续费缓冲）。
 * 与链上 KolPass.mint 计价完全一致：第 k 枚成本 = curvePriceAt(totalMinted + k)，再乘 108/100。
 * 曲线参数缺失时返回 undefined。
 */
export function estimateMintCostWei(
  curveConfig: CurveConfig | undefined,
  currentSupply: bigint | undefined,
  quantity: bigint,
): bigint | undefined {
  if (!curveConfig || currentSupply === undefined || quantity <= 0n) return undefined;
  const { basePrice, baseSupply } = curveConfig;
  const start = currentSupply;
  let acc = 0n;
  for (let k = 0n; k < quantity; k++) {
    const ns = start + k + 1n;
    acc += (basePrice * ns * ns) / (baseSupply * baseSupply);
  }
  return (acc * 108n) / 100n;
}

/**
 * useKolPass — 单个 KOL 的 PASS NFT 合约读写封装。
 *
 * @param passAddress KolPass 合约地址（来自 Registry.getKol().passContracts，动态获取）
 * @param account 可选，用于查询持仓 balanceOf
 *
 * @example
 * const { curvePrice, totalSupply, balanceOf, mint, estimateMintCost, isLoading } = useKolPass(passAddress, address);
 * await mint(1n, { value: estimateMintCost(1n) });
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
  const curveConfig = curveConfigRes.data as CurveConfig | undefined;

  // ===== 枚举用户持有的 tokenId（ERC721Enumerable.tokenOfOwnerByIndex）=====
  // 链上不得一次性枚举过多，读取上限与 MVP 单次 mint 数量一致（20），超出部分截断
  const MAX_ENUM_TOKENS = 20;
  const holdingCount =
    account !== undefined ? (balanceOfRes.data as bigint | undefined) : undefined;
  const enumCount =
    holdingCount !== undefined ? Math.min(Number(holdingCount), MAX_ENUM_TOKENS) : 0;
  const enumContracts = Array.from({ length: enumCount }, (_, i) => ({
    address: (passAddress ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
    abi: kolPassAbi,
    functionName: 'tokenOfOwnerByIndex' as const,
    args: [account, BigInt(i)] as const,
  }));
  const tokenReads = useReadContracts({
    contracts: enumContracts,
    query: {
      enabled:
        account !== undefined && passAddress !== undefined && (holdingCount ?? 0n) > 0n,
    },
  });
  const userTokenIds: bigint[] | undefined =
    account !== undefined && holdingCount !== undefined
      ? (tokenReads.data ?? [])
          .map((r) => (r.status === 'success' && r.result !== undefined ? r.result : undefined))
          .filter((t): t is bigint => t !== undefined)
      : undefined;

  const { write, status, txHash, error, isLoading, isSuccess, reset } = useWriteContractTx();
  const queryClient = useQueryClient();

  /**
   * mint/burn 交易确认后的统一处理：先失效本 PASS 相关链上读取
   * （totalSupply / curvePrice / balanceOf / tokenId 枚举），再调用调用方 onSuccess。
   * 关键：不刷新 totalSupply 会导致连续 mint 时按陈旧 supply 计价 → 链上 INSUFFICIENT revert。
   */
  const wrapOnSuccess =
    (userOnSuccess?: (txHash: Hash, receipt: unknown) => void) =>
    (txHash: Hash, receipt: unknown) => {
      queryClient.invalidateQueries();
      userOnSuccess?.(txHash, receipt);
    };

  const mint = useCallback(
    (quantity: bigint, opts: { value?: bigint } & KolPassTxOptions = {}): Promise<Hash | null> => {
      if (!passAddress) return Promise.resolve(null);
      const { value, onSuccess, toast } = opts;
      // 精确 value 优先；否则按曲线公式逐枚累加估算（与链上 mint 完全一致），
      // 含 8% 手续费缓冲。曲线参数或总供应量未加载（undefined）且调用方未显式
      // 传 value 时，拒绝签名并返回 null —— 绝不用 curvePrice×quantity 这类
      // 不含手续费/高供应量失真的近似值提交，否则链上 mint 会 INSUFFICIENT revert
      // 或按错误金额扣款。
      let cost = value;
      if (cost === undefined) {
        cost = estimateMintCostWei(curveConfig, totalSupplyRes.data as bigint | undefined, quantity);
      }
      if (cost === undefined) return Promise.resolve(null);
      return write({
        address: passAddress,
        abi: kolPassAbi,
        functionName: 'mint',
        args: [quantity],
        value: cost,
        onSuccess: wrapOnSuccess(onSuccess),
        toast,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [write, passAddress, totalSupplyRes.data, curveConfig, queryClient],
  );

  const estimateMintCost = useCallback(
    (quantity: bigint): bigint | undefined => {
      if (!passAddress) return undefined;
      // 仅返回精确成本（含 8% 手续费）；曲线参数/供应量未就绪时返回 undefined
      // （UI 应显示"计算中"并禁用 mint），不做不含手续费的降级近似。
      return estimateMintCostWei(curveConfig, totalSupplyRes.data as bigint | undefined, quantity);
    },
    [passAddress, curveConfig, totalSupplyRes.data],
  );

  const burn = useCallback(
    (tokenIds: readonly bigint[], opts: KolPassTxOptions = {}): Promise<Hash | null> => {
      if (!passAddress) return Promise.resolve(null);
      return write({
        address: passAddress,
        abi: kolPassAbi,
        functionName: 'burn',
        args: [tokenIds],
        onSuccess: wrapOnSuccess(opts.onSuccess),
        toast: opts.toast,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [write, passAddress, queryClient],
  );

  return {
    curvePrice: curvePriceRes.data as bigint | undefined,
    totalSupply: totalSupplyRes.data as bigint | undefined,
    balanceOf: balanceOfRes.data as bigint | undefined,
    curveConfig: curveConfigRes.data as CurveConfig | undefined,
    userTokenIds,
    mint,
    burn,
    estimateMintCost,
    status,
    txHash,
    error,
    isLoading,
    isSuccess,
    reset,
    isAddressMissing: passAddress === undefined,
  };
}
