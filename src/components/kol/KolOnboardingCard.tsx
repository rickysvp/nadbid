import type { ReactNode } from 'react';
import { Check, Lock } from 'lucide-react';
import { cn } from '../../utils/cn';

export type StepStatus = 'completed' | 'active' | 'locked';

export interface KolOnboardingCardProps {
  /** 0-based step index */
  step: number;
  title: string;
  description?: string;
  icon?: ReactNode;
  status: StepStatus;
  children: ReactNode;
}

/**
 * KolOnboardingCard — KOL 入驻流程的单步骤卡片容器。
 *
 * 三种状态：
 * - completed: 绿色边框 + 勾号，展示完成摘要
 * - active:    高亮边框，展示可操作表单
 * - locked:    灰色半透明，展示锁定提示
 */
export function KolOnboardingCard({
  step,
  title,
  description,
  icon,
  status,
  children,
}: KolOnboardingCardProps) {
  const isLocked = status === 'locked';
  const isCompleted = status === 'completed';

  return (
    <div
      className={cn(
        'bg-[#161616] border rounded-2xl overflow-hidden transition-all',
        isCompleted && 'border-[#3ec470]/30',
        status === 'active' && 'border-white/[0.08] ring-1 ring-[#3ec470]/20',
        isLocked && 'border-white/[0.04] opacity-60',
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-4 p-5 border-b border-white/[0.04]">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-sm',
            isCompleted && 'bg-[#3ec470] text-black',
            status === 'active' &&
              'bg-[#3ec470]/10 text-[#3ec470] border border-[#3ec470]/30',
            isLocked && 'bg-white/5 text-white/30',
          )}
        >
          {isCompleted ? (
            <Check className="h-4 w-4" />
          ) : isLocked ? (
            <Lock className="h-3.5 w-3.5" />
          ) : (
            step + 1
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3
            className={cn(
              'font-bold text-sm uppercase tracking-wider',
              isLocked ? 'text-white/40' : 'text-white',
            )}
          >
            {title}
          </h3>
          {description && (
            <p className="text-xs text-white/40 mt-0.5">{description}</p>
          )}
        </div>

        {icon && <div className="shrink-0 text-white/20">{icon}</div>}
      </div>

      {/* Content */}
      {!isLocked && <div className="p-5">{children}</div>}
      {isLocked && (
        <div className="p-5">
          <p className="text-xs text-white/30">Complete previous steps to unlock.</p>
        </div>
      )}
    </div>
  );
}
