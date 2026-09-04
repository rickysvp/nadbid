import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useUiStore } from '../stores/uiStore';
import { cn } from '../utils/cn';
import type { ToastType } from '../types';

const toastConfig: Record<ToastType, { icon: typeof CheckCircle; bg: string; border: string; text: string }> = {
  success: {
    icon: CheckCircle,
    bg: 'bg-[#0d1611]',
    border: 'border-[#3ec470]/30',
    text: 'text-[#3ec470]',
  },
  error: {
    icon: XCircle,
    bg: 'bg-[#160d0d]',
    border: 'border-red-400/30',
    text: 'text-red-400',
  },
  info: {
    icon: Info,
    bg: 'bg-[#0d1116]',
    border: 'border-blue-400/30',
    text: 'text-blue-400',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-[#16140d]',
    border: 'border-amber-400/30',
    text: 'text-amber-400',
  },
};

/**
 * 全局 Toast 渲染组件。
 *
 * 注意：不使用 motion/AnimatePresence（尤其是 layout 动画）——framer-motion 的
 * layout 动画在 React 19 下与 React DOM commit 冲突，会抛
 * "Failed to execute 'insertBefore' on 'Node'..." 导致整页崩溃（线上已复现）。
 * 此处用纯 CSS 入场动画替代，入场/离场均不操作 React 之外的 DOM。
 */
export default function Toaster() {
  const { toasts, removeToast } = useUiStore();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const config = toastConfig[toast.type];
        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            className={cn(
              'toast-enter pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-2xl',
              config.bg,
              config.border,
            )}
          >
            <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', config.text)} />
            <p className="flex-1 text-x] text-white/90 font-medium leading-relaxed">
              {toast.message}
            </p>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-white/30 hover:text-white/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
