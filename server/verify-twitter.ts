// server/verify-twitter.ts
// POST /api/kol/verify-twitter { twitterHandle }
// → 调第三方 SocialData.tools API（免官方 X 开发者审核）：
//   GET https://api.socialdata.tools/twitter/user/{handle}
//   → 返回 { verified: followers >= 阈值, followers, provider }
// 说明：主流程已切换 X OAuth（server/x-oauth.ts），本端点仅保留作备用查询。
// 未配置 SOCIALDATA_API_KEY 时拒绝（不返回 mock 通过，防止伪造验证）。
import express from 'express';

const router = express.Router();

const SOCIALDATA_API_KEY = process.env.SOCIALDATA_API_KEY;
const FOLLOWERS_THRESHOLD = Number(process.env.X_FOLLOWERS_THRESHOLD) || 5000;

// 简单内存限流：每 IP 每 60s 最多 10 次（serverless 下按实例生效，作为基本防护）
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;
const rateMap = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

router.post('/verify-twitter', async (req, res) => {
  // 限流（基于 IP）
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  if (rateLimited(ip)) {
    res.status(429).json({ error: 'rate limited, try again later' });
    return;
  }

  const { twitterHandle } = req.body ?? {};
  if (!twitterHandle) {
    res.status(400).json({ error: 'missing handle' });
    return;
  }

  // 未配置 SOCIALDATA_API_KEY 时拒绝（不 mock 通过，防伪造验证）
  if (!SOCIALDATA_API_KEY) {
    res.status(503).json({ error: 'verification service not configured' });
    return;
  }

  try {
    const r = await fetch(
      `https://api.socialdata.tools/twitter/user/${encodeURIComponent(twitterHandle.replace(/^@/, ''))}`,
      { headers: { Authorization: `Bearer ${SOCIALDATA_API_KEY}` } }
    );
    if (r.status === 404) {
      res.status(404).json({ error: 'twitter user not found' });
      return;
    }
    if (r.status === 402) {
      res.status(502).json({ error: 'socialdata balance insufficient' });
      return;
    }
    if (!r.ok) {
      res.status(502).json({ error: `socialdata api failed: ${r.status}` });
      return;
    }
    const data = (await r.json()) as {
      followers_count?: number;
      screen_name?: string;
    };
    const followers = data?.followers_count ?? 0;
    res.json({ verified: followers >= FOLLOWERS_THRESHOLD, followers, provider: 'socialdata' });
  } catch (e) {
    res.status(500).json({ error: 'socialdata api failed' });
  }
});

export default router;
