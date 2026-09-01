import type { PlatformStat } from '@/types';

/** Mock platform-level stats shown in the home page dashboard column. */
export const platformStats: PlatformStat[] = [
  { id: 'totalVolume', label: 'Total Volume', value: '2.4M $MON', change: '+12.5%' },
  { id: 'totalDividends', label: 'Total Dividends', value: '450K $MON', change: '+8.2%' },
  { id: 'activeBidders', label: 'Active Bidders', value: '1,204', change: '+54 this week' },
];
