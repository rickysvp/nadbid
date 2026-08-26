import { useState } from 'react';
import { BadgeCheck, GraduationCap, Search, Users, Wallet, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionTitle, StatDivider, StatItem } from '@/components/ui';
import { useQuery } from '@tanstack/react-query';
import { isMockEnabled, apiGet } from '@/api/httpClient';
import { kolProfiles, knownKolHandles } from '@/data/kolProfiles';
import type { KolBadgeId, KolProfile } from '@/types';
import { cn } from '@/utils/cn';

type KolDirectoryEntry = Pick<
  KolProfile,
  | 'handle'
  | 'nickname'
  | 'bio'
  | 'avatarUrl'
  | 'bannerAccentClass'
  | 'verified'
  | 'rank'
  | 'holders'
  | 'marketCap'
  | 'totalDividendsDistributedMon'
> & { badgeIds: KolBadgeId[] };

/** 筛选档位 → badge 匹配键（All 表示不过滤）。 */
const FILTER_BADGE: Record<string, KolBadgeId | null> = {
  All: null,
  OG: 'og',
  'Top 100': 'top100',
  Verified: 'verified',
};

async function fetchKolDirectory(): Promise<KolDirectoryEntry[]> {
  if (isMockEnabled()) {
    return knownKolHandles.map((h) => {
      const p = kolProfiles[h];
      return {
        handle: p.handle,
        nickname: p.nickname,
        bio: p.bio,
        avatarUrl: p.avatarUrl,
        bannerAccentClass: p.bannerAccentClass,
        verified: p.verified,
        rank: p.rank,
        holders: p.holders,
        badgeIds: p.badges.map((b) => b.id),
        totalDividendsDistributedMon: p.totalDividendsDistributedMon,
        marketCap: p.marketCap,
      };
    });
  }
  return apiGet<KolDirectoryEntry[]>('/kols');
}

