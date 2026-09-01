import type { Abi } from 'viem';

/**
 * 合约地址配置 — 全部从环境变量读取，未配置时为 undefined。
 *
 * 部署后在 .env 中填入实际地址：
 *   VITE_CONTRACT_PASS=0x...
 *   VITE_CONTRACT_AUCTION=0x...
 *   VITE_CONTRACT_STAKING=0x...
 *   VITE_CONTRACT_DIVIDEND=0x...
 */
export const contractAddresses = {
  /** PASS NFT 合约地址 */
  pass: import.meta.env.VITE_CONTRACT_PASS as `0x${string}` | undefined,
  /** 拍卖合约地址 */
  auction: import.meta.env.VITE_CONTRACT_AUCTION as `0x${string}` | undefined,
  /** 质押合约地址 */
  staking: import.meta.env.VITE_CONTRACT_STAKING as `0x${string}` | undefined,
  /** 分红合约地址 */
  dividend: import.meta.env.VITE_CONTRACT_DIVIDEND as `0x${string}` | undefined,
} as const;

export type ContractKey = keyof typeof contractAddresses;

// ============================================================================
// ABI 类型骨架 — 部署后补充完整 ABI。
// 当前仅包含各合约最常用函数的最小片段，供 hooks 类型推导使用。
// ============================================================================

/**
 * PASS NFT 合约 ABI（最小片段）
 * 完整 ABI 待部署后从 artifacts 导入。
 */
export const passAbi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'mint',
    stateMutability: 'payable',
    inputs: [
      { name: 'kolId', type: 'uint256' },
      { name: 'quantity', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'burn',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'kolId', type: 'uint256' },
      { name: 'quantity', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'tokenURI',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
] as const satisfies Abi;

/**
 * 拍卖合约 ABI（最小片段）
 */
export const auctionAbi = [
  {
    type: 'function',
    name: 'placeBid',
    stateMutability: 'payable',
    inputs: [
      { name: 'auctionId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'settleAuction',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'auctionId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getAuction',
    stateMutability: 'view',
    inputs: [{ name: 'auctionId', type: 'uint256' }],
    outputs: [
      { name: 'seller', type: 'address' },
      { name: 'currentBid', type: 'uint256' },
      { name: 'highestBidder', type: 'address' },
      { name: 'endTime', type: 'uint256' },
      { name: 'settled', type: 'bool' },
    ],
  },
] as const satisfies Abi;

/**
 * 质押合约 ABI（最小片段）
 */
export const stakingAbi = [
  {
    type: 'function',
    name: 'stake',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'kolId', type: 'uint256' },
      { name: 'tokenIds', type: 'uint256[]' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'unstake',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'kolId', type: 'uint256' },
      { name: 'tokenIds', type: 'uint256[]' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getStakedBalance',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'kolId', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const satisfies Abi;

/**
 * 分红合约 ABI（最小片段）
 */
export const dividendAbi = [
  {
    type: 'function',
    name: 'claim',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'kolId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'pendingRewards',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'kolId', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const satisfies Abi;

/** 合约 ABI 映射表 */
export const contractAbis: Record<ContractKey, Abi> = {
  pass: passAbi,
  auction: auctionAbi,
  staking: stakingAbi,
  dividend: dividendAbi,
};

/**
 * 获取合约配置（地址 + ABI）。
 * 地址未配置时返回 undefined，调用方应在 UI 中提示"合约未部署"。
 */
export function getContractConfig(key: ContractKey): { address: `0x${string}`; abi: Abi } | undefined {
  const address = contractAddresses[key];
  if (!address) return undefined;
  return { address, abi: contractAbis[key] };
}
