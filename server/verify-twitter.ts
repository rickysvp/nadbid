// server/verify-twitter.ts
// POST /api/kol/verify-twitter { wallet, twitterHandle }
// → 调 X API v2: GET users/by/username/{handle}?user.fields=public_metrics
// → 返回 { verified: followers >= 10000, followers }
// → 未配置 X_API_BEARER_TOKEN 时返回 mock 数据，供前端联调
import express from 'express';

const router = express.Router();

const X_API_BEARER = process.env.X_API_BEARER_TOKEN;
const FOLLOWERS_THRESHOLD = 10000;

router.post('/verify-twitter', async (req, res) => {
  const { twitterHandle } = req.body ?? {};
  if (!twitterHandle) {
    res.status(400).json({ error: 'missing handle' });
    return;
  }

  // Mock fallback：未配置 Bearer Token 时返回模拟结果，供前端联调
  if (!X_API_BEARER) {
    res.json({ verified: true, followers: 1520000, mock: true });
    return;
  }

  try {
    const r = await fetch(
      `https://api.twitter.com/2/users/by/username/${encodeURIComponent(twitterHandle)}?user.fields=public_metrics`,
      { headers: { Authorization: `Bearer ${X_API_BEARER}` } }
    );
    if (!r.ok) {
      res.status(502).json({ error: `twitter api failed: ${r.status}` });
      return;
    }
    const data = (await r.json()) as {
      data?: { public_metrics?: { followers_count?: number } };
    };
    const followers = data?.data?.public_metrics?.followers_count ?? 0;
    res.json({ verified: followers >= FOLLOWERS_THRESHOLD, followers });
  } catch (e) {
    res.status(500).json({ error: 'twitter api failed' });
  }
});

export default router;
