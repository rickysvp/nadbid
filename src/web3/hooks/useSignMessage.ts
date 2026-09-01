import { useCallback, useState } from 'react';
import { useSignMessage as useWagmiSignMessage } from 'wagmi';
import type { Hex } from 'viem';
import { useToast } from '../../hooks/useToast';
import { handleWeb3Error, classifyWeb3Error } from '../web3Errors';
import type { ToastLike } from '../web3Errors';

/** 签名状态机 */
export type SignStatus = 'idle' | 'signing' | 'success' | 'error';

export interface UseSignMessageResult {
  /** 触发消息签名，返回签名（失败时返回 null） */
  signMessage: (args: SignMessageArgs) => Promise<Hex | null>;
  /** 当前签名状态 */
  status: SignStatus;
  /** 签名结果（success 状态有值） */
  signature: Hex | null;
  /** 错误信息（error 状态有值） */
  error: string | null;
  /** 是否正在签名 */
  isLoading: boolean;
  /** 签名是否成功 */
  isSuccess: boolean;
  /** 重置状态为 idle */
  reset: () => void;
}

export interface SignMessageArgs {
  /** 待签名消息 */
  message: string;
  /** 签名成功后的回调 */
  onSuccess?: (signature: Hex) => void;
  /** 自定义 toast（默认使用全局 useToast） */
  toast?: ToastLike;
  /** 签名成功时的 toast 消息（默认 "Message signed"） */
  successMessage?: string;
}

/**
 * useSignMessage — 封装 wagmi useSignMessage，提供签名状态管理、
 * 自动 toast 通知和统一错误处理。
 *
 * @example
 * const { signMessage, status, signature } = useSignMessage();
 * const sig = await signMessage({
 *   message: 'Sign in to NADBID',
 *   onSuccess: (sig) => console.log('signed:', sig),
 * });
 */
export function useSignMessage(): UseSignMessageResult {
  const toast = useToast();
  const { signMessageAsync, error: signError, reset: resetSign } =
    useWagmiSignMessage();

  const [status, setStatus] = useState<SignStatus>('idle');
  const [signature, setSignature] = useState<Hex | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // wagmi 错误兜底（通常在 signMessageAsync catch 中已处理）
  if (signError && status === 'signing') {
    const info = classifyWeb3Error(signError);
    setStatus('error');
    setErrorMessage(info.message);
  }

  const signMessage = useCallback(
    async (args: SignMessageArgs): Promise<Hex | null> => {
      const { message, onSuccess, toast: customToast, successMessage = 'Message signed' } = args;
      const t = customToast ?? toast;

      setErrorMessage(null);
      setStatus('signing');

      try {
        const sig = await signMessageAsync({ message });
        setSignature(sig);
        setStatus('success');
        t.success(successMessage);
        onSuccess?.(sig);
        return sig;
      } catch (err) {
        const info = handleWeb3Error(err, t);
        setStatus('error');
        setErrorMessage(info.message);
        return null;
      }
    },
    [signMessageAsync, toast],
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setSignature(null);
    setErrorMessage(null);
    resetSign();
  }, [resetSign]);

  return {
    signMessage,
    status,
    signature,
    error: errorMessage,
    isLoading: status === 'signing',
    isSuccess: status === 'success',
    reset,
  };
}
