import { Link } from 'react-router-dom';
import { Coins, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

/**
 * Claim — 领取奖励功能尚未部署链上合约。
 * 删除全部 mock 数据（useClaim / mockClaimHistory），链上接入后显示真实领取记录。
 */
export default function ClaimPage() {
  return (
    <div className="min-h-screen bg-transparent pt-32 pb-24 font-sans text-white relative">
      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        <Link to="/" className="flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors font-bold text-sm tracking-wide">
          <ArrowLeft className="w-4 h-4" /> BACK
        </Link>

        <div className="bg-[#161616] border border-white/[0.04] rounded-2xl p-16 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#0f0f0f] border border-white/[0.06] flex items-center justify-center">
            <Coins className="w-9 h-9 text-white/30" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mb-3">Claim Rewards Coming Soon</h1>
          <p className="text-white/40 text-[13px] max-w-md mx-auto leading-relaxed mb-8">
            Claim staking and dividend rewards. The claiming contract has not been deployed yet.
          </p>
          <Link to="/auctions">
            <Button>Browse Live Auctions</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
