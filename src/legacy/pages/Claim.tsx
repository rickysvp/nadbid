import { Link } from 'react-router-dom';

/** Claim 占位页 - 等待业务接入时显示。 */
export default function Claim() {
  return (
    <main className="flex-grow flex flex-col items-center justify-center pb-20 pt-12 px-container-padding">
      <div className="w-full max-w-md bg-white border-3 border-black rounded-2xl shadow-neo-xl p-8 flex flex-col items-center text-center relative overflow-hidden">
        <span className="font-mono text-7xl font-black text-secondary mb-4 relative z-10">CLAIM</span>
        <h1 className="font-display text-3xl font-black text-black mb-2 relative z-10">Claim Rewards</h1>
        <p className="font-body text-base text-on-surface-variant font-bold mb-8 leading-relaxed relative z-10">
          Coming soon. Claim your accrued dividend tokens and auction winnings here.
        </p>
        <Link
          to="/"
          className="bg-primary text-black px-8 py-3 rounded-full font-mono font-black text-sm uppercase tracking-wider btn-hover border-2 border-black shadow-neo-sm relative z-10"
        >
          Back to Auctions
        </Link>
      </div>
    </main>
  );
}
