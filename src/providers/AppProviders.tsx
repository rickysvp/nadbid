import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Component, useEffect, type ReactNode } from 'react';
import ToastContainer from '@/components/ui/ToastContainer';
import { useKolHoldingsStore } from '@/stores';

/**
 * Single place to wrap the app with context providers.
 * Add future providers here (wagmi, theme, i18n, ...) to keep main.tsx clean.
 */

/** 全局 1s 心跳：驱动质押仓位状态机（PENDING→ACTIVE→UNLOCKING→释放）与统一时钟。 */
function StoreTicker() {
  useEffect(() => {
    const id = window.setInterval(() => useKolHoldingsStore.getState().tick(), 1_000);
    return () => window.clearInterval(id);
  }, []);
  return null;
}

/** DEV ONLY：暴露虚拟时钟，供 Playwright 验证质押生命周期（advance 后立即结算到期迁移）。 */
function DevClockBridge() {
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const bridge = {
      advance: (ms: number) => useKolHoldingsStore.getState().advanceClock(ms),
      now: () => useKolHoldingsStore.getState().nowUtcMs,
    };
    const globalScope = window as unknown as Record<string, unknown>;
    const existing = (globalScope.__nadbidDev ?? {}) as Record<string, unknown>;
    globalScope.__nadbidDev = { ...existing, ...bridge };
    return () => {
      delete (window as unknown as Record<string, unknown>).__nadbidDev;
    };
  }, []);
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, refetchOnWindowFocus: false, retry: 1 },
    mutations: { retry: 0 },
  },
});

interface ErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown, info: unknown): void {
    console.error('[ErrorBoundary] rendering error', error, info);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <main className="min-h-screen flex items-center justify-center p-8">
            <div className="bg-white border-3 border-black rounded-2xl p-8 shadow-neo-lg max-w-md text-center">
              <h2 className="font-display text-2xl font-black mb-2">Something went wrong</h2>
              <p className="font-body text-on-surface-variant mb-6">
                The app hit an unexpected error. Try refreshing the page.
              </p>
              <button
                type="button"
                className="bg-primary text-on-primary px-6 py-3 rounded-full font-mono font-bold uppercase text-sm border-2 border-black shadow-neo-md btn-hover"
                onClick={() => window.location.reload()}
              >
                Reload
              </button>
            </div>
          </main>
        )
      );
    }
    return this.props.children;
  }
}

interface AppProvidersProps {
  children: ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {children}
        <ToastContainer />
        <StoreTicker />
        <DevClockBridge />
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
