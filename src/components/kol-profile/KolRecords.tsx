import { useMemo, useState } from 'react';
import { Gavel, History, Repeat, Trophy, Flame } from 'lucide-react';
import type { KolAuction, KolAuctionsBundle, KolProfile, NftTrade } from '@/types';
import { cn } from '@/utils/cn';
import { PastAuctionList } from '@/components/kol-profile/KolAuctionHistory';
import { NftTradeList } from '@/components/kol-profile/RecentActivityList';

type TabId = 'auctions' | 'trades';

interface KolRecordsProps {
  handle: string;
  bundle: KolAuctionsBundle;
  profile: KolProfile;
  /** External optimistic NFT trades (from Mint/Burn). */
  prependedActivity?: NftTrade[];
}

/** KOL 记录容器：拍卖历史 + NFT 交易历史合并为一块，以 2 个 Tab 分区展示。 */
export default function KolRecords({
  handle,
  bundle,
  profile,
  prependedActivity = [],
}: KolRecordsProps) {
  const [tab, setTab] = useState<TabId>('auctions');
  const [filter, setFilter] = useState<'all' | 'mint' | 'burn'>('all');

  const pastAuctions: KolAuction[] = bundle.past;

  const merged = useMemo<NftTrade[]>(() => {
    const list = [...prependedActivity, ...profile.activity];
    const set = new Set<string>();
    return list.filter((t) => (set.has(t.id) ? false : (set.add(t.id), true)));
  }, [profile.activity, prependedActivity]);

  const visibleTrades = useMemo(
    () => merged.filter((t) => filter === 'all' || t.kind === filter),
    [merged, filter],
  );

  const tabs: { id: TabId; label: string; icon: typeof Gavel; count: number; accent: string }[] = [
    { id: 'auctions', label: 'Auctions', icon: Trophy, count: pastAuctions.length, accent: 'bg-tertiary' },
    { id: 'trades', label: 'NFT Trades', icon: Repeat, count: merged.length, accent: 'bg-secondary' },
  ];

  return (
    <section className="rounded-3xl border-3 border-black shadow-neo-xl bg-white overflow-hidden">
      {/* Header sticker + tab bar */}
      <header className="relative px-6 md:px-8 pt-6 pb-4 md:pb-5 bg-surface-container-lowest border-b-2 border-black">
        <div className="inline-flex items-center gap-1.5 bg-black text-white font-mono font-black text-[11px] uppercase border-2 border-black px-4 py-1.5 shadow-neo-sm transform -rotate-1 mb-5">
          <History className="w-3.5 h-3.5" /> Records · @{handle}
        </div>

        <div className="grid grid-cols-2 gap-2 md:gap-3 p-1.5 bg-white rounded-2xl border-2 border-black shadow-neo-md">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex flex-col sm:flex-row sm:items-center justify-center gap-1.5 sm:gap-2 py-3 px-3 rounded-xl font-mono font-black uppercase text-[11px] md:text-xs transition-all border-2',
                  active
                    ? cn(t.accent, 'text-black shadow-neo-md scale-[1.02] border-black')
                    : 'bg-transparent text-on-surface-variant border-transparent hover:text-black hover:bg-black/5',
                )}
                aria-pressed={active}
              >
                <t.icon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mx-auto sm:mx-0" strokeWidth={2.4} />
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 leading-tight">
                  <span>{t.label}</span>
                  <span
                    className={cn(
                      'inline-block rounded-full px-2 py-[1px] text-[10px] mt-0.5 sm:mt-0',
                      active ? 'bg-black/20 text-black' : 'bg-black/5 text-black/70',
                    )}
                  >
                    {t.count}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </header>

      {/* Auction history body */}
      {tab === 'auctions' && (
        <div className="px-5 md:px-7 py-6 md:py-7">
          {pastAuctions.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-black/30 bg-surface-container-lowest text-center py-12 px-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl border-2 border-black bg-tertiary/40 shadow-neo-sm mb-4">
                <Gavel className="w-7 h-7 text-black" />
              </div>
              <h3 className="font-display font-black text-2xl text-black mb-2">
                No past auctions on record
              </h3>
              <p className="font-body text-base text-on-surface-variant font-bold leading-relaxed max-w-md mx-auto">
                This is @{handle}'s first run on nadbid. Come back after a few auctions conclude!
              </p>
            </div>
          ) : (
            <PastAuctionList auctions={pastAuctions} />
          )}
        </div>
      )}

      {/* NFT trades body */}
      {tab === 'trades' && (
        <div className="px-5 md:px-7 py-6 md:py-7">
          <div className="flex flex-wrap items-center gap-2 justify-between mb-5">
            <div className="inline-flex items-center gap-2 font-mono text-xs uppercase font-bold text-on-surface-variant">
              <Repeat className="w-4 h-4" /> {visibleTrades.length} trades · @{handle}
            </div>
            <div className="inline-flex rounded-full border-2 border-black bg-surface-container-lowest shadow-neo-sm overflow-hidden p-0.5">
              {(['all', 'mint', 'burn'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    'inline-flex items-center gap-1 px-4 py-1.5 font-mono text-[11px] uppercase font-black transition-all',
                    filter === f
                      ? 'bg-primary text-white rounded-full shadow-neo-sm'
                      : 'text-black hover:bg-black/5',
                  )}
                >
                  {f === 'burn' && <Flame className="w-3 h-3" />}
                  {f}
                </button>
              ))}
            </div>
          </div>
          <NftTradeList trades={visibleTrades} handle={handle} />
        </div>
      )}
    </section>
  );
}