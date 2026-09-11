/**
 * 审计 P1 修复：evidenceUri 安全净化工具。
 * 合约允许任意字符串写入 evidenceUri（攻击者可绕过前端直接调合约），
 * 前端若直接作为 <a href> 渲染，可触发 javascript: / data: / 钓鱼 URL。
 *
 * 安全策略：
 * 1. new URL() 解析失败 → null（不渲染为链接）
 * 2. 协议必须为 https:
 * 3. 域名必须为 x.com 或 twitter.com（含子域名）
 * 4. 通过校验返回原始 href；否则返回 null，调用方应降级为纯文本展示
 */

const ALLOWED_EVIDENCE_HOSTS = ['x.com', 'twitter.com'];

export function safeEvidenceUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase();
    const isAllowed = ALLOWED_EVIDENCE_HOSTS.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    );
    if (!isAllowed) return null;
    return url.href;
  } catch {
    return null;
  }
}
