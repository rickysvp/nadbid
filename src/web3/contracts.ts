import type { Abi } from 'viem';

/**
 * 合约地址配置 — 从环境变量读取，未配置时为 undefined。
 *
 * 部署后在 .env 中填入实际地址：
 *   VITE_CONTRACT_REGISTRY=0x...
 *   VITE_CONTRACT_FACTORY=0x...
 *
 * KolPass / KolAuction 地址按 KOL 动态获取（Registry.getKol().passContracts / auctionContracts），
 * 不在静态配置中。
 */
export const contractAddresses = {
  /** NadbidRegistry 注册表合约（KOL 入驻、担保金、索引） */
  registry: import.meta.env.VITE_CONTRACT_REGISTRY as `0x${string}` | undefined,
  /** NadbidFactory 工厂合约（创建 KolPass / KolAuction） */
  factory: import.meta.env.VITE_CONTRACT_FACTORY as `0x${string}` | undefined,
} as const;

export type ContractKey = keyof typeof contractAddresses;

// ============================================================================
// 合约 ABI — 从 contracts/out/*.sol/*.json 提取（compiler 0.8.28）。
// 仅保留本项目使用的函数与事件，精简前端 bundle。
// ============================================================================


export const registryAbi =
[
  {"type": "function","name": "registerKol","inputs": [{"name": "twitterHandle","type": "string","internalType": "string"},{"name": "followers","type": "uint256","internalType": "uint256"}],"outputs": [],"stateMutability": "nonpayable"},
  {"type": "function","name": "depositBond","inputs": [],"outputs": [],"stateMutability": "payable"},
  {"type": "function","name": "requestBondRedeem","inputs": [],"outputs": [],"stateMutability": "nonpayable"},
  {"type": "function","name": "finalizeBondRedeem","inputs": [],"outputs": [],"stateMutability": "nonpayable"},
  {"type": "function","name": "isKolRegistered","inputs": [{"name": "wallet","type": "address","internalType": "address"}],"outputs": [{"name": "","type": "bool","internalType": "bool"}],"stateMutability": "view"},
  {"type": "function","name": "getKol","inputs": [{"name": "wallet","type": "address","internalType": "address"}],"outputs": [{"name": "","type": "tuple","internalType": "struct NadbidRegistry.Kol","components": [{"name": "wallet","type": "address","internalType": "address"},{"name": "twitterHandle","type": "string","internalType": "string"},{"name": "followers","type": "uint256","internalType": "uint256"},{"name": "registered","type": "bool","internalType": "bool"},{"name": "bonded","type": "bool","internalType": "bool"},{"name": "bondAmount","type": "uint256","internalType": "uint256"},{"name": "bondTimestamp","type": "uint256","internalType": "uint256"},{"name": "bondRedeemRequestedAt","type": "uint256","internalType": "uint256"},{"name": "bondRedeemPending","type": "bool","internalType": "bool"},{"name": "banned","type": "bool","internalType": "bool"},{"name": "passContracts","type": "address[]","internalType": "address[]"},{"name": "auctionContracts","type": "address[]","internalType": "address[]"}]}],"stateMutability": "view"},
  {"type": "function","name": "hasBond","inputs": [{"name": "wallet","type": "address","internalType": "address"}],"outputs": [{"name": "","type": "bool","internalType": "bool"}],"stateMutability": "view"},
  {"type": "function","name": "isKolBanned","inputs": [{"name": "wallet","type": "address","internalType": "address"}],"outputs": [{"name": "","type": "bool","internalType": "bool"}],"stateMutability": "view"},
  {"type": "function","name": "canCreate","inputs": [{"name": "kol","type": "address","internalType": "address"}],"outputs": [{"name": "","type": "bool","internalType": "bool"}],"stateMutability": "view"},
  {"type": "function","name": "setFactory","inputs": [{"name": "_factory","type": "address","internalType": "address"}],"outputs": [],"stateMutability": "nonpayable"},
  {"type": "function","name": "factory","inputs": [],"outputs": [{"name": "","type": "address","internalType": "address"}],"stateMutability": "view"},
  {"type": "function","name": "owner","inputs": [],"outputs": [{"name": "","type": "address","internalType": "address"}],"stateMutability": "view"},
  {"type": "function","name": "kolList","inputs": [{"name": "","type": "uint256","internalType": "uint256"}],"outputs": [{"name": "","type": "address","internalType": "address"}],"stateMutability": "view"},
  {"type": "function","name": "BOND_AMOUNT","inputs": [],"outputs": [{"name": "","type": "uint256","internalType": "uint256"}],"stateMutability": "view"},
  {"type": "function","name": "BOND_REDEEM_COOLDOWN","inputs": [],"outputs": [{"name": "","type": "uint256","internalType": "uint256"}],"stateMutability": "view"},
  {"type": "function","name": "MIN_FOLLOWERS","inputs": [],"outputs": [{"name": "","type": "uint256","internalType": "uint256"}],"stateMutability": "view"},
  {"type": "function","name": "addPassContract","inputs": [{"name": "kol","type": "address","internalType": "address"},{"name": "passContract","type": "address","internalType": "address"}],"outputs": [],"stateMutability": "nonpayable"},
  {"type": "function","name": "addAuctionContract","inputs": [{"name": "kol","type": "address","internalType": "address"},{"name": "auctionContract","type": "address","internalType": "address"}],"outputs": [],"stateMutability": "nonpayable"},
  {"type": "event","name": "KolRegistered","inputs": [{"name": "kol","type": "address","indexed": true,"internalType": "address"},{"name": "twitterHandle","type": "string","indexed": false,"internalType": "string"},{"name": "followers","type": "uint256","indexed": false,"internalType": "uint256"}],"anonymous": false},
  {"type": "event","name": "BondDeposited","inputs": [{"name": "kol","type": "address","indexed": true,"internalType": "address"},{"name": "amount","type": "uint256","indexed": false,"internalType": "uint256"}],"anonymous": false},
  {"type": "event","name": "BondRedeemRequested","inputs": [{"name": "kol","type": "address","indexed": true,"internalType": "address"}],"anonymous": false},
  {"type": "event","name": "BondRedeemed","inputs": [{"name": "kol","type": "address","indexed": true,"internalType": "address"},{"name": "amount","type": "uint256","indexed": false,"internalType": "uint256"}],"anonymous": false},
] as const satisfies Abi;

