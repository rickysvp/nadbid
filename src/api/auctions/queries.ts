import { useQuery } from '@tanstack/react-query';
import { buildAuctionDetail } from '@/data/auctionDetail';
import type { AuctionDetailData } from '@/data/auctionDetail';
import { featuredAuction, ongoingAuctions, upcomingAuctions } from '@/data/auctions';
import { platformStats } from '@/data/stats';
import { apiGet, isMockEnabled } from '@/api/httpClient';
import type {
  FeaturedAuction,
  OngoingAuction,
  PlatformStat,
  UpcomingAuction,
} from '@/types';

export type { AuctionDetailData };

/**
 * React Query hooks for auction data.
 * Demo data via `isMockEnabled()` switch; swap branches for real API calls
 * by setting VITE_ENABLE_MOCKS=false in your `.env`.
 */

export function useFeaturedAuction() {
  return useQuery({
    queryKey: ['auctions', 'featured'],
    queryFn: async (): Promise<FeaturedAuction | null> => {
      if (isMockEnabled()) return featuredAuction;
      return apiGet<FeaturedAuction | null>('/auctions/featured');
    },
  });
}

export function useOngoingAuctions() {
  return useQuery({
    queryKey: ['auctions', 'ongoing'],
    queryFn: async (): Promise<OngoingAuction[]> => {
      if (isMockEnabled()) return ongoingAuctions;
      return apiGet<OngoingAuction[]>('/auctions/ongoing');
    },
  });
}

export function useUpcomingAuctions() {
  return useQuery({
    queryKey: ['auctions', 'upcoming'],
    queryFn: async (): Promise<UpcomingAuction[]> => {
      if (isMockEnabled()) return upcomingAuctions;
      return apiGet<UpcomingAuction[]>('/auctions/upcoming');
    },
  });
}

export function usePlatformStats() {
  return useQuery({
    queryKey: ['platform', 'stats'],
    queryFn: async (): Promise<PlatformStat[]> => {
      if (isMockEnabled()) return platformStats;
      return apiGet<PlatformStat[]>('/platform/stats');
    },
  });
}

export function useAuctionDetail(id: string) {
  return useQuery({
    queryKey: ['auctions', 'detail', id],
    queryFn: async (): Promise<AuctionDetailData> => {
      if (isMockEnabled()) return buildAuctionDetail(id);
      return apiGet<AuctionDetailData>(`/auctions/${id}`);
    },
  });
}
