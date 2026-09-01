import { useCallback, useRef, useState } from 'react';
import {
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import type { Hash } from 'viem';
import { useToast } from '../../hooks/useToast';
import { handleWeb3Error, classifyWeb3Error } from '../web3Errors';
import type { ToastLike } from '../web3Errors';

/**
 * 交易状态机：
 *   idle       — 初始状态，无交易
 *   preparing  — 钱包弹窗已打开，等待用户签名
 *   pending    — 交易已提交到 mempool，获得 txHash，等待上链
 *   confirming — 交易已上链，等待区块确认（useWaitForTransactionReceipt loading）
 *   success    — 交易已确认成功
 *   error      — 交易失败（用户拒绝 / revert / 网络错误等）
 */
export type TxStatus = 'idle' | 'preparing' | 'pending' | 'confirming' | 'success' | 'error';

export interface UseWriteContractTxResult {
  /** 触发合约写入交易，返回 txHash（失败时返回 null） */
  write: (args: WriteContractTxArgs) => Promise<Hash | null>;
  /** 当前交易状态 */
  status: TxStatus;
  /** 交易哈希（pending 及之后有值） */
  txHash: Hash | null;
  /** 错误信息（error 状态有值） */
  error: string | null;
  /** 是否正在处理（preparing / pending / confirming） */
  isLoading: boolean;
  /** 交易是否成功确认 */
  isSuccess: boolean;
  /** 重置状态为 idle（用于连续发起多笔交易） */
  reset: () => void;
}

export interface WriteContractTxArgs {
  address: `0x${string}`;
  abi: readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
  gas?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  nonce?: number;
  /** 交易成功确认后的回调，可用于刷新余额、失效 query 等 */
  onSuccess?: (txHash: Hash, receipt: unknown) => void;
  /** 自定义 toast（默认使用全局 useToast） */
  toast?: ToastLike;
  /** 交易提交时的 toast 消息（默认 "Transaction submitted"） */
  submittedMessage?: string;
  /** 交易确认成功时的 toast 消息（默认 "Transaction confirmed"） */
  successMessage?: string;
}

/**
 * useWriteContractTx — 封装 wagmi useWriteContract + useWaitForTransactionReceipt，
 * 提供完整交易状态机、自动 toast 通知和统一错误处理。
 *
 * @example
 * const { write, status, isLoading, txHash } = useWriteContractTx();
 * await write({
 *   address: contractAddress,
 *   abi: passAbi,
 *   functionName: 'mint',
 *   args: [kolId, quantity],
 *   value: price,
 *   onSuccess: () => queryClient.invalidateQueries({ queryKey: ['balance'] }),
 * });
 */
export function useWriteContractTx(): UseWriteContractTxResult {
  const toast = useToast();
  const { writeContractAsync, error: writeError, reset: resetWrite } =
    useWriteContract();

  const [txHash, setTxHash] = useState<Hash | null>(null);
  const [status, setStatus] = useState<TxStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const onSuccessRef = useRef<((txHash: Hash, receipt: unknown) => void) | null>(null);

  // 等待交易收据
  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: receiptSuccess,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
    query: { enabled: txHash !== null },
  });

  // 交易确认成功
  if (receiptSuccess && receipt && status === 'confirming') {
    setStatus('success');
    if (onSuccessRef.current) {
      onSuccessRef.current(txHash!, receipt);
      onSuccessRef.current = null;
    }
  }

  // 收据查询失败（交易可能 revert）
  if (receiptError && status === 'confirming') {
    setStatus('error');
    const info = classifyWeb3Error(receiptError);
    setErrorMessage(info.message);
    if (!info.silent) toast.error(info.message);
  }

  // writeContract 错误（用户拒绝等，在 write 函数中已处理，这里兜底）
  if (writeError && status === 'preparing') {
    setStatus('error');
    const info = classifyWeb3Error(writeError);
    setErrorMessage(info.message);
  }

  const write = useCallback(
    async (args: WriteContractTxArgs): Promise<Hash | null> => {
      const {
        onSuccess,
        toast: customToast,
        submittedMessage = 'Transaction submitted',
        successMessage = 'Transaction confirmed',
        ...contractArgs
      } = args;

      const t = customToast ?? toast;
      onSuccessRef.current = onSuccess ?? null;
      setErrorMessage(null);
      setStatus('preparing');

      try {
        const hash = await writeContractAsync(contractArgs as Parameters<typeof writeContractAsync>[0]);
        setTxHash(hash);
        setStatus('pending');
        t.info(submittedMessage);

        // 等待收据确认（useWaitForTransactionReceipt 会自动处理）
        // 状态从 pending → confirming → success 由 hook 顶部的副作用驱动
        return hash;
      } catch (err) {
        const info = handleWeb3Error(err, t);
        setStatus('error');
        setErrorMessage(info.message);
        onSuccessRef.current = null;
        return null;
      }
    },
    [writeContractAsync, toast],
  );

  const reset = useCallback(() => {
    setTxHash(null);
    setStatus('idle');
    setErrorMessage(null);
    onSuccessRef.current = null;
    resetWrite();
  }, [resetWrite]);

  // 派生状态：pending → confirming 过渡
  // 当 txHash 已设置且 useWaitForTransactionReceipt 开始 loading 时，状态从 pending 变为 confirming
  // 这在 render 期间安全地更新状态（React 18 允许在 render 期间 setState 避免额外渲染）
  if (status === 'pending' && txHash && isConfirming) {
    setStatus('confirming');
  }

  const isLoading = status === 'preparing' || status === 'pending' || status === 'confirming';
  const isSuccess = status === 'success';

  return { write, status, txHash, error: errorMessage, isLoading, isSuccess, reset };
}
