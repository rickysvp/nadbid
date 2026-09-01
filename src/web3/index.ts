// Web3 模块统一导出
export { wagmiConfig, monadTestnet, supportedChains } from './config';
export { registryConfig, factoryConfig } from './config';
export { WagmiProvider } from './WagmiProvider';
export { WalletStateSyncer } from './WalletStateSyncer';
export {
  contractAddresses,
  registryAbi,
  factoryAbi,
  kolPassAbi,
  kolAuctionAbi,
} from './contracts';
export type { ContractKey } from './contracts';
export {
  classifyWeb3Error,
  handleWeb3Error,
  getErrorToastType,
} from './web3Errors';
export type { Web3ErrorType, Web3ErrorInfo, ToastLike } from './web3Errors';
export * from './hooks';
