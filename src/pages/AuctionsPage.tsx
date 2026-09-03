import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, Clock, AlertCircle, Gavel, X } from 'lucide-react';
import { parseEther } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import { KolAvatar } from '../components/kol/KolAvatar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../hooks/useToast';
import { useWalletStore } from '../stores/walletStore';
import { ConnectModal } from '../components/wallet/ConnectModal';
import { useRegistry } from '../web3/hooks/useRegistry';
import { useFactory } from '../web3/hooks/useFactory';
import { kolProfilePath, auctionDetailPath } from '../config/routes';
import { cn } from '../utils/cn';
import { shortenAddress } from '../utils/format';
import { contractAddresses, registryAbi } from '../web3/contracts';
import { useReadContract } from '../web3/hooks/useReadContract';
import { useAuction } from '../web3/hooks/useAuction';
import type { AuctionData } from '../web3/hooks/useAuction';
import type { KolData } from '../web3/hooks/useRegistry';

type FilterTab = 'ALL' | 'LIVE' | 'UPCOMING';

/**
 * 首页拍卖列表 — 全部来自 Monad 测试网链上真实数据：
 * NadbidRegistry 索引（kolList → getKol().auctionContracts）+ 各 KolAuction 状态。
 * 无任何 mock 数据。Registry 地址未配置时显示「合约未部署」提示。
 */

/** MVP：Registry.kolList 枚举上限（合约无 getKolCount，读越界返回 0x0 即忽略） */
const MAX_REGISTRY_INDEX = 8;
const ZERO_ADDRESS: `0x${string}` = '0x0000000000000000000000000000000000000000';

// Countdown hook for auction cards
function useCountdown(targetDate: number) {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, targetDate - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = targetDate - Date.now();
      setTimeLeft(remaining > 0 ? remaining : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);
  const totalSeconds = Math.floor(timeLeft / 1000);
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return { timeString, totalSeconds };
}

/** 链上拍卖展示状态派生：settled 优先；其次按 endTime / startTime 判定 ENDED / UPCOMING / LIVE */
function deriveChainStatus(data: AuctionData): 'LIVE' | 'UPCOMING' | 'ENDED' | 'SETTLED' {
  if (data.settled) return 'SETTLED';
  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec >= Number(data.endTime)) return 'ENDED';
  if (nowSec < Number(data.startTime)) return 'UPCOMING';
  return 'LIVE';
}

/* ============================================================================
 * 链上路径：Registry 索引 + 各 KolAuction 状态
 * ========================================================================== */

interface ChainAuctionCardProps {
  /** KolAuction 合约地址（卡片 id，点击进入 /auctions/0x... 链上详情） */
  auctionAddress: `0x${string}`;
  /** KOL 钱包地址（Registry.getKol 的 key） */
  kolAddress: `0x${string}`;
  /** Registry.getKol() 的 KOL 结构（含 twitterHandle / auctionContracts 索引） */
  kolData: KolData | undefined;
  filter: FilterTab;
  search: string;
  onVisibility: (key: string, visible: boolean) => void;
}

