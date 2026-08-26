import { ArrowUpRight, BookOpen, Clock3, Coins, Gavel, ShieldAlert, Wallet } from 'lucide-react';

/**
 * Auction rules summary. Content is a faithful abridged view of SPEC §6-§10.
 * The full authoritative document lives in the repo (spec/nadbid-SPEC-v2.4.md);
 * the CTA button deep-links into the DOCS site at the auction-rules anchor.
 */
const RULES: Array<{
  icon: typeof Gavel;
  label: string;
  body: string;
  accent: string;
}> = [
  {
    icon: Wallet,
    label: 'Who can bid',
    body: 'You must hold ≥1 FREE_HOLD NFT for this KOL. Staking / unstaking pending NFTs do NOT count toward bidding eligibility.',
    accent: 'text-black bg-white/60',
  },
  {
    icon: Coins,
    label: 'Bid amount',
    body: 'Every bid costs the same fixed price (X) within one auction. X ≥ 100 $MON. Gas is paid by the bidder.',
    accent: 'text-secondary bg-white/60',
  },
  {
    icon: Clock3,
    label: 'Anti-sniper',
    body: 'Every valid bid extends the countdown by 60 seconds. Even same-block bids all count; only the last tx becomes “last bidder”.',
    accent: 'text-black bg-white/60',
  },
  {
    icon: Gavel,
    label: 'Settlement split',
    body: 'After countdown ends: 20% platform fee, 80% locked as guarantee pool (KOL payout + staker dividends). Funds are only released after COMPLETED / BREACHED.',
    accent: 'text-primary bg-white/60',
  },
  {
    icon: ShieldAlert,
    label: 'Performance / dispute',
    body: 'KOL has 48h to submit qualified evidence (tweet URL + publish time + content hash). Winner confirm / Admin audit / 72h auto-confirm. 48h no-evidence → BREACHED and 80% refunded.',
    accent: 'text-black bg-white/60',
  },
];

export default function AuctionRulesPanel() {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 border-3 border-black shadow-neo-md">
      <div className="flex items-start justify-between gap-4 mb-4">
        <h3 className="font-display text-xl font-black flex items-center gap-2 text-black">
          <BookOpen className="w-5 h-5 text-black" /> Auction Rules
        </h3>
        <a
          href="/docs#auction-rules"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] md:text-xs font-black uppercase tracking-wider text-primary hover:text-black transition-colors shrink-0"
        >
          Open full docs
          <ArrowUpRight className="w-3.5 h-3.5 md:w-4 md:h-4" strokeWidth={2.5} />
        </a>
      </div>

      <p className="font-mono text-[10px] md:text-xs font-bold text-on-surface-variant uppercase leading-relaxed mb-5">
        Short version — SPEC §6 → §10 · Click above for the authoritative rules.
      </p>

      <ul className="flex flex-col divide-y-2 divide-black/10 border-2 border-black/10 rounded-xl overflow-hidden">
        {RULES.map((rule) => {
          const Icon = rule.icon;
          return (
            <li key={rule.label} className="flex gap-3 md:gap-4 p-3 md:p-4 bg-white/40">
              <div
                className={`shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-lg border-2 border-black shadow-neo-sm flex items-center justify-center ${rule.accent}`}
              >
                <Icon className="w-4.5 h-4.5 md:w-5 md:h-5" strokeWidth={2.25} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-mono text-[10px] md:text-xs font-black uppercase tracking-wider text-black mb-1">
                  {rule.label}
                </span>
                <span className="font-body text-sm md:text-base font-bold text-black/80 leading-relaxed">
                  {rule.body}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <a
        href="/docs#auction-rules"
        className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-primary text-black px-6 py-3 rounded-lg font-display font-black text-base md:text-lg btn-hover active:scale-95 border-2 border-black shadow-neo-lg"
      >
        <BookOpen className="w-5 h-5" strokeWidth={2.25} />
        Read full auction rules
        <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
      </a>
    </div>
  );
}
