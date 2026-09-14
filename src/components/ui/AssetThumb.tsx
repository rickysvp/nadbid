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

const TYPE_LABEL: Record<number, string> = {
  0: 'TOKEN',
  1: 'NFT',
  2: '1155',
};

/**
 * 拍品缩略图 / 主视觉：
 * - thumb：小方块（默认 48px），无图时类型首字母 + 色底 + 类型角标
 * - hero：画廊式大图（撑满传入尺寸），无图时海报式占位（斜线纹理 + 大首字母 + 底部类型条）
 */
export function AssetThumb({
  assetType,
  assetAddr,
  tokenId,
  variant = 'thumb',
  className,
}: {
  assetType: number;
  assetAddr: string;
  tokenId?: bigint;
  variant?: 'thumb' | 'hero';
  className?: string;
}) {
  const { data, isLoading } = useAssetMeta(assetType, assetAddr, tokenId);
  const hasImage = !!data?.imageUrl;
  const fallback = assetType === 0 ? 'T' : data?.symbol?.[0]?.toUpperCase?.() ?? TYPE_INITIAL[assetType] ?? '?';

  if (variant === 'hero') {
    return (
      <div
        className={cn(
          'relative flex items-center justify-center overflow-hidden rounded-xl border-2 border-[#111] bg-[#fffdf7] shadow-[4px_4px_0_#111]',
          className ?? 'h-56 w-full',
        )}
      >
        {isLoading ? (
          <div className="h-full w-full animate-pulse bg-[#111]/5" />
        ) : hasImage ? (
          <img src={data!.imageUrl} alt={data?.name ?? 'auction asset'} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div
            className={cn(
              'relative flex h-full w-full items-center justify-center overflow-hidden',
              TYPE_TILE[assetType] ?? 'bg-[#111]/5',
            )}
          >
            {/* 斜线纹理 */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.18]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, rgba(17,17,17,0.25) 0px, rgba(17,17,17,0.25) 2px, transparent 2px, transparent 14px)',
              }}
            />
            <span className="relative font-mono text-5xl font-black text-[#111]/30 md:text-6xl">{fallback}</span>
            <span className="absolute bottom-2 left-2 rounded-md border-2 border-[#111] bg-[#ffe94a] px-2 py-0.5 font-mono text-[10px] font-black text-[#111]">
              {TYPE_LABEL[assetType] ?? 'ASSET'}
            </span>
            {data?.symbol && (
              <span className="absolute bottom-2 right-2 rounded-md border-2 border-[#111] bg-[#fffdf7] px-2 py-0.5 font-mono text-[10px] font-black text-[#111]/60">
                {data.symbol}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

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
          {TYPE_LABEL[assetType] ?? 'A'}
        </span>
      )}
    </div>
  );
}