export const factoryAbi =
[
  {"type": "function","name": "createKolPass","inputs": [{"name": "mintPrice","type": "uint256","internalType": "uint256"}],"outputs": [{"name": "","type": "address","internalType": "address"}],"stateMutability": "nonpayable"},
  {"type": "function","name": "createKolAuction","inputs": [{"name": "passContract","type": "address","internalType": "address"},{"name": "fixedBidAmount","type": "uint256","internalType": "uint256"},{"name": "duration","type": "uint256","internalType": "uint256"},{"name": "content","type": "string","internalType": "string"}],"outputs": [{"name": "","type": "address","internalType": "address"}],"stateMutability": "nonpayable"},
  {"type": "function","name": "createKolAuctionScheduled","inputs": [{"name": "passContract","type": "address","internalType": "address"},{"name": "fixedBidAmount","type": "uint256","internalType": "uint256"},{"name": "duration","type": "uint256","internalType": "uint256"},{"name": "content","type": "string","internalType": "string"},{"name": "startTime","type": "uint256","internalType": "uint256"}],"outputs": [{"name": "","type": "address","internalType": "address"}],"stateMutability": "nonpayable"},
  {"type": "function","name": "registry","inputs": [],"outputs": [{"name": "","type": "address","internalType": "contract NadbidRegistry"}],"stateMutability": "view"},
  {"type": "function","name": "platformTreasury","inputs": [],"outputs": [{"name": "","type": "address","internalType": "address"}],"stateMutability": "view"},
  {"type": "event","name": "KolPassCreated","inputs": [{"name": "kol","type": "address","indexed": true,"internalType": "address"},{"name": "passContract","type": "address","indexed": false,"internalType": "address"},{"name": "mintPrice","type": "uint256","indexed": false,"internalType": "uint256"}],"anonymous": false},
  {"type": "event","name": "KolAuctionCreated","inputs": [{"name": "kol","type": "address","indexed": true,"internalType": "address"},{"name": "auctionContract","type": "address","indexed": false,"internalType": "address"},{"name": "passContract","type": "address","indexed": false,"internalType": "address"},{"name": "fixedBidAmount","type": "uint256","indexed": false,"internalType": "uint256"}],"anonymous": false},
] as const satisfies Abi;

