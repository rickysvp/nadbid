import { useQuery } from '@tanstack/react-query';
import { apiGet, isMockEnabled } from '@/api/httpClient';
import { kolProfiles } from '@/data/kolProfiles';
import type { KolProfile } from '@/types';

export class KolNotFoundError extends Error {
  constructor(public handle: string) {
    super(`KOL @${handle} not found`);
    this.name = 'KolNotFoundError';
  }
}

export function useKolProfile(handle: string) {
  return useQuery({
    queryKey: ['kol', 'profile', handle],
    retry: false,
    queryFn: async (): Promise<KolProfile> => {
      if (isMockEnabled()) {
        const profile = kolProfiles[handle];
        if (!profile) throw new KolNotFoundError(handle);
        return profile;
      }
      return apiGet<KolProfile>(`/kols/${encodeURIComponent(handle)}`);
    },
  });
}
