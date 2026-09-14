import { disconnect } from '@wagmi/core';
import { wagmiConfig } from './config';
import { useWalletStore } from '../stores/walletStore';

/**
 * disconnectWallet — 彻底断开钱包连接（强化版）。
 *
 * wagmi useDisconnect().disconnect() 只清 wagmi 内部状态；在 OKX / MetaMask
 * 扩展场景下存在两个"断不干净"的来源：
 *   1. wagmi storage（localStorage 'wagmi.*'）若残留 connections，
 *      刷新页面后 ReconnectController 会自动重连——这里显式清除；
 *   2. 钱包扩展侧（OKX）的站点授权仍存在，dApp 刷新后扩展仍会注入 provider，
 *      若用户希望"彻底退出"，需在扩展中移除本站授权——返回提示信息。
 *
 * 同时兜底重置本地 walletStore（不依赖 WalletStateSyncer 的事件时序）。
 */
export async function disconnectWallet(): Promise<{ extensionReminder: boolean }> {
  // 断开前记录连接方式（重置后无法再读取）
  const prevConnector = useWalletStore.getState().connectorId;

  try {
    // wagmi core：断开所有 connector 并清空 connections（同步更新 storage）
    disconnect(wagmiConfig);
  } catch {
    // 已断开或 connector 异常，忽略
  }

  try {
    // 兜底：清除 wagmi 本地持久化，杜绝刷新自动重连
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith('wagmi.')) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // localStorage 不可用（隐私模式等），忽略
  }

  try {
    // 兜底：立即重置本地 store
    useWalletStore.getState()._resetFromWagmi();
  } catch {
    // ignore
  }

  // 若曾经通过扩展（injected）连接，扩展侧授权需要用户手动移除
  const extensionReminder = prevConnector !== null && prevConnector !== 'walletConnect';

  return { extensionReminder };
}
