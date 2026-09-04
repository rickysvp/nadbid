import { useCallback } from 'react';
import type { Hash } from 'viem';
import { contractAddresses, registryAbi } from '../contracts';
import type { ToastLike } from '../web3Errors';
import { useReadContract } from './useReadContract';
import { useWriteContractTx } from './useWriteContractTx';
import type { TxStatus } from './useWriteContractTx';

/** NadbidRegistry.getKol 返回的 KOL 结构体 */
export interface KolData {
  wallet: `0x${string}`;
  twitterHandle: string;
  followers: bigint;
  registered: boolean;
  bonded: boolean;
  bondAmount: bigint;
  bondTimestamp: bigint;
  bondRedeemRequestedAt: bigint;
  bondRedeemPending: boolean;
  banned: boolean;
  passContracts: readonly `0x${string}`[];
  auctionContracts: readonly `0x${string}`[];
}

/**
 * wagmi/viem 对 solidity struct 返回值解码为数组（按字段声明顺序），
 * 而非命名对象。全站按对象属性访问（kolData.twitterHandle / passContracts），
 * 必须归一化为 KolData。任何直接读 getKol / kolList 的地方都要经过本函数。
 */
export function normalizeKolData(raw: unknown): KolData | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw)) {
    const r = raw as unknown[];
    if (r.length < 12) return undefined;
    return {
      wallet: r[0] as `0x${string}`,
      twitterHandle: String(r[1] ?? ''),
      followers: r[2] as bigint,
      registered: Boolean(r[3]),
      bonded: Boolean(r[4]),
      bondAmount: r[5] as bigint,
      bondTimestamp: r[6] as bigint,
      bondRedeemRequestedAt: r[7] as bigint,
      bondRedeemPending: Boolean(r[8]),
      banned: Boolean(r[9]),
      passContracts: (r[10] ?? []) as readonly `0x${string}`[],
      auctionContracts: (r[11] ?? []) as readonly `0x${string}`[],
    };
  }
  return raw as KolData;
}

/** 写入交易的通用选项 */
export interface RegistryTxOptions {
  /** 交易成功确认后的回调 */
  onSuccess?: (txHash: Hash, receipt: unknown) => void;
  /** 自定义 toast */
  toast?: ToastLike;
}

export interface UseRegistryResult {
  // ---- 链上读取（默认查询传入的 wallet） ----
  /** 该钱包是否已注册为 KOL */
  isRegistered: boolean | undefined;
  /** 该钱包的 KOL 完整信息（含 passContracts / auctionContracts 索引） */
  kolData: KolData | undefined;
  /** 该钱包是否已缴纳担保金 */
  hasBond: boolean | undefined;
  /** 该钱包当前是否具备创建资格 */
  canCreate: boolean | undefined;
  /** 担保金金额（BOND_AMOUNT，单位 wei） */
  bondAmount: bigint | undefined;
  // ---- 链上写入 ----
  /** registerKol(twitterHandle, followers, signature)：注册为 KOL（signature 为平台
   *   ECDSA 注册签名，由 server 在 X 验证通过后签发，防绕过前端伪造粉丝数） */
  registerKol: (
    twitterHandle: string,
    followers: bigint,
    signature: `0x${string}`,
    opts?: RegistryTxOptions,
  ) => Promise<Hash | null>;
  /**
   * depositBond(opts)：缴纳担保金。
   * value 默认取链上 BOND_AMOUNT，也可通过 opts.value 显式传入。
   */
  depositBond: (opts?: { value?: bigint } & RegistryTxOptions) => Promise<Hash | null>;
  /** requestBondRedeem()：发起担保金赎回（进入 cooldown） */
  requestBondRedeem: (opts?: RegistryTxOptions) => Promise<Hash | null>;
  /** finalizeBondRedeem()：冷却期后完成担保金赎回 */
  finalizeBondRedeem: (opts?: RegistryTxOptions) => Promise<Hash | null>;
  // ---- 交易状态（各写入共享同一状态机） ----
  status: TxStatus;
  txHash: Hash | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  reset: () => void;
  /** 注册表合约地址未配置 */
  isAddressMissing: boolean;
}

