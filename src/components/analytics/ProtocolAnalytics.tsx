// src/components/analytics/ProtocolAnalytics.tsx
// 链上行为分析条 — 读取 /api/analytics/overview（本地索引器 / Vercel serverless 共用）
// 展示协议级指标：拍卖总数、已结算、总池、协议费、均价、活跃出价者。
import { useEffect, useState } from 'react';

interface OverviewResp {
  synced: boolean;
  lastSyncAt: string;
  lastBlock: number;
  overview: {
    totalAuctions: number;
    liveAuctions: number;
    settledAuctions: number;
    cancelledAuctions: number;
    totalBids: number;
    activeBidders: number;
    totalSellers: number;
    totalPool: string;
    totalProtocolFees: string;
    avgFinalPrice: string;
    totalRefunded: string;
    totalRewards: string;
  } | null;
}

function fmt(v: string | undefined): string {
  if (!v) return '0';
  const n = Number(v);
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toFixed(2);
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">{label}</div>
      <div className="mt-1 truncate text-lg font-black text-white">{value}</div>
      {hint ? <div className="mt-0.5 text-[10px] text-[#ccff00]">{hint}</div> : null}
    </div>
  );
}

export default function ProtocolAnalytics() {
  const [resp, setResp] = useState<OverviewResp | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/analytics/overview')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: OverviewResp) => alive && setResp(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  if (failed) {
    return (
      <div className="nb-card border border-white/15 bg-white/5 px-4 py-3 text-xs text-white/50">
        Analytics API unavailable — start indexer service locally or deploy with synced data.
      </div>
    );
  }

  if (!resp) {
    return <div className="nb-card border border-white/15 bg-white/5 px-4 py-3 text-xs text-white/40">Loading chain analytics…</div>;
  }

  if (!resp.synced || !resp.overview) {
    return (
      <div className="nb-card border border-white/15 bg-white/5 px-4 py-3 text-xs text-white/50">
        Indexer not synced yet — run{' '}
        <code className="rounded bg-[#111]/60 px-1.5 py-0.5 font-mono text-[#ccff00]">npx tsx server/indexer-cli.ts</code> to
        build the local index.
      </div>
    );
  }

  const o = resp.overview;
  return (
    <div className="nb-card border border-white/15 bg-white/5 px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white/60">
          <span className={`h-2 w-2 rounded-full ${resp.synced ? 'bg-[#ccff00]' : 'bg-[#111]/30'}`} />
          Chain Analytics
        </div>
        <div className="text-[10px] text-white/35">
          {o.totalAuctions} auctions indexed · synced {resp.lastSyncAt.slice(0, 10)}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-x-4 gap-y-5 md:grid-cols-6">
        <Metric label="Auctions" value={String(o.totalAuctions)} />
        <Metric label="Settled" value={String(o.settledAuctions)} />
        <Metric label="Pooled" value={`${fmt(o.totalPool)} MON`} />
        <Metric label="Protocol fee" value={`${fmt(o.totalProtocolFees)} MON`} hint="5% of pool" />
        <Metric label="Avg final" value={`${fmt(o.avgFinalPrice)} MON`} />
        {/* 出价明细依赖事件索引；状态扫描模式为 0 时显示占位 */}
        <Metric label="Bidders" value={o.totalBids > 0 ? String(o.activeBidders) : '—'} hint={o.totalBids > 0 ? undefined : 'event index'} />
      </div>
    </div>
  );
}
