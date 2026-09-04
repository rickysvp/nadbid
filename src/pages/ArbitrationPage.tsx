import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Scale, ArrowLeft, ShieldCheck, Gavel } from 'lucide-react';
import { useAccount, usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { shortenAddress } from '../utils/format';
import { contractAddresses, registryAbi, kolAuctionAbi } from '../web3/contracts';
import { useAuction } from '../web3/hooks/useAuction';
import { useToast } from '../hooks/useToast';
import { auctionDetailPath } from '../config/routes';

const MAX_REGISTRY_INDEX = 20;

interface DisputedAuction {
  address: `0x${string}`;
  kol: `0x${string}`;
  content: string;
  winner: `0x${string}`;
  winnerTotalSpent: bigint;
  totalVolume: bigint;
  evidenceHash: `0x${string}`;
  fulfillmentTime: bigint;
}

function formatMonWei(value: bigint | undefined): string {
  if (value === undefined) return '0.00';
  const s = formatUnits(value, 18);
  const dot = s.indexOf('.');
  const intPart = dot === -1 ? s : s.slice(0, dot);
  const decPart = dot === -1 ? '' : s.slice(dot + 1);
  return `${intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${decPart.padEnd(2, '0').slice(0, 2)}`;
}

/** 链上争议仲裁页 — 枚举 Registry 中所有 KOL 的拍卖，列出 DISPUTED 状态；仲裁者可裁定 */
export default function ArbitrationPage() {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  // Registry.arbitrator 读取（前端可读，不做鉴权——链上 resolveDispute 才是最终防线）
  const [arbitrator, setArbitrator] = useState<`0x${string}` | undefined>(undefined);
  const [disputed, setDisputed] = useState<DisputedAuction[] | undefined>(undefined);
  const [scanning, setScanning] = useState(true);

  const isArbitrator = !!address && arbitrator !== undefined && address.toLowerCase() === arbitrator.toLowerCase();

  useEffect(() => {
    const registry = contractAddresses.registry;
    if (!registry || !publicClient) return;
    publicClient
      .readContract({
        address: registry,
        abi: registryAbi,
        functionName: 'arbitrator',
      })
      .then((a) => setArbitrator(a as `0x${string}`))
      .catch(() => setArbitrator(undefined));
  }, [publicClient]);

  // 枚举 Registry 前 MAX_REGISTRY_INDEX 个 KOL → auctionContracts → DISPUTED 拍卖
  useEffect(() => {
    const registry = contractAddresses.registry;
    if (!registry || !publicClient) return;
    let cancelled = false;
    setScanning(true);
    (async () => {
      try {
        const auctions: DisputedAuction[] = [];
        for (let i = 0; i < MAX_REGISTRY_INDEX; i++) {
          const kolAddr = await publicClient.readContract({
            address: registry,
            abi: registryAbi,
            functionName: 'kolList',
            args: [BigInt(i)],
          });
          if (kolAddr === '0x0000000000000000000000000000000000000000') break;
          const kol = (await publicClient.readContract({
            address: registry,
            abi: registryAbi,
            functionName: 'getKol',
            args: [kolAddr],
          })) as unknown as { auctionContracts: readonly `0x${string}`[] };
          const auctionContracts = [...kol.auctionContracts];
          for (const auctionAddr of auctionContracts) {
            const a = await publicClient.readContract({
              address: auctionAddr,
              abi: kolAuctionAbi,
              functionName: 'getAuction',
            });
            const data = a as unknown as {
              status: number;
              kol: `0x${string}`;
              content: string;
              winner: `0x${string}`;
              winnerTotalSpent: bigint;
              totalVolume: bigint;
              evidenceHash: `0x${string}`;
              fulfillmentTime: bigint;
            };
            if (data.status === 4) {
              auctions.push({
                address: auctionAddr,
                kol: data.kol,
                content: data.content,
                winner: data.winner,
                winnerTotalSpent: data.winnerTotalSpent,
                totalVolume: data.totalVolume,
                evidenceHash: data.evidenceHash,
                fulfillmentTime: data.fulfillmentTime,
              });
            }
          }
        }
        if (!cancelled) setDisputed(auctions);
      } catch {
        if (!cancelled) setDisputed([]);
      } finally {
        if (!cancelled) setScanning(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicClient]);

  const renderRows = useMemo(() => disputed ?? [], [disputed]);

  return (
    <div className="min-h-screen bg-transparent pt-32 pb-24 font-sans text-white relative">
      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        <Link to="/" className="flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors font-bold text-sm tracking-wide">
          <ArrowLeft className="w-4 h-4" /> BACK
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-[#0f0f0f] border border-white/[0.06] flex items-center justify-center">
            <Scale className="w-5 h-5 text-[#3ec470]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Arbitration</h1>
            <p className="text-white/40 text-[11px] font-bold tracking-[0.15em] uppercase">
              On-chain dispute resolution · Registry arbitrator
            </p>
          </div>
          {arbitrator !== undefined && (
            <div className="ml-auto flex items-center gap-2 text-[10px] font-bold">
              <ShieldCheck className={`w-4 h-4 ${isArbitrator ? 'text-[#3ec470]' : 'text-white/30'}`} />
              <span className={isArbitrator ? 'text-[#3ec470]' : 'text-white/40'}>
                Arbitrator: {shortenAddress(arbitrator)}
              </span>
              {isArbitrator && (
                <span className="bg-[#3ec470]/10 border border-[#3ec470]/30 text-[#3ec470] px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">
                  You are arbitrator
                </span>
              )}
            </div>
          )}
        </div>

        {!contractAddresses.registry ? (
          <div className="bg-[#161616] border border-white/[0.04] rounded-2xl p-12 text-center">
            <Gavel className="w-8 h-8 text-white/20 mx-auto mb-4" />
            <p className="text-white/40 text-[13px]">Contract addresses not configured (VITE_CONTRACT_REGISTRY missing).</p>
          </div>
        ) : scanning ? (
          <div className="bg-[#161616] border border-white/[0.04] rounded-2xl p-12 text-center">
            <div className="text-white/40 text-[13px] font-mono animate-pulse">Scanning on-chain auctions...</div>
          </div>
        ) : renderRows.length === 0 ? (
          <div className="bg-[#161616] border border-white/[0.04] rounded-2xl p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[#0f0f0f] border border-white/[0.06] flex items-center justify-center">
              <Scale className="w-7 h-7 text-white/25" />
            </div>
            <h2 className="text-lg font-black text-white mb-2">No Disputed Auctions</h2>
            <p className="text-white/40 text-[12px] max-w-md mx-auto leading-relaxed">
              No auction is currently in dispute. When a winner raises a dispute within the confirmation window,
              it appears here for arbitration.
            </p>
            <Link to="/auctions" className="inline-block mt-6 text-[#3ec470] font-bold text-sm hover:opacity-80">
              ← Back to Live Auctions
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {renderRows.map((d) => (
              <DisputeCard key={d.address} dispute={d} isArbitrator={isArbitrator} onResolved={() => setDisputed((prev) => prev?.filter((x) => x.address !== d.address))} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DisputeCard({
  dispute,
  isArbitrator,
  onResolved,
}: {
  dispute: DisputedAuction;
  isArbitrator: boolean;
  onResolved: () => void;
}) {
  const { success } = useToast();
  const { auctionData, resolveDispute, isLoading, refetchAuction, error: txError } = useAuction(dispute.address);
  const [busy, setBusy] = useState(false);

  const handleResolve = async (kolWon: boolean) => {
    if (busy) return;
    setBusy(true);
    await resolveDispute(kolWon, {
      onSuccess: () => {
        success(kolWon ? 'Ruled in favor of KOL — funds released.' : 'Ruled against KOL — refund pool + bond slashed.');
        refetchAuction();
        setTimeout(onResolved, 1500);
      },
    });
    setBusy(false);
  };

  return (
    <div className="bg-[#161616] border border-[#ea6668]/25 rounded-xl p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[#7a2d2d]/40 border border-[#ea6668]/40 text-[#ff8a8c] text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
              Disputed
            </span>
            <Link to={auctionDetailPath(dispute.address)} className="text-white/40 text-[10px] font-mono hover:text-[#3ec470] transition-colors">
              {shortenAddress(dispute.address)}
            </Link>
          </div>
          <h3 className="text-[15px] font-black text-white truncate">{dispute.content || 'KOL Auction'}</h3>
        </div>
        <div className="text-right shrink-0">
          <div className="text-white/40 text-[8px] font-bold uppercase tracking-[0.15em] mb-1">Locked Volume</div>
          <div className="font-mono text-[13px] font-bold text-[#ff8a8c]">{formatMonWei(dispute.totalVolume)} MON</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-[#0f0f0f] border border-white/[0.04] rounded p-3">
          <div className="text-white/40 text-[8px] font-bold uppercase tracking-[0.15em] mb-1">KOL</div>
          <div className="font-mono text-[11px] font-bold">{shortenAddress(dispute.kol)}</div>
        </div>
        <div className="bg-[#0f0f0f] border border-white/[0.04] rounded p-3">
          <div className="text-white/40 text-[8px] font-bold uppercase tracking-[0.15em] mb-1">Winner</div>
          <div className="font-mono text-[11px] font-bold">{shortenAddress(dispute.winner)}</div>
        </div>
        <div className="bg-[#0f0f0f] border border-white/[0.04] rounded p-3">
          <div className="text-white/40 text-[8px] font-bold uppercase tracking-[0.15em] mb-1">Winner Spent</div>
          <div className="font-mono text-[11px] font-bold">{formatMonWei(dispute.winnerTotalSpent)} MON</div>
        </div>
      </div>

      <div className="bg-[#0f0f0f] border border-white/[0.04] rounded p-3 mb-5 break-all">
        <div className="text-white/40 text-[8px] font-bold uppercase tracking-[0.15em] mb-1">Dispute Evidence</div>
        <div className="font-mono text-[10px] text-white/70">{dispute.evidenceHash}</div>
      </div>

      {auctionData?.status === 4 && isArbitrator && (
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => handleResolve(false)}
            disabled={busy || isLoading}
            className="flex-1 bg-[#7a2d2d]/50 border border-[#ea6668]/50 text-[#ff8a8c] font-black text-[11px] py-2.5 rounded hover:bg-[#7a2d2d]/70 transition-colors uppercase"
          >
            {busy ? 'Ruling...' : 'Rule Against KOL — Refund + Slash Bond'}
          </button>
          <button
            onClick={() => handleResolve(true)}
            disabled={busy || isLoading}
            className="flex-1 bg-[#3ec470] text-black font-black text-[11px] py-2.5 rounded hover:bg-[#4ade80] transition-colors uppercase"
          >
            {busy ? 'Ruling...' : 'Rule for KOL — Release Funds'}
          </button>
        </div>
      )}

      {auctionData?.status === 4 && !isArbitrator && (
        <div className="text-white/40 text-[10px] flex items-center gap-2">
          <Gavel className="w-3.5 h-3.5" /> 等待平台仲裁裁定（仅 arbitrator 可操作）。资金保持锁定。
        </div>
      )}

      {auctionData && auctionData.status !== 4 && (
        <div className="text-[#3ec470] text-[10px] font-bold">
          Resolved — status #{auctionData.status}
        </div>
      )}
      {txError && <div className="text-[#ff8a8c] text-[10px] mt-2">{txError}</div>}
    </div>
  );
}
