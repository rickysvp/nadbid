import { useAssetMeta } from '../../web3/hooks/useAssetMeta';
import { cn } from '../../utils/cn';

const TYPE_TILE: Record<number, string> = {
  0: 'bg-[#3ec4f0]/20',
  1: 'bg-[#3ec470]/20',
  2: 'bg-[#ff6ba9]/20',
};

const TYPE_INITIAL: Record<number, string> = {
  0: 'T',
  1: 'N',
  2: 'M',
};

/**
 * 拍品缩略图：有 metadata 图则显示真实 NFT 图；无图时粗野占位块（类型首字母 + 色底）。
 */
export function AssetThumb({
  assetType,
  assetAddr,
  tokenId,
  className,
}: {
  assetType: number;
  assetAddr: string;
  tokenId?: bigint;
  className?: string;
}) {
  const { data, isLoading } = useAssetMeta(assetType, assetAddr, tokenId);
  const hasImage = !!data?.imageUrl;
  const fallback = assetType === 0 ? 'T' : data?.symbol?.[0]?.toUpperCase?.() ?? TYPE_INITIAL[assetType] ?? '?';

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-[#111] bg-[#fffdf7] shadow-[3px_3px_0_#111]',
        className ?? 'h-12 w-12',
      )}
    >
      {isLoading ? (
        <div className="h-full w-full animate-pulse bg-[#111]/5" />
      ) : hasImage ? (
        <img src={data!.imageUrl} alt={data?.name ?? 'auction asset'} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className={cn('flex h-full w-full items-center justify-center', TYPE_TILE[assetType] ?? 'bg-[#111]/5')}>
          <span className="font-mono text-sm font-black text-[#111]/45">{fallback}</span>
        </div>
      )}
      {!hasImage && !isLoading && (
        <span className="absolute bottom-0.5 right-0.5 rounded-sm bg-[#111]/70 px-0.5 leading-none text-[7px] font-black text-[#fffdf7]">
          {assetType === 0 ? 'T20' : assetType === 1 ? 'NFT' : '1155'}
        </span>
      )}
    </div>
  );
}
