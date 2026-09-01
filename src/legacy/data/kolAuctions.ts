import type { KolAuction, KolAuctionsBundle, KolAuctionStatus } from '@/types';
import { normalizeKolHandle } from '@/utils/format';

/** Past-auction seed descriptor — these are finalized shill results. */
interface PastSeedEntry {
  key: string;
  title: string;
  description: string;
  winBid: string;
  winner: string;
  tvl?: string;
  participants?: number;
  totalBids?: number;
}

const pastSeed = (handle: string, entries: PastSeedEntry[]): KolAuction[] =>
  entries.map((e, i) => ({
    id: `past-${handle}-${e.key}`,
    status: 'past',
    handle,
    title: e.title,
    description: e.description,
    bidPrice: e.winBid,
    timeLabel: 'Finalized',
    tvl: e.tvl,
    participants: e.participants,
    totalBids: e.totalBids,
    winningBid: e.winBid,
    winnerAddress: e.winner,
    cardRotateClass: i % 2 === 0 ? '-rotate-[0.4deg]' : 'rotate-[0.3deg]',
    panelRotateClass: i % 2 === 0 ? '-rotate-[0.6deg]' : 'rotate-1',
  }));

/** 模块加载时刻（数据只在刷新时固化一次，与 mock 语义一致）。 */
const MODULE_LOAD_AT = Date.now();

const liveAuction = (
  id: KolAuction['id'],
  status: KolAuctionStatus,
  handle: string,
  opts: Partial<KolAuction> & Pick<KolAuction, 'title' | 'description' | 'bidPrice' | 'timeLabel'>,
): KolAuction => ({
  id,
  status,
  handle,
  title: opts.title,
  description: opts.description,
  bidPrice: opts.bidPrice,
  timeLabel: opts.timeLabel,
  // timeLabel（如 "12h 04m" / "4d 06h"）→ 模块加载时刻的绝对时间戳，供 UI 实时走秒。
  endsAtUtcMs:
    status === 'ongoing' ? MODULE_LOAD_AT + parseTimeLabelToMs(opts.timeLabel) : undefined,
  startsAtUtcMs:
    status === 'upcoming' ? MODULE_LOAD_AT + parseTimeLabelToMs(opts.timeLabel) : undefined,
  tvl: opts.tvl,
  participants: opts.participants,
  totalBids: opts.totalBids,
  cardRotateClass: opts.cardRotateClass,
  panelRotateClass: opts.panelRotateClass,
});

/** 把 "4d 06h" / "12h 04m" / "47m" 风格的时长标签解析成毫秒。 */
export function parseTimeLabelToMs(label: string): number {
  let ms = 0;
  const day = label.match(/(\d+)\s*d/i);
  const hour = label.match(/(\d+)\s*h/i);
  const minute = label.match(/(\d+)\s*m/i);
  if (day) ms += Number(day[1]) * 86_400_000;
  if (hour) ms += Number(hour[1]) * 3_600_000;
  if (minute) ms += Number(minute[1]) * 60_000;
  return ms;
}

