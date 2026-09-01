import { HttpError as LibHttpError, http } from '@/lib/http';
import { env } from '@/lib/env';
import { useUiStore } from '@/stores';

/**
 * App-level HTTP client. Feature modules import from here rather than
 * importing the raw `@/lib/http` helper so we can toast on auth errors,
 * time out consistently, and toggle between real API calls and mocks.
 */

// Export the error class once (a class export doubles as both value + type).
export const HttpError = LibHttpError;

/**
 * Pure (non-hook) function so the same toggle is readable from within
 * queryFn callbacks (where React hooks can't run).
 */
export function isMockEnabled(): boolean {
  return env.VITE_ENABLE_MOCKS;
}

async function toastifyError(err: unknown): Promise<never> {
  if (err instanceof LibHttpError && err.status === 401) {
    useUiStore.getState().pushToast({
      kind: 'error',
      title: 'Session expired',
      description: 'Please reconnect your wallet.',
    });
  }
  throw err;
}

export async function apiGet<T>(path: string, options?: Parameters<typeof http<T>>[1]) {
  return http<T>(path, { ...options, method: 'GET' }).catch(toastifyError);
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
  options?: Parameters<typeof http<T>>[1],
) {
  return http<T>(path, { ...options, method: 'POST', body }).catch(toastifyError);
}
