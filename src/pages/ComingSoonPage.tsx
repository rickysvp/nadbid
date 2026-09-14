import { Link } from 'react-router-dom';
import { ArrowRight, Lock } from 'lucide-react';
import { ROUTES } from '../config/routes';

export interface ComingSoonProps {
  /** 页面标题 */
  title: string;
  /** 一句话说明 */
  tagline: string;
  /** 规划中的能力列表 */
  features: string[];
  /** 状态说明 */
  note?: string;
}

/**
 * 通用占位页 — Staking / Claim / Referral
 * 标注 Coming soon 与产品规划，避免用户误以为权益已上线
 */
export default function ComingSoonPage({ title, tagline, features, note }: ComingSoonProps) {
  return (
    <div className="mx-auto max-w-3xl px-6 pt-28 pb-24 text-[#111]">
      <div className="nb-card p-8 md:p-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border-2 border-[#111] bg-[#ffe94a] shadow-[3px_3px_0_#111]">
          <Lock className="h-6 w-6" />
        </div>

        <div className="mt-6 inline-flex">
          <span className="nb-sticker bg-[#ff4d4f] px-3 py-1 text-[11px] font-black text-[#fffdf7]">COMING SOON</span>
        </div>

        <h1 className="mt-5 text-4xl md:text-5xl font-black tracking-tighter">{title}</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[#111]/60">{tagline}</p>

        <div className="mx-auto mt-8 max-w-md text-left">
          <div className="text-xs font-black uppercase tracking-[0.2em] text-[#117a3d]">Planned</div>
          <ul className="mt-3 space-y-2.5">
            {features.map((f) => (
              <li key={f} className="nb-card-flat flex items-center gap-3 px-4 py-3 text-sm font-bold">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#3ec470]" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {note && <p className="mt-8 text-xs text-[#111]/40">{note}</p>}

        <Link
          to={ROUTES.NADBID}
          className="mt-9 inline-flex items-center gap-2 rounded-xl border-2 border-[#111] bg-[#3ec470] px-7 py-3.5 font-black text-[#111] shadow-[4px_4px_0_#111] transition hover:bg-[#4ade80] hover:shadow-[6px_6px_0_#111] hover:-translate-y-0.5"
        >
          Back to auctions
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
