import { useEffect, useMemo, useState } from 'react';
import { usePublicClient, useReadContract } from 'wagmi';
import { monadTestnet } from '../web3/config';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Coins,
  Image as ImageIcon,
  Layers,
  PlusCircle,
  ShieldCheck,
  Trophy,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { isAddress, parseUnits } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import { useConnectedAddress, useCreateAuction, useNadbidAuctionContract } from '../web3/hooks/useNadbidAuction';
import { cn } from '../utils/cn';
import { ConnectButton } from '../components/wallet';
import { useToast } from '../hooks/useToast';
import { useWriteContractTx } from '../web3/hooks/useWriteContractTx';
import { nadbidAuctionAbi } from '../web3/contracts';

/** 资产授权 ABI（精简） */
const ERC20_APPROVE_ABI = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const;

const SET_APPROVAL_ABI = [
  {
    type: 'function',
    name: 'setApprovalForAll',
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'approved', type: 'bool' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

type AssetType = '0' | '1' | '2'; // ERC20 / ERC721 / ERC1155

const MIN_INCREMENT_BPS = 100; // 1%
const MAX_INCREMENT_BPS = 5000; // 50%
const SUPPORTS_INTERFACE_ABI = [
  {
    type: 'function',
    name: 'supportsInterface',
    inputs: [{ name: 'interfaceId', type: 'bytes4' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
] as const;

const DECIMALS_ABI = [
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
] as const;

const ALLOWANCE_ABI = [
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

const IS_APPROVED_FOR_ALL_ABI = [
  {
    type: 'function',
    name: 'isApprovedForAll',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'operator', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
] as const;

const STEPS = ['Asset', 'Pricing', 'Confirm'] as const;

const inputCls =
  'w-full rounded-xl border-2 border-[#111] bg-[#fffdf7] px-4 py-3 text-sm text-[#111] placeholder-[#111]/30 outline-none shadow-[2px_2px_0_rgba(17,17,17,0.25)] transition focus:border-[#117a3d] focus:shadow-[2px_2px_0_#1a7f37]';

export default function NadbidCreateAuctionPage() {
  const navigate = useNavigate();
  const address = useConnectedAddress();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { address: auctionAddr, isReady } = useNadbidAuctionContract();
  const createTx = useCreateAuction();
  const approveTx = useWriteContractTx();

  const [step, setStep] = useState(0);
  const [assetType, setAssetType] = useState<AssetType>('0');
  const [assetAddr, setAssetAddr] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [amount, setAmount] = useState('');
  const [startPrice, setStartPrice] = useState('');
  const [incrementPct, setIncrementPct] = useState('1');
  const [reservePrice, setReservePrice] = useState('');

  const invalidateAll = useMemo(
    () => () => {
      queryClient.invalidateQueries();
    },
    [queryClient],
  );

  const startPriceWei = useMemo(() => {
    if (!startPrice) return undefined;
    try {
      return parseUnits(startPrice, 6);
    } catch {
      return undefined;
    }
  }, [startPrice]);

  const reserveWei = useMemo(() => {
    if (!reservePrice) return 0n;
    try {
      return parseUnits(reservePrice, 6);
    } catch {
      return undefined;
    }
  }, [reservePrice]);

  const incrementBps = useMemo(() => {
    const pct = Number(incrementPct);
    if (!Number.isFinite(pct)) return undefined;
    return BigInt(Math.round(pct * 100));
  }, [incrementPct]);

  const publicClient = usePublicClient({ chainId: monadTestnet.id });
  const [assetProbe, setAssetProbe] = useState<'idle' | 'checking' | 'ok' | 'noCode' | 'badType'>('idle');

  // 链上资产探测：地址必须存在合约代码，且接口与所选资产类型匹配，
  // 否则创建时 transferFrom/transferFrom 必然 revert（浪费 gas）。
  useEffect(() => {
    let cancelled = false;
    const v = assetAddr.trim();
    if (!isAddress(v)) {
      setAssetProbe('idle');
      return;
    }
    if (!publicClient) {
      setAssetProbe('idle');
      return;
    }
    setAssetProbe('checking');
    (async () => {
      try {
        const code = await publicClient.getCode({ address: v as `0x${string}` });
        if (cancelled) return;
        if (!code || code === '0x') {
          setAssetProbe('noCode');
          return;
        }
        const addr = v as `0x${string}`;
        if (assetType === '0') {
          await publicClient.readContract({
            address: addr,
            abi: DECIMALS_ABI,
            functionName: 'decimals',
          });
          if (!cancelled) setAssetProbe('ok');
        } else if (assetType === '1') {
          const ok = await publicClient.readContract({
            address: addr,
            abi: SUPPORTS_INTERFACE_ABI,
            functionName: 'supportsInterface',
            args: ['0x80ac58cd'],
          });
          if (!cancelled) setAssetProbe(ok ? 'ok' : 'badType');
        } else {
          const ok = await publicClient.readContract({
            address: addr,
            abi: SUPPORTS_INTERFACE_ABI,
            functionName: 'supportsInterface',
            args: ['0xd9b67a26'],
          });
          if (!cancelled) setAssetProbe(ok ? 'ok' : 'badType');
        }
      } catch {
        if (!cancelled) setAssetProbe('badType');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assetAddr, assetType, publicClient]);

  const amountWei = useMemo(() => {
    if (assetType === '1') return 0n; // ERC721：单件 NFT 由 tokenId 定位，amount 必须为 0（合约 require(amount==0)）
    if (!amount) return undefined;
    try {
      return parseUnits(amount, assetType === '0' ? 6 : 0);
    } catch {
      return undefined;
    }
  }, [assetType, amount]);

  const assetAddrValid = (() => {
    const v = assetAddr.trim();
    return isAddress(v);
  })();
  const approvalArgs = useMemo(() => {
    if (!address || !auctionAddr) return undefined;
    return [address, auctionAddr] as readonly [`0x${string}`, `0x${string}`];
  }, [address, auctionAddr]);
  const approvalQuery = useReadContract({
    chainId: monadTestnet.id,
    address: (assetAddrValid ? assetAddr.trim() : '') as `0x${string}` | undefined,
    abi: assetType === '0' ? ALLOWANCE_ABI : IS_APPROVED_FOR_ALL_ABI,
    functionName: assetType === '0' ? 'allowance' : 'isApprovedForAll',
    args: approvalArgs,
    query: { enabled: !!address && !!auctionAddr && assetAddrValid },
  });
  const assetApproved = useMemo(() => {
    if (!approvalQuery.data || !auctionAddr) return false;
    if (assetType === '0') {
      if (typeof approvalQuery.data !== 'bigint' || amountWei === undefined) return false;
      return approvalQuery.data >= amountWei;
    }
    return approvalQuery.data === true;
  }, [approvalQuery.data, assetType, amountWei, auctionAddr]);

  const canCreate =
    isReady &&
    !!address &&
    assetAddrValid &&
    assetProbe === 'ok' &&
    startPriceWei !== undefined &&
    incrementBps !== undefined &&
    incrementBps >= BigInt(MIN_INCREMENT_BPS) &&
    incrementBps <= BigInt(MAX_INCREMENT_BPS) &&
    amountWei !== undefined &&
    (reserveWei === undefined || reserveWei > 0n) &&
    assetApproved;

  const assetValid = assetAddrValid && amountWei !== undefined;
  const pricingValid =
    startPriceWei !== undefined && incrementBps !== undefined && incrementBps >= BigInt(MIN_INCREMENT_BPS) && incrementBps <= BigInt(MAX_INCREMENT_BPS) && (reserveWei === undefined || reserveWei > 0n);

  /** 第一步：授权资产给合约 */
  const handleApprove = async () => {
    if (!auctionAddr) return;
    if (!assetAddrValid) {
      toast.error?.('请输入有效的合约地址（0x + 40 位十六进制）');
      return;
    }
    if (assetProbe !== 'ok') {
      toast.error?.('资产合约探测未通过：地址无合约或类型不匹配');
      return;
    }
    if (assetType === '0') {
      await approveTx.write({
        address: assetAddr.trim() as `0x${string}`,
        abi: ERC20_APPROVE_ABI,
        functionName: 'approve',
        args: [auctionAddr, amountWei!],
        gas: 150_000n,
        successMessage: 'Token approved',
      });
    } else {
      await approveTx.write({
        address: assetAddr.trim() as `0x${string}`,
        abi: SET_APPROVAL_ABI,
        functionName: 'setApprovalForAll',
        args: [auctionAddr, true],
        gas: 150_000n,
        successMessage: 'NFT approved',
      });
    }
    toast.success?.('Approved. You can now create the auction.');
    queryClient.invalidateQueries();
  };

  /** 第二步：创建拍卖 */
  const handleCreate = async () => {
    if (!auctionAddr || !canCreate) return;
    const tokenIdWei = assetType === '0' ? 0n : BigInt(tokenId || 0);
    const hash = await createTx.write({
      address: auctionAddr,
      abi: nadbidAuctionAbi,
      functionName: 'createAuction',
      gas: 2_000_000n,
      args: [
        BigInt(assetType),
        assetAddr.trim() as `0x${string}`,
        tokenIdWei,
        amountWei!,
        startPriceWei!,
        incrementBps!,
        reserveWei ?? 0n,
      ],
      onSuccess: invalidateAll,
      successMessage: 'Auction created',
    });
    if (hash) {
      toast.success?.('Auction created on-chain — refreshing auctions…');
      navigate('/nadbid');
    }
  };

  if (!isReady) {
    return (
      <Shell>
        <div className="nb-card border border-[#111]/15 bg-[#fffdf7] p-12 text-center text-sm text-[#111]/40">
          Contract not deployed. Set <span className="font-mono text-[#117a3d]">VITE_NADBID_AUCTION</span> first.
        </div>
      </Shell>
    );
  }

  if (!address) {
    return (
      <Shell>
        <div className="nb-card p-8 md:p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border-2 border-[#111] bg-[#ffe94a] shadow-[3px_3px_0_#111]">
            <Wallet className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-2xl font-black text-[#111]">Connect your wallet to create an auction</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#111]/55">
            You&apos;ll need a Monad testnet wallet to deposit the asset, approve it and lock the auction parameters
            on-chain.
          </p>
          <div className="mt-6 flex justify-center">
            <ConnectButton variant="dark" />
          </div>

          <div className="mx-auto mt-8 grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step} className="nb-card-flat p-4 text-left">
                <div className="inline-flex h-7 w-7 items-center justify-center rounded-md border-2 border-[#111] bg-[#8b5cf6] font-mono text-xs font-black text-white">
                  {i + 1}
                </div>
                <div className="mt-2.5 text-sm font-black text-[#111]">{step}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-[#111]/45">
                  {i === 0 ? 'Pick asset type & address' : i === 1 ? 'Start price, increment, reserve' : 'Approve & publish'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* 步骤指示器 */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => i < step && setStep(i)}
              className={cn(
                'flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold transition',
                i === step
                  ? 'bg-[#8b5cf6] text-white'
                  : i < step
                    ? 'bg-[#8b5cf6]/10 text-[#117a3d]'
                    : 'bg-[#111]/5 text-[#111]/40',
              )}
            >
              {i < step ? <Check className="h-3 w-3" /> : <span className="font-mono">{i + 1}</span>}
              {s}
            </button>
            {i < STEPS.length - 1 && <div className="h-px w-6 bg-[#111]/10" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <StepCard title="What are you auctioning?" desc="List any on-chain asset. It is escrowed at creation and delivered to the winner automatically.">
          {/* 资产类型 */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#111]/70">Asset type</label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { v: '0', label: 'ERC-20', icon: <Coins className="h-4 w-4" /> },
                  { v: '1', label: 'ERC-721', icon: <ImageIcon className="h-4 w-4" /> },
                  { v: '2', label: 'ERC-1155', icon: <Layers className="h-4 w-4" /> },
                ] as const
              ).map((t) => (
                <button
                  key={t.v}
                  onClick={() => setAssetType(t.v)}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition',
                    assetType === t.v
                      ? 'border-[#1a7f37]/50 bg-[#8b5cf6]/10 text-[#117a3d]'
                      : 'border-[#111]/15 bg-[#fffdf7] text-[#111]/60 hover:border-[#111]/25',
                  )}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <Field label="Asset contract address" hint="e.g. Wrapped BTC, MON, an NFT collection">
            <input
              value={assetAddr}
              onChange={(e) => setAssetAddr(e.target.value)}
              placeholder="0x…"
              className={cn(inputCls, assetAddr.trim() && !assetAddrValid && 'border-red-500/60')}
            />
            {assetAddr.trim() && !assetAddrValid && (
              <p className="mt-1.5 text-xs text-red-400">
                Invalid address — must be 0x + 40 hex characters
              </p>
            )}
            {assetAddrValid && assetProbe === 'checking' && (
              <p className="mt-1.5 text-xs text-[#111]/40">Probing on-chain…</p>
            )}
            {assetAddrValid && assetProbe === 'noCode' && (
              <p className="mt-1.5 text-xs text-red-400">
                No contract at this address on Monad Testnet — check the address or deploy it first
              </p>
            )}
            {assetAddrValid && assetProbe === 'badType' && (
              <p className="mt-1.5 text-xs text-red-400">
                Address exists but is not a valid {assetType === '0' ? 'ERC-20' : assetType === '1' ? 'ERC-721 (supportsInterface 0x80ac58cd)' : 'ERC-1155 (0xd9b67a26)'} — pick the right asset type
              </p>
            )}
            {assetAddrValid && assetProbe === 'ok' && (
              <p className="mt-1.5 text-xs text-[#117a3d]">Contract verified on-chain ✓</p>
            )}
          </Field>

          {assetType !== '0' && (
            <Field label="Token ID" hint="NFT 唯一标识">
              <input value={tokenId} onChange={(e) => setTokenId(e.target.value)} placeholder="0" className={inputCls} />
            </Field>
          )}

          {assetType !== '1' && (
            <Field label={assetType === '0' ? 'Amount' : 'Amount'} hint={assetType === '0' ? 'ERC-20 数量（如 1000）' : 'ERC-1155 份数'}>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1000" className={inputCls} />
            </Field>
          )}

          <div className="mt-6 flex justify-end">
            <button
              disabled={!assetValid}
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#8b5cf6] px-6 py-3 text-sm font-black text-white transition hover:bg-[#a78bfa] disabled:opacity-40"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </StepCard>
      )}

      {step === 1 && (
        <StepCard title="Set the price ladder" desc="Fixed 120s countdown per bid — the timer resets every time someone bids.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Start price (USDC)" hint="起拍价，第一笔出价即此价">
              <input value={startPrice} onChange={(e) => setStartPrice(e.target.value)} placeholder="10" className={inputCls} />
            </Field>

            <Field label={`Increment per bid (${incrementPct}%)`} hint="范围 1% – 50%">
              <input
                type="number"
                min={1}
                max={50}
                step={1}
                value={incrementPct}
                onChange={(e) => setIncrementPct(e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="Reserve price (USDC, optional)" hint="未达保留价 → 流拍全额退款，资产退回">
              <input value={reservePrice} onChange={(e) => setReservePrice(e.target.value)} placeholder="0" className={inputCls} />
            </Field>

            {/* 固定时长（只读） */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#111]/70">Auction duration</label>
              <div className="flex items-center gap-3 rounded-xl border border-[#111]/15 bg-[#fffdf7] px-4 py-3">
                <Clock className="h-4 w-4 text-[#117a3d]" />
                <span className="font-mono text-sm font-black text-[#111]">120 seconds</span>
                <span className="text-xs text-[#111]/40">fixed · resets on each bid</span>
              </div>
            </div>
          </div>

          {/* 费用说明 */}
          <div className="mt-5 rounded-xl border border-[#1a7f37]/15 bg-[#8b5cf6]/[0.04] p-4 text-sm">
            <div className="mb-2 text-xs font-black uppercase tracking-wider text-[#117a3d]">Payout structure</div>
            <div className="grid grid-cols-2 gap-2.5 text-[#111]/70">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 shrink-0 text-[#117a3d]" />
                You receive <b className="text-[#111]">85% of the pool</b> (net of 5% settle fee)
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 shrink-0 text-[#117a3d]" />
                15% of pool → earlier bidders as dividends
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#117a3d]" />
                Bidders pay a 1% fee on each bid
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#117a3d]" />
                Reserve not met → all bids refunded
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep(0)} className="rounded-xl border border-[#111]/15 px-5 py-3 text-sm font-bold text-[#111]/70 hover:text-[#111]">
              Back
            </button>
            <button
              disabled={!pricingValid}
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#8b5cf6] px-6 py-3 text-sm font-black text-white transition hover:bg-[#a78bfa] disabled:opacity-40"
            >
              Review & confirm
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </StepCard>
      )}

      {step === 2 && (
        <StepCard title="Confirm & deploy" desc="Approve the asset, then create the auction in one flow.">
          {/* 摘要 */}
          <div className="space-y-2 rounded-xl bg-[#fffdf7] p-5 text-sm">
            <SummaryRow label="Asset" value={assetType === '0' ? `${amount || '—'} ${shorten(assetAddr)}` : assetType === '1' ? `#${tokenId || '—'} ${shorten(assetAddr)}` : `${amount || '—'}× #${tokenId || '—'} ${shorten(assetAddr)}`} />
            <SummaryRow label="Start price" value={`${startPrice || '—'} USDC`} accent />
            <SummaryRow label="Increment" value={`${incrementPct}% per bid`} />
            <SummaryRow label="Reserve" value={reservePrice ? `${reservePrice} USDC` : 'none'} />
            <SummaryRow label="Duration" value="120s (fixed)" />
            <SummaryRow label="Bid fee" value="1% paid by bidders" />
            <SummaryRow label="Settle fee" value="5% from each payout" />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleApprove}
              disabled={!assetAddr.trim() || approveTx.isLoading}
              className="flex-1 rounded-xl border border-[#111]/25 bg-[#111]/5 px-4 py-3 text-sm font-bold text-[#111] transition hover:bg-[#111]/10 disabled:opacity-40"
            >
              {approveTx.isLoading ? 'Approving…' : 'Approve asset'}
            </button>
            <button
              onClick={handleCreate}
              disabled={!canCreate || createTx.isLoading}
              className="flex-1 rounded-xl bg-[#8b5cf6] px-4 py-3 text-sm font-black text-white transition hover:bg-[#a78bfa] disabled:opacity-40"
            >
              {createTx.isLoading
                ? 'Creating…'
                : assetAddrValid && !assetApproved
                  ? 'Approve asset first'
                  : 'Create auction'}
            </button>
          </div>

          <p className="mt-3 text-center text-xs text-[#111]/40">
            Your wallet can't bid on your own auction (enforced on-chain).
          </p>

          <div className="mt-4 flex justify-start">
            <button onClick={() => setStep(1)} className="rounded-xl px-4 py-2 text-sm font-bold text-[#111]/60 hover:text-[#111]">
              ← Back to pricing
            </button>
          </div>
        </StepCard>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pt-28">
      <Link
        to="/nadbid"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[#111]/50 transition hover:text-[#117a3d]"
      >
        <ArrowLeft className="h-4 w-4" />
        All auctions
      </Link>
      <h1 className="mb-1 flex items-center gap-3 text-3xl font-black text-[#111]">
        <PlusCircle className="h-8 w-8 text-[#117a3d]" />
        Create auction
      </h1>
      <p className="mb-8 text-sm text-[#111]/50">
        List any on-chain asset (ERC-20 / ERC-721 / ERC-1155). Bidders pay in USDC — you receive 85% of the pool net of
        fees.
      </p>
      {children}
    </div>
  );
}

function StepCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="nb-card border border-[#111]/15 bg-[#fffdf7] p-6 md:p-8">
      <h2 className="text-xl font-black text-[#111]">{title}</h2>
      <p className="mb-6 mt-1.5 text-sm text-[#111]/45">{desc}</p>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-[#111]/70">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-[#111]/40">{hint}</p>}
    </div>
  );
}

function SummaryRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[#111]/50">{label}</span>
      <span className={cn('font-mono text-right', accent ? 'text-[#117a3d]' : 'text-[#111]/85')}>{value}</span>
    </div>
  );
}

function shorten(a: string): string {
  if (a.length <= 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
