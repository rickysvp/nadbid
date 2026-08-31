import { create } from 'zustand';
import type { Toast, ToastType } from '../types';

interface UiState {
  // Toast
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Modal / Drawer（预留）
  activeModal: string | null;
  openModal: (id: string) => void;
  closeModal: () => void;

  // 全局 loading
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

let toastIdCounter = 0;

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${++toastIdCounter}-${Date.now()}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    return id;
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),

  activeModal: null,
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),

  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
}));

/** 便捷函数：在非组件环境下触发 toast */
export function pushToast(message: string, type: ToastType = 'info', duration = 3000): string {
  const id = `toast-${++toastIdCounter}-${Date.now()}`;
  useUiStore.getState().addToast({ message, type, duration });
  if (duration > 0) {
    setTimeout(() => useUiStore.getState().removeToast(id), duration);
  }
  return id;
}