// Per-KOL history (finalized). Only 1 auction per KOL stays "Live" (Ongoing OR Upcoming),
// every other one lives here.
const HISTORIES: Record<string, PastSeedEntry[]> = {
  CryptoChad: [
    {
      key: 'gen0',
      title: 'Gen-0 Launch Shill',
      description: 'Intro pinned tweet + 2 replies to whale accounts for 7 days.',
      winBid: '940 $MON',
      winner: '0xWhale…4c2',
      tvl: '$880K',
      participants: 420,
      totalBids: 1288,
    },
    {
      key: 'ama',
      title: 'Spaces AMA Takeover',
      description: '1hr featured guest slot + retweet blast to all followers day-of.',
      winBid: '880 $MON',
      winner: '0xWhale…4c2',
      tvl: '$420K',
      participants: 158,
      totalBids: 486,
    },
    {
      key: 'raid',
      title: 'Discord Raid Night',
      description: 'Brought 200+ core holders into a server for a 1hr raiding session.',
      winBid: '620 $MON',
      winner: '0xDegen…21a',
      tvl: '$260K',
      participants: 214,
      totalBids: 512,
    },
  ],
  NFTQueen: [
    {
      key: 'gen0',
      title: 'Gen-0 Launch Shill',
      description: 'Intro pinned tweet + 2 replies to whale accounts for 7 days.',
      winBid: '3,150 $MON',
      winner: '0xPunk…9f1',
      tvl: '$2.1M',
      participants: 512,
      totalBids: 1480,
    },
    {
      key: 'ama',
      title: 'Spaces AMA Takeover',
      description: '1hr featured guest slot + retweet blast to all followers day-of.',
      winBid: '2,400 $MON',
      winner: '0xPunk…9f1',
      tvl: '$1.0M',
      participants: 261,
      totalBids: 722,
    },
    {
      key: 'thread',
      title: 'Thread Storm (5 tweets)',
      description: 'A 5-post story-thread building hype around a project. End-to-end research and copy.',
      winBid: '1,760 $MON',
      winner: '0xMuse…3aa',
      tvl: '$640K',
      participants: 189,
      totalBids: 610,
    },
  ],
  DogeFather: [
    {
      key: 'gen0',
      title: 'Gen-0 Launch Shill',
      description: 'Intro pinned tweet + 2 replies to whale accounts for 7 days.',
      winBid: '12,400 $MON',
      winner: '0xMuch…Wow',
      tvl: '$8.8M',
      participants: 1024,
      totalBids: 3310,
    },
    {
      key: 'ama',
      title: 'Spaces AMA Takeover',
      description: '1hr featured guest slot + retweet blast to all followers day-of.',
      winBid: '8,888 $MON',
      winner: '0xMuch…Wow',
      tvl: '$4.2M',
      participants: 731,
      totalBids: 2044,
    },
    {
      key: 'raid',
      title: 'Discord Raid Night',
      description: 'Brought 500+ core holders into a server for a 1hr raiding session.',
      winBid: '6,400 $MON',
      winner: '0xWoof…Bark',
      tvl: '$2.6M',
      participants: 566,
      totalBids: 1508,
    },
    {
      key: 'thread',
      title: 'Thread Storm (5 tweets)',
      description: 'A 5-post story-thread building hype around a project. End-to-end research and copy.',
      winBid: '4,800 $MON',
      winner: '0xMuch…Wow',
      tvl: '$1.9M',
      participants: 402,
      totalBids: 998,
    },
  ],
  CryptoKing: [
    {
      key: 'gen0',
      title: 'Gen-0 Launch Shill',
      description: 'Intro pinned tweet + 2 replies to whale accounts for 7 days.',
      winBid: '1,480 $MON',
      winner: '0xDegen…21a',
      tvl: '$1.3M',
      participants: 388,
      totalBids: 991,
    },
    {
      key: 'ama',
      title: 'Spaces AMA Takeover',
      description: '1hr featured guest slot + retweet blast to all followers day-of.',
      winBid: '1,120 $MON',
      winner: '0xDegen…21a',
      tvl: '$850K',
      participants: 212,
      totalBids: 540,
    },
    {
      key: 'thread',
      title: 'Thread Storm (5 tweets)',
      description: 'A 5-post story-thread building hype around a project. End-to-end research and copy.',
      winBid: '830 $MON',
      winner: '0xRegal…77d',
      tvl: '$410K',
      participants: 147,
      totalBids: 383,
    },
  ],
};

/**
 * Status uniqueness — at any moment a KOL has AT MOST ONE live auction: it is EITHER
 * ongoing OR upcoming (never both), and never more than one of that status. Every other
 * auction is history. Prefers ongoing when both are present.
 */
function sanitizeLiveStates(bundle: KolAuctionsBundle): KolAuctionsBundle {
  const demote = (a: KolAuction): KolAuction => ({ ...a, status: 'past', timeLabel: 'Finalized' });
  const history: KolAuction[] = [...bundle.past];

  let live: KolAuction | null = null;
  if (bundle.ongoing.length > 0) {
    live = bundle.ongoing[0];
    bundle.ongoing.slice(1).forEach((a) => history.push(demote(a)));
    bundle.upcoming.forEach((a) => history.push(demote(a)));
  } else if (bundle.upcoming.length > 0) {
    live = bundle.upcoming[0];
    bundle.upcoming.slice(1).forEach((a) => history.push(demote(a)));
  }

  return {
    handle: bundle.handle,
    ongoing: live?.status === 'ongoing' ? [live] : [],
    upcoming: live?.status === 'upcoming' ? [live] : [],
    past: history,
  };
}