/** 链上拍卖卡片 — 数据来自 useAuction(auctionAddress).getAuction() */
function ChainAuctionCard({
  auctionAddress,
  kolAddress,
  kolData,
  filter,
  search,
  onVisibility,
}: ChainAuctionCardProps) {
  const { auctionData } = useAuction(auctionAddress);
  const { info } = useToast();

  // KOL 展示信息：链上仅 kol 地址 + twitterHandle（注册时填写）；无 handle 时回退 shortenAddress
  const hasHandle = !!kolData?.twitterHandle && kolData.twitterHandle.trim() !== '';
  const kolName = hasHandle ? kolData!.twitterHandle.replace(/^@/, '') : shortenAddress(kolAddress);
  const kolHandle = hasHandle ? kolData!.twitterHandle : shortenAddress(kolAddress);
  // KOL 头像/名称链接：链上 KOL 以钱包地址为唯一身份（KolProfilePage 对 0x 开头的 handle
  // 直接解析 Registry.getKol(wallet).passContracts[0]），不再用 handle 查找 mock 数据
  const profileTo = kolAddress !== ZERO_ADDRESS ? kolProfilePath(kolAddress) : undefined;

  const status = auctionData ? deriveChainStatus(auctionData) : undefined;
  const isLive = status === 'LIVE';

  const fixedBid = auctionData ? Number(auctionData.fixedBidAmount) / 1e18 : 0;
  const lastBidder =
    auctionData && auctionData.lastBidder !== ZERO_ADDRESS ? auctionData.lastBidder : null;
  const targetTime = auctionData
    ? isLive
      ? Number(auctionData.endTime) * 1000
      : Number(auctionData.startTime) * 1000
    : 0; // 数据未加载时不渲染倒计时（组件会在 !auctionData 时 return null，0 无害）
  const { timeString, totalSeconds } = useCountdown(targetTime);

  // 过滤 / 搜索：数据未加载（auctionData undefined）时不展示，避免空数据闪卡
  const matchesFilter =
    filter === 'ALL' || (filter === 'LIVE' && isLive) || (filter === 'UPCOMING' && status === 'UPCOMING');
  const searchLower = search.trim().toLowerCase();
  const matchesSearch =
    !searchLower ||
    kolName.toLowerCase().includes(searchLower) ||
    kolHandle.toLowerCase().includes(searchLower);
  const included = !!auctionData && matchesFilter && matchesSearch;

  // 向父级上报可见性（用于链上路径的空态判定）
  useEffect(() => {
    onVisibility(auctionAddress, included);
  }, [auctionAddress, included, onVisibility]);

  if (!included || !auctionData) return null;

  const statusBadge =
    status === 'LIVE' ? (
      <Badge variant="live" pulse>Live</Badge>
    ) : status === 'UPCOMING' ? (
      <Badge variant="upcoming">Upcoming</Badge>
    ) : status === 'SETTLED' ? (
      <Badge variant="settled">Settled</Badge>
    ) : (
      <Badge variant="ended">Ended</Badge>
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#161616] border border-white/[0.04] p-6 rounded-2xl flex flex-col hover:border-white/10 transition-colors duration-300 relative overflow-hidden group"
    >
      {/* Top: Avatar + Name + Status */}
      <div className="flex justify-between items-start mb-5 relative z-10">
        {profileTo ? (
          <Link to={profileTo} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="w-14 h-14 rounded-full border-2 border-[#1a1a1a] bg-black/50 overflow-hidden flex items-center justify-center">
              <KolAvatar handle={kolHandle} name={kolName} className="!w-full !h-full !rounded-full !border-0" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-white font-black text-lg tracking-tight leading-tight hover:text-[#3ec470] transition-colors">{kolName}</h3>
              <span className="text-white/40 text-[11px] font-mono">{kolHandle}</span>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full border-2 border-[#1a1a1a] bg-black/50 overflow-hidden flex items-center justify-center">
              <KolAvatar handle={kolHandle} name={kolName} className="!w-full !h-full !rounded-full !border-0" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-white font-black text-lg tracking-tight leading-tight">{kolName}</h3>
              <span className="text-white/40 text-[11px] font-mono">{kolHandle}</span>
            </div>
          </div>
        )}

        {statusBadge}
      </div>

      {/* Follow on X — 有链上 handle 时真实跳转该 KOL 推特，否则提示 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (hasHandle) {
            window.open(`https://x.com/${kolData!.twitterHandle.replace(/^@/, '')}`, '_blank', 'noopener,noreferrer');
          } else {
            info('No X handle registered on-chain yet');
          }
        }}
        className="w-full bg-[#0a0a0a] border border-white/[0.06] text-white/70 hover:text-white text-[10px] font-bold uppercase tracking-[0.15em] py-2.5 rounded-lg hover:bg-white/[0.02] hover:border-white/10 transition-all mb-6 relative z-10"
      >
        Follow on X
      </button>

      {/* Data Blocks */}
      <div className="flex flex-col gap-2 mb-6 relative z-10">
        <div className="bg-[#0f0f0f] border border-white/[0.04] rounded-xl p-4 flex items-center justify-between">
          <span className="text-white/40 text-[10px] font-bold uppercase tracking-[0.15em]">{isLive ? 'Fixed Bid' : 'Fixed Bid'}</span>
          <span className="text-[#3ec470] font-mono text-lg font-bold">
            {fixedBid.toFixed(1)} <span className="text-[10px] text-[#3ec470]/50">MON</span>
          </span>
        </div>

        <div className="bg-[#0f0f0f] border border-white/[0.04] rounded-xl p-4 flex items-center justify-between">
          <span className="text-white/40 text-[10px] font-bold uppercase tracking-[0.15em]">Last Bidder</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-white/10 overflow-hidden flex items-center justify-center">
              {lastBidder && <div className="w-2 h-2 rounded-full bg-[#3ec470]/50"></div>}
            </div>
            <span className="text-white/90 font-mono text-sm">
              {lastBidder ? shortenAddress(lastBidder) : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Countdown */}
      <div className="flex items-center justify-between mb-5 pb-5 border-b border-white/[0.04] mt-auto relative z-10">
        <span className="text-white/40 text-[10px] font-bold tracking-[0.15em] uppercase">{isLive ? 'Status' : 'Starts In'}</span>
        <div className={cn('flex items-center gap-1.5 font-mono text-sm font-bold', isLive ? 'text-[#3ec470]' : 'text-white/70')}>
          {isLive ? (
            <span className="animate-pulse">IN PROGRESS ({totalSeconds}s)</span>
          ) : (
            <>
              <Clock className="w-3.5 h-3.5 opacity-70" />
              <span>{timeString}</span>
            </>
          )}
        </div>
      </div>

      {/* CTA Button — 链上卡片 id 直接传合约地址（Task 11 双路径：0x → 链上详情） */}
      <Link to={auctionDetailPath(auctionAddress)} className="relative z-10">
        <Button fullWidth variant={isLive ? 'default' : 'secondary'}>
          Enter Auction
        </Button>
      </Link>
    </motion.div>
  );
}

interface ChainKolSlotProps {
  /** Registry.kolList 索引 */
  index: number;
  filter: FilterTab;
  search: string;
  onVisibility: (key: string, visible: boolean) => void;
}

/** 枚举 Registry.kolList[index] → getKol(kol).auctionContracts → 渲染该 KOL 的所有链上拍卖卡片 */
function ChainKolSlot({ index, filter, search, onVisibility }: ChainKolSlotProps) {
  const kolListRes = useReadContract({
    address: contractAddresses.registry,
    abi: registryAbi,
    functionName: 'kolList',
    args: [BigInt(index)],
  });
  const kolAddress = kolListRes.data as `0x${string}` | undefined;
  const isEmpty = !kolAddress || kolAddress.toLowerCase() === ZERO_ADDRESS;

  const kolRes = useReadContract({
    address: contractAddresses.registry,
    abi: registryAbi,
    functionName: 'getKol',
    args: [kolAddress ?? ZERO_ADDRESS],
    query: { enabled: !isEmpty },
  });
  const kolData = kolRes.data as KolData | undefined;
  const auctionContracts = kolData?.auctionContracts ?? [];

  return (
    <>
      {auctionContracts.map((addr) => (
        <ChainAuctionCard
          key={addr}
          auctionAddress={addr}
          kolAddress={kolAddress ?? ZERO_ADDRESS}
          kolData={kolData}
          filter={filter}
          search={search}
          onVisibility={onVisibility}
        />
      ))}
    </>
  );
}

/** 链上拍卖列表视图 — 统一收集子卡片可见性以支持空态 */
function ChainAuctionsView({ filter, search }: { filter: FilterTab; search: string }) {
  const [visibleKeys, setVisibleKeys] = useState<ReadonlySet<string>>(new Set());

  const onVisibility = useCallback((key: string, visible: boolean) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (visible) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: MAX_REGISTRY_INDEX }, (_, i) => (
          <ChainKolSlot key={i} index={i} filter={filter} search={search} onVisibility={onVisibility} />
        ))}
      </div>

      {visibleKeys.size === 0 && (
        <div className="text-center py-24 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
          <AlertCircle className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 font-medium">No on-chain auctions found yet.</p>
        </div>
      )}
    </>
  );
}

