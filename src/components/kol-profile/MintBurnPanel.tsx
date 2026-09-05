import { useMemo, useState } from 'react';
import { Flame, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { useToast } from '../../hooks/useToast';
import { useWalletStore } from '../../stores/walletStore';
import { useKolPass } from '../../web3/hooks/useKolPass';
import { curvePriceAt, supplyAfterBurn, supplyAfterMint } from '../../utils/bondingCurve';
import { ConnectModal } from '../trade';
import { cn } from '../../utils/cn';

export interface MintBurnResultPayload {
  action: 'mint' | 'burn';
  amount: number;
  newSupply: number;
  newPrice: number;
}

export interface MintBurnPanelProps {
  /** KOL handle（无 @ 前缀） */
  kolHandle: string;
  /** KOL 显示名 */
  kolName: string;
  /** 当前债券曲线供应量（页面统一维护） */
  supply: number;
  /** 当前债券曲线价格（MON，页面统一维护） */
  price: number;
  /** KolPass 合约地址（链上真实数据；未创建 PASS 合约时显示占位） */
  passAddress?: `0x${string}`;
  /** 交易成功回调：携带新供应量 / 新价格，供页面更新 Overview 与曲线图 */
  onTradeSuccess?: (result: MintBurnResultPayload) => void;
}

type MintBurnTab = 'mint' | 'burn';

/**
 * KOL Profile 交易面板 — MINT / BURN 双 Tab（纯链上，无 mock）。
 *
 * 数据全部来自 KolPass 合约：curvePrice / totalSupply / balanceOf（链上真实值）；
 * Mint 走真实链上交易（value 按曲线逐枚累加，含 8% 手续费缓冲）；
 * Burn 走联合曲线回购 — 用户选择持有的 PASS tokenId（ERC721Enumerable 枚举）后销毁。
 * passAddress 未配置（KOL 尚未创建 PASS 合约）时显示占位提示。
 */
export function MintBurnPanel({
  kolHandle: _kolHandle,
  kolName,
  supply,
  price,
  passAddress,
  onTradeSuccess,
}: MintBurnPanelProps) {
  const wallet = useWalletStore();
  const { success: toastSuccess, error: toastError } = useToast();
  const account =
    wallet.isConnected && wallet.address ? (wallet.address as `0x${string}`) : undefined;
  const chain = useKolPass(passAddress, account);
  // 无 PASS 合约地址 → 面板整体显示占位（无 mock 交易）
  const hasPass = passAddress !== undefined;

  const [tab, setTab] = useState<MintBurnTab>('mint');
  const [qty, setQty] = useState<string>('1');
  const [connectOpen, setConnectOpen] = useState(false);
  // 链上 burn：tokenId 多选集合（联合曲线核心需求 — 按曲线价回购，多人套利是设计模型）
  const [burnSelected, setBurnSelected] = useState<Set<string>>(new Set());

  /* ---------- 派生计算（全部取链上真实数据） ---------- */

  /** 链上曲线价（wei → MON）/ 总供应量 / 持仓 */
  const chainPrice = chain.curvePrice !== undefined ? Number(chain.curvePrice) / 1e18 : undefined;
  const chainSupply = chain.totalSupply !== undefined ? Number(chain.totalSupply) : undefined;
  const chainHolding = chain.balanceOf !== undefined ? Number(chain.balanceOf) : undefined;

  /** 有效价格 / 供应量 / 持仓：链上值就绪时取链上，否则回退页面基线（加载期） */
  const effectivePrice = chainPrice !== undefined ? chainPrice : price;
  const effectiveSupply = chainSupply !== undefined ? chainSupply : supply;
  const effectiveHolding = chainHolding !== undefined ? chainHolding : 0;

  /** 交易状态机（链上 6 态） */
  const isSubmitting = chain.isLoading;

  const isMint = tab === 'mint';

  /**
   * 链上数据就绪判定：曲线参数 + 总供应量 + 曲线价均加载完成才允许 mint。
   * 任一项缺失（加载中/失败）时禁用 mint，避免 estimateMintCost 回退单币近似
   * 在高供应量下给出不足的 value 导致交易失败。
   */
  const chainDataReady =
    chain.curveConfig !== undefined && chain.totalSupply !== undefined && chain.curvePrice !== undefined;

  /** 链上 burn：当前用户可烧的 tokenId 列表（ERC721Enumerable 枚举，上限 20） */
  const chainBurnable = account !== undefined ? (chain.userTokenIds ?? []) : [];
  const chainBurnReady = chainBurnable.length > 0;

  /** 解析并钳制数量为合法整数；空 / 非法输入视为 0 */
  const qtyNum = useMemo(() => {
    const n = Math.floor(Number(qty));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [qty]);
  const isQtyValid = qtyNum > 0;

  /** 总成本 / 总返还 = 数量 × 当前单位价格（债券曲线模型） */
  const totalAmount = qtyNum * effectivePrice;

  /** Burn 数量：链上用选中 token 数 */
  const burnQty = burnSelected.size;
  /** Burn 数量超过当前可烧持仓 */
  const burnExceedsHolding = !isMint && burnQty > chainBurnable.length;

  /**
   * 链上路径的精确成本（wei，含 8% 手续费缓冲）：与链上 mint 实际扣款一致。
   * 曲线参数未加载时 undefined。burn 路径：按当前曲线价×选中数估算返还。
   */
  /** 曲线配置（链上读取），burn 预估需按递减曲线逐枚计算 */
  const curveCfg = chain.curveConfig;
  const chainCostWei = isQtyValid
    ? isMint
      ? chain.estimateMintCost(BigInt(qtyNum))
      : curveCfg && effectiveSupply > 0
        ? (() => {
            // 审计修复（P2-5）：burn 预估与链上严格一致——逐枚按递减曲线
            // Σ curvePriceAt(supply - i)，再扣 8% 手续费（feeKOL 5% + feePlatform 3%）。
            // 修复前用「单枚当前价 × 数量」估算，与链上递减+扣费不符，页面返还偏大。
            let sum = 0n;
            for (let i = 0; i < burnQty; i++) {
              const step = BigInt(effectiveSupply - i);
              sum += (curveCfg.basePrice * step * step) / (curveCfg.baseSupply * curveCfg.baseSupply);
            }
            return sum - (sum * 8n) / 100n;
          })()
        : undefined
    : undefined;
  /** 链上精确成本 → MON（显示用） */
  const chainCostMon = chainCostWei !== undefined ? Number(chainCostWei) / 1e18 : undefined;
  const displayTotalAmount = chainCostMon !== undefined ? chainCostMon : totalAmount;
  /** 预估新供应量 / 新价格（Mint 上涨 / Burn 下跌） */
  const newSupply = isMint ? supplyAfterMint(effectiveSupply, qtyNum) : supplyAfterBurn(effectiveSupply, qtyNum);
  /** P3-10：精确的"下一枚"价 = basePrice*(newSupply+1)²/baseSupply²（bigint 计算，
   *  避免 Number(wei) 大数精度损失；与链上 curvePriceAt 整数除法一致） */
  const newPrice =
    curveCfg && effectiveSupply > 0
      ? Number(
          (curveCfg.basePrice * BigInt(newSupply + 1) * BigInt(newSupply + 1)) /
            (curveCfg.baseSupply * curveCfg.baseSupply),
        ) / 1e18
      : curvePriceAt(newSupply, effectiveSupply, effectivePrice);

  /** 余额内可 mint 的最大数量 */
  const maxMintQty = Math.max(0, Math.floor((wallet.balanceMon || 0) / (effectivePrice > 0 ? effectivePrice : 1)));

  /** CTA 是否可点：数量合法、链上数据就绪（时序保护）、不在交易中。
   *  burn 特例：未连接钱包时仍可点击（点击后引导连接），避免按钮"点了没反应" */
  const canSubmit =
    isQtyValid &&
    !isSubmitting &&
    chainDataReady &&
    (isMint || !wallet.isConnected || (burnQty > 0 && chainBurnReady));

  const handleSetMax = () => {
    setQty(String(isMint ? maxMintQty : effectiveHolding));
  };

  /** 点击 CTA：校验 → 未连接钱包引导连接 → 直接执行交易（无确认弹窗，简化交互） */
  const handleTradeClick = () => {
    if (!canSubmit) return;
    // Burn 持仓不足：立即给出错误提示
    if (burnExceedsHolding) {
      toastError(`Insufficient PASS holdings. You hold ${chainBurnable.length} PASS, tried to burn ${burnQty}.`);
      return;
    }
    if (!wallet.isConnected) {
      setConnectOpen(true);
      return;
    }
    chain.reset();
    void executeTrade();
  };

  /** 连接成功后的续接：直接执行交易 */
  const handleConnected = () => {
    chain.reset();
    void executeTrade();
  };

  /** 执行交易：mint / burn 均直接走真实链上交易，不再弹窗确认 */
  const executeTrade = async () => {
    if (isMint) {
      const txHashRes = await chain.mint(BigInt(qtyNum));
      if (!txHashRes) {
        // 用户拒绝 / 失败：失败原因由 useWriteContractTx 分类后经 toast 提示
        return;
      }

      const newSupply = supplyAfterMint(effectiveSupply, qtyNum);
      // P3-10：精确"下一枚"价（与顶部展示公式一致）
      const newPrice =
        curveCfg && effectiveSupply > 0
          ? Number(
              (curveCfg.basePrice * BigInt(newSupply + 1) * BigInt(newSupply + 1)) /
                (curveCfg.baseSupply * curveCfg.baseSupply),
            ) / 1e18
          : curvePriceAt(newSupply, effectiveSupply, effectivePrice);
      // 余额刷新：按链上精确成本（含手续费）扣减，而非单枚价×qty
      const costMon = chainCostMon !== undefined ? chainCostMon : qtyNum * effectivePrice;
      await wallet.refreshBalance(costMon);
      onTradeSuccess?.({ action: 'mint', amount: qtyNum, newSupply, newPrice });
      toastSuccess(`Minted ${qtyNum} ${kolName} PASS`);
      return;
    }

    // 链上 burn：联合曲线按曲线价回购，选中 token 全部销毁（多人套利是设计模型）
    const tokenIds = chainBurnable
      .filter((t) => burnSelected.has(t.toString()))
      .map((t) => BigInt(t));
    if (tokenIds.length === 0) {
      toastError('No PASS tokens selected to burn.');
      return;
    }
    const txHashRes = await chain.burn(tokenIds);
    if (!txHashRes) return;

    const burnAmt = tokenIds.length;
    const newSupply = supplyAfterBurn(effectiveSupply, burnAmt);
    const newPrice =
      chainPrice !== undefined && effectiveSupply > 0
        ? chainPrice * (newSupply * newSupply) / (effectiveSupply * effectiveSupply)
        : curvePriceAt(newSupply, effectiveSupply, effectivePrice);
    // 审计修复（P2-2）：burn 是入账，delta 传负数（mock 路径方向正确）。
    // real 模式走 balanceLoader 链上真实查询，忽略 delta。仅作为兜底估算。
    const refundMon = burnAmt * (chainPrice ?? 0);
    await wallet.refreshBalance(-refundMon);
    onTradeSuccess?.({ action: 'burn', amount: burnAmt, newSupply, newPrice });
    toastSuccess(`Burned ${burnAmt} ${kolName} PASS`);
  };

  // 无 PASS 合约 → 占位提示（KOL 未创建 PASS，无 mock 交易）
  if (!hasPass) {
    return (
      <div className="flex flex-col h-full bg-[#161616] border border-white/[0.04] rounded-lg p-6">
        <h3 className="text-[13px] font-bold uppercase tracking-[0.1em] mb-6">Trade Pass</h3>
        <div className="bg-[#0f0f0f] border border-white/[0.04] rounded p-5 text-center my-auto">
          <p className="text-white/30 text-[11px] font-mono">
            This KOL has not created a PASS contract yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#161616] border border-white/[0.04] rounded-lg p-6">
      <h3 className="text-[13px] font-bold uppercase tracking-[0.1em] mb-6">Trade Pass</h3>

      {/* 三卡片：当前价格 / 供应量 / 当前持仓（链上真实） */}
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

      {/* 数量输入（mint） */}
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
            Only {chainBurnable.length} PASS available to burn.
          </div>
        )}
        {/* 链上 burn：token 选择列表（联合曲线回购，ERC721Enumerable 枚举） */}
        {!isMint && (
          <div className="mt-3 border border-white/[0.06] rounded-lg p-3 bg-[#0a0a0a]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]">
                Your PASS Tokens
              </span>
              <span className="text-white/50 text-[9px] font-mono">
                {burnSelected.size}/{chainBurnable.length} selected
              </span>
            </div>
            {chainBurnable.length === 0 ? (
              <div className="text-amber-400/80 text-xs font-mono leading-relaxed">
                {!wallet.isConnected
                  ? 'Connect your wallet to view your PASS tokens.'
                  : chainHolding === undefined
                    ? 'Loading your PASS tokens...'
                    : 'You hold 0 PASS of this KOL. Mint first, then come back to burn.'}
              </div>
            ) : (
              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                {chainBurnable.map((tid) => {
                  const key = tid.toString();
                  const checked = burnSelected.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setBurnSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(key)) next.delete(key);
                          else next.add(key);
                          return next;
                        });
                      }}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 rounded text-[11px] font-mono transition-colors border',
                        checked
                          ? 'bg-red-500/15 border-red-500/40 text-red-300'
                          : 'bg-white/[0.03] border-white/[0.04] text-white/70 hover:bg-white/[0.06]',
                      )}
                    >
                      <span>Token #{tid.toString()}</span>
                      <span className={cn('text-[9px] font-bold', checked ? 'text-red-300' : 'text-white/30')}>
                        {checked ? 'SELECTED' : '—'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
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
            {displayTotalAmount.toFixed(6)} MON
          </span>
        </div>
        <div className="flex justify-between text-white/50">
          <span>Est. New Price</span>
          <span className="text-white">{newPrice.toFixed(6)} MON</span>
        </div>
        <div className="flex justify-between font-bold text-white pt-3 border-t border-white/[0.04]">
          <span>{isMint ? 'Total' : 'Net Receive'}</span>
          <span className="text-white">{displayTotalAmount.toFixed(6)} MON</span>
        </div>
      </div>

      {/* CTA — 未连接钱包也可点击（点击引导连接）；仅数量非法/数据未就绪/交易中禁用 */}
      <Button
        fullWidth
        size="lg"
        variant={isMint ? 'default' : 'danger'}
        onClick={handleTradeClick}
        disabled={!canSubmit}
        className={cn(
          'cursor-pointer',
          !wallet.isConnected && canSubmit && 'animate-pulse',
        )}
      >
        {isSubmitting
          ? (isMint ? 'Minting...' : 'Burning...')
          : !wallet.isConnected
            ? 'Connect Wallet to Trade'
            : !chainDataReady
              ? 'Loading Curve...'
              : isMint
                ? 'Mint PASS'
                : burnQty > 0
                  ? `Burn ${burnQty} PASS`
                  : chainHolding !== undefined && chainHolding === 0
                    ? 'No PASS to Burn'
                    : 'Select PASS to Burn'}
      </Button>
      {!wallet.isConnected && isQtyValid && (
        <div className="text-[#3ec470]/70 text-[9px] text-center mt-2 font-bold tracking-wider">
          Connect your wallet to {isMint ? `mint ${kolName}'s PASS` : `burn ${kolName}'s PASS`}
        </div>
      )}
      <div className="text-white/30 text-[9px] italic text-center mt-4">
        PASS follows a bonding curve — burning refunds at curve price. Prices may slip.
      </div>

      {/* 钱包连接引导（交易直接执行，无确认弹窗） */}
      <ConnectModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        onConnected={handleConnected}
      />
    </div>
  );
}
