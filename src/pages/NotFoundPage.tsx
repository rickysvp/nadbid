import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ROUTES } from '../config/routes';

/** 404 页面 — 粗野风大字报 + 返回入口 */
export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 pt-28 pb-24 text-center text-[#111]">
      <div className="nb-card p-10 md:p-16">
        <div className="inline-flex">
          <span className="nb-sticker bg-[#ff4d4f] px-3 py-1 text-[11px] font-black text-[#fffdf7]">ERROR 404</span>
        </div>

        <h1 className="mt-6 text-7xl md:text-9xl font-black tracking-tighter leading-none">404</h1>

        <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-[#111]/60">
          This page doesn&apos;t exist on-chain or off-chain. The block was mined, but the route wasn&apos;t.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to={ROUTES.HOME}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-[#111] bg-[#8b5cf6] px-7 py-3.5 font-black text-white shadow-[4px_4px_0_#111] transition hover:bg-[#a78bfa] hover:shadow-[6px_6px_0_#111] hover:-translate-y-0.5"
          >
            Back to home
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to={ROUTES.NADBID}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-[#111] bg-[#ffe94a] px-7 py-3.5 font-black text-[#111] shadow-[4px_4px_0_#111] transition hover:bg-[#fff2a8] hover:shadow-[6px_6px_0_#111] hover:-translate-y-0.5"
          >
            Browse auctions
          </Link>
        </div>
      </div>
    </div>
  );
}