/** datetime-local 输入框当前值（本地时区，无秒） */
function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ============================================================================
 * 创建拍卖弹窗（拍卖 Tab 主入口）
 * 业务规则：
 *  - 需连接钱包 + 已注册 KOL + 已缴纳担保金（canCreate）
 *  - 需已有 PASS 合约（拍卖绑定 PASS，合约侧校验 NOT_OWN_PASS）
 *  - 开始时间：默认立即开始；选择未来时间 → 预约开始（createKolAuctionScheduled）
 * ========================================================================== */
function CreateAuctionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const wallet = useWalletStore();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const account = wallet.isConnected && wallet.address ? (wallet.address as `0x${string}`) : undefined;
  const registry = useRegistry(account);
  const factory = useFactory();

  const [connectOpen, setConnectOpen] = useState(false);
  const [fixedBid, setFixedBid] = useState('99');
  const [duration, setDuration] = useState('120');
  const [content, setContent] = useState('');
  const [startAt, setStartAt] = useState(() => toLocalInputValue(new Date()));
  const [passAddr, setPassAddr] = useState<`0x${string}` | ''>('');

  const passContracts = registry.kolData?.passContracts ?? [];
  const isRegistered = registry.isRegistered === true;
  const canCreate = registry.canCreate === true;

  // 默认选中最近创建的 PASS 合约
  useEffect(() => {
    if (passAddr === '' && passContracts.length > 0) {
      setPassAddr(passContracts[passContracts.length - 1]);
    }
  }, [passContracts, passAddr]);

  if (!open) return null;

  /** 表单校验 + 提交：立即开始 → createKolAuction；未来开始 → createKolAuctionScheduled */
  const handleCreate = async () => {
    if (!account || !passAddr) return;
    const fixedBidNum = Number(fixedBid);
    const durationNum = Number(duration);
    if (!(fixedBidNum > 0)) { toastError('Enter a valid fixed bid amount'); return; }
    if (!(durationNum > 0)) { toastError('Enter a valid duration'); return; }
    if (!content.trim()) { toastError('Describe the auction content'); return; }
    const startMs = new Date(startAt).getTime();
    if (Number.isNaN(startMs)) { toastError('Invalid start time'); return; }
    const startSec = Math.floor(startMs / 1000);
    const nowSec = Math.floor(Date.now() / 1000);

    const base = {
      passContract: passAddr,
      fixedBidAmount: parseEther(fixedBid.trim()),
      duration: BigInt(durationNum),
      content: content.trim().slice(0, 200),
    };
    const onSuccess = () => {
      queryClient.invalidateQueries();
      success('Auction created!');
      onClose();
    };
    // 未来时间 → 预约开始；否则立即开始
    const res =
      startSec > nowSec
        ? await factory.createKolAuctionScheduled({ ...base, startTime: BigInt(startSec) }, { onSuccess })
        : await factory.createKolAuction(base, { onSuccess });
    if (!res && factory.error) toastError(factory.error);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !factory.isLoading) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="bg-[#161616] border border-white/[0.08] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#3ec470]/10 flex items-center justify-center">
              <Gavel className="w-4 h-4 text-[#3ec470]" />
            </div>
            <h2 className="text-white font-black text-lg tracking-tight">Create Auction</h2>
          </div>
          <button
            onClick={onClose}
            disabled={factory.isLoading}
            className="w-8 h-8 rounded-lg bg-white/[0.05] text-white/50 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 分层前置校验 */}
        {!account ? (
          <div className="text-center py-10">
            <p className="text-white/40 text-sm mb-6">Connect your wallet to create an auction.</p>
            <Button fullWidth onClick={() => setConnectOpen(true)}>Connect Wallet</Button>
            <ConnectModal open={connectOpen} onClose={() => setConnectOpen(false)} />
          </div>
        ) : !isRegistered ? (
          <div className="text-center py-10 space-y-4">
            <AlertCircle className="w-10 h-10 text-white/20 mx-auto" />
            <p className="text-white/60 text-sm">You are not a registered KOL yet.</p>
            <Link to="/kol/onboarding" onClick={onClose}>
              <Button fullWidth variant="secondary">Go to KOL Onboarding</Button>
            </Link>
          </div>
        ) : passContracts.length === 0 ? (
          <div className="text-center py-10 space-y-4">
            <AlertCircle className="w-10 h-10 text-white/20 mx-auto" />
            <p className="text-white/60 text-sm">
              You need a PASS contract first. Create one in KOL Onboarding.
            </p>
            <Link to="/kol/onboarding" onClick={onClose}>
              <Button fullWidth variant="secondary">Create PASS in Onboarding</Button>
            </Link>
          </div>
        ) : !canCreate ? (
          <div className="text-center py-10 space-y-4">
            <AlertCircle className="w-10 h-10 text-white/20 mx-auto" />
            <p className="text-white/60 text-sm">You have no active creation eligibility (bond required).</p>
            <Link to="/kol/onboarding" onClick={onClose}>
              <Button fullWidth variant="secondary">Bond in KOL Onboarding</Button>
            </Link>
          </div>
        ) : (
          /* 创建表单 */
          <div className="space-y-4">
            {/* PASS 合约选择 */}
            <div>
              <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
                PASS Contract
              </label>
              <select
                value={passAddr}
                onChange={(e) => setPassAddr(e.target.value as `0x${string}`)}
                disabled={factory.isLoading}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#3ec470]/50 disabled:opacity-50"
              >
                {passContracts.map((addr) => (
                  <option key={addr} value={addr} className="bg-[#161616]">
                    {shortenAddress(addr)}
                  </option>
                ))}
              </select>
            </div>

            {/* 固定出价 + 时长 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
                  Fixed Bid (MON)
                </label>
                <input
                  type="number" step="0.01" min="0.01"
                  value={fixedBid}
                  onChange={(e) => setFixedBid(e.target.value)}
                  disabled={factory.isLoading}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#3ec470]/50 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
                  Duration (sec)
                </label>
                <input
                  type="number" step="1" min="1" max="86400"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  disabled={factory.isLoading}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#3ec470]/50 disabled:opacity-50"
                />
              </div>
            </div>

            {/* 开始时间（预约） */}
            <div>
              <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
                Start Time
              </label>
              <input
                type="datetime-local"
                value={startAt}
                min={toLocalInputValue(new Date())}
                onChange={(e) => setStartAt(e.target.value)}
                disabled={factory.isLoading}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#3ec470]/50 disabled:opacity-50"
              />
              <p className="text-[10px] text-white/30 mt-1.5">
                Leave as now to start immediately; pick a future time to schedule the auction start.
              </p>
            </div>

            {/* 拍卖内容 */}
            <div>
              <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
                Auction Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, 200))}
                disabled={factory.isLoading}
                rows={3}
                maxLength={200}
                placeholder="Describe what the winner receives (e.g. 1-hour private call, signed merch, etc.)"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#3ec470]/50 disabled:opacity-50 resize-none"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-white/30">Max 200 characters (on-chain limit)</span>
                <span className="text-[10px] font-mono text-white/40">{content.length}/200</span>
              </div>
            </div>

            <Button fullWidth onClick={handleCreate} loading={factory.isLoading} disabled={factory.isAddressMissing}>
              {factory.isAddressMissing ? 'Contract Not Deployed' : 'Create Auction'}
            </Button>
            {factory.error && <p className="text-xs text-red-400">{factory.error}</p>}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function AuctionsPage() {
  const [filter, setFilter] = useState<FilterTab>('ALL');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  // Registry 地址已配置 → 链上真实数据；未配置 → 显示「合约未部署」
  const registryConfigured = contractAddresses.registry !== undefined;

  return (
    <div className="min-h-screen bg-transparent pt-32 pb-24 font-sans relative">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white mb-3">Live Auctions</h1>
            <p className="text-white/50 text-sm max-w-xl leading-relaxed">
              Discover and bid on exclusive KOL PASS distributions.
              Secure your yield and priority access through our fair-launch auction mechanism.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search KOLs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#161616] border border-white/10 rounded-full py-3 pl-12 pr-6 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#3ec470] transition-colors"
              />
              <Search className="w-4 h-4 text-white/30 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 bg-[#161616] p-1.5 rounded-full border border-white/10 w-full sm:w-auto">
              {(['ALL', 'LIVE', 'UPCOMING'] as FilterTab[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'flex-1 sm:flex-none px-6 py-2 rounded-full text-xs font-bold tracking-wider transition-colors',
                    filter === f
                      ? 'bg-white/10 text-white'
                      : 'text-white/40 hover:text-white/80'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Create Auction 入口（拍卖 Tab 主入口） */}
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 bg-[#3ec470] text-black text-xs font-black uppercase tracking-wider px-6 py-3 rounded-full hover:bg-[#4ade80] transition-colors shadow-[0_0_20px_rgba(62,196,112,0.15)]"
            >
              <Gavel className="w-4 h-4" />
              Create Auction
            </button>
          </div>
        </div>

        {/* Auction Grid — 纯链上真实数据（无 mock） */}
        {registryConfigured ? (
          <ChainAuctionsView filter={filter} search={search} />
        ) : (
          <div className="text-center py-24 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
            <AlertCircle className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40 font-medium">Registry contract not deployed. Set VITE_CONTRACT_REGISTRY.</p>
          </div>
        )}
      </div>

      {/* 创建拍卖弹窗 */}
      <CreateAuctionModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
