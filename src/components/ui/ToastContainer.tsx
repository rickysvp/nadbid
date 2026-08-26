import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useUiStore } from '@/stores';
import type { Toast } from '@/stores/uiStore';
import { cn } from '@/utils/cn';

const TONE_STYLES: Record<
  Toast['kind'],
  { ring: string; icon: typeof CheckCircle2; accent: string; pill: string }
> = {
  success: {
    ring: 'border-secondary',
    icon: CheckCircle2,
    accent: 'text-secondary',
    pill: 'bg-secondary/15',
  },
  error: {
    ring: 'border-error',
    icon: AlertCircle,
    accent: 'text-error',
    pill: 'bg-error/15',
  },
  info: {
    ring: 'border-primary',
    icon: Info,
    accent: 'text-primary',
    pill: 'bg-primary/15',
  },
  warn: {
    ring: 'border-tertiary',
    icon: AlertTriangle,
    accent: 'text-black',
    pill: 'bg-tertiary/40',
  },
};

export default function ToastContainer() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);
  // Hydrate only on client — avoids SSR mismatch in future.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-5 right-5 z-50 w-full max-w-sm space-y-3 pointer-events-none"
    >
      {toasts.map((toast, i) => {
        const style = TONE_STYLES[toast.kind];
        const Icon = style.icon;
        return (
          <div
            key={toast.id}
            style={{ animationDelay: `${i * 50}ms` }}
            className={cn(
              'pointer-events-auto w-full rounded-2xl border-3 border-black shadow-neo-xl bg-white p-4 pl-4 flex items-start gap-3 animate-[slideInRight_340ms_cubic-bezier(0.16,1,0.3,1)_both]',
              style.ring,
            )}
          >
            <div
              className={cn(
                'flex items-center justify-center w-10 h-10 shrink-0 rounded-xl border-2 border-black shadow-neo-sm',
                style.pill,
                style.accent,
              )}
            >
              <Icon className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div className="flex-grow min-w-0 pt-0.5">
              <p className="font-display font-black text-black text-base leading-tight mb-1 break-words">
                {toast.title}
              </p>
              {toast.description && (
                <p className="font-body text-sm text-on-surface-variant font-bold leading-relaxed break-words">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(toast.id)}
              className="w-8 h-8 shrink-0 rounded-full border-2 border-black bg-surface-container-low text-black flex items-center justify-center hover:bg-tertiary transition-colors"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