export const kolPassAbi =
[
  {"type": "function","name": "balanceOf","inputs": [{"name": "owner","type": "address","internalType": "address"}],"outputs": [{"name": "","type": "uint256","internalType": "uint256"}],"stateMutability": "view"},
  {"type": "function","name": "tokenOfOwnerByIndex","inputs": [{"name": "owner","type": "address","internalType": "address"},{"name": "index","type": "uint256","internalType": "uint256"}],"outputs": [{"name": "","type": "uint256","internalType": "uint256"}],"stateMutability": "view"},
  {"type": "function","name": "tokenByIndex","inputs": [{"name": "index","type": "uint256","internalType": "uint256"}],"outputs": [{"name": "","type": "uint256","internalType": "uint256"}],"stateMutability": "view"},
  {"type": "function","name": "curvePrice","inputs": [],"outputs": [{"name": "","type": "uint256","internalType": "uint256"}],"stateMutability": "view"},
  {"type": "function","name": "totalSupply","inputs": [],"outputs": [{"name": "","type": "uint256","internalType": "uint256"}],"stateMutability": "view"},
  {"type": "function","name": "curvePriceAt","inputs": [{"name": "nextSupply","type": "uint256","internalType": "uint256"}],"outputs": [{"name": "","type": "uint256","internalType": "uint256"}],"stateMutability": "view"},
  {"type": "function","name": "getCurveConfig","inputs": [],"outputs": [{"name": "","type": "tuple","internalType": "struct KolPass.CurveConfig","components": [{"name": "basePrice","type": "uint256","internalType": "uint256"},{"name": "baseSupply","type": "uint256","internalType": "uint256"},{"name": "exponent","type": "uint256","internalType": "uint256"}]}],"stateMutability": "view"},
  {"type": "function","name": "basePrice","inputs": [],"outputs": [{"name": "","type": "uint256","internalType": "uint256"}],"stateMutability": "view"},
  {"type": "function","name": "baseSupply","inputs": [],"outputs": [{"name": "","type": "uint256","internalType": "uint256"}],"stateMutability": "view"},
  {"type": "function","name": "exponent","inputs": [],"outputs": [{"name": "","type": "uint256","internalType": "uint256"}],"stateMutability": "view"},
  {"type": "function","name": "mint","inputs": [{"name": "quantity","type": "uint256","internalType": "uint256"}],"outputs": [{"name": "tokenIds","type": "uint256[]","internalType": "uint256[]"}],"stateMutability": "payable"},
  {"type": "function","name": "burn","inputs": [{"name": "tokenIds","type": "uint256[]","internalType": "uint256[]"}],"outputs": [],"stateMutability": "nonpayable"},
  {"type": "function","name": "kol","inputs": [],"outputs": [{"name": "","type": "address","internalType": "address"}],"stateMutability": "view"},
  {"type": "function","name": "platformTreasury","inputs": [],"outputs": [{"name": "","type": "address","internalType": "address"}],"stateMutability": "view"},
  {"type": "function","name": "totalMinted","inputs": [],"outputs": [{"name": "","type": "uint256","internalType": "uint256"}],"stateMutability": "view"},
  {"type": "event","name": "Transfer","inputs": [{"name": "from","type": "address","indexed": true,"internalType": "address"},{"name": "to","type": "address","indexed": true,"internalType": "address"},{"name": "tokenId","type": "uint256","indexed": true,"internalType": "uint256"}],"anonymous": false},
] as const satisfies Abi;

