// server/verify-twitter.ts
// POST /api/kol/verify-twitter { wallet, twitterHandle }
// → 调第三方 SocialData.tools API（免官方 X 开发者审核）：
//   GET https://api.socialdata.tools/twitter/user/{handle}
//   → 返回 { verified: followers >= 10000, followers, provider }
// → 未配置 SOCIALDATA_API_KEY 时返回 mock 数据，供前端联调
//
// SocialData.tools：$0.0002/次（≈0.0014 元），每分钟前 3 次免费，
//   注册 https://socialdata.tools 后充值小额并生成 API key 即可，无需 X 官方审核。
import express from 'express';

const router = express.Router();

const SOCIALDATA_API_KEY = process.env.SOCIALDATA_API_KEY;
const FOLLOWERS_THRESHOLD = 10000;

router.post('/verify-twitter', async (req, res) => {
  const { twitterHandle } = req.body ?? {};
  if (!twitterHandle) {
    res.status(400).json({ error: 'missing handle' });
    return;
  }

  // Mock fallback：未配置 SOCIALDATA_API_KEY 时返回模拟结果，供前端联调
  if (!SOCIALDATA_API_KEY) {
    res.json({ verified: true, followers: 1520000, mock: true, provider: 'mock' });
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
