import { useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { isAddress } from 'viem';

const NAME_ABI = [
  { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
] as const;
const SYMBOL_ABI = [
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
] as const;
const TOKEN_URI_ABI = [
  {
    name: 'tokenURI',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

/** 把 ipfs:// 等链上 URI 规范成可 fetch 的 https URL */
export function normalizeAssetUri(uri: string): string {
  if (!uri) return uri;
  if (uri.startsWith('ipfs://')) {
    const cid = uri.replace('ipfs://', '').replace(/^ipfs\//, '');
    return `https://ipfs.io/ipfs/${cid}`;
  }
  if (uri.startsWith('data:')) return uri;
  if (uri.startsWith('http')) return uri;
  return uri;
}

export interface AssetMeta {
  name?: string;
  symbol?: string;
  imageUrl?: string;
}

/**
 * 拍卖标的元数据：ERC-721/1155 读 name/symbol + tokenURI(metadata JSON → image)；
 * ERC-20 读 name/symbol。tokenURI 缺失/失败时静默降级为名称 + 占位视觉。
 */
export function useAssetMeta(
  assetType: number | undefined,
  assetAddr: string | undefined,
  tokenId?: bigint | undefined,
  enabled = true,
) {
  const publicClient = usePublicClient();
  return useQuery<AssetMeta>({
    queryKey: ['asset-meta', assetType, assetAddr, tokenId?.toString()],
    enabled: enabled && !!assetAddr && isAddress(assetAddr) && !!publicClient,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const addr = assetAddr as `0x${string}`;
      const out: AssetMeta = {};
      try {
        const [name, symbol] = await Promise.all([
          publicClient!.readContract({ address: addr, abi: NAME_ABI, functionName: 'name' }).catch(() => undefined),
          publicClient!.readContract({ address: addr, abi: SYMBOL_ABI, functionName: 'symbol' }).catch(() => undefined),
        ]);
        if (typeof name === 'string' && name) out.name = name;
        if (typeof symbol === 'string' && symbol) out.symbol = symbol;
      } catch {
        /* 非标准合约：忽略 */
      }

      const isNft = assetType === 1 || assetType === 2;
      if (isNft && tokenId !== undefined) {
        const uri = await publicClient!
          .readContract({ address: addr, abi: TOKEN_URI_ABI, functionName: 'tokenURI', args: [tokenId] })
          .catch(() => undefined);
        if (typeof uri === 'string' && uri) {
          const norm = normalizeAssetUri(uri);
          if (norm.startsWith('http')) {
            try {
              const res = await fetch(norm, { headers: { Accept: 'application/json' } });
              if (res.ok) {
                const j = (await res.json().catch(() => null)) as { name?: unknown; image?: unknown } | null;
                if (j) {
                  if (typeof j.name === 'string' && j.name && !out.name) out.name = j.name;
                  if (typeof j.image === 'string' && j.image) out.imageUrl = normalizeAssetUri(j.image);
                }
              }
            } catch {
              /* metadata 抓取失败：降级为名称占位 */
            }
          }
        }
      }
      return out;
    },
  });
}