export default function KOLs() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['kols', 'directory'],
    queryFn: fetchKolDirectory,
  });
  const [activeFilter, setActiveFilter] = useState<string>('All');

  const filteredKols = (data ?? []).filter((kol) => {
    const badge = FILTER_BADGE[activeFilter];
    return badge === null || badge === undefined || kol.badgeIds.includes(badge);
  });

  return (
    <main className="flex-grow pb-20 pt-10 px-container-padding">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <section className="w-full rounded-[2.5rem] bg-primary text-white border-3 border-black shadow-neo-lg p-8 md:p-12 relative overflow-hidden mb-10 transform -rotate-[0.25deg]">
          <div
            className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-tertiary/30 border-3 border-black"
            aria-hidden
          />
          <div
            className="absolute -bottom-24 -left-10 w-56 h-56 rounded-full bg-secondary/20 border-3 border-black"
            aria-hidden
          />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white text-black font-mono font-black text-xs uppercase border-2 border-black px-3 py-1.5 rounded-full shadow-neo-sm mb-5 transform -rotate-1">
              <GraduationCap className="w-4 h-4" /> The KOL Directory
            </div>
            <h1 className="font-display font-black text-4xl md:text-6xl leading-[1.05] tracking-tight mb-4">
              Back a creator. <span className="text-tertiary">Trade their attention.</span>
            </h1>
            <p className="font-body text-lg md:text-xl text-white/90 font-bold leading-relaxed mb-8 max-w-2xl">
              Every KOL has their own bonding curve ticket. Buy early, sell on hype, earn rewards
              when they hit new milestones — all on-chain and transparent.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/kols/CryptoChad"
                className="inline-flex items-center gap-2 bg-tertiary text-black px-5 py-3 rounded-full font-mono font-black text-[12px] uppercase border-2 border-black shadow-neo-md btn-hover"
              >
                Explore top KOL →
              </Link>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur text-white px-5 py-3 rounded-full font-mono font-black text-[12px] uppercase border-2 border-white/30">
                <Search className="w-4 h-4" />
                <span className="text-white/80 hidden sm:inline">Beta · 4 creators live</span>
                <span className="sm:hidden">Beta · 4 live</span>
              </div>
            </div>
          </div>
        </section>

        {/* Filters */}
        <div className="mb-7 flex flex-wrap items-center gap-3 justify-between">
          <SectionTitle
            icon={Users}
            iconClassName="text-primary w-8 h-8 stroke-black stroke-2"
            title="All Creators"
            count={filteredKols.length}
          />
          <div className="inline-flex rounded-full border-2 border-black bg-surface-container-lowest shadow-neo-sm overflow-hidden p-0.5">
            {(['All', 'OG', 'Top 100', 'Verified'] as const).map((tag) => (
              <button
                type="button"
                key={tag}
                aria-pressed={activeFilter === tag}
                onClick={() => setActiveFilter(tag)}
                className={cn(
                  'px-4 py-1.5 font-mono text-[11px] uppercase font-black transition-all rounded-full',
                  activeFilter === tag
                    ? 'bg-primary text-white shadow-neo-sm'
                    : 'text-black hover:bg-black/5',
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Grid of KOL cards */}
        {isLoading && (
          <div className="text-center py-16 font-mono font-black text-primary text-xl animate-pulse">
            Loading KOLs…
          </div>
        )}
        {error && !isLoading && (
          <div className="bg-white border-3 border-black rounded-3xl shadow-neo-xl p-8 text-center max-w-md mx-auto">
            <X className="w-12 h-12 text-error mx-auto mb-3" />
            <h2 className="font-display font-black text-2xl mb-2">Failed to load KOLs</h2>
            <p className="font-body text-on-surface-variant font-bold">Try refreshing the page.</p>
          </div>
        )}

        {!isLoading && filteredKols.length === 0 && (
          <div className="bg-white border-3 border-black rounded-3xl shadow-neo-xl p-10 text-center max-w-md mx-auto">
            <X className="w-12 h-12 text-on-surface-variant mx-auto mb-3" />
            <h2 className="font-display font-black text-2xl mb-2">No creators match</h2>
            <p className="font-body text-on-surface-variant font-bold mb-5">
              No KOLs carry the “{activeFilter}” badge yet — try another filter.
            </p>
            <button
              type="button"
              onClick={() => setActiveFilter('All')}
              className="bg-primary text-on-primary px-6 py-3 rounded-full font-mono font-bold uppercase text-sm border-2 border-black shadow-neo-md btn-hover"
            >
              Show all creators
            </button>
          </div>
        )}

        {!isLoading && filteredKols.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-card-gap">
            {filteredKols.map((kol) => (
              <Link
                to={`/kols/${kol.handle}`}
                key={kol.handle}
                className="group relative rounded-[2rem] border-3 border-black shadow-neo-lg bg-surface-container-lowest overflow-hidden transform rotate-[-0.5deg] hover:rotate-0 hover:-translate-y-1 transition-all flex flex-col"
              >
                {/* Banner with gradient */}
                <div
                  className={cn(
                    'h-24 w-full bg-gradient-to-br border-b-3 border-black relative',
                    kol.bannerAccentClass,
                  )}
                >
                  {kol.verified && (
                    <div className="absolute top-3 right-3 bg-primary text-white inline-flex items-center gap-1 font-mono text-[10px] uppercase font-black border-2 border-black px-2.5 py-1 rounded-full shadow-neo-sm transform rotate-2">
                      <BadgeCheck className="w-3.5 h-3.5" /> Verified
                    </div>
                  )}
                  <div className="absolute -bottom-1 left-4 bg-tertiary text-black px-3 py-1 font-mono text-xs font-black uppercase border-2 border-black shadow-neo-sm">
                    #{kol.rank}
                  </div>
                </div>

                {/* Avatar */}
                <div className="relative px-6">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-3 border-black shadow-neo-md -mt-10 bg-white">
                    <img
                      src={kol.avatarUrl}
                      alt={kol.nickname}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>

                {/* Text */}
                <div className="px-6 pt-4 pb-6 flex flex-col flex-grow">
                  <h3 className="font-display font-black text-2xl text-black leading-none mb-1 group-hover:text-primary transition-colors">
                    {kol.nickname}
                  </h3>
                  <p className="font-mono text-xs uppercase font-black text-primary mb-4">
                    @{kol.handle}
                  </p>
                  <p className="font-body text-sm text-on-surface-variant font-bold leading-relaxed line-clamp-3 mb-5 min-h-[4.5rem]">
                    {kol.bio}
                  </p>
                  <div className="flex items-center gap-2 mt-auto pt-3 border-t-2 border-black/10">
                    <StatItem label="Dividends" value={kol.totalDividendsDistributedMon} />
                    <StatDivider />
                    <StatItem label="Holders" value={kol.holders} valueClass="text-secondary" />
                    <StatDivider />
                    <div className="flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-black" />
                      <span className="font-display font-black text-black text-base">
                        {kol.marketCap ?? '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hover CTA chip */}
                <div className="absolute bottom-5 right-5 bg-primary text-white px-3.5 py-1.5 rounded-full font-mono text-[11px] uppercase font-black border-2 border-black shadow-neo-sm opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all pointer-events-none">
                  View Profile →
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
