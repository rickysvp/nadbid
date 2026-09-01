import { Coins, Sparkles, TrendingUp } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import { THEME } from '@/constants/theme';
import type { FloorPricePoint, NftInfo } from '@/types';

interface NftPanelProps {
  info: NftInfo;
  floorPriceHistory: FloorPricePoint[];
  onMintClick?: () => void;
}

const NFT_STATS_LABELS: Array<keyof Pick<NftInfo, 'supply' | 'staked' | 'holders'>> = [
  'supply',
  'staked',
  'holders',
];
const NFT_STATS_LABEL_MAP: Record<string, string> = {
  supply: 'SUPPLY',
  staked: 'STAKING',
  holders: 'HOLDERS',
};
const NFT_STATS_CLASSES: Record<string, string> = {
  supply: 'text-black',
  staked: 'text-secondary',
  holders: 'text-black',
};

/** NFT floor price chart, stats and mint CTA. */
export default function NftPanel({ info, floorPriceHistory, onMintClick }: NftPanelProps) {
  return (
    <div className="bg-bg-deep rounded-xl p-6 md:p-8 border-3 border-black shadow-neo-lg flex flex-col">
      <h3 className="font-display text-2xl font-black mb-4 flex items-center gap-2 text-black">
        <Sparkles className="w-6 h-6 stroke-[2.5]" />
        {info.name}
      </h3>

      <div className="w-full bg-white border-2 border-black rounded-xl p-4 shadow-neo-md mb-6 h-48 relative overflow-hidden">
        <div className="absolute top-2 left-4 z-10">
          <span className="font-mono text-[10px] uppercase font-black text-on-surface-variant">
            Floor Price
          </span>
          <div className="font-mono text-xl font-black text-monad">{info.floorPrice}</div>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={floorPriceHistory} margin={{ top: 20, right: 5, left: -25, bottom: 0 }}>
            <YAxis
              domain={['auto', 'auto']}
              axisLine={false}
              tickLine={false}
              tick={{
                fontFamily: 'monospace',
                fontSize: 10,
                fontWeight: 700,
                fill: THEME.mutedText,
              }}
            />
            <Tooltip
              contentStyle={{
                border: '2px solid black',
                borderRadius: '8px',
                boxShadow: '2px 2px 0px 0px rgba(0,0,0,1)',
                fontWeight: 700,
                fontFamily: 'monospace',
                fontSize: '12px',
              }}
              itemStyle={{ color: THEME.secondary }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke={THEME.secondary}
              strokeWidth={4}
              dot={{ fill: THEME.secondary, stroke: 'black', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: 'black', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {NFT_STATS_LABELS.map((key) => (
          <div
            key={key}
            className="bg-white border-2 border-black rounded-xl p-3 shadow-neo-sm flex flex-col items-center text-center"
          >
            <span className="font-mono text-[10px] font-bold text-on-surface-variant uppercase mb-1">
              {NFT_STATS_LABEL_MAP[key]}
            </span>
            <span className={`font-mono text-lg font-black ${NFT_STATS_CLASSES[key]}`}>
              {info[key]}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 mb-8">
        <div className="flex justify-between items-center bg-white border-2 border-black rounded-xl p-3 shadow-neo-sm">
          <span className="font-mono text-xs font-bold text-on-surface-variant uppercase flex items-center gap-1">
            <Coins className="w-4 h-4" /> Revenue Share
          </span>
          <span className="font-mono text-sm font-black text-black">{info.revenueShare}</span>
        </div>
        <div className="flex justify-between items-center bg-white border-2 border-black rounded-xl p-3 shadow-neo-sm">
          <span className="font-mono text-xs font-bold text-on-surface-variant uppercase flex items-center gap-1">
            <TrendingUp className="w-4 h-4" /> Shared Revenue
          </span>
          <span className="font-mono text-sm font-black text-monad">{info.sharedRevenue}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onMintClick}
        className="bg-black text-white w-full px-6 py-3 rounded-lg font-display font-black text-xl btn-hover active:scale-95 flex items-center justify-center gap-3 border-2 border-black shadow-dark-btn mt-auto"
      >
        <span>MINT NFT</span>
        <div className="w-1.5 h-1.5 rounded-full bg-white/50" aria-hidden="true" />
        <span className="text-monad">{info.mintPrice}</span>
      </button>
    </div>
  );
}
