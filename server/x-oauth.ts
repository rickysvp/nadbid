// server/x-oauth.ts
// X OAuth 2.0 with PKCE — 验证"KOL 本人控制该 X 账号"
// 流程：
//   1. GET /api/kol/x-auth-url  → 生成 PKCE(state+verifier) 并返回 X 授权 URL
//   2. 用户跳转 X 登录自己的账号授权 → X 重定向回 {CALLBACK}?code=..&state=..
//   3. GET {CALLBACK}  → 用 code+verifier 换 access_token → 调 /2/users/me 拿本人 username
//   4. 再用 SocialData 查粉丝数 → 返回 { verified, username, followers, provider }
//
// 前置：.env 配置 X_CLIENT_ID / X_CLIENT_SECRET，并在 X Developer App 的
//       User authentication settings 登记回调地址（Redirect/Callback URL）。
import express from 'express';
import crypto from 'node:crypto';

const router = express.Router();

const CLIENT_ID = process.env.X_CLIENT_ID || '';
const CLIENT_SECRET = process.env.X_CLIENT_SECRET || '';
// 回调地址：必须在 X App 的 User authentication settings 中精确登记
const CALLBACK_URL =
  process.env.X_CALLBACK_URL || 'http://localhost:3001/api/kol/x-oauth-callback';
const FOLLOWERS_THRESHOLD = 10000;

// 内存态 PKCE 存储：state → { verifier, createdAt }
// MVP 无数据库；流程即时完成，重启丢失可接受
const pkceStore = new Map<string, { verifier: string; createdAt: number }>();
const PKCE_TTL_MS = 10 * 60 * 1000; // 10 分钟

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function genRandomState(): string {
  return b64url(crypto.randomBytes(24));
}

function genVerifier(): string {
  // PKCE verifier: 43-128 位无保留字符
  return b64url(crypto.randomBytes(48));
}

function genCodeChallenge(verifier: string): string {
  return b64url(crypto.createHash('sha256').update(verifier).digest());
}

/** 1. 生成授权 URL（前端跳转用） */
router.get('/x-auth-url', (req, res) => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    res.status(503).json({ error: 'X_CLIENT_ID/X_CLIENT_SECRET not configured' });
    return;
  }
  const state = genRandomState();
  const verifier = genVerifier();
  pkceStore.set(state, { verifier, createdAt: Date.now() });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: CALLBACK_URL,
    scope: 'tweet.read users.read',
    state,
    code_challenge: genCodeChallenge(verifier),
    code_challenge_method: 'S256',
  });
  res.json({ authUrl: `https://twitter.com/i/oauth2/authorize?${params.toString()}`, state });
});

/** 2. X 回调：换 token → 拿本人 username → 查粉丝数 */
router.get('/x-oauth-callback', async (req, res) => {
  const { code, state, error } = req.query as {
    code?: string;
    state?: string;
    error?: string;
  };

  if (error) {
    // 用户拒绝授权
    res.redirect(
      `http://localhost:3000/kol/onboarding?xoauth=denied&error=${encodeURIComponent(error)}`
    );
    return;
  }
  if (!code || !state) {
    res.status(400).send('missing code/state');
    return;
  }

  const entry = pkceStore.get(state);
  if (!entry || Date.now() - entry.createdAt > PKCE_TTL_MS) {
    res.status(400).send('state invalid or expired');
    return;
  }
  pkceStore.delete(state);

  try {
    // 3. code + verifier → access_token（Basic Auth: client_id:client_secret）
    const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: CALLBACK_URL,
        code_verifier: entry.verifier,
      }),
    });
    if (!tokenRes.ok) {
      const t = await tokenRes.text();
      res.status(502).send(`token exchange failed: ${tokenRes.status} ${t.slice(0, 200)}`);
      return;
    }
    const tokenData = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      res.status(502).send('no access_token in response');
      return;
    }

    // 4. /2/users/me → 本人 username / id（此端点免费 0 积分）
    const meRes = await fetch(
      'https://api.twitter.com/2/users/me?user.fields=username,public_metrics,name',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!meRes.ok) {
      const t = await meRes.text();
      res.status(502).send(`users/me failed: ${meRes.status} ${t.slice(0, 200)}`);
      return;
    }
    const me = (await meRes.json()) as {
      data?: { id?: string; username?: string; name?: string; public_metrics?: { followers_count?: number } };
    };
    const username = me?.data?.username ?? '';
    const followers = me?.data?.public_metrics?.followers_count ?? 0;

    // 5. 返回验证结果（粉丝数阈值判断）
    res.redirect(
      `http://localhost:3000/kol/onboarding?xoauth=success&username=${encodeURIComponent(
        username
      )}&followers=${followers}&verified=${followers >= FOLLOWERS_THRESHOLD}`
    );
  } catch (e) {
    res.status(500).send('oauth callback error');
  }
});

export default router;
