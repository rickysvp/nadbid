import { Link, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Gavel } from 'lucide-react';
import AuctionRulesPanel from '@/components/auction-detail/AuctionRulesPanel';
import AuctionSummaryCard from '@/components/auction-detail/AuctionSummaryCard';
import BidBoard from '@/components/auction-detail/BidBoard';
import FulfillmentStatus from '@/components/auction-detail/FulfillmentStatus';
import LatestBidderBanner from '@/components/auction-detail/LatestBidderBanner';
import NftPanel from '@/components/auction-detail/NftPanel';
import { useAuctionDetail } from '@/api';
import { useUiStore } from '@/stores';

export default function AuctionDetail() {
  const { id } = useParams<{ id: string }>();
  const pushToast = useUiStore((s) => s.pushToast);
  const { data, isLoading, isError } = useAuctionDetail(id ?? '');

  if (isLoading) {
    return (
      <main className="flex-grow flex items-center justify-center py-20">
        <div className="font-mono text-black font-black text-xl animate-pulse">
          Loading auction…
        </div>
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="flex-grow flex items-center justify-center py-20 px-container-padding">
        <div className="bg-white border-3 border-black rounded-2xl p-8 shadow-neo-lg max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-error mx-auto mb-3" />
          <h2 className="font-display text-2xl font-black mb-2">Auction not found</h2>
          <p className="font-body text-on-surface-variant mb-6">
            The auction you&apos;re looking for doesn&apos;t exist or has ended.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full font-mono font-black text-sm uppercase tracking-wider btn-hover border-2 border-black shadow-neo-md"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
            <Link
              to="/kols"
              className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-mono font-black text-sm uppercase tracking-wider btn-hover border-2 border-black shadow-neo-md"
            >
              <Gavel className="w-4 h-4" /> Browse KOLs
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const {
    kol,
    description,
    liveStats,
    bidHistory,
    latestBidder,
    floorPriceHistory,
    nftInfo,
    fulfillmentInfo,
  } = data;

  return (
    <main className="flex-grow flex flex-col gap-6 pb-20 pt-6">
      <section className="w-full px-container-padding max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-[60%] flex flex-col gap-6">
          <AuctionSummaryCard
            kol={kol}
            description={description}
            liveStats={liveStats}
            status={data.status}
            onPlaceBid={() =>
              pushToast({
                kind: 'info',
                title: 'Bidding not wired yet',
                description: 'This demo triggers a toast; hook up placeBid() mutation later.',
              })
            }
          />
          <LatestBidderBanner bidder={latestBidder} />
          <BidBoard bidders={bidHistory} />
        </div>

        <div className="w-full lg:w-[40%] flex flex-col gap-6">
          <NftPanel
            info={nftInfo}
            floorPriceHistory={floorPriceHistory}
            onMintClick={() =>
              pushToast({
                kind: 'info',
                title: 'Minting not wired yet',
                description:
                  'This demo triggers a toast; connect the mint flow to the contract later.',
              })
            }
          />
          <FulfillmentStatus info={fulfillmentInfo} />
          <AuctionRulesPanel />
        </div>
      </section>
    </main>
  );
}
