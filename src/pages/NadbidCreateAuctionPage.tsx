import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Coins, Image as ImageIcon, Layers, PlusCircle } from 'lucide-react';
import { parseUnits } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import { useConnectedAddress, useCreateAuction, useNadbidAuctionContract } from '../web3/hooks/useNadbidAuction';
import { cn } from '../utils/cn';
import { useToast } from '../hooks/useToast';
import { useWriteContractTx } from '../web3/hooks/useWriteContractTx';

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

export default function NadbidCreateAuctionPage() {
  const address = useConnectedAddress();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { address: auctionAddr, isReady } = useNadbidAuctionContract();
  const createTx = useCreateAuction();
  const approveTx = useWriteContractTx();

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

  const amountWei = useMemo(() => {
    if (assetType === '1') return 1n; // ERC721 单枚
    if (!amount) return undefined;
    try {
      return parseUnits(amount, assetType === '0' ? 6 : 0);
    } catch {
      return undefined;
    }
  }, [assetType, amount]);

  const canCreate =
    isReady &&
    !!address &&
    !!assetAddr.trim() &&
    startPriceWei !== undefined &&
    incrementBps !== undefined &&
    incrementBps >= BigInt(MIN_INCREMENT_BPS) &&
    incrementBps <= BigInt(MAX_INCREMENT_BPS) &&
    amountWei !== undefined &&
    (reserveWei === undefined || reserveWei > 0n);

  /** 第一步：授权资产给合约 */
  const handleApprove = async () => {
    if (!auctionAddr) return;
    if (assetType === '0') {
      await approveTx.write({
        address: assetAddr as `0x${string}`,
        abi: ERC20_APPROVE_ABI,
        functionName: 'approve',
        args: [auctionAddr, amountWei!],
        successMessage: 'Token approved',
      });
    } else {
      await approveTx.write({
        address: assetAddr as `0x${string}`,
        abi: SET_APPROVAL_ABI,
        functionName: 'setApprovalForAll',
        args: [auctionAddr, true],
        successMessage: 'NFT approved',
      });
    }
    toast.success?.('Approved. You can now create the auction.');
  };

  /** 第二步：创建拍卖 */
  const handleCreate = async () => {
    if (!auctionAddr || !canCreate) return;
    const tokenIdWei = assetType === '0' ? 0n : BigInt(tokenId || 0);
    const hash = await createTx.write({
      address: auctionAddr,
      abi: createAbi(),
      functionName: 'createAuction',
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
      toast.success?.('Auction created on-chain.');
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link to="/nadbid" className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/50 transition hover:text-[#3ec470]">
        <ArrowLeft className="h-4 w-4" />
        All auctions
      </Link>

      <h1 className="mb-1 flex items-center gap-3 text-2xl font-bold text-white">
        <PlusCircle className="h-7 w-7 text-[#3ec470]" />
        Create auction
      </h1>
      <p className="mb-6 text-sm text-white/50">
        List any on-chain asset (ERC-20 / ERC-721 / ERC-1155). Bidders pay in USDC; the asset is escrowed at creation
        and delivered to the winner automatically on settle.
      </p>

      {!isReady ? (
        <div className="rounded-xl border border-white/5 bg-[#161616] p-8 text-center text-sm text-white/40">
          Contract not deployed. Set <span className="font-mono text-[#3ec470]">VITE_NADBID_AUCTION</span> first.
        </div>
      ) : !address ? (
        <div className="rounded-xl border border-white/5 bg-[#161616] p-8 text-center text-sm text-white/40">
          Connect your wallet to create an auction.
        </div>
      ) : (
        <div className="space-y-5 rounded-xl border border-white/5 bg-[#161616] p-6">
          {/* 资产类型 */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-white/70">Asset type</label>
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
                    'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition',
                    assetType === t.v
                      ? 'border-[#3ec470]/50 bg-[#3ec470]/10 text-[#3ec470]'
                      : 'border-white/10 bg-[#0f0f0f] text-white/60 hover:border-white/20',
                  )}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <Field label="Asset contract address" hint="e.g. Wrapped BTC, MON, NFT collection">
            <input
              value={assetAddr}
              onChange={(e) => setAssetAddr(e.target.value)}
              placeholder="0x…"
              className={inputCls}
            />
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

          <Field label="Start price (USDC)" hint="起拍价，第一笔出价即此价">
            <input value={startPrice} onChange={(e) => setStartPrice(e.target.value)} placeholder="10" className={inputCls} />
          </Field>

          <Field label={`Increment per bid (${incrementPct}% = +${incrementPct}%)`} hint={`范围 1% – 50%`}>
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

          {/* 摘要 */}
          <div className="rounded-lg bg-[#0f0f0f] p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-white/50">Auction escrow</span>
              <span className="font-mono text-white">
                {assetType === '0' ? `${amount || '—'} ${shorten(assetAddr)}` : assetType === '1' ? `#${tokenId || '—'} ${shorten(assetAddr)}` : `${amount || '—'}× #${tokenId || '—'} ${shorten(assetAddr)}`}
              </span>
            </div>
            <div className="mt-1.5 flex justify-between">
              <span className="text-white/50">Start price</span>
              <span className="font-mono text-[#3ec470]">{startPrice ? `${startPrice} USDC` : '—'}</span>
            </div>
            <div className="mt-1.5 flex justify-between">
              <span className="text-white/50">Reserve</span>
              <span className="font-mono text-white/80">{reservePrice ? `${reservePrice} USDC` : 'none'}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              disabled={!assetAddr.trim() || approveTx.isLoading}
              className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-40"
            >
              {approveTx.isLoading ? 'Approving…' : '1. Approve asset'}
            </button>
            <button
              onClick={handleCreate}
              disabled={!canCreate || createTx.isLoading}
              className="flex-1 rounded-lg bg-[#3ec470] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#4ade80] disabled:opacity-40"
            >
              {createTx.isLoading ? 'Creating…' : '2. Create auction'}
            </button>
          </div>

          {!canCreate && (
            <p className="text-xs text-white/40">
              Fill start price (USDC), increment 1–50%, and amount{assetType === '1' ? '' : ''} to enable creation.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-white/10 bg-[#0f0f0f] px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none transition focus:border-[#3ec470]/50';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-white/70">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-white/35">{hint}</p>}
    </div>
  );
}

function shorten(a: string): string {
  if (a.length <= 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

// ABI 引用（复用 web3/contracts 的 nadbidAuctionAbi）
import { nadbidAuctionAbi } from '../web3/contracts';
function createAbi() {
  return nadbidAuctionAbi;
}
