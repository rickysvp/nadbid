import { useReadContract as useWagmiReadContract } from 'wagmi';
import type { Abi } from 'viem';
import { classifyWeb3Error } from '../web3Errors';

/**
 * useReadContract — wagmi useReadContract 的轻量封装。
 *
 * wagmi v2 的 useReadContract 已内置 @tanstack/react-query 缓存、
 * staleTime、refetch 等能力，因此本封装仅补充：
 *   1. 统一错误分类（将原始 viem 错误转为 Web3ErrorInfo）
 *   2. 类型安全的 data 访问
 *
 * 缓存策略由全局 QueryClient（WagmiProvider 中配置 staleTime: 30_000）控制。
 * 如需单独覆盖，可通过 options.query 传入。
 *
 * @example
 * const { data, isLoading, error, refetch } = useReadContract({
 *   address: contractAddresses.pass!,
 *   abi: passAbi,
 *   functionName: 'balanceOf',
 *   args: [address],
 * });
 */
export function useReadContract<TAbi extends Abi = Abi, TFunctionName extends string = string>(
  params: {
    address: `0x${string}` | undefined;
    abi: TAbi;
    functionName: TFunctionName;
    args?: readonly unknown[];
    chainId?: number;
    blockNumber?: bigint;
    blockTag?: 'latest' | 'earliest' | 'pending' | 'safe' | 'finalized';
    query?: {
      enabled?: boolean;
      staleTime?: number;
      refetchInterval?: number;
      refetchOnWindowFocus?: boolean;
      retry?: number;
    };
  },
) {
  const result = useWagmiReadContract({
    ...params,
    address: params.address ?? '0x0000000000000000000000000000000000000000',
    query: {
      enabled: params.address !== undefined && (params.query?.enabled ?? true),
      ...params.query,
    },
  } as Parameters<typeof useWagmiReadContract>[0]);

  // 统一错误分类
  const classifiedError = result.error ? classifyWeb3Error(result.error) : null;

  return {
    ...result,
    /** 分类后的错误信息（用户友好） */
    classifiedError,
    /** 是否因地址未配置而禁用查询 */
    isAddressMissing: params.address === undefined,
  };
}