/**
 * Raw seeds per KOL. To exercise every state across the roster:
 *  - CryptoChad  → 1 ONGOING  (SOON empty, lots of history)
 *  - NFTQueen    → 1 UPCOMING (LIVE empty — a KOL can be solely queued)
 *  - DogeFather  → 1 ONGOING
 *  - CryptoKing  → 1 UPCOMING (LIVE empty — another queued demo)
 */
export const kolAuctionsBundleByHandle: Record<string, KolAuctionsBundle> = {
  CryptoChad: {
    handle: 'CryptoChad',
    ongoing: [
      liveAuction('ongoing-CryptoChad-pinned', 'ongoing', 'CryptoChad', {
        title: 'Pinned Tweet (24h)',
        description:
          'Your banner pinned to my profile for a full day — includes a QRT to your launch post.',
        bidPrice: '1.42 $MON',
        timeLabel: '12h 04m',
        tvl: '$1.2M',
        participants: 84,
        totalBids: 262,
        cardRotateClass: '-rotate-[0.25deg]',
        panelRotateClass: 'rotate-[0.5deg]',
      }),
    ],
    upcoming: [],
    past: pastSeed('CryptoChad', HISTORIES.CryptoChad),
  },
  NFTQueen: {
    handle: 'NFTQueen',
    ongoing: [],
    upcoming: [
      liveAuction('upcoming-NFTQueen-pinned', 'upcoming', 'NFTQueen', {
        title: 'Pinned Tweet (24h)',
        description:
          'Your banner pinned to my profile for a full day — includes a QRT to your launch post.',
        bidPrice: '580 $MON',
        timeLabel: '4d 06h',
        tvl: '$1.8M',
        participants: 96,
        totalBids: 288,
        cardRotateClass: 'rotate-[0.5deg]',
        panelRotateClass: '-rotate-1',
      }),
    ],
    past: pastSeed('NFTQueen', HISTORIES.NFTQueen),
  },
  DogeFather: {
    handle: 'DogeFather',
    ongoing: [
      liveAuction('ongoing-DogeFather-pinned', 'ongoing', 'DogeFather', {
        title: 'Pinned Tweet (24h)',
        description:
          'Your banner pinned to my profile for a full day — includes a QRT to your launch post.',
        bidPrice: '6.90 $MON',
        timeLabel: '00h 47m',
        tvl: '$5.4M',
        participants: 312,
        totalBids: 940,
        cardRotateClass: '-rotate-[0.25deg]',
        panelRotateClass: 'rotate-[0.5deg]',
      }),
    ],
    upcoming: [],
    past: pastSeed('DogeFather', HISTORIES.DogeFather),
  },
  CryptoKing: {
    handle: 'CryptoKing',
    ongoing: [],
    upcoming: [
      liveAuction('upcoming-CryptoKing-pinned', 'upcoming', 'CryptoKing', {
        title: 'Pinned Tweet (24h)',
        description:
          'Your banner pinned to my profile for a full day — includes a QRT to your launch post.',
        bidPrice: '920 $MON',
        timeLabel: '2d 18h',
        tvl: '$980K',
        participants: 74,
        totalBids: 210,
        cardRotateClass: 'rotate-[0.4deg]',
        panelRotateClass: '-rotate-[0.6deg]',
      }),
    ],
    past: pastSeed('CryptoKing', HISTORIES.CryptoKing),
  },
};

/**
 * Given any raw handle (optionally with "@" prefix), return its auction bundle,
 * with live-state uniqueness enforced. Missing handles → empty bundle so the UI
 * renders friendly empty-state cards.
 */
export function getKolAuctionsBundle(rawHandle: string): KolAuctionsBundle {
  const handle = normalizeKolHandle(rawHandle);
  const raw = kolAuctionsBundleByHandle[handle] ?? {
    handle,
    upcoming: [],
    ongoing: [],
    past: [],
  };
  return sanitizeLiveStates(raw);
}