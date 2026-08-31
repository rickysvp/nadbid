import { CheckCircle2 } from 'lucide-react';
import type { FulfillmentInfo } from '@/types';

interface FulfillmentStatusProps {
  info: FulfillmentInfo;
}

/** Settlement / dispute status panel. */
export default function FulfillmentStatus({ info }: FulfillmentStatusProps) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 border-3 border-black shadow-neo-md">
      <h3 className="font-display text-xl font-black mb-4 flex items-center gap-2 text-black">
        <CheckCircle2 className="w-5 h-5 text-black" /> Fulfillment Status
      </h3>
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center pb-2 border-b-2 border-black/10">
          <span className="font-mono text-[10px] font-bold text-on-surface-variant uppercase">
            Current State
          </span>
          <span className="bg-secondary text-black px-2 py-0.5 rounded font-mono text-[10px] font-black border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
            {info.currentState}
          </span>
        </div>
        <div className="flex justify-between items-center pb-2 border-b-2 border-black/10">
          <span className="font-mono text-[10px] font-bold text-on-surface-variant uppercase">
            Evidence Required
          </span>
          <span className="font-body text-xs font-black text-black">{info.evidenceRequired}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-mono text-[10px] font-bold text-on-surface-variant uppercase">
            Dispute Window
          </span>
          <span className="font-body text-xs font-black text-black">{info.disputeWindow}</span>
        </div>
      </div>
    </div>
  );
}
