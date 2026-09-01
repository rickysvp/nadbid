import { useQuery } from '@tanstack/react-query';
import { apiGet, isMockEnabled } from '@/api/httpClient';
import { getKolAuctionsBundle } from '@/data/kolAuctions';
import type { KolAuctionsBundle } from '@/types';
import { normalizeKolHandle } from '@/utils/format';

export function useKolAuctions(rawHandle: string) {
  const handle = normalizeKolHandle(rawHandle);
  return useQuery({
    queryKey: ['kol', 'auctions', handle],
    retry: false,
    queryFn: async (): Promise<KolAuctionsBundle> => {
      if (isMockEnabled()) return getKolAuctionsBundle(handle);
      return apiGet<KolAuctionsBundle>(`/kols/${encodeURIComponent(handle)}/auctions`);
    },
  });
}
