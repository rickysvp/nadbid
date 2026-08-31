import { motion, AnimatePresence } from 'motion/react';
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
 * 全局 Toast 渲染组件 — 替代 Toaster.tsx 的 window CustomEvent hack
 */
export default function Toaster() {
  const { toasts, removeToast } = useUiStore();

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const config = toastConfig[toast.type];
          const Icon = config.icon;

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-2xl',
                config.bg,
                config.border,
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', config.text)} />
              <p className="flex-1 text-[13px] text-white/90 font-medium leading-relaxed">
                {toast.message}
              </p>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-white/30 hover:text-white/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
