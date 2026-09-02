import { useMemo, useState } from 'react';
import { Flame, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { useToast } from '../../hooks/useToast';
import { useWalletStore } from '../../stores/walletStore';
import { useKolHolding } from '../../stores/kolHoldingsStore';
import { usePassMintBurn } from '../../hooks/usePassMintBurn';
import { useKolPass } from '../../web3/hooks/useKolPass';
import { curvePriceAt, supplyAfterBurn, supplyAfterMint } from '../../utils/bondingCurve';
import { TradeConfirmationModal, ConnectModal } from '../trade';
import type { TradeDetailItem } from '../trade';
import { cn } from '../../utils/cn';

export interface MintBurnResultPayload {
  action: 'mint' | 'burn';
  amount: number;
  newSupply: number;
  newPrice: number;
}

export interface MintBurnPanelProps {
  /** KOL handle（无 @ 前缀，与持仓 store key 一致） */
  kolHandle: string;
  /** KOL 显示名 */
  kolName: string;
  /** 当前债券曲线供应量（页面统一维护） */
  supply: number;
  /** 当前债券曲线价格（MON，页面统一维护） */
  price: number;
  /**
   * KolPass 合约地址（Task 12 链上接入）。
   * 已配置（合约已部署且 KOL 地址可解析）→ mint 走真实链上交易，曲线价 / 供应量取链上
   * curvePrice / totalSupply；undefined（合约未部署 / 地址不可推断）→ 保留 mock 双路径回退。
   */
  passAddress?: `0x${string}`;
  /** 交易成功回调：携带新供应量 / 新价格，供页面更新 Overview 与曲线图 */
  onTradeSuccess?: (result: MintBurnResultPayload) => void;
}

type MintBurnTab = 'mint' | 'burn';

/**
 * KOL Profile 交易面板 — MINT / BURN 双 Tab。
 *
 * 流程：输入数量 → 点击 CTA（未连接钱包 → ConnectModal）→ TradeConfirmationModal
 * 展示交易详情 → 确认后执行交易 → 成功后更新持仓 / 余额 / 曲线价格并通知页面刷新。
 *
 * Task 12 双路径：
 *  - 链上路径（passAddress 已配置）：Mint 走 useKolPass 真实交易（value 默认
 *    curvePrice × qty），曲线价 / 供应量 / 持仓取链上 curvePrice / totalSupply / balanceOf；
 *    Burn 需 tokenId 枚举（MVP 未实现）→ 显示「待扩展」提示并禁用。
 *  - mock 路径（passAddress undefined，合约未部署 / 地址不可推断）：保留 usePassMintBurn
 *    完整 7 态 mock 交易与 bondingCurve 派生逻辑。
 */
export function MintBurnPanel({
  kolHandle,
  kolName,
  supply,
  price,
  passAddress,
  onTradeSuccess,
}: MintBurnPanelProps) {
  const wallet = useWalletStore();
  const holding = useKolHolding(kolHandle);
  const trade = usePassMintBurn();
  const account =
    wallet.isConnected && wallet.address ? (wallet.address as `0x${string}`) : undefined;
  // 链上路径：passAddress 已配置时启用（hook 无条件调用，未配置时返回 undefined 数据）
  const chain = useKolPass(passAddress, account);
  const isChainPath = passAddress !== undefined;
  const { error: toastError } = useToast();

  const [tab, setTab] = useState<MintBurnTab>('mint');
  const [qty, setQty] = useState<string>('1');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);

  /* ---------- 派生计算（链上路径取链上数据，mock 路径取 bondingCurve + 页面基线） ---------- */

  /** 链上曲线价（wei → MON）/ 总供应量 / 持仓 */
  const chainPrice = chain.curvePrice !== undefined ? Number(chain.curvePrice) / 1e18 : undefined;
  const chainSupply = chain.totalSupply !== undefined ? Number(chain.totalSupply) : undefined;
  const chainHolding = chain.balanceOf !== undefined ? Number(chain.balanceOf) : undefined;

  /** 有效价格 / 供应量 / 持仓：链上路径优先链上值，否则回退页面传入基线 / 本地持仓 store */
  const effectivePrice = isChainPath && chainPrice !== undefined ? chainPrice : price;
  const effectiveSupply = isChainPath && chainSupply !== undefined ? chainSupply : supply;
  const effectiveHolding =
    isChainPath ? (chainHolding !== undefined ? chainHolding : 0) : holding;

  /** 交易状态机（mock 7 态 / 链上 6 态，'signing' 为 mock 特有） */
  const isSubmitting = isChainPath ? chain.isLoading : trade.isSubmitting;
  const txStatus = isChainPath ? chain.status : trade.status;
  const txHash = isChainPath ? chain.txHash : trade.txHash;
  const txError = isChainPath ? chain.error : trade.error;

  const isMint = tab === 'mint';

  /** 链上 Burn 需 tokenId 枚举（MVP 未实现）→ 链上路径禁用 Burn，保留「待扩展」提示 */
  const burnUnsupported = isChainPath && !isMint;

  /** 解析并钳制数量为合法整数；空 / 非法输入视为 0 */
  const qtyNum = useMemo(() => {
    const n = Math.floor(Number(qty));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [qty]);
  const isQtyValid = qtyNum > 0;

  /** 总成本 / 总返还 = 数量 × 当前单位价格（债券曲线模型，见 usePassMintBurn） */
  const totalAmount = qtyNum * effectivePrice;
  /** 预估新供应量 / 新价格（Mint 上涨 / Burn 下跌） */
  const newSupply = isMint ? supplyAfterMint(effectiveSupply, qtyNum) : supplyAfterBurn(effectiveSupply, qtyNum);
  const newPrice = curvePriceAt(newSupply, effectiveSupply, effectivePrice);

  /** Burn 数量超过当前可烧持仓 */
  const burnExceedsHolding = !isMint && isQtyValid && qtyNum > effectiveHolding;
  /** 余额内可 mint 的最大数量 */
  const maxMintQty = Math.max(0, Math.floor((wallet.balanceMon || 0) / (effectivePrice > 0 ? effectivePrice : 1)));

  /** CTA 是否可点：数量合法且不在交易中（持仓不足走错误提示而非禁用） */
  const canSubmit = isQtyValid && !isSubmitting && !burnUnsupported;

  const handleSetMax = () => {
    setQty(String(isMint ? maxMintQty : effectiveHolding));
  };

  /** 点击 CTA：校验 → 未连接钱包引导连接 → 打开确认弹窗 */
  const handleTradeClick = () => {
    if (!canSubmit) return;
    // Burn 持仓不足：立即给出错误提示（不进入弹窗）
    if (burnExceedsHolding) {
      toastError(`Insufficient PASS holdings. You hold ${effectiveHolding} PASS, tried to burn ${qtyNum}.`);
      return;
    }
    if (!wallet.isConnected) {
      setConnectOpen(true);
      return;
    }
    trade.reset();
    chain.reset();
    setConfirmOpen(true);
  };

  /** 连接成功后的续接：回到交易确认流程 */
  const handleConnected = () => {
    trade.reset();
    chain.reset();
    setConfirmOpen(true);
  };

  /** 确认交易：链上路径 mint 走真实交易 / burn 待扩展；mock 路径保留 usePassMintBurn */
  const handleConfirm = async () => {
    if (isChainPath) {
      if (!isMint) return; // burnUnsupported 已禁用 CTA，此处兜底
      // 链上 mint：value 默认 curvePrice × qty（useKolPass 兜底，MVP 单币计价）
      const txHash = await chain.mint(BigInt(qtyNum));
      if (!txHash) return; // 用户拒绝 / 失败 → 状态由 TradeConfirmationModal 展示

      const newSupply = supplyAfterMint(effectiveSupply, qtyNum);
      const newPrice = curvePriceAt(newSupply, effectiveSupply, effectivePrice);
      await wallet.refreshBalance(qtyNum * effectivePrice);
      onTradeSuccess?.({ action: 'mint', amount: qtyNum, newSupply, newPrice });

      // 展示成功态后自动关闭并重置
      setTimeout(() => {
        setConfirmOpen(false);
        chain.reset();
      }, 1400);
      return;
    }

    // mock 路径：usePassMintBurn 完整交易 → 成功后通知页面更新曲线与持仓
    const result = isMint
      ? await trade.mintPass({ kolHandle, mintAmount: qtyNum, costPerPass: effectivePrice, currentSupply: effectiveSupply })
      : await trade.burnPass({ kolHandle, burnAmount: qtyNum, pricePerPass: effectivePrice, currentSupply: effectiveSupply });
    if (!result) return; // 错误已由 TradeConfirmationModal 展示；用户拒绝 → 静默

    onTradeSuccess?.({
      action: isMint ? 'mint' : 'burn',
      amount: result.amount,
      newSupply: result.newSupply,
      newPrice: result.newPrice,
    });

    // 展示成功态后自动关闭并重置
    setTimeout(() => {
      setConfirmOpen(false);
      trade.reset();
    }, 1400);
  };

  const confirmDetails: TradeDetailItem[] = [
    { label: 'KOL', value: `${kolName} (${kolHandle})` },
    { label: 'Action', value: isMint ? 'Mint PASS' : 'Burn PASS' },
    { label: 'Quantity', value: `${qtyNum} PASS` },
    { label: 'Unit Price', value: `${effectivePrice.toFixed(2)} MON` },
    {
      label: isMint ? 'Total Cost' : 'Est. Return',
      value: `${totalAmount.toFixed(2)} MON`,
      highlight: true,
    },
    { label: 'Est. New Price', value: `${newPrice.toFixed(2)} MON` },
  ];

  return (
    <div className="flex flex-col h-full bg-[#161616] border border-white/[0.04] rounded-lg p-6">
      <h3 className="text-[13px] font-bold uppercase tracking-[0.1em] mb-6">Trade Pass</h3>

      {/* 三卡片：当前价格 / 供应量 / 当前持仓 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#0f0f0f] border border-white/[0.04] rounded p-3">
          <div className="text-white/40 text-[9px] font-bold uppercase tracking-[0.15em] mb-1">Mint Price</div>
          <div className="font-mono text-[12px] font-bold text-[#3ec470]">{effectivePrice.toFixed(2)} MON</div>
        </div>
        <div className="bg-[#0f0f0f] border border-white/[0.04] rounded p-3">
          <div className="text-white/40 text-[9px] font-bold uppercase tracking-[0.15em] mb-1">Supply</div>
          <div className="font-mono text-[12px] font-bold">{effectiveSupply.toLocaleString()}</div>
        </div>
        <div className="bg-[#0f0f0f] border border-white/[0.04] rounded p-3">
          <div className="text-white/40 text-[9px] font-bold uppercase tracking-[0.15em] mb-1">Holdings</div>
          <div className="font-mono text-[12px] font-bold">{effectiveHolding.toLocaleString()}</div>
        </div>
      </div>

      {/* MINT / BURN Tab 切换 */}
      <div className="grid grid-cols-2 gap-1 bg-[#0a0a0a] border border-white/[0.06] rounded p-1 mb-5">
        <button
          type="button"
          onClick={() => setTab('mint')}
          className={cn(
            'flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] py-2 rounded transition-colors',
            isMint
              ? 'bg-[#3ec470] text-black'
              : 'text-white/50 hover:text-white hover:bg-white/[0.05]',
          )}
        >
          <Sparkles className="w-3 h-3" /> Mint
        </button>
        <button
          type="button"
          onClick={() => setTab('burn')}
          className={cn(
            'flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] py-2 rounded transition-colors',
            !isMint
              ? 'bg-red-500 text-black'
              : 'text-white/50 hover:text-white hover:bg-white/[0.05]',
          )}
        >
          <Flame className="w-3 h-3" /> Burn
        </button>
      </div>

      {/* 数量输入 */}
      <div className="mb-5">
        <div className="text-white/40 text-[9px] font-bold uppercase tracking-[0.15em] mb-2">Quantity</div>
        <div className="flex bg-[#0a0a0a] border border-white/[0.06] rounded p-1">
          <input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="bg-transparent w-full px-3 font-mono text-[14px] text-white outline-none"
            aria-label={`${isMint ? 'Mint' : 'Burn'} quantity`}
          />
          <button
            type="button"
            onClick={handleSetMax}
            className="bg-white/[0.05] text-white/60 text-[9px] font-bold px-3 py-2 rounded hover:bg-white/[0.1] transition-colors tracking-[0.1em]"
          >
            MAX
          </button>
        </div>
        {/* Burn 持仓不足的即时提示 */}
        {burnExceedsHolding && (
          <div className="text-red-400 text-[10px] font-mono mt-2">
            Only {effectiveHolding} PASS available to burn.
          </div>
        )}
        {/* 链上 Burn 待扩展提示（需 tokenId 枚举） */}
        {burnUnsupported && (
          <div className="text-amber-400/80 text-[10px] font-mono mt-2 border border-amber-400/20 bg-amber-400/5 rounded p-2 leading-relaxed">
            On-chain burn requires token ID enumeration — MVP limitation, coming soon.
          </div>
        )}
      </div>

      {/* 预估明细 */}
      <div className="space-y-3 font-mono text-[12px] mb-6 mt-auto">
        <div className="flex justify-between text-white/50">
          <span>Wallet</span>
          <span className="text-white/80">{(wallet.balanceMon || 0).toFixed(2)} MON</span>
        </div>
        <div className="flex justify-between text-white/50">
          <span>{isMint ? 'Est. Cost' : 'Est. Return'}</span>
          <span className={isMint ? 'text-white' : 'text-[#3ec470]'}>
            {isMint ? '−' : '+'}
            {totalAmount.toFixed(2)} MON
          </span>
        </div>
        <div className="flex justify-between text-white/50">
          <span>Est. New Price</span>
          <span className="text-white">{newPrice.toFixed(2)} MON</span>
        </div>
        <div className="flex justify-between font-bold text-white pt-3 border-t border-white/[0.04]">
          <span>{isMint ? 'Total' : 'Net Receive'}</span>
          <span className="text-white">{totalAmount.toFixed(2)} MON</span>
        </div>
      </div>

      {/* CTA — 未连接钱包也可点击（点击引导连接）；仅数量非法/交易中禁用 */}
      <Button
        fullWidth
        size="lg"
        variant={isMint ? 'default' : 'danger'}
        onClick={handleTradeClick}
        disabled={!isQtyValid || isSubmitting || burnUnsupported}
        className={cn(
          'cursor-pointer',
          !wallet.isConnected && isQtyValid && !isSubmitting && !burnUnsupported && 'animate-pulse',
        )}
      >
        {isSubmitting
          ? (isMint ? 'Minting...' : 'Burning...')
          : !wallet.isConnected
            ? 'Connect Wallet to Mint'
            : isMint
              ? 'Mint PASS'
              : burnUnsupported
                ? 'Burn Unavailable'
                : 'Burn PASS'}
      </Button>
      {!wallet.isConnected && isQtyValid && (
        <div className="text-[#3ec470]/70 text-[9px] text-center mt-2 font-bold tracking-wider">
          Connect your wallet to mint {kolName}'s PASS
        </div>
      )}
      <div className="text-white/30 text-[9px] italic text-center mt-4">
        Prices follow a bonding curve. Slippage may apply.
      </div>

      {/* 交易确认弹窗 */}
      <TradeConfirmationModal
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          trade.reset();
          chain.reset();
        }}
        title={isMint ? 'Confirm Mint' : 'Confirm Burn'}
        description={
          isMint
            ? `Mint ${qtyNum} ${kolName} PASS at the current bonding-curve price.`
            : `Burn ${qtyNum} ${kolName} PASS and receive MON back along the bonding curve.`
        }
        details={confirmDetails}
        confirmText={isMint ? 'Confirm Mint' : 'Confirm Burn'}
        cancelText="Cancel"
        onConfirm={handleConfirm}
        status={txStatus}
        txHash={txHash ?? undefined}
        error={txError ?? undefined}
      />

      {/* 钱包连接引导 */}
      <ConnectModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        onConnected={handleConnected}
      />
    </div>
  );
}
