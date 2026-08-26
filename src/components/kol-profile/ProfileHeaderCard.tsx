import { BadgeCheck, Crown, Medal, Sparkles, Users, Gift, ExternalLink, Share2, Wallet, TrendingUp } from 'lucide-react';
import type { KolBadge, KolProfile } from '@/types';
import { selectActiveStakedQty, selectPendingStakedQty, selectUnlockingStakedQty, useKolHolding } from '@/stores';
import { cn } from '@/utils/cn';

const BADGE_ICON: Record<KolBadge['id'], typeof BadgeCheck> = {
  verified: BadgeCheck,
  og: Crown,
  top100: Medal,
};

const BADGE_COLOR: Record<KolBadge['id'], string> = {
  verified: 'bg-secondary text-black',
  og: 'bg-tertiary text-black',
  top100: 'bg-primary text-white',
};

interface ProfileHeaderCardProps {
  profile: KolProfile;
  onJumpToRecords?: () => void;
}

export default function ProfileHeaderCard({ profile, onJumpToRecords }: ProfileHeaderCardProps) {
  const {
    handle,
    nickname,
    bio,
    avatarUrl,
    bannerAccentClass,
    rank,
    verified,
    holders,
    dividendSharePerNft,
    totalDividendsDistributedMon,
    xUrl,
    badges,
  } = profile;

  // 读取动态持仓（未变动时回退到 profile.market 基线），让左侧快照与 hasAnyHolding 联动真实持仓。
  const market = useKolHolding(handle, profile.market);

  const hasAnyHolding =
    market.userNftBalance > 0 ||
    selectActiveStakedQty(market) +
      selectPendingStakedQty(market) +
      selectUnlockingStakedQty(market) >
      0 ||
    market.dividendsClaimedMon > 0 ||
    market.dividendsPendingMon > 0.0001;

  return (
    <div className="relative">
      {/* ========== NFT CARD ========== */}
      <div className="relative mb-5">
        <article
          className={cn(
            'relative rounded-[28px] border-3 border-black shadow-neo-xl overflow-hidden p-6 md:p-8 bg-gradient-to-br',
            bannerAccentClass,
          )}
        >
          <div
            className="absolute inset-0 opacity-50 pointer-events-none mix-blend-overlay"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 15%, rgba(255,255,255,0.55) 0, transparent 38%), radial-gradient(circle at 80% 90%, rgba(0,0,0,0.25) 0, transparent 45%), linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)',
              backgroundSize: 'auto, auto, 20px 20px, 20px 20px',
            }}
            aria-hidden="true"
          />
          <div
            className="absolute -top-1 -left-1 -right-1 h-2 bg-[linear-gradient(90deg,#ff00d4,#00eaff,#ffee00,#7c3aed,#ff00d4)] opacity-70"
            aria-hidden
          />

          <div className="relative flex items-start justify-between mb-4 z-10">
            <div className="bg-black text-white px-3 py-1.5 font-mono text-[10px] md:text-[11px] uppercase font-black tracking-widest border-2 border-black shadow-neo-sm transform -rotate-2">
              nadbid · #{String(rank).padStart(3, '0')}
            </div>
            {verified && (
              <div className="bg-white text-black px-3 py-1.5 font-mono text-[10px] md:text-[11px] uppercase font-black tracking-wider border-2 border-black shadow-neo-sm transform rotate-2 flex items-center gap-1.5">
                <BadgeCheck className="w-3.5 h-3.5" strokeWidth={2.8} /> Verified
              </div>
            )}
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div
              className="absolute top-2 w-[190px] h-[190px] md:w-[230px] md:h-[230px] rounded-full blur-2xl opacity-60 bg-white/40"
              aria-hidden
            />
            <div className="relative">
              <div
                className={cn(
                  'rounded-full p-[3px]',
                  verified
                    ? 'bg-[conic-gradient(from_0deg,#ffffff,#facc15,#22c55e,#3b82f6,#a855f7,#ec4899,#ffffff)] animate-[spin_8s_linear_infinite]'
                    : 'bg-[conic-gradient(from_0deg,rgba(255,255,255,0.9),rgba(0,0,0,0.6),rgba(255,255,255,0.9))]',
                )}
              >
                <div className="rounded-full bg-white p-1.5 border-2 border-black shadow-neo-md">
                  <div className="relative overflow-hidden rounded-full w-[170px] h-[170px] md:w-[208px] md:h-[208px] ring-1 ring-black/60">
                    <img
                      src={avatarUrl}
                      alt={nickname}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div
                      className="absolute inset-0 rounded-full pointer-events-none"
                      style={{
                        boxShadow:
                          'inset 0 0 0 2px rgba(255,255,255,0.25), inset 0 -18px 40px 0 rgba(0,0,0,0.28)',
                      }}
                      aria-hidden
                    />
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-1 bg-primary text-white px-3 py-1.5 font-mono text-[10px] uppercase font-black tracking-wider border-2 border-black shadow-neo-md transform rotate-[-6deg] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Mint me
              </div>
            </div>

            <div className="mt-8 md:mt-10 text-center w-full px-1">
              <h1 className="font-display font-black text-2xl md:text-3xl leading-tight text-black drop-shadow-[0_2px_0_rgba(255,255,255,0.7)] tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                {nickname}
              </h1>
              <p
                className="mt-2 inline-flex items-center px-3 py-1 rounded-lg font-black text-sm md:text-lg text-white/95 bg-black/25 border border-white/35 drop-shadow-[0_2px_0_rgba(0,0,0,0.45)] whitespace-nowrap tabular-nums"
                style={{
                  fontFamily:
                    '"JetBrains Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                  letterSpacing: '0.02em',
                }}
              >
                @{handle}
              </p>
            </div>

            <div className="mt-6 md:mt-7 flex items-center gap-3 w-full">
              <a
                href={xUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="group flex-1 inline-flex items-center justify-center gap-2 bg-black text-white px-4 py-2.5 rounded-2xl font-mono text-[11px] md:text-xs uppercase font-black tracking-wider border-2 border-black shadow-neo-md btn-hover"
                title={`Open ${handle} on X`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 shrink-0"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M18.244 2H21.5l-7.52 8.6L22.5 22h-6.84l-5.36-6.98L4.05 22H.79l8.02-9.18L.85 2h6.99l4.85 6.37L18.244 2Zm-2.4 18h1.9L7.25 4h-2l11 16Z" />
                </svg>
                <span
                  style={{
                    fontFamily:
                      '"JetBrains Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                    letterSpacing: '0.01em',
                  }}
                >
                  X · @{handle}
                </span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/kols/${handle}`;
                  if (navigator.share) {
                    navigator
                      .share({ title: `${nickname} on nadbid`, text: bio, url })
                      .catch(() => {});
                  } else if (navigator.clipboard) {
                    navigator.clipboard.writeText(url).catch(() => {});
                  }
                }}
                className="shrink-0 inline-flex items-center justify-center w-12 h-12 bg-white text-black rounded-2xl border-2 border-black shadow-neo-md btn-hover"
                title="Share profile"
                aria-label="Share profile"
              >
                <Share2 className="w-[18px] h-[18px]" strokeWidth={2.4} />
              </button>
            </div>
          </div>
        </article>

        <div className="mt-4 rounded-2xl border-2 border-black shadow-neo-md bg-white p-4 md:p-5">
          <p className="font-body text-sm md:text-[15px] text-on-surface-variant font-bold leading-relaxed mb-4">
            {bio}
          </p>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => {
              const Icon = BADGE_ICON[badge.id];
              return (
                <div
                  key={badge.id}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full font-mono text-[11px] uppercase font-black px-3 py-1.5 border-2 border-black shadow-neo-sm',
                    BADGE_COLOR[badge.id],
                  )}
                >
                  <Icon className="w-3.5 h-3.5" /> {badge.label}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========== THREE STATS ========== */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="rounded-2xl border-2 border-black shadow-neo-md p-4 bg-[#EDE9FF] flex items-center gap-4">
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-white border-2 border-black flex items-center justify-center text-primary shadow-neo-sm">
            <Users className="w-6 h-6" strokeWidth={2.2} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-mono text-[10px] uppercase font-black text-black/60 leading-none tracking-widest">
              NFT Holders
            </span>
            <span className="font-display font-black text-3xl text-black leading-tight mt-1">
              {holders}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-black shadow-neo-md p-4 bg-[#D7F6E2] flex items-center gap-4">
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-white border-2 border-black flex items-center justify-center text-secondary shadow-neo-sm">
            <Gift className="w-6 h-6" strokeWidth={2.2} />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-mono text-[10px] uppercase font-black text-black/60 leading-none tracking-widest">
              Dividend / NFT
            </span>
            <div className="flex items-baseline gap-2 mt-1 flex-wrap">
              <span className="font-display font-black text-3xl text-black leading-tight">
                {dividendSharePerNft}
              </span>
              <span className="font-mono text-[10px] uppercase font-bold text-black/60">
                of dividend pool
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-black shadow-neo-md p-4 bg-[#FFF4C1] flex items-center gap-4">
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-white border-2 border-black flex items-center justify-center shadow-neo-sm">
            <TrendingUp className="w-6 h-6 text-black" strokeWidth={2.2} />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-mono text-[10px] uppercase font-black text-black/60 leading-none tracking-widest">
              Total distributed
            </span>
            <div className="flex items-baseline gap-2 mt-1 flex-wrap">
              <span className="font-display font-black text-3xl text-black leading-tight">
                {totalDividendsDistributedMon}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========== MY STAKING SNAPSHOT ========== */}
      {hasAnyHolding && (
        <div className="rounded-2xl border-2 border-black shadow-neo-md bg-surface-container-lowest p-4 md:p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase font-black text-black tracking-wider">
              <Wallet className="w-4 h-4 text-primary" /> Your snapshot · @{handle}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 md:gap-3">
            <div className="rounded-xl border-2 border-black bg-white p-3 text-center">
              <div className="font-mono text-[9px] uppercase font-black text-black/60 leading-none tracking-widest">
                Staked NFT
              </div>
              <div className="mt-1.5 font-display font-black text-xl md:text-2xl text-primary tabular-nums">
                {selectActiveStakedQty(market)}
              </div>
              <div className="font-mono text-[10px] text-black/60 mt-0.5">NFT</div>
            </div>
            <div className="rounded-xl border-2 border-black bg-white p-3 text-center">
              <div className="font-mono text-[9px] uppercase font-black text-black/60 leading-none tracking-widest">
                Pending claim
              </div>
              <div className="mt-1.5 font-display font-black text-xl md:text-2xl text-secondary tabular-nums">
                {market.dividendsPendingMon.toFixed(2)}
              </div>
              <div className="font-mono text-[10px] text-black/60 mt-0.5">$MON</div>
            </div>
            <div className="rounded-xl border-2 border-black bg-white p-3 text-center">
              <div className="font-mono text-[9px] uppercase font-black text-black/60 leading-none tracking-widest">
                Lifetime claimed
              </div>
              <div className="mt-1.5 font-display font-black text-xl md:text-2xl text-black tabular-nums">
                {market.dividendsClaimedMon.toFixed(2)}
              </div>
              <div className="font-mono text-[10px] text-black/60 mt-0.5">$MON</div>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onJumpToRecords}
        className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase font-bold text-primary hover:text-black transition-colors"
      >
        <Sparkles className="w-4 h-4" /> View {nickname} records →
      </button>
    </div>
  );
}
