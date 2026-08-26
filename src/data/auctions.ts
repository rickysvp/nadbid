import type { FeaturedAuction, OngoingAuction, UpcomingAuction } from '@/types';
import { kolProfiles, knownKolHandles } from '@/data/kolProfiles';
import { getKolAuctionsBundle } from '@/data/kolAuctions';

/**
 * Home-page auction lists DERIVED from the same source of truth as the profile
 * pages (kolProfiles × kolAuctions bundles). Card ids are canonical auction ids
 * (`ongoing-CryptoChad-pinned`…), so every card deep-links to a real
 * `/auctions/:id` detail page. Replace with API responses once the backend is
 * available.
 */

const ACCENT_ROTATION = ['bg-primary', 'bg-secondary-container', 'bg-tertiary-container'];

export const ongoingAuctions: OngoingAuction[] = [];
export const upcomingAuctions: UpcomingAuction[] = [];

knownKolHandles.forEach((handle, index) => {
  const profile = kolProfiles[handle];
  if (!profile) return;

  const bundle = getKolAuctionsBundle(handle);
  const kol = {
    nickname: profile.nickname,
    handle: `@${handle}`,
    followers: profile.followers ?? '—',
    holders: profile.holders,
    avatarUrl: profile.avatarUrl,
  };

  const ongoing = bundle.ongoing[0];
  if (ongoing) {
    ongoingAuctions.push({
      id: ongoing.id,
      kol,
      tvl: (ongoing.tvl ?? '—').replace(/^\$/, ''),
      participants: ongoing.participants ?? 0,
      totalBids: ongoing.totalBids ?? 0,
      bidPrice: ongoing.bidPrice,
      timeLeft: ongoing.timeLabel,
      endsAtUtcMs: ongoing.endsAtUtcMs,
      avatarAccentClass: ACCENT_ROTATION[index % ACCENT_ROTATION.length],
    });
  }

  const upcoming = bundle.upcoming[0];
  if (upcoming) {
    upcomingAuctions.push({
      id: upcoming.id,
      kol,
      title: upcoming.title,
      description: upcoming.description,
      bidPrice: upcoming.bidPrice,
      startsIn: upcoming.timeLabel,
      startsAtUtcMs: upcoming.startsAtUtcMs,
      cardRotateClass:
        upcoming.cardRotateClass ?? (index % 2 === 0 ? '-rotate-1' : 'rotate-1'),
      panelRotateClass:
        upcoming.panelRotateClass ?? (index % 2 === 0 ? 'rotate-1' : '-rotate-1'),
      visibilityClass: index >= 2 ? 'hidden md:block' : undefined,
    });
  }
});

/**
 * Featured hero slot — prefer the first live ONGOING auction (most urgent),
 * falling back to the first UPCOMING one. `routeId` points at the canonical
 * detail route; `status` drives the status pill.
 */
function pickFeaturedAuction(): FeaturedAuction | null {
  for (const handle of knownKolHandles) {
    const profile = kolProfiles[handle];
    if (!profile) continue;
    const bundle = getKolAuctionsBundle(handle);
    const live = bundle.ongoing[0] ?? bundle.upcoming[0];
    if (!live) continue;
    return {
      kol: {
        nickname: profile.nickname,
        handle: `@${handle}`,
        followers: profile.followers ?? '—',
        holders: profile.holders,
        avatarUrl: profile.avatarUrl,
      },
      title: live.title,
      countdown: live.timeLabel,
      countdownTargetUtcMs: live.endsAtUtcMs ?? live.startsAtUtcMs,
      bidPrice: live.bidPrice,
      routeId: live.id,
      status: live.status,
    };
  }
  return null;
}

export const featuredAuction: FeaturedAuction | null = pickFeaturedAuction();
