import type {
  AuctionKolWithHandle,
  AuctionLiveStats,
  Bidder,
  FloorPricePoint,
  FulfillmentInfo,
  KolAuction,
  KolAuctionStatus,
  KolProfile,
  NftInfo,
} from '@/types';
import { knownKolHandles, kolProfiles } from '@/data/kolProfiles';
import { getKolAuctionsBundle } from '@/data/kolAuctions';
import { formatTokenAmount } from '@/utils/format';

/**
 * Auction detail view model — assembled PER AUCTION ID from the same source of
 * truth as the profile pages (kolProfiles × kolAuctions bundles), so every
 * route (`/auctions/:id`) renders its own auction instead of a shared static
 * snapshot. Swap to a real API response once the backend lands.
 */

export interface AuctionDetailData {
  id: string;
  status: KolAuctionStatus;
  kol: AuctionKolWithHandle;
  description: string;
  liveStats: AuctionLiveStats;
  bidHistory: Bidder[];
  latestBidder: Bidder;
  floorPriceHistory: FloorPricePoint[];
  nftInfo: NftInfo;
  fulfillmentInfo: FulfillmentInfo;
}

/** Thrown by `buildAuctionDetail` for unknown ids; surfaces as a 404-style UI. */
export class AuctionNotFoundError extends Error {
  readonly auctionId: string;

  constructor(auctionId: string) {
    super(`Auction not found: ${auctionId}`);
    this.name = 'AuctionNotFoundError';
    this.auctionId = auctionId;
  }
}

/* ---------- Bid board synthesis (demo-grade, deterministic per auction) ---------- */

const BIDDER_POOL: Pick<Bidder, 'address' | 'nickname' | 'handle' | 'avatarUrl'>[] = [
  {
    address: '0x4F...a9B2',
    nickname: 'Crypto Whale',
    handle: '@CryptoWhale',
    avatarUrl:
      'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=100',
  },
  {
    address: '0x1A...8fC4',
    nickname: null,
    handle: null,
    avatarUrl: null,
  },
  {
    address: '0x9E...b3D1',
    nickname: 'NFT Degen',
    handle: '@NFTDegen',
    avatarUrl:
      'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&q=80&w=100',
  },
  {
    address: '0x2C...e7A5',
    nickname: null,
    handle: null,
    avatarUrl: null,
  },
  {
    address: '0x5B...d1F8',
    nickname: 'Diamond Hands',
    handle: '@DiamondHands',
    avatarUrl:
      'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=100',
  },
  {
    address: '0x77...D2cA',
    nickname: 'Moon Dev',
    handle: '@0xMoonDev',
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100',
  },
  {
    address: '0xD3...9e0F',
    nickname: 'Satoshi Jr.',
    handle: '@SatoshiJr',
    avatarUrl:
      'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&q=80&w=100',
  },
  {
    address: '0xA1...7f6E',
    nickname: null,
    handle: null,
    avatarUrl: null,
  },
  {
    address: '0x8b...A319',
    nickname: 'Defi Llama',
    handle: '@LlamaDefi',
    avatarUrl:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
  },
  {
    address: '0xF0...5Ba7',
    nickname: 'Alpha Chad',
    handle: '@AlphaChad',
    avatarUrl:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100',
  },
];

/** Relative bid-depth per tier, used to split totalBids across the board. */
const TIER_BID_RATIOS = [10, 6, 4, 3, 2.5, 2, 1.5, 1.2, 1, 0.8];

