import { useCallback } from 'react';
import { useUiStore } from '../stores/uiStore';
import type { ToastType } from '../types';

/**
 * Toast Hook — 统一全局 toast 管理，替代 window CustomEvent hack
 */
export function useToast() {
  const { addToast, removeToast, toasts } = useUiStore();

  const toast = useCallback(
    (message: string, type: ToastType = 'info', duration = 3000) => {
      const id = addToast({ message, type, duration });
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
      return id;
    },
    [addToast, removeToast],
  );

  const success = useCallback(
    (message: string, duration?: number) => toast(message, 'success', duration),
    [toast],
  );

  const error = useCallback(
    (message: string, duration?: number) => toast(message, 'error', duration),
    [toast],
  );

  const info = useCallback(
    (message: string, duration?: number) => toast(message, 'info', duration),
    [toast],
  );

  const warning = useCallback(
    (message: string, duration?: number) => toast(message, 'warning', duration),
    [toast],
  );

  return { toast, success, error, info, warning, toasts, removeToast };
}

/**
 * 兼容旧代码的全局 toast 函数（过渡期使用，新代码请用 useToast hook）
 */
let globalToastFn: ((message: string, type?: ToastType) => void) | null = null;

export function setGlobalToast(fn: (message: string, type?: ToastType) => void) {
  globalToastFn = fn;
}

export function globalToast(message: string, type: ToastType = 'info') {
  if (globalToastFn) {
    globalToastFn(message, type);
  } else {
    console.warn('[toast] no global toast function registered:', message);
  }
}
