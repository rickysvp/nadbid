import { Link } from 'react-router-dom';

/** Catch-all page for unknown routes. */
export default function NotFound() {
  return (
    <main className="flex-grow flex flex-col items-center justify-center pb-20 pt-12 px-container-padding">
      <div className="w-full max-w-md bg-white border-3 border-black rounded-3xl shadow-neo-xl p-8 flex flex-col items-center text-center">
        <span className="font-mono text-7xl font-black text-primary mb-4">404</span>
        <h1 className="font-display text-3xl font-black text-black mb-2">Page Not Found</h1>
        <p className="font-body text-base text-on-surface-variant font-bold mb-8 leading-relaxed">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          to="/"
          className="bg-primary text-on-primary px-8 py-3 rounded-full font-mono font-black text-sm uppercase tracking-wider btn-hover border-2 border-black shadow-neo-sm"
        >
          Back to Auctions
        </Link>
      </div>
    </main>
  );
}
