import { useEffect, useState } from 'react';
import { ArrowRightLeft, CalendarClock, Coins, Gift, Trophy } from 'lucide-react';
import type { DividendPoolInfo } from '@/types';
import { DIVIDEND_POOL } from '@/constants/app';
import { formatCountdown, formatTokenAmount, roundMon } from '@/utils/format';

/** 每 1s 刷新倒计时（避免整个页面重渲染，只局部刷新 countdown 字符串）。 */
function useLiveCountdown(targetUtcMs: number): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return formatCountdown(targetUtcMs, now);
}

interface DividendPoolCardProps {
  handle: string;
  dividendPool: DividendPoolInfo;
}

/** Dividend Pool 详情卡，放置在 Mint/Burn 模块下方。 */
export default function DividendPoolCard({ handle, dividendPool }: DividendPoolCardProps) {
  const ratioPct = roundMon((dividendPool.ratioBps / DIVIDEND_POOL.BPS) * 100, 2);
  const countdownStr = useLiveCountdown(dividendPool.nextSettlementAtUtcMs);

  return (
    <section className="relative rounded-2xl border-3 border-black shadow-neo-xl overflow-hidden bg-surface-container-low grid-bg">
      {/* Decorative blobs (§7.2) — flat opaque colors, no gradient */}
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-secondary opacity-20 pointer-events-none" aria-hidden />
      <div className="absolute -bottom-24 -left-10 w-64 h-64 rounded-full bg-tertiary opacity-25 pointer-events-none" aria-hidden />
      <div className="px-5 md:px-7 pt-5 md:pt-6 pb-5 flex flex-col gap-4 md:gap-5 relative z-10">
        {/* Row 1：左 Pool label · 右 倒计时大 Pill（两块并排不堆内联） */}
        <div className="flex flex-wrap items-center justify-between gap-3 md:gap-5">
          <div className="inline-flex items-center gap-2 font-mono text-[11px] md:text-xs uppercase font-black border-2 border-black px-3.5 py-1.5 bg-black text-white rounded-full shadow-neo-sm">
            <Coins className="w-4 h-4 text-secondary" /> Dividend Pool · @{handle}
          </div>
          <div className="inline-flex items-center gap-3 md:gap-4 rounded-2xl border-2 border-black bg-white shadow-neo-md px-4 md:px-6 py-3.5">
            <CalendarClock className="w-5 h-5 md:w-6 md:h-6 text-primary shrink-0" strokeWidth={2.2} />
            <div className="min-w-0 text-right">
              <div className="font-mono text-[10px] uppercase font-black text-black/55 leading-none tracking-widest">
                Next settlement · Sunday 00:00 UTC
              </div>
              <div className="font-display font-black text-2xl md:text-3xl text-black leading-tight mt-1.5 tabular-nums">
                {countdownStr}
              </div>
            </div>
          </div>
        </div>

        {/* Row 2：三句短说明（小屏单列 md 三列），替代长段文 */}
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 text-[13px] md:text-sm font-body">
          <li className="flex items-start gap-2.5 bg-white/90 border-2 border-black/10 rounded-2xl px-3.5 py-3 shadow-sm">
            <span className="shrink-0 inline-flex w-7 h-7 items-center justify-center rounded-full bg-primary text-black font-mono text-[11px] font-black shadow-neo-sm">
              ①
            </span>
            <p className="text-black/80 leading-snug">
              拍卖完成后，<strong className="text-black">KOL 收入 {ratioPct}%</strong> 划入此池
            </p>
          </li>
          <li className="flex items-start gap-2.5 bg-white/90 border-2 border-black/10 rounded-2xl px-3.5 py-3 shadow-sm">
            <span className="shrink-0 inline-flex w-7 h-7 items-center justify-center rounded-full bg-secondary text-black font-mono text-[11px] font-black shadow-neo-sm">
              ②
            </span>
            <p className="text-black/80 leading-snug">
              <strong className="text-black">每周日 00:00 UTC</strong> 快照，按{' '}
              <strong>STAKE_ACTIVE</strong> 数量等分
            </p>
          </li>
          <li className="flex items-start gap-2.5 bg-white/90 border-2 border-black/10 rounded-2xl px-3.5 py-3 shadow-sm">
            <span className="shrink-0 inline-flex w-7 h-7 items-center justify-center rounded-full bg-tertiary text-black font-mono text-[11px] font-black shadow-neo-sm">
              ③
            </span>
            <p className="text-black/80 leading-snug">
              池独立于铸造曲线，<strong className="text-black">互不影响 互不占用</strong>
            </p>
          </li>
        </ul>
      </div>

      {/* 三格数值：小屏 2 列堆叠 R% 单独占一行，中屏起 3 列并排；间距 md:gap-5 不挤 */}
      <div className="mx-4 md:mx-6 mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
        <div className="rounded-2xl border-2 border-black bg-white p-4 shadow-neo-sm">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="font-mono text-[10px] uppercase font-black text-black/60 leading-none tracking-widest">
              Pending this week
            </span>
          </div>
          <div className="font-display font-black text-3xl text-black leading-tight">
            {formatTokenAmount(dividendPool.pendingThisWeekMon)}
          </div>
          <div className="font-mono text-[11px] text-black/55 mt-1">
            Still accruing · snapshot at settlement
          </div>
        </div>

        <div className="rounded-2xl border-2 border-black bg-white p-4 shadow-neo-sm">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRightLeft className="w-4 h-4 text-secondary" />
            <span className="font-mono text-[10px] uppercase font-black text-black/60 leading-none tracking-widest">
              Last settled
            </span>
          </div>
          <div className="font-display font-black text-3xl text-black leading-tight">
            {formatTokenAmount(dividendPool.lastSettledMon)}
          </div>
          <div className="font-mono text-[11px] text-black/55 mt-1">
            Claimable now · Pull Claim via contract
          </div>
        </div>

        <div className="rounded-2xl border-2 border-black bg-[#1a1a1a] text-white p-4 shadow-neo-sm">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-4 h-4 text-tertiary" />
            <span className="font-mono text-[10px] uppercase font-black text-white/65 leading-none tracking-widest">
              Pool share ratio (R%)
            </span>
          </div>
          <div className="font-display font-black text-3xl leading-tight">{ratioPct}%</div>
          <div className="font-mono text-[11px] text-white/60 mt-1 leading-snug">
            From KOL 80% income · mint curve is 100% independent
          </div>
        </div>
      </div>
    </section>
  );
}