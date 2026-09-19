import { useEffect, useMemo, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { monadTestnet } from '../config';
import { formatUnits } from 'viem';
import { contractAddresses, nadbidAuctionAbi, monAbi } from '../contracts';
import { useReadContract } from './useReadContract';
import { useWriteContractTx } from './useWriteContractTx';

/**
 * NADBIDAuction 新协议 hooks
 * —— 链上拍卖：MON 结算、出价不退款、同区块同价随机保留一笔、
 *    前序出价者持续分红（100x 硬顶）、85/15 资金分配、120s 倒计时。
 */

// ---------------------------------------------------------------------------
// 类型与常量
// ---------------------------------------------------------------------------

export enum AuctionStatus {
  LIVE = 0,
  SETTLING = 1,
  SETTLED = 2,
  CANCELLED = 3,
}

export enum AssetType {
  ERC20 = 0,
  ERC721 = 1,
  ERC1155 = 2,
}

export const STATUS_LABEL: Record<number, { text: string; tone: 'green' | 'amber' | 'red' | 'gray' | 'blue' }> = {
  [AuctionStatus.LIVE]: { text: 'Live', tone: 'green' },
  [AuctionStatus.SETTLING]: { text: 'Settling', tone: 'amber' },
  [AuctionStatus.SETTLED]: { text: 'Settled', tone: 'blue' },
  [AuctionStatus.CANCELLED]: { text: 'Cancelled', tone: 'gray' },
};

export const ASSET_LABEL: Record<number, string> = {
  [AssetType.ERC20]: 'ERC-20',
  [AssetType.ERC721]: 'ERC-721',
  [AssetType.ERC1155]: 'ERC-1155',
};

export interface AuctionMeta {
  status: number;
  seller: `0x${string}`;
  assetType: number;
  assetAddr: `0x${string}`;
  assetTokenId: bigint;
  assetAmount: bigint;
  startPrice: bigint;
  incrementBps: bigint;
  reservePrice: bigint;
  lastPrice: bigint;
  deadline: bigint;
  lastBatchBlock: bigint;
  lastBatchId: bigint;
  batchStartId: bigint;
  batchCount: bigint;
  totalPool: bigint;
  candidatesPool: bigint;
  retainedFees: bigint;
  refunded: bigint;
  rpu: bigint;
  rpuFinal: bigint;
  finalPrice: bigint;
  winner: `0x${string}`;
}

export interface BatchMeta {
  price: bigint;
  blockNumber: bigint;
  candidateCount: bigint;
  selectedBidder: `0x${string}`;
  snapshotRpu: bigint;
  resolved: boolean;
}

export const MON_DECIMALS = 6;

/** wei(6) → 可读字符串，千分位，2 位小数 */
export function fmtMon(v: bigint | undefined): string {
  if (v === undefined) return '0.00';
  const s = formatUnits(v, MON_DECIMALS);
  const dot = s.indexOf('.');
  const intPart = dot === -1 ? s : s.slice(0, dot);
  const decPart = dot === -1 ? '' : s.slice(dot + 1);
  const intFmt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${intFmt}.${decPart.padEnd(2, '0').slice(0, 2)}`;
}

/** 下一价格等级 = ceil(prev × (1 + bps/10000)) */
export function nextPrice(prev: bigint, bps: bigint): bigint {
  return (prev * (10_000n + bps) + 10_000n - 1n) / 10_000n;
}

/** 出价总支付 = 价格 + 1% 手续费 */
export function bidPay(price: bigint): bigint {
  return price + (price * 100n) / 10_000n;
}

/** 拍卖是否已结束（时间超时） */
export function isAuctionEnded(meta: AuctionMeta | undefined, nowMs: number): boolean {
  if (!meta) return false;
  return nowMs >= Number(meta.deadline) * 1000;
}

// ---------------------------------------------------------------------------
// 合约配置
// ---------------------------------------------------------------------------

export function useNadbidAuctionContract() {
  const address = contractAddresses.auction;
  return { address, abi: nadbidAuctionAbi, isReady: address !== undefined };
}

export function useMonContract() {
  return { address: contractAddresses.mon, abi: monAbi };
}

// ---------------------------------------------------------------------------
// 读取
// ---------------------------------------------------------------------------

/** 拍卖总数 */
export function useAuctionCount() {
  const { address, abi, isReady } = useNadbidAuctionContract();
  return useReadContract({ address, abi, functionName: 'auctionCount', args: [], chainId: monadTestnet.id, query: { enabled: isReady } });
}

/** 单场拍卖元数据 */
export function useAuctionMeta(id: bigint | undefined) {
  const { address, abi, isReady } = useNadbidAuctionContract();
  const enabled = isReady && id !== undefined;
  const r = useReadContract({
    address,
    abi,
    functionName: 'auctions',
    args: enabled ? [id] : [],
    chainId: monadTestnet.id,
    query: { enabled },
  });
  const meta = useMemo<AuctionMeta | undefined>(() => {
    const d = r.data as
      | [
          number,
          `0x${string}`,
          number,
          `0x${string}`,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          `0x${string}`,
        ]
      | undefined;
    if (!d) return undefined;
    return {
      status: d[0],
      seller: d[1],
      assetType: d[2],
      assetAddr: d[3],
      assetTokenId: d[4],
      assetAmount: d[5],
      startPrice: d[6],
      incrementBps: d[7],
      reservePrice: d[8],
      lastPrice: d[9],
      deadline: d[10],
      lastBatchBlock: d[11],
      lastBatchId: d[12],
      batchStartId: d[13],
      batchCount: d[14],
      totalPool: d[15],
      candidatesPool: d[16],
      retainedFees: d[17],
      refunded: d[18],
      rpu: d[19],
      rpuFinal: d[20],
      finalPrice: d[21],
      winner: d[22],
    };
  }, [r.data]);
  return { ...r, meta };
}

/** 批次详情 */
export function useBatchMeta(batchId: bigint | undefined) {
  const { address, abi, isReady } = useNadbidAuctionContract();
  const enabled = isReady && batchId !== undefined;
  const r = useReadContract({
    address,
    abi,
    functionName: 'getBatch',
    args: enabled ? [batchId] : [],
    query: { enabled },
  });
  const batch = useMemo<BatchMeta | undefined>(() => {
    // getBatch 的 ABI 是命名 struct（components），viem 会解析成对象而非数组；
    // 兼容两种形态避免 d[0]/d[2] 读到 undefined。
    const d = r.data as
      | [bigint, bigint, bigint, `0x${string}`, bigint, boolean]
      | {
          price: bigint;
          blockNumber: bigint;
          candidateCount: bigint;
          selectedBidder: `0x${string}`;
          snapshotRpu: bigint;
          resolved: boolean;
        }
      | undefined;
    if (!d) return undefined;
    const isArr = Array.isArray(d);
    return {
      price: (isArr ? d[0] : d.price) as bigint,
      blockNumber: (isArr ? d[1] : d.blockNumber) as bigint,
      candidateCount: (isArr ? d[2] : d.candidateCount) as bigint,
      selectedBidder: (isArr ? d[3] : d.selectedBidder) as `0x${string}`,
      snapshotRpu: (isArr ? d[4] : d.snapshotRpu) as bigint,
      resolved: (isArr ? d[5] : d.resolved) as boolean,
    };
  }, [r.data]);
  return { ...r, batch };
}

/** 当前用户是否在某批次是候选 / 已领退款 / 已领分红 */
export function useBatchUserState(batchId: bigint | undefined, address: `0x${string}` | undefined) {
  const { address: addr, abi, isReady } = useNadbidAuctionContract();
  const enabled = isReady && batchId !== undefined && address !== undefined;
  const cand = useReadContract({
    address: addr,
    abi,
    functionName: 'isCandidate',
    args: enabled ? [batchId, address] : [],
    chainId: monadTestnet.id,
    query: { enabled },
  });
  const refunded = useReadContract({
    address: addr,
    abi,
    functionName: 'refundClaimed',
    args: enabled ? [batchId, address] : [],
    chainId: monadTestnet.id,
    query: { enabled },
  });
  const rewarded = useReadContract({
    address: addr,
    abi,
    functionName: 'rewardClaimed',
    args: enabled ? [batchId, address] : [],
    chainId: monadTestnet.id,
    query: { enabled },
  });
  return {
    isCandidate: Boolean(cand.data),
    refundClaimed: Boolean(refunded.data),
    rewardClaimed: Boolean(rewarded.data),
  };
}

/** MON 余额 */
export function useUsdcBalance(address: `0x${string}` | undefined) {
  const { address: mon, abi } = useMonContract();
  return useReadContract({ address: mon, abi, functionName: 'balanceOf', args: address ? [address] : [], chainId: monadTestnet.id, query: { enabled: !!address } });
}

/** MON 授权额度 */
export function useMonAllowance(owner: `0x${string}` | undefined, spender: `0x${string}` | undefined) {
  const { address: mon, abi } = useMonContract();
  const enabled = !!owner && !!spender;
  return useReadContract({
    address: mon,
    abi,
    functionName: 'allowance',
    args: enabled ? [owner, spender] : [],
    chainId: monadTestnet.id,
    query: { enabled },
  });
}

// ---------------------------------------------------------------------------
// 写入
// ---------------------------------------------------------------------------

/** 出价（下一价格等级 + 1% 手续费） */
export function usePlaceBid() {
  const { address } = useNadbidAuctionContract();
  return useWriteContractTxWith(address, 'placeBid');
}

/** 结算拍卖（任何人可在截止后触发） */
export function useFinalizeAuction() {
  const { address } = useNadbidAuctionContract();
  return useWriteContractTxWith(address, 'finalize');
}

/** 领取退款 */
export function useClaimRefund() {
  const { address } = useNadbidAuctionContract();
  return useWriteContractTxWith(address, 'claimRefund');
}

/** 领取分红 */
export function useClaimReward() {
  const { address } = useNadbidAuctionContract();
  return useWriteContractTxWith(address, 'claimReward');
}

/** 卖家领取收益 */
export function useClaimSeller() {
  const { address } = useNadbidAuctionContract();
  return useWriteContractTxWith(address, 'claimSeller');
}

/** 创建拍卖（需先授权资产给合约） */
export function useCreateAuction() {
  const { address } = useNadbidAuctionContract();
  return useWriteContractTxWith(address, 'createAuction');
}

/** MON 授权 */
export function useApproveMon() {
  const { address } = useMonContract();
  return useWriteContractTxWith(address, 'approve');
}

function useWriteContractTxWith(address: `0x${string}` | undefined, _tag: string) {
  const tx = useWriteContractTx();
  return { ...tx, contractAddress: address };
}

/** 当前钱包地址 */
export function useConnectedAddress() {
  const { address } = useAccount();
  return address;
}

export interface AuctionListRow {
  id: bigint;
  status: number;
  seller: `0x${string}`;
  assetType: number;
  assetAddr: `0x${string}`;
  assetTokenId: bigint;
  assetAmount: bigint;
  startPrice: bigint;
  incrementBps: bigint;
  reservePrice: bigint;
  lastPrice: bigint;
  deadline: bigint;
  batchCount: bigint;
  totalPool: bigint;
  finalPrice: bigint;
  winner: `0x${string}`;
}

/** 批量读取多个拍卖摘要（供列表页使用） */
export function useAuctionList() {
  const publicClient = usePublicClient({ chainId: monadTestnet.id });
  const { address: auctionAddr, isReady } = useNadbidAuctionContract();
  const countR = useAuctionCount();
  const count = countR.data !== undefined ? Number(countR.data) : 0;
  const [list, setList] = useState<AuctionListRow[] | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!isReady || !publicClient) {
      setList(undefined);
      setLoading(false);
      return;
    }
    if (count === 0) {
      setList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      // 分块读取：每块并发 20 个，块间串行，避免拍卖数量大时一次性
      // 发出大量 RPC 请求（限流/超时/响应过大）。功能不变，返回全量。
      const CHUNK = 20;
      const rows: (AuctionListRow | null)[] = [];
      for (let start = 0; start < count; start += CHUNK) {
        const end = Math.min(start + CHUNK, count);
        const chunk = await Promise.all(
          Array.from({ length: end - start }, (_, i) =>
            publicClient
              .readContract({
                address: auctionAddr!,
                abi: nadbidAuctionAbi,
                functionName: 'auctions',
                // 合约 auctionId 从 1 开始
                args: [BigInt(start + i + 1)],
              })
              .then((d) => {
                const v = d as readonly unknown[];
                return {
                  id: BigInt(start + i + 1),
                  status: Number(v[0]) as number,
                  seller: v[1] as `0x${string}`,
                  assetType: Number(v[2]) as number,
                  assetAddr: v[3] as `0x${string}`,
                  assetTokenId: v[4] as bigint,
                  assetAmount: v[5] as bigint,
                  startPrice: v[6] as bigint,
                  incrementBps: v[7] as bigint,
                  reservePrice: v[8] as bigint,
                  lastPrice: v[9] as bigint,
                  deadline: v[10] as bigint,
                  batchCount: v[14] as bigint,
                  totalPool: v[15] as bigint,
                  finalPrice: v[21] as bigint,
                  winner: v[22] as `0x${string}`,
                } as AuctionListRow;
              })
              .catch(() => null),
          ),
        );
        rows.push(...chunk);
        if (cancelled) return;
      }
      if (!cancelled) {
        setList(rows.filter((r): r is AuctionListRow => r !== null));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isReady, publicClient, count, auctionAddr]);

  return { count, list, isLoading: countR.isLoading || loading };
}