export const kolAuctionAbi =
[
  {"type": "function","name": "getAuction","inputs": [],"outputs": [{"name": "","type": "tuple","internalType": "struct KolAuction.Auction","components": [{"name": "id","type": "uint256","internalType": "uint256"},{"name": "kol","type": "address","internalType": "address"},{"name": "passContract","type": "address","internalType": "address"},{"name": "fixedBidAmount","type": "uint256","internalType": "uint256"},{"name": "content","type": "string","internalType": "string"},{"name": "itemCategory","type": "uint8","internalType": "uint8"},{"name": "startTime","type": "uint256","internalType": "uint256"},{"name": "endTime","type": "uint256","internalType": "uint256"},{"name": "lastBidder","type": "address","internalType": "address"},{"name": "totalBids","type": "uint256","internalType": "uint256"},{"name": "totalVolume","type": "uint256","internalType": "uint256"},{"name": "status","type": "uint8","internalType": "enum KolAuction.AuctionStatus"},{"name": "settled","type": "bool","internalType": "bool"}]}],"stateMutability": "view"},
  {"type": "function","name": "getCumulativeBid","inputs": [{"name": "bidder","type": "address","internalType": "address"}],"outputs": [{"name": "","type": "uint256","internalType": "uint256"}],"stateMutability": "view"},
  {"type": "function","name": "getBidCount","inputs": [{"name": "bidder","type": "address","internalType": "address"}],"outputs": [{"name": "","type": "uint256","internalType": "uint256"}],"stateMutability": "view"},
  {"type": "function","name": "placeBid","inputs": [],"outputs": [{"name": "","type": "bool","internalType": "bool"}],"stateMutability": "payable"},
  {"type": "function","name": "settle","inputs": [],"outputs": [],"stateMutability": "nonpayable"},
  {"type": "function","name": "auction","inputs": [],"outputs": [{"name": "id","type": "uint256","internalType": "uint256"},{"name": "kol","type": "address","internalType": "address"},{"name": "passContract","type": "address","internalType": "address"},{"name": "fixedBidAmount","type": "uint256","internalType": "uint256"},{"name": "content","type": "string","internalType": "string"},{"name": "itemCategory","type": "uint8","internalType": "uint8"},{"name": "startTime","type": "uint256","internalType": "uint256"},{"name": "endTime","type": "uint256","internalType": "uint256"},{"name": "lastBidder","type": "address","internalType": "address"},{"name": "totalBids","type": "uint256","internalType": "uint256"},{"name": "totalVolume","type": "uint256","internalType": "uint256"},{"name": "status","type": "uint8","internalType": "enum KolAuction.AuctionStatus"},{"name": "settled","type": "bool","internalType": "bool"}],"stateMutability": "view"},
  {"type": "function","name": "endTime","inputs": [],"outputs": [{"name": "","type": "uint256","internalType": "uint256"}],"stateMutability": "view"},
  {"type": "function","name": "lastBidder","inputs": [],"outputs": [{"name": "","type": "address","internalType": "address"}],"stateMutability": "view"},
  {"type": "function","name": "totalBids","inputs": [],"outputs": [{"name": "","type": "uint256","internalType": "uint256"}],"stateMutability": "view"},
  {"type": "function","name": "settled","inputs": [],"outputs": [{"name": "","type": "bool","internalType": "bool"}],"stateMutability": "view"},
  {"type": "function","name": "cumulativeBid","inputs": [{"name": "","type": "address","internalType": "address"}],"outputs": [{"name": "","type": "uint256","internalType": "uint256"}],"stateMutability": "view"},
  {"type": "function","name": "bidCount","inputs": [{"name": "","type": "address","internalType": "address"}],"outputs": [{"name": "","type": "uint256","internalType": "uint256"}],"stateMutability": "view"},
  {"type": "function","name": "lastBidderCumulative","inputs": [],"outputs": [{"name": "","type": "uint256","internalType": "uint256"}],"stateMutability": "view"},
  {"type": "function","name": "lastBidderBidCount","inputs": [],"outputs": [{"name": "","type": "uint256","internalType": "uint256"}],"stateMutability": "view"},
  {"type": "event","name": "BidPlaced","inputs": [{"name": "auctionId","type": "uint256","indexed": false,"internalType": "uint256"},{"name": "bidSeq","type": "uint256","indexed": false,"internalType": "uint256"},{"name": "bidder","type": "address","indexed": true,"internalType": "address"},{"name": "amount","type": "uint256","indexed": false,"internalType": "uint256"},{"name": "timestamp","type": "uint256","indexed": false,"internalType": "uint256"}],"anonymous": false},
  {"type": "event","name": "AuctionSettled","inputs": [{"name": "auctionId","type": "uint256","indexed": false,"internalType": "uint256"},{"name": "lastBidder","type": "address","indexed": false,"internalType": "address"},{"name": "totalVolume","type": "uint256","indexed": false,"internalType": "uint256"},{"name": "platformFee","type": "uint256","indexed": false,"internalType": "uint256"},{"name": "guaranteePool","type": "uint256","indexed": false,"internalType": "uint256"},{"name": "blockNumber","type": "uint256","indexed": false,"internalType": "uint256"}],"anonymous": false},
] as const satisfies Abi;