const parseMonAmount = (price: string): number => {
  const n = Number.parseFloat(price.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

function buildBidBoard(auction: KolAuction): { board: Bidder[]; latest: Bidder } {
  const unit = parseMonAmount(auction.bidPrice);
  const totalBids = Math.max(auction.totalBids ?? 0, BIDDER_POOL.length);

  const board: Bidder[] = BIDDER_POOL.map((identity, i) => {
    const bidCount = Math.max(1, Math.round((totalBids * TIER_BID_RATIOS[i]) / TIER_BID_RATIOS[0]));
    return {
      rank: i + 1,
      ...identity,
      totalAmount: (bidCount * unit).toFixed(1),
      bidCount,
    };
  });

  // Rank #1 → highest cumulative bid amount (board is sorted descending).
  board.sort((a, b) => Number(b.totalAmount) - Number(a.totalAmount));
  board.forEach((b, i) => {
    b.rank = i + 1;
  });

  // Per SPEC §6.4 + §6.5: lastBidder is updated by `updateLastBidder(bidder)`
  // for every BidPlaced — it reflects CHRONOLOGICAL order (most recent tx),
  // which does NOT always equal rank #1. For the mock we pick a "live last"
  // by looking at the auction's latest bidder handle / deterministically
  // rotating through the pool so the banner and the #1 rank are visually
  // distinct and the banner's "latest" label is honest.
  const lastIdx =
    typeof auction.totalBids === 'number'
      ? auction.totalBids % BIDDER_POOL.length
      : (BIDDER_POOL.length - 2 + BIDDER_POOL.length) % BIDDER_POOL.length;
  const lastIdentity = BIDDER_POOL[lastIdx];
  const lastBidCount = Math.max(
    1,
    Math.round((totalBids * TIER_BID_RATIOS[lastIdx]) / TIER_BID_RATIOS[0]),
  );
  const latest: Bidder = {
    rank: board.find((b) => b.address === lastIdentity.address)?.rank ?? lastIdx + 1,
    ...lastIdentity,
    totalAmount: (lastBidCount * unit).toFixed(1),
    bidCount: lastBidCount,
  };

  return { board, latest };
}

/* ---------- Lookup across every KOL bundle ---------- */

function findAuctionById(id: string): { auction: KolAuction; profile: KolProfile } | null {
  for (const handle of knownKolHandles) {
    const bundle = getKolAuctionsBundle(handle);
    const auction = [...bundle.ongoing, ...bundle.upcoming, ...bundle.past].find(
      (a) => a.id === id,
    );
    if (auction) {
      const profile = kolProfiles[handle];
      if (profile) return { auction, profile };
    }
  }
  return null;
}

const FULFILLMENT_STATE: Record<KolAuctionStatus, string> = {
  ongoing: 'ACTIVE',
  upcoming: 'SCHEDULED',
  past: 'SETTLED',
};

/**
 * Build the full detail view model for one auction id.
 * @throws {@link AuctionNotFoundError} when the id matches no known auction.
 */
export function buildAuctionDetail(rawId: string): AuctionDetailData {
  const id = rawId.trim();
  const hit = findAuctionById(id);
  if (!hit) throw new AuctionNotFoundError(id);

  const { auction, profile } = hit;
  const { board, latest } = buildBidBoard(auction);

  const kol: AuctionKolWithHandle = {
    nickname: profile.nickname,
    handle: `@${auction.handle}`,
    followers: profile.followers ?? '—',
    holders: profile.holders,
    avatarUrl: profile.avatarUrl,
  };

  const liveStats: AuctionLiveStats = {
    costPerBid: auction.bidPrice,
    totalBids: auction.totalBids ?? 0,
    timeLeft: auction.timeLabel,
  };

  // NFT panel mirrors the KOL profile numbers exactly (supply / staked / price),
  // so the two pages can never disagree again.
  //
  // IMPORTANT: `profile.holders` is a *KOL account-level* metric (follower-scale number),
  // NOT the count of unique addresses holding the KOL's NFT. For the NFT stats panel we
  // must show a unique-NFT-holder count, which is strictly < totalSupplyNfts (you can't
  // have more holder addresses than issued NFTs). Derive it from supply so the ratio is
  // always consistent across KOLs.
  const uniqueNftHolderRatioByKol: Record<string, number> = {
    CryptoChad: 0.62,
    NFTQueen: 0.71,
    DogeFather: 0.48,
    CryptoKing: 0.55,
  };
  const uniqueHolderCount = Math.round(
    profile.market.totalSupplyNfts *
      (uniqueNftHolderRatioByKol[profile.handle] ?? 0.55),
  );
  const nftInfo: NftInfo = {
    name: `${profile.nickname} NFT`,
    floorPrice: profile.market.currentPrice,
    supply: profile.market.totalSupplyNfts.toLocaleString('en-US'),
    staked: profile.market.totalStakedNfts.toLocaleString('en-US'),
    holders: uniqueHolderCount.toLocaleString('en-US'),
    revenueShare: `${profile.dividendPool.ratioBps / 100}% of KOL Revenue`,
    sharedRevenue: formatTokenAmount(profile.dividendPool.pendingThisWeekMon),
    mintPrice: profile.market.currentPrice,
  };

  return {
    id: auction.id,
    status: auction.status,
    kol,
    description: auction.description,
    liveStats,
    bidHistory: board,
    latestBidder: latest,
    // Reuse the profile's own curve preview so the chart shares one algorithm
    // (and one current price) with the profile page.
    floorPriceHistory: profile.curve.map((p) => ({ time: p.t, price: p.price })),
    nftInfo,
    fulfillmentInfo: {
      currentState: FULFILLMENT_STATE[auction.status],
      evidenceRequired: 'Tweet Link & Timestamp',
      disputeWindow: '48 Hours post-settlement',
    },
  };
}
