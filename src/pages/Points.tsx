import { Link } from 'react-router-dom';

/** Points 占位页 - 等待业务接入时显示。 */
export default function Points() {
  return (
    <main className="flex-grow flex flex-col items-center justify-center pb-20 pt-12 px-container-padding">
      <div className="w-full max-w-md bg-white border-3 border-black rounded-2xl shadow-neo-xl p-8 flex flex-col items-center text-center relative overflow-hidden">
        <span className="font-mono text-7xl font-black text-tertiary mb-4 relative z-10">POINTS</span>
        <h1 className="font-display text-3xl font-black text-black mb-2 relative z-10">Points &amp; Loyalty</h1>
        <p className="font-body text-base text-on-surface-variant font-bold mb-8 leading-relaxed relative z-10">
          Coming soon. Track your bidding points, loyalty tiers and unlock perks.
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
