import { useCallback, useRef, useState, useEffect } from 'react';
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
  // P3-7：onSuccess 按 txHash 关联（Map），连续发起多笔交易时互不覆盖。
  // 之前单槽 ref 会被第二笔覆盖，导致第一笔确认时触发第二笔的 onSuccess 或丢失。
  const onSuccessMapRef = useRef<Map<Hash, (txHash: Hash, receipt: unknown) => void>>(new Map());
  // Codex 审计：交易并发保护——hook 只有单 txHash + 单 receipt watcher，
  // 并发第二笔会覆盖第一笔的监听导致其确认回调永不触发。业务上禁止并发：
  // 一笔未结束（preparing→pending→confirming）时直接拒绝新交易。
  const busyRef = useRef(false);

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

  // ---- 以下副作用全部放在 useEffect 中，严禁在 render 期间 setState ----
  // 原因：render 期间 setState 在 pending→confirming→success 竞态下可能反复触发
  // 新渲染，导致 React "Maximum update depth exceeded" 崩溃 → 整页黑屏
  // （此前线上黑屏根因，本次修复）。

  // 收据查询失败（交易可能 revert）
  useEffect(() => {
    if (receiptError && status === 'confirming') {
      busyRef.current = false;
      setStatus('error');
      const info = classifyWeb3Error(receiptError);
      setErrorMessage(info.message);
      if (!info.silent) toast.error(info.message);
    }
  }, [receiptError, status, toast]);

  // 交易在链上 revert：收据正常返回但 status=0x0。不能走 success 分支——
  // 否则 toast 误报 "Transaction confirmed" 且 onSuccess（成功提示/刷新）被触发。
  useEffect(() => {
    if (receiptSuccess && receipt && receipt.status === 'reverted' && status === 'confirming') {
      setStatus('error');
      busyRef.current = false;
      const msg = 'Transaction reverted on-chain';
      setErrorMessage(msg);
      toast.error(msg);
      onSuccessMapRef.current.delete(txHash!);
    }
  }, [receiptSuccess, receipt, status, txHash, toast]);

  // 交易确认成功（仅 status=success 的收据）
  useEffect(() => {
    if (receiptSuccess && receipt && receipt.status === 'success' && status === 'confirming') {
      setStatus('success');
      busyRef.current = false;
      const cb = onSuccessMapRef.current.get(txHash!);
      if (cb) {
        onSuccessMapRef.current.delete(txHash!);
        cb(txHash!, receipt);
      }
    }
  }, [receiptSuccess, receipt, status, txHash]);

  // writeContract 错误（用户拒绝等，在 write 函数中已处理，这里兜底）
  useEffect(() => {
    if (writeError && status === 'preparing') {
      busyRef.current = false;
      setStatus('error');
      const info = classifyWeb3Error(writeError);
      setErrorMessage(info.message);
    }
  }, [writeError, status]);

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
      if (busyRef.current) {
        // 并发保护：上一笔未确认完（含用户拒绝后的重置窗口）直接拒绝
        setStatus('error');
        const msg = 'A transaction is already in progress — please wait for it to confirm';
        setErrorMessage(msg);
        if (t.error) t.error(msg);
        return null;
      }
      busyRef.current = true;
      setErrorMessage(null);
      setStatus('preparing');

      try {
        const hash = await writeContractAsync(contractArgs as Parameters<typeof writeContractAsync>[0]);
        setTxHash(hash);
        // P3-7：拿到 hash 后登记该笔交易的 onSuccess（按 txHash 关联）
        if (onSuccess) onSuccessMapRef.current.set(hash, onSuccess);
        setStatus('pending');
        t.info(submittedMessage);

        // 等待收据确认（useWaitForTransactionReceipt 会自动处理）
        // 状态从 pending → confirming → success 由 hook 顶部的副作用驱动
        return hash;
      } catch (err) {
        busyRef.current = false;
        const info = handleWeb3Error(err, t);
        setStatus('error');
        setErrorMessage(info.message);
        return null;
      }
    },
    [writeContractAsync, toast],
  );

  const reset = useCallback(() => {
    setTxHash(null);
    setStatus('idle');
    setErrorMessage(null);
    onSuccessMapRef.current.clear();
    resetWrite();
  }, [resetWrite]);

  // 派生状态：pending → confirming 过渡（useEffect 中更新，禁止 render 期间 setState）
  useEffect(() => {
    if (status === 'pending' && txHash && isConfirming) {
      setStatus('confirming');
    }
  }, [status, txHash, isConfirming]);

  // F8：confirming 超时兜底——交易提交后若 RPC 丢失/节点卡住，收据永远不会返回，
  // 用户会无限期卡在 confirming。5 分钟后置 error 并提示用户自行检查钱包。
  useEffect(() => {
    if (status !== 'confirming' || !txHash) return;
    const timer = setTimeout(() => {
      busyRef.current = false;
      setStatus('error');
      const msg = 'Transaction may still be pending — check your wallet for confirmation';
      setErrorMessage(msg);
      toast.error(msg);
    }, 5 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [status, txHash, toast]);

  const isLoading = status === 'preparing' || status === 'pending' || status === 'confirming';
  const isSuccess = status === 'success';

  return { write, status, txHash, error: errorMessage, isLoading, isSuccess, reset };
}
