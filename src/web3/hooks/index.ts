export { useWriteContractTx } from './useWriteContractTx';
export type {
  UseWriteContractTxResult,
  WriteContractTxArgs,
  TxStatus,
} from './useWriteContractTx';

export { useReadContract } from './useReadContract';

// ============================================================================
// NADBIDAuction 新协议 hooks
// ============================================================================

export {
  useAuctionCount,
  useAuctionMeta,
  useBatchMeta,
  useBatchUserState,
  useUsdcBalance,
  useMonAllowance,
  usePlaceBid,
  useFinalizeAuction,
  useClaimRefund,
  useClaimReward,
  useClaimSeller,
  useCreateAuction,
  useApproveMon,
  useConnectedAddress,
  useAuctionList,
  useNadbidAuctionContract,
  useMonContract,
  fmtMon,
  nextPrice,
  bidPay,
  isAuctionEnded,
  AuctionStatus,
  AssetType,
  STATUS_LABEL,
  ASSET_LABEL,
  MON_DECIMALS,
} from './useNadbidAuction';
export type {
  AuctionMeta,
  BatchMeta,
  AuctionListRow,
} from './useNadbidAuction';
