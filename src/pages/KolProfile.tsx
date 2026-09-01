import { useCallback, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProfileHeaderCard from '@/components/kol-profile/ProfileHeaderCard';
import MintBurnPanel from '@/components/kol-profile/MintBurnPanel';
import DividendPoolCard from '@/components/kol-profile/DividendPoolCard';
import ActiveAuctionEntry from '@/components/kol-profile/ActiveAuctionEntry';
import KolRecords from '@/components/kol-profile/KolRecords';
import { KolNotFoundError, useKolAuctions, useKolProfile } from '@/api';
import type { NftTrade, NftTradeKind } from '@/types';
import { useWalletStore } from '@/stores';

export default function KolProfile() {
  const { handle = '' } = useParams<{ handle: string }>();
  const { data: profile, isLoading, error } = useKolProfile(handle);
  const { data: auctionsBundle } = useKolAuctions(handle);
  const [prepended, setPrepended] = useState<NftTrade[]>([]);
  const walletAddress = useWalletStore((s) => s.address);
  const recordsRef = useRef<HTMLDivElement | null>(null);

  const scrollToRecords = useCallback(() => {
    if (recordsRef.current) {
      recordsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  /**
   * Mint/Burn 乐观交易追加。
   * 注：MintBurnPanel 回调签名为 (kind, qty, amount)，amount 带正负号由组件侧决定；
   * 这里只做展示目的，直接落活动列表即可。
   */
  const handleTrade = useCallback(
    (kind: NftTradeKind, quantity: number, signedAmount: number) => {
      const short = walletAddress
        ? walletAddress.replace(/^(.{6}).*(.{3})$/, '$1…$2')
        : '0xYOU…001';
      const newTx: NftTrade = {
        id: `tx-opt-${kind}-${Date.now()}`,
        kind,
        nftQuantity: quantity,
        address: short,
        // MintBurnPanel 传 signedAmount: mint 为负（支出），burn 为正（收入）
        amountDelta: signedAmount,
        timestamp: new Date().toISOString(),
      };
      setPrepended((prev) => [newTx, ...prev].slice(0, 20));
    },
    [walletAddress],
  );

  if (isLoading) {
    return (
      <main className="flex-grow flex items-center justify-center py-20">
        <div className="font-mono text-black font-black text-xl animate-pulse">Loading KOL…</div>
      </main>
    );
  }

  const notFound = error instanceof KolNotFoundError;
  if (!profile || error) {
    return (
      <main className="flex-grow flex items-center justify-center py-20 px-container-padding">
        <div className="bg-white border-3 border-black rounded-2xl shadow-neo-xl p-8 max-w-md text-center relative overflow-hidden">
          <AlertCircle className="w-14 h-14 text-error mx-auto mb-3 relative z-10" />
          <h1 className="font-display text-3xl font-black text-black mb-2 relative z-10">
            {notFound ? 'KOL not found' : 'Could not load profile'}
          </h1>
          <p className="font-body text-base text-on-surface-variant font-bold mb-8 leading-relaxed relative z-10">
            {notFound
              ? `@${handle} hasn't joined nadbid yet — check the handle or browse the directory.`
              : 'Something went wrong loading the profile. Try again shortly.'}
          </p>
          <Link
            to="/kols"
            className="inline-flex items-center gap-2 bg-primary text-black px-6 py-3 rounded-full font-mono font-black text-sm uppercase tracking-wider btn-hover border-2 border-black shadow-neo-md relative z-10"
          >
            <ArrowLeft className="w-4 h-4" /> Back to KOL Directory
          </Link>
        </div>
      </main>
    );
  }

  const bundle = auctionsBundle ?? ({ handle, upcoming: [], ongoing: [], past: [] } as const);

  return (
    <main className="flex-grow pb-20 pt-6">
      <div className="w-full px-container-padding max-w-7xl mx-auto flex flex-col gap-6 xl:gap-7">
        {/* 顶部显眼拍卖入口：有 LIVE / UPCOMING 拍卖才展示 */}
        <ActiveAuctionEntry bundle={bundle} />

        <div className="flex flex-col xl:flex-row gap-6 xl:gap-8">
          {/* Left column */}
          <div className="w-full xl:w-[32%] shrink-0 xl:sticky xl:top-[108px] xl:self-start">
            <ProfileHeaderCard profile={profile} onJumpToRecords={scrollToRecords} />
          </div>

          {/* Right column: Mint/Burn (top) · Dividend Pool (below MINT) · Records (bottom) */}
          <div className="w-full xl:w-[68%] flex flex-col gap-6 xl:gap-7">
            <MintBurnPanel profile={profile} onTrade={handleTrade} />
            <DividendPoolCard handle={handle} dividendPool={profile.dividendPool} />
            <div ref={recordsRef}>
              <KolRecords handle={handle} profile={profile} bundle={bundle} prependedActivity={prepended} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}