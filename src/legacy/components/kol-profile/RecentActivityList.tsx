import { useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpRight, History, Tag, Flame, Sparkles } from 'lucide-react';
import type { KolProfile, NftTrade } from '@/types';
import { cn, formatTokenAmount } from '@/utils';

interface RecentActivityListProps {
  profile: KolProfile;
  /** External optimistic updates. */
  prependedActivity?: NftTrade[];
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.max(1, Math.floor(diff / 60000));
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

const KIND_META: Record<
  NftTrade['kind'],
  {
    label: string;
    past: string;
    icon: typeof Sparkles;
    bg: string;
    textColor: string;
    amountSign: 'pos' | 'neg';
  }
> = {
  mint: {
    label: 'Mint',
    past: 'Minted',
    icon: Sparkles,
    bg: 'bg-secondary text-black',
    textColor: 'text-secondary',
    amountSign: 'neg',
  },
  burn: {
    label: 'Burn',
    past: 'Burned',
    icon: Flame,
    bg: 'bg-white text-error',
    textColor: 'text-error',
    amountSign: 'pos',
  },
};

/** 共享的 NFT 交易列表主体（供 Records 容器与独立组件复用）。 */
export function NftTradeList({ trades, handle }: { trades: NftTrade[]; handle: string }) {
  return (
    <ul className="space-y-3">
      {trades.length === 0 && (
        <li className="rounded-2xl border-2 border-dashed border-black/30 text-center py-10 text-on-surface-variant font-body font-bold">
          No NFT activity yet — be the first to mint @{handle} NFT!
        </li>
      )}
      {trades.map((tx, idx) => {
        const meta = KIND_META[tx.kind];
        const Icon = tx.kind === 'mint' ? ArrowDownToLine : ArrowUpRight;
        const displayAmount = Math.abs(tx.amountDelta);
        const isInflow = meta.amountSign === 'pos';
        return (
          <li
            key={tx.id}
            className="rounded-2xl border-2 border-black shadow-neo-sm bg-surface-container-lowest p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-transform hover:translate-x-[1px] hover:-translate-y-[1px] hover:shadow-neo-md animate-[fadeUp_320ms_ease-out_both]"
            style={{ animationDelay: `${idx * 36}ms` }}
          >
            <div className="flex items-center gap-4 flex-grow">
              <div
                className={cn(
                  'w-11 h-11 rounded-full border-2 border-black shadow-neo-sm flex items-center justify-center shrink-0',
                  meta.bg,
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-display font-black text-black text-lg md:text-xl leading-tight">
                  {meta.past} {tx.nftQuantity} NFT
                </span>
                <span className="font-mono text-[11px] uppercase font-bold text-on-surface-variant flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> by {tx.address}
                  </span>
                  <span>· {relativeTime(tx.timestamp)}</span>
                </span>
              </div>
            </div>
            <div
              className={cn(
                'font-display font-black text-xl md:text-2xl shrink-0 sm:ml-auto',
                isInflow ? 'text-monad' : 'text-error',
              )}
            >
              {isInflow ? '+' : '−'}
              {formatTokenAmount(displayAmount)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function RecentActivityList({
  profile,
  prependedActivity = [],
}: RecentActivityListProps) {
  const title = 'Recent NFT Activity';
  const [filter, setFilter] = useState<'all' | 'mint' | 'burn'>('all');

  const activity = useMemo<NftTrade[]>(() => {
    const merged = [...prependedActivity, ...profile.activity];
    const set = new Set<string>();
    return merged.filter((t) => (set.has(t.id) ? false : (set.add(t.id), true)));
  }, [profile.activity, prependedActivity]);

  const visible = useMemo(
    () => activity.filter((a) => filter === 'all' || a.kind === filter),
    [activity, filter],
  );

  return (
    <section className="rounded-2xl border-3 border-black shadow-neo-xl bg-white overflow-hidden">
      {/* Title sticker + filter */}
      <header className="relative px-6 md:px-8 pt-6 pb-4 md:pb-5">
        <div className="inline-block bg-tertiary text-black font-mono font-black text-[11px] uppercase border-2 border-black px-4 py-1.5 shadow-neo-sm mb-4">
          {title}
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="inline-flex items-center gap-2 font-mono text-xs uppercase font-bold text-on-surface-variant">
            <History className="w-4 h-4" /> {visible.length} trades · @{profile.handle}
          </div>
          <div className="inline-flex rounded-full border-2 border-black bg-surface-container-lowest shadow-neo-sm overflow-hidden p-0.5">
            {(['all', 'mint', 'burn'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  'px-4 py-1.5 font-mono text-[11px] uppercase font-black transition-all',
                  filter === f
                    ? 'bg-primary text-black rounded-full shadow-neo-sm'
                    : 'text-black hover:bg-black/5',
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* List */}
      <div className="px-5 md:px-7 pb-7">
        <NftTradeList trades={visible} handle={profile.handle} />
      </div>
    </section>
  );
}
