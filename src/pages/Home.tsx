import { AlertCircle, Gavel } from 'lucide-react';
import { Link } from 'react-router-dom';
import FeaturedAuction from '@/components/FeaturedAuction';
import OngoingAuctionsList from '@/components/OngoingAuctionsList';
import StatsDashboard from '@/components/StatsDashboard';
import UpcomingAuctions from '@/components/UpcomingAuctions';
import {
  useFeaturedAuction,
  useOngoingAuctions,
  usePlatformStats,
  useUpcomingAuctions,
} from '@/api';

export default function Home() {
  const {
    data: featured,
    isLoading: featuredLoading,
    isError: featuredError,
  } = useFeaturedAuction();
  const { data: stats, isLoading: statsLoading, isError: statsError } = usePlatformStats();
  const { data: ongoing, isLoading: ongoingLoading, isError: ongoingError } = useOngoingAuctions();
  const {
    data: upcoming,
    isLoading: upcomingLoading,
    isError: upcomingError,
  } = useUpcomingAuctions();

  const loading = featuredLoading || statsLoading || ongoingLoading || upcomingLoading;
  const hasError = featuredError || statsError || ongoingError || upcomingError;

  if (loading) {
    return (
      <main className="flex-grow flex items-center justify-center py-20">
        <div className="font-mono text-primary font-black text-xl animate-pulse">
          Loading auctions…
        </div>
      </main>
    );
  }

  // featured 为 null（当前无 live 拍卖）或列表为空数组都是合法状态，只有查询失败才走错误页。
  if (hasError || !stats || !ongoing || !upcoming) {
    return (
      <main className="flex-grow flex items-center justify-center py-20 px-container-padding">
        <div className="bg-white border-3 border-black rounded-2xl p-8 shadow-neo-lg max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-error mx-auto mb-3" />
          <h2 className="font-display text-2xl font-black mb-2">Failed to load</h2>
          <p className="font-body text-on-surface-variant mb-6">
            Couldn&apos;t load the auction list. Try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-primary text-on-primary px-6 py-3 rounded-full font-mono font-bold uppercase text-sm border-2 border-black shadow-neo-md btn-hover"
          >
            Reload
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-grow flex flex-col gap-16 pb-20 pt-8">
      <section className="w-full px-container-padding max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 lg:items-stretch">
        <div className="w-full lg:w-[68%] flex">
          {featured ? (
            <FeaturedAuction auction={featured} />
          ) : (
            <div className="w-full flex flex-col items-center justify-center gap-4 bg-surface-container-lowest rounded-[2.5rem] border-3 border-black shadow-neo-lg p-12 text-center">
              <Gavel className="w-12 h-12 text-primary" />
              <h2 className="font-display text-3xl font-black text-black">
                No featured auction right now
              </h2>
              <p className="font-body text-lg font-bold text-on-surface-variant max-w-md leading-relaxed">
                The floor is quiet — browse the directory and back your favorite KOL before their
                next drop goes live.
              </p>
              <Link
                to="/kols"
                className="bg-primary text-white px-8 py-3.5 rounded-full font-display font-black text-lg uppercase btn-hover border-3 border-black shadow-neo-md"
              >
                Browse KOLs
              </Link>
            </div>
          )}
        </div>
        <div className="w-full lg:w-[32%] flex">
          <StatsDashboard stats={stats} />
        </div>
      </section>
      <OngoingAuctionsList auctions={ongoing} />
      <UpcomingAuctions auctions={upcoming} />
    </main>
  );
}
