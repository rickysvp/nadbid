import { motion, AnimatePresence } from 'motion/react';
import { KolAvatar } from '../kol/KolAvatar';
import { Table, TableHeader, TableHead, TableBody, TableCell, TableEmpty } from '../ui/Table';
import { shortenAddress, formatRelativeTime } from '../../utils/format';
import type { Bid } from '../../types';

export interface BidBoardProps {
  bids: Bid[];
  /** 当前最高出价者地址（高亮显示） */
  leadingBidder?: string;
  className?: string;
}

/**
 * 出价排行榜 — 从 AuctionDetailView 提取
 * 展示：排名、出价者、出价金额、时间
 */
export function BidBoard({ bids, leadingBidder, className }: BidBoardProps) {
  const sortedBids = [...bids].sort((a, b) => b.amount - a.amount);

  return (
    <div className={className}>
      <h3 className="text-lg font-bold text-white tracking-wide mb-4">Bid History</h3>
      <Table>
        <TableHeader>
          <tr>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Bidder</TableHead>
            <TableHead className="text-right">Bid ($MON)</TableHead>
            <TableHead className="text-right">Time</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          <AnimatePresence>
            {sortedBids.map((bid, index) => (
              <motion.tr
                key={bid.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01] transition-colors ${
                  leadingBidder === bid.bidder ? 'bg-[#3ec470]/5' : ''
                }`}
              >
                <TableCell className="py-3">
                  <span className={`font-mono font-bold ${index === 0 ? 'text-[#3ec470]' : 'text-white/40'}`}>
                    {index + 1}
                  </span>
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex items-center gap-2">
                    <KolAvatar handle={bid.bidder} size="sm" />
                    <span className="font-mono text-[12px] text-white/80">{shortenAddress(bid.bidder)}</span>
                  </div>
                </TableCell>
                <TableCell className="py-3 text-right">
                  <span className="font-mono font-bold text-white">
                    {bid.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </TableCell>
                <TableCell className="py-3 text-right">
                  <span className="text-[11px] text-white/40">{formatRelativeTime(bid.timestamp)}</span>
                </TableCell>
              </motion.tr>
            ))}
          </AnimatePresence>
          {sortedBids.length === 0 && <TableEmpty colSpan={4} message="No bids yet. Be the first!" />}
        </TableBody>
      </Table>
    </div>
  );
}