/**
 * useRegistry — NadbidRegistry 注册表合约读写封装（KOL 入驻、担保金、创建资格、索引）。
 *
 * @param wallet 可选，查询目标钱包地址；缺省时仅提供写入能力，读取返回 undefined。
 *
 * @example
 * const { isRegistered, kolData, registerKol, depositBond, canCreate } = useRegistry(address);
 * await registerKol('@handle', 10000n);
 * await depositBond(); // 自动带 BOND_AMOUNT
 */
export function useRegistry(wallet?: `0x${string}` | undefined): UseRegistryResult {
  const registryAddress = contractAddresses.registry;

  const isRegisteredRes = useReadContract({
    address: registryAddress,
    abi: registryAbi,
    functionName: 'isKolRegistered',
    args: [wallet ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: wallet !== undefined },
  });
  const kolRes = useReadContract({
    address: registryAddress,
    abi: registryAbi,
    functionName: 'getKol',
    args: [wallet ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: wallet !== undefined },
  });
  const hasBondRes = useReadContract({
    address: registryAddress,
    abi: registryAbi,
    functionName: 'hasBond',
    args: [wallet ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: wallet !== undefined },
  });
  const canCreateRes = useReadContract({
    address: registryAddress,
    abi: registryAbi,
    functionName: 'canCreate',
    args: [wallet ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: wallet !== undefined },
  });
  const bondAmountRes = useReadContract({
    address: registryAddress,
    abi: registryAbi,
    functionName: 'BOND_AMOUNT',
  });

  const { write, status, txHash, error, isLoading, isSuccess, reset } = useWriteContractTx();

  const registerKol = useCallback(
    (
      twitterHandle: string,
      followers: bigint,
      /** 平台 ECDSA 注册签名（server 在 X 验证通过后签发，P2-2 防伪造粉丝数注册） */
      signature: `0x${string}`,
      opts: RegistryTxOptions = {},
    ): Promise<Hash | null> => {
      if (!registryAddress) return Promise.resolve(null);
      return write({
        address: registryAddress,
        abi: registryAbi,
        functionName: 'registerKol',
        args: [twitterHandle, followers, signature],
        onSuccess: opts.onSuccess,
        toast: opts.toast,
      });
    },
    [write, registryAddress],
  );

  const depositBond = useCallback(
    (opts: { value?: bigint } & RegistryTxOptions = {}): Promise<Hash | null> => {
      if (!registryAddress) return Promise.resolve(null);
      const { value, onSuccess, toast } = opts;
      const amount = value ?? (bondAmountRes.data as bigint | undefined);
      if (amount === undefined) return Promise.resolve(null); // 尚未读到 BOND_AMOUNT
      return write({
        address: registryAddress,
        abi: registryAbi,
        functionName: 'depositBond',
        args: [],
        value: amount,
        onSuccess,
        toast,
      });
    },
    [write, registryAddress, bondAmountRes.data],
  );

  const requestBondRedeem = useCallback(
    (opts: RegistryTxOptions = {}): Promise<Hash | null> => {
      if (!registryAddress) return Promise.resolve(null);
      return write({
        address: registryAddress,
        abi: registryAbi,
        functionName: 'requestBondRedeem',
        args: [],
        onSuccess: opts.onSuccess,
        toast: opts.toast,
      });
    },
    [write, registryAddress],
  );

  const finalizeBondRedeem = useCallback(
    (opts: RegistryTxOptions = {}): Promise<Hash | null> => {
      if (!registryAddress) return Promise.resolve(null);
      return write({
        address: registryAddress,
        abi: registryAbi,
        functionName: 'finalizeBondRedeem',
        args: [],
        onSuccess: opts.onSuccess,
        toast: opts.toast,
      });
    },
    [write, registryAddress],
  );

  return {
    isRegistered: isRegisteredRes.data as boolean | undefined,
    kolData: normalizeKolData(kolRes.data),
    hasBond: hasBondRes.data as boolean | undefined,
    canCreate: canCreateRes.data as boolean | undefined,
    bondAmount: bondAmountRes.data as bigint | undefined,
    registerKol,
    depositBond,
    requestBondRedeem,
    finalizeBondRedeem,
    status,
    txHash,
    error,
    isLoading,
    isSuccess,
    reset,
    isAddressMissing: registryAddress === undefined,
  };
}
