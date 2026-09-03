import { Link } from 'react-router-dom';
import { Trophy, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

/**
 * Points — 积分系统尚未上链。
 * 删除全部硬编码 mock 数据（积分余额 / 排名 / 来源明细 / 推荐列表），
 * 链上积分合约接入后显示真实数据。
 */
export default function PointsPage() {
  return (
    <div className="min-h-screen bg-transparent pt-32 pb-24 font-sans text-white relative">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-12 relative z-10">
        <Link to="/" className="flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors font-bold text-sm tracking-wide">
          <ArrowLeft className="w-4 h-4" /> BACK
        </Link>

        <div className="bg-[#161616] border border-white/[0.04] rounded-2xl p-16 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#0f0f0f] border border-white/[0.06] flex items-center justify-center">
            <Trophy className="w-9 h-9 text-white/30" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mb-3">Points Coming Soon</h1>
          <p className="text-white/40 text-[13px] max-w-md mx-auto leading-relaxed mb-8">
            Earn points by minting PASS, bidding in auctions, and referring friends. The points system has not been deployed on-chain yet.
          </p>
          <Link to="/auctions">
            <Button>Browse Live Auctions</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
