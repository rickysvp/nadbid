import { Activity, Coins, TrendingUp, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PlatformStat } from '@/types';

const STAT_ICONS: Record<PlatformStat['id'], LucideIcon> = {
  totalVolume: Activity,
  totalDividends: Coins,
  activeBidders: Users,
};

interface StatsDashboardProps {
  stats: PlatformStat[];
}

export default function StatsDashboard({ stats }: StatsDashboardProps) {
  return (
    <div className="flex flex-col gap-8 w-full h-full justify-between">
      {stats.map((stat) => {
        const Icon = STAT_ICONS[stat.id];
        return (
          <div
            key={stat.id}
            className="bg-white rounded-xl p-6 shadow-neo-lg flex flex-col justify-center border-3 border-black flex-1 min-h-[150px] hover:-translate-y-1 transition-transform cursor-default"
          >
            <div className="flex items-center gap-2 mb-4 text-primary">
              <Icon className="w-5 h-5" />
              <span className="font-mono text-[11px] uppercase tracking-widest text-black font-black">
                {stat.label}
              </span>
            </div>
            <div>
              <div className="font-display text-4xl font-black text-black">{stat.value}</div>
              <div className="text-secondary text-sm font-bold flex items-center mt-2">
                <TrendingUp className="w-4 h-4 mr-1" />
                {stat.change}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
