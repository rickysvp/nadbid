import { create } from 'zustand';

export interface Toast {
  id: string;
  kind: 'success' | 'error' | 'info' | 'warn';
  title: string;
  description?: string;
  ttlMs: number | null;
}

interface UiState {
  isNavDrawerOpen: boolean;
  openNavDrawer: () => void;
  closeNavDrawer: () => void;
  toggleNavDrawer: () => void;

  toasts: Toast[];
  pushToast: (toast: Omit<Toast, 'id' | 'ttlMs'> & Partial<Pick<Toast, 'ttlMs'>>) => void;
  dismissToast: (id: string) => void;
}

let toastSeq = 0;

export const useUiStore = create<UiState>((set) => ({
  isNavDrawerOpen: false,
  openNavDrawer: () => set({ isNavDrawerOpen: true }),
  closeNavDrawer: () => set({ isNavDrawerOpen: false }),
  toggleNavDrawer: () => set((s) => ({ isNavDrawerOpen: !s.isNavDrawerOpen })),

  toasts: [],
  pushToast: (toast) => {
    const id = `toast-${++toastSeq}`;
    const ttlMs = toast.ttlMs ?? 4000;
    set((s) => ({ toasts: [...s.toasts, { id, ttlMs, ...toast }] }));
    if (ttlMs !== null) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, ttlMs);
    }
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
