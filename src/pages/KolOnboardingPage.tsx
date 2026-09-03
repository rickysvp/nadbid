import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { parseEther } from 'viem';
import {
  Wallet,
  Twitter,
  Coins,
  Layers,
  Gavel,
  Check,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { KolOnboardingCard, type StepStatus } from '../components/kol/KolOnboardingCard';
import { ConnectModal } from '../components/wallet/ConnectModal';
import { useWalletStore } from '../stores/walletStore';
import { useRegistry } from '../web3/hooks/useRegistry';
import { useFactory } from '../web3/hooks/useFactory';
import { useToast } from '../hooks/useToast';
import { shortenAddress } from '../utils/format';

// ============================================================================
// 步骤定义
// ============================================================================

interface StepDef {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const STEPS: StepDef[] = [
  {
    title: 'Connect Wallet',
    description: 'Connect your wallet to begin onboarding',
    icon: <Wallet className="h-4 w-4" />,
  },
  {
    title: 'Verify Twitter',
    description: 'Verify followers and register on-chain',
    icon: <Twitter className="h-4 w-4" />,
  },
  {
    title: 'Bond 10 MON',
    description: 'Deposit collateral to become a verified KOL',
    icon: <Coins className="h-4 w-4" />,
  },
  {
    title: 'Create PASS',
    description: 'Deploy your PASS NFT collection',
    icon: <Layers className="h-4 w-4" />,
  },
  {
    title: 'Create Auction',
    description: 'Launch your first fixed-price auction',
    icon: <Gavel className="h-4 w-4" />,
  },
];

// ============================================================================
// 页面组件
// ============================================================================

export default function KolOnboardingPage() {
  const { isConnected, address, isConnecting, disconnect } = useWalletStore();
  const { success, error: toastError, info } = useToast();
  const queryClient = useQueryClient();

  // 真实钱包连接弹窗（wagmi）
  const [connectOpen, setConnectOpen] = useState(false);

  const registry = useRegistry(
    (address ?? undefined) as `0x${string}` | undefined,
  );
  const factory = useFactory();

  // ---- 本地表单状态 ----
  const [twitterHandle, setTwitterHandle] = useState('');
  const [twitterVerified, setTwitterVerified] = useState(false);
  const [twitterFollowers, setTwitterFollowers] = useState(0);
  const [isVerifyingTwitter, setIsVerifyingTwitter] = useState(false);
  const [mintPrice, setMintPrice] = useState('0.001');

  // ---- 从链上数据推导已完成步骤 ----
  const completedSteps = useMemo(() => {
    const completed = new Set<number>();
    if (isConnected) completed.add(0);
    if (registry.isRegistered) completed.add(1);
    if (registry.hasBond) completed.add(2);
    if (registry.kolData?.passContracts && registry.kolData.passContracts.length > 0)
      completed.add(3);
    if (
      registry.kolData?.auctionContracts &&
      registry.kolData.auctionContracts.length > 0
    )
      completed.add(4);
    return completed;
  }, [
    isConnected,
    registry.isRegistered,
    registry.hasBond,
    registry.kolData,
  ]);

  // 当前激活步骤 = 第一个未完成的步骤
  const [currentStep, setCurrentStep] = useState(0);
  useEffect(() => {
    for (let i = 0; i < STEPS.length; i++) {
      if (!completedSteps.has(i)) {
        setCurrentStep(i);
        return;
      }
    }
    setCurrentStep(STEPS.length); // 全部完成
  }, [completedSteps]);

  // ---- X OAuth 回调参数解析：success 时缓存票据，待钱包地址恢复后验证 ----
  // 注意：X 授权会整页跳转（window.location.href），返回时 wagmi autoConnect
  // 是异步恢复钱包的，address 初始为 null。若在此刻立即调 verify-ticket 会
  // 因缺 wallet 参数报 "missing wallet"。因此这里只解析参数，验证放在依赖
  // address 的 effect 中执行；用户未连接钱包时提示先连接，连接后自动补验证。
  const pendingTicketRef = useRef<string | null>(null);
  const warnedNoWalletRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const xoauth = params.get('xoauth');
    if (xoauth === 'success') {
      const ticket = params.get('ticket') || '';
      // 清理 URL（去掉回调参数，避免刷新重复触发）
      window.history.replaceState({}, '', window.location.pathname);
      if (!ticket) {
        toastError('X authorization succeeded but verification ticket is missing.');
        return;
      }
      pendingTicketRef.current = ticket;
      warnedNoWalletRef.current = false;
    } else if (xoauth === 'denied') {
      window.history.replaceState({}, '', window.location.pathname);
      info('X authorization cancelled.');
    } else if (xoauth === 'error') {
      window.history.replaceState({}, '', window.location.pathname);
      const stage = params.get('stage') || '';
      const message = params.get('message') || 'OAuth callback failed';
      toastError(`X authorization failed (${stage}): ${message}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 等钱包地址可用后执行票据验证（autoConnect 恢复 address 后自动触发；
  // 未连接钱包时给出明确提示，连接后仍可自动补验证）
  useEffect(() => {
    const ticket = pendingTicketRef.current;
    if (!ticket) return;
    if (!address) {
      if (!warnedNoWalletRef.current) {
        warnedNoWalletRef.current = true;
        toastError('Wallet not connected — please connect your wallet to complete X verification.');
      }
      return;
    }
    // 地址已就绪，执行验证并清除待处理票据
    pendingTicketRef.current = null;
    (async () => {
      try {
        const walletParam = encodeURIComponent(address);
        const r = await fetch(
          `/api/kol/verify-ticket?ticket=${encodeURIComponent(ticket)}&wallet=${walletParam}`
        );
        const data = (await r.json()) as {
          verified?: boolean;
          username?: string;
          followers?: number;
          error?: string;
        };
        if (r.ok && data.verified && data.username) {
          setTwitterHandle(data.username);
          setTwitterVerified(true);
          setTwitterFollowers(data.followers ?? 0);
          success(
            `X account @${data.username} verified — ${(data.followers ?? 0).toLocaleString()} followers`,
          );
        } else if (r.ok && data.username) {
          setTwitterHandle(data.username);
          setTwitterFollowers(data.followers ?? 0);
          toastError(
            `@${data.username} has ${(data.followers ?? 0).toLocaleString()} followers — need 1,000+ to become a KOL`,
          );
        } else {
          toastError(`X verification failed: ${data.error || 'invalid ticket'}`);
        }
      } catch {
        toastError('X verification failed — please try authorizing again.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const allDone = currentStep >= STEPS.length;
  const contractsMissing = registry.isAddressMissing || factory.isAddressMissing;

  /** 交易成功后失效所有读查询，刷新链上状态 */
  const invalidateAll = () => {
    queryClient.invalidateQueries();
  };

  const getStepStatus = (index: number): StepStatus => {
    if (completedSteps.has(index)) return 'completed';
    if (index === currentStep) return 'active';
    return 'locked';
  };

  // ==========================================================================
  // Step 1: 验证推特 + 注册 KOL
  // ==========================================================================

  const handleVerifyTwitter = async () => {
    // 必须已连接钱包：X 授权票据会绑定当前钱包（防止同一 X 身份被多钱包冒用）
    if (!address) {
      toastError('Please connect your wallet before verifying Twitter');
      return;
    }
    // 方式改为 X OAuth 授权：跳转 X 登录本人账号授权，回调后带回 username/followers
    setIsVerifyingTwitter(true);
    try {
      // 绑定当前钱包地址：ticket 只允许该钱包使用（防止同一 X 身份被多钱包冒用）
      const walletParam = encodeURIComponent(address);
      const res = await fetch(`/api/kol/x-auth-url?wallet=${walletParam}`);
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data = await res.json();
      if (data.authUrl) {
        // 保存原 handle（如有），供 OAuth 成功后校对；直接跳转 X 授权页
        window.location.href = data.authUrl;
      } else {
        toastError('OAuth not configured on server');
        setIsVerifyingTwitter(false);
      }
    } catch {
      // 安全策略：server 不可达时不得静默视为验证通过（否则可绕过粉丝门槛注册）。
      // 明确报错并停留在未验证状态；用户偏好真实数据，不提供 mock 降级路径。
      toastError(
        'Verification server unreachable. X OAuth is required to verify your account — please try again.',
      );
      setIsVerifyingTwitter(false);
    }
  };

  const handleRegisterKol = async () => {
    if (!twitterVerified) {
      toastError('Please verify your Twitter handle first');
      return;
    }
    if (registry.isAddressMissing) {
      toastError('Registry contract not deployed. Set VITE_CONTRACT_REGISTRY in .env');
      return;
    }
    const handle = twitterHandle.trim().replace(/^@/, '');
    await registry.registerKol(handle, BigInt(twitterFollowers), {      onSuccess: () => {
        success('KOL registered on-chain!');
        invalidateAll();
      },
    });
  };

  // ==========================================================================
  // Step 2: 质押担保金
  // ==========================================================================

  const handleDepositBond = async () => {
    if (registry.isAddressMissing) {
      toastError('Registry contract not deployed.');
      return;
    }
    await registry.depositBond({
      onSuccess: () => {
        success('Bond deposited — you are now a verified KOL!');
        invalidateAll();
      },
    });
  };

  // ==========================================================================
  // Step 3: 创建 PASS
  // ==========================================================================

  const handleCreatePass = async () => {
    if (factory.isAddressMissing) {
      toastError('Factory contract not deployed. Set VITE_CONTRACT_FACTORY in .env');
      return;
    }
    const price = parseEther(mintPrice || '0');
    await factory.createKolPass(price, {
      onSuccess: () => {
        success('PASS contract deployed successfully!');
        invalidateAll();
      },
    });
  };

  // ==========================================================================
  // Step 4（第 5 步）: 创建拍卖 — 主入口在拍卖 Tab（Auctions 页），此处仅引导
  // ==========================================================================

  // ==========================================================================
  // 各步骤内容渲染
  // ==========================================================================

  const renderStepContent = (index: number) => {
    const status = getStepStatus(index);

    // ---- 已完成：展示摘要 ----
    if (status === 'completed') {
      return <CompletedSummary index={index} />;
    }

    // ---- 未解锁 ----
    if (status === 'locked') {
      return null; // 卡片自身会显示锁定提示
    }

    // ---- 激活步骤：表单 ----
    switch (index) {
      case 0:
        return (
          <div className="space-y-4">
            {isConnected ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-mono font-bold text-sm">
                    {shortenAddress(address || '')}
                  </div>
                  <div className="text-xs text-white/40 mt-0.5">
                    Wallet connected
                  </div>
                </div>
                <Button variant="danger" size="sm" onClick={disconnect}>
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-white/50 text-sm mb-4">
                  Connect your wallet to begin the KOL onboarding process.
                </p>
                <Button onClick={() => setConnectOpen(true)} loading={isConnecting}>
                  <Wallet className="h-4 w-4" /> Connect Wallet
                </Button>
              </div>
            )}
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            {/* X OAuth 授权（验证本人账号） */}
            <div>
              <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
                Connect X Account
              </label>
              <p className="text-xs text-white/40 mb-3">
                Authorize with X to verify this is your account. We never ask for your
                password — X handles the login.
              </p>
              <div className="flex gap-2 items-center">
                {twitterVerified ? (
                  <div className="flex-1 flex items-center gap-2 bg-black/40 border border-[#3ec470]/30 rounded-lg px-4 py-2.5">
                    <Check className="h-4 w-4 text-[#3ec470]" />
                    <span className="text-sm text-white font-medium">
                      @{twitterHandle.replace(/^@/, '')}
                    </span>
                    <span className="text-xs text-[#3ec470]">
                      {twitterFollowers.toLocaleString()} followers
                    </span>
                  </div>
                ) : twitterHandle ? (
                  <div className="flex-1 flex items-center gap-2 bg-black/40 border border-red-500/40 rounded-lg px-4 py-2.5">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <span className="text-sm text-white font-medium">
                      @{twitterHandle.replace(/^@/, '')}
                    </span>
                    <span className="text-xs text-red-400">
                      {twitterFollowers.toLocaleString()} followers
                    </span>
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleVerifyTwitter}
                    loading={isVerifyingTwitter}
                    className="flex-1 justify-center"
                  >
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Authorize with X
                  </Button>
                )}
              </div>
              {twitterVerified ? (
                <div className="mt-2 flex items-center gap-2 text-xs text-[#3ec470]">
                  <Check className="h-3 w-3" />
                  <span>
                    Identity verified via X OAuth — you control this account
                  </span>
                </div>
              ) : twitterHandle ? (
                <div className="mt-2 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-red-400 font-medium">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Minimum 1,000 followers required</span>
                  </div>
                  <p className="mt-1 text-xs text-red-300/70">
                    @{twitterHandle.replace(/^@/, '')} has{' '}
                    {twitterFollowers.toLocaleString()} followers — below the 1,000
                    threshold. Grow your audience and authorize again.
                  </p>
                </div>
              ) : (
                <div className="mt-2 text-xs text-white/30">
                  <span className="inline-flex items-center gap-1.5">
                    <Lock className="h-3 w-3" />
                    Secured by X OAuth 2.0 — only you can authorize your own account
                  </span>
                </div>
              )}
            </div>

            {/* 注册按钮 */}
            <div className="pt-2 border-t border-white/[0.04]">
              <p className="text-xs text-white/40 mb-3">
                Register your KOL profile on-chain with your verified X account.
              </p>
              <Button
                fullWidth
                onClick={handleRegisterKol}
                loading={registry.isLoading}
                disabled={!twitterVerified || registry.isAddressMissing}
              >
                {registry.isAddressMissing
                  ? 'Contract Not Deployed'
                  : 'Register KOL On-Chain'}
              </Button>
              {registry.error && (
                <p className="text-xs text-red-400 mt-2">{registry.error}</p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-black/30 rounded-lg p-4">
              <div>
                <div className="text-xs text-white/40 uppercase tracking-wider">
                  Bond Amount
                </div>
                <div className="text-xl font-black text-white font-mono mt-1">
                  10 <span className="text-sm text-white/40">MON</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#3ec470]/10 flex items-center justify-center">
                <Coins className="h-6 w-6 text-[#3ec470]" />
              </div>
            </div>
            <p className="text-xs text-white/40 leading-relaxed">
              Deposit 10 MON as collateral. This bond ensures KOL accountability and
              can be redeemed after a cooldown period if you choose to leave the
              platform.
            </p>
            <Button
              fullWidth
              onClick={handleDepositBond}
              loading={registry.isLoading}
              disabled={registry.isAddressMissing}
            >
              {registry.isAddressMissing
                ? 'Contract Not Deployed'
                : 'Deposit 10 MON Bond'}
            </Button>
            {registry.error && (
              <p className="text-xs text-red-400">{registry.error}</p>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
                PASS Mint Price (MON)
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={mintPrice}
                onChange={(e) => setMintPrice(e.target.value)}
                disabled={factory.isLoading}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white font-mono placeholder-white/20 focus:outline-none focus:border-[#3ec470]/50 disabled:opacity-50"
              />
              <p className="text-xs text-white/30 mt-1.5">
                The base price for minting your PASS NFT. Price follows a bonding
                curve as supply increases.
              </p>
            </div>
            <Button
              fullWidth
              onClick={handleCreatePass}
              loading={factory.isLoading}
              disabled={factory.isAddressMissing}
            >
              {factory.isAddressMissing
                ? 'Contract Not Deployed'
                : 'Deploy PASS Contract'}
            </Button>
            {factory.error && (
              <p className="text-xs text-red-400">{factory.error}</p>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="bg-[#0f0f0f] border border-white/[0.04] rounded-lg p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#3ec470]/10 flex items-center justify-center shrink-0">
                  <Gavel className="w-4 h-4 text-[#3ec470]" />
                </div>
                <div>
                  <p className="text-white/80 text-sm font-bold">Auctions are created on the Auctions tab</p>
                  <p className="text-white/40 text-xs mt-1 leading-relaxed">
                    Once your PASS contract is live, head to the Auctions page to launch your first
                    fixed-price auction — set the fixed bid, duration, content, and even schedule a
                    future start time.
                  </p>
                </div>
              </div>
              <Link to="/auctions">
                <Button fullWidth>Go to Auctions</Button>
              </Link>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ==========================================================================
  // 完成摘要子组件
  // ==========================================================================

  function CompletedSummary({ index }: { index: number }) {
    switch (index) {
      case 0:
        return (
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-lg bg-[#3ec470]/10 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-[#3ec470]" />
            </div>
            <span className="text-white/70 font-mono">
              {shortenAddress(address || '')}
            </span>
          </div>
        );
      case 1:
        return (
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-lg bg-[#3ec470]/10 flex items-center justify-center">
              <Twitter className="h-4 w-4 text-[#3ec470]" />
            </div>
            <span className="text-white/70">
              @{registry.kolData?.twitterHandle || twitterHandle.replace(/^@/, '')} ·{' '}
              {(Number(registry.kolData?.followers) || twitterFollowers).toLocaleString()}{' '}
              followers
            </span>
          </div>
        );
      case 2:
        return (
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-lg bg-[#3ec470]/10 flex items-center justify-center">
              <Coins className="h-4 w-4 text-[#3ec470]" />
            </div>
            <span className="text-white/70">10 MON bond deposited</span>
          </div>
        );
      case 3:
        return (
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-lg bg-[#3ec470]/10 flex items-center justify-center">
              <Layers className="h-4 w-4 text-[#3ec470]" />
            </div>
            <span className="text-white/70 font-mono text-xs">
              {registry.kolData?.passContracts.length || 0} PASS contract
              {(registry.kolData?.passContracts.length || 0) !== 1 ? 's' : ''}{' '}
              deployed
            </span>
          </div>
        );
      case 4:
        return (
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-lg bg-[#3ec470]/10 flex items-center justify-center">
              <Gavel className="h-4 w-4 text-[#3ec470]" />
            </div>
            <span className="text-white/70 font-mono text-xs">
              {registry.kolData?.auctionContracts.length || 0} auction
              {(registry.kolData?.auctionContracts.length || 0) !== 1 ? 's' : ''}{' '}
              created
            </span>
          </div>
        );
      default:
        return null;
    }
  }

  // ==========================================================================
  // 顶部步骤条
  // ==========================================================================

  const renderStepper = () => (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((s, i) => {
        const isDone = completedSteps.has(i);
        const isActive = i === currentStep && !isDone;
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  isDone
                    ? 'bg-[#3ec470] text-black'
                    : isActive
                      ? 'bg-[#3ec470]/10 text-[#3ec470] border-2 border-[#3ec470]'
                      : 'bg-white/5 text-white/30 border border-white/10'
                }`}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider hidden sm:block ${
                  isDone || isActive ? 'text-white/70' : 'text-white/25'
                }`}
              >
                {s.title}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${
                  completedSteps.has(i) ? 'bg-[#3ec470]/50' : 'bg-white/10'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  // ==========================================================================
  // 主渲染
  // ==========================================================================

  return (
    <div className="min-h-screen bg-transparent pt-28 pb-24">
      <div className="max-w-2xl mx-auto px-6 lg:px-12">
        {/* 标题 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">
            Become a KOL
          </h1>
          <p className="text-white/40 text-sm max-w-md mx-auto">
            Complete the steps below to register, stake, deploy your PASS, and
            launch your first auction.
          </p>
        </motion.div>

        {/* 合约未部署警告 */}
        {contractsMissing && (
          <div className="mb-6 flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
                Contracts Not Deployed
              </div>
              <p className="text-xs text-white/50 leading-relaxed">
                Registry or Factory contract address is not configured. Set{' '}
                <code className="text-amber-300/80">VITE_CONTRACT_REGISTRY</code> and{' '}
                <code className="text-amber-300/80">VITE_CONTRACT_FACTORY</code> in
                your <code className="text-amber-300/80">.env</code> file to enable
                on-chain interactions.
              </p>
            </div>
          </div>
        )}

        {/* 步骤条 */}
        {renderStepper()}

        {/* 全部完成 */}
        {allDone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-[#0d1f14] to-[#161616] border border-[#3ec470]/40 rounded-2xl p-8 text-center mb-6"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#3ec470] flex items-center justify-center shadow-0_20px_rgba(62,196,112,0.3)]">
              <Check className="h-8 w-8 text-black" />
            </div>
            <h2 className="text-xl font-black text-white mb-2">
              Onboarding Complete!
            </h2>
            <p className="text-white/50 text-sm mb-6">
              You are now a verified KOL with an active PASS collection and live
              auction.
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.open('/auctions', '_blank')}
              >
                <ExternalLink className="h-3.5 w-3.5" /> View Auctions
              </Button>
            </div>
          </motion.div>
        )}

        {/* 步骤卡片 */}
        <div className="space-y-4">
          {STEPS.map((step, i) => (
            <KolOnboardingCard
              key={i}
              step={i}
              title={step.title}
              description={step.description}
              icon={step.icon}
              status={getStepStatus(i)}
            >
              {renderStepContent(i)}
            </KolOnboardingCard>
          ))}
        </div>
      </div>

      {/* 真实钱包连接弹窗 */}
      <ConnectModal open={connectOpen} onClose={() => setConnectOpen(false)} />
    </div>
  );
}
