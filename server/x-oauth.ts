// server/x-oauth.ts
// X OAuth 2.0 with PKCE — 验证"KOL 本人控制该 X 账号"
// 流程：
//   1. GET /api/kol/x-auth-url  → 生成 PKCE(state+verifier) 并返回 X 授权 URL
//   2. 用户跳转 X 登录自己的账号授权 → X 重定向回 {CALLBACK}?code=..&state=..
//   3. GET {CALLBACK}  → 用 code+verifier 换 access_token → 调 /2/users/me 拿本人 username
//   4. 粉丝数阈值判断 → 302 跳回前端（xoauth=success / xoauth=denied / xoauth=error）
//
// 无状态 PKCE（serverless 安全）：
//   state 自包含 verifier + 过期时间，用服务端密钥 HMAC 签名。
//   回调时解签校验，不依赖进程内存 → 兼容 Vercel 冷启动/多实例。
//   需要 .env 配置 X_STATE_SECRET（随机长字符串）。
import express from 'express';
import crypto from 'node:crypto';

const router = express.Router();

const CLIENT_ID = process.env.X_CLIENT_ID || '';
const CLIENT_SECRET = process.env.X_CLIENT_SECRET || '';
// 回调地址：必须在 X App 的 User authentication settings 中精确登记
const CALLBACK_URL =
  process.env.X_CALLBACK_URL || 'http://localhost:3001/api/kol/x-oauth-callback';
// 前端地址：OAuth 成功后跳回（本地开发默认 localhost:3000，生产用 X_FRONTEND_URL）
const FRONTEND_URL = process.env.X_FRONTEND_URL || 'http://localhost:3000';
// 粉丝门槛：测试网 1000（Vercel X_FOLLOWERS_THRESHOLD），主网正式值部署时配置
const FOLLOWERS_THRESHOLD = Number(process.env.X_FOLLOWERS_THRESHOLD) || 5000;
// state / ticket 签名密钥：生产必须配置（随机长串），缺失时拒绝启动（防止用公开默认值伪造）
const STATE_SECRET: string = process.env.X_STATE_SECRET ?? '';
if (!STATE_SECRET) {
  throw new Error('X_STATE_SECRET must be configured (server refuses to start without it)');
}
const STATE_TTL_MS = 10 * 60 * 1000; // 10 分钟

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function genVerifier(): string {
  // PKCE verifier: 43-128 位无保留字符
  return b64url(crypto.randomBytes(48));
}

function genCodeChallenge(verifier: string): string {
  return b64url(crypto.createHash('sha256').update(verifier).digest());
}

/** 无状态 state 生成：payload(verifier|wallet|exp) + HMAC 签名。
 *  wallet 为申请者当前钱包地址，用于把 X 身份绑定到具体钱包，
 *  防止同一 X 账号授权后 ticket 被其他钱包冒用。 */
function signState(verifier: string, wallet: string): string {
  const payload = b64url(
    Buffer.from(JSON.stringify({ v: verifier, w: wallet, exp: Date.now() + STATE_TTL_MS }))
  );
  const sig = b64url(crypto.createHmac('sha256', STATE_SECRET).update(payload).digest());
  return `${payload}.${sig}`;
}

/** 无状态 state 校验：返回 { verifier, wallet }，失败返回 null */
function verifyState(state: string): { verifier: string; wallet: string } | null {
  const parts = state.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = b64url(crypto.createHmac('sha256', STATE_SECRET).update(payload).digest());
  // 常量时间比较
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      v?: string;
      w?: string;
      exp?: number;
    };
    if (!data.v || !data.w || typeof data.exp !== 'number' || Date.now() > data.exp) return null;
    return { verifier: data.v, wallet: data.w };
  } catch {
    return null;
  }
}

// ===== 一次性验证票据（ticket）=====
// 服务器 OAuth 回调成功验证 X 本人身份后，签发短时效、HMAC 签名的验证票据。
// 前端不得信任 URL 参数里的 username/followers/verified（可被伪造），
// 必须用 ticket 调 /api/kol/verify-ticket 换取可信结果，再决定是否上链注册。
const TICKET_TTL_MS = 5 * 60 * 1000; // 5 分钟

interface VerifyTicket {
  u: string; // username
  f: number; // followers
  w: string; // 申请者钱包地址（绑定 X 身份，防多钱包冒用）
  exp: number;
}

function signTicket(username: string, followers: number, wallet: string): string {
  const payload: VerifyTicket = { u: username, f: followers, w: wallet, exp: Date.now() + TICKET_TTL_MS };
  const encoded = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = b64url(crypto.createHmac('sha256', STATE_SECRET).update(encoded).digest());
  return `${encoded}.${sig}`;
}

/** 验证票据，返回 { username, followers, wallet } 或 null（无效/过期/伪造） */
function verifyTicket(ticket: string): { username: string; followers: number; wallet: string } | null {
  const parts = ticket.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = b64url(crypto.createHmac('sha256', STATE_SECRET).update(payload).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as VerifyTicket;
    if (
      typeof data.u !== 'string' ||
      typeof data.f !== 'number' ||
      typeof data.w !== 'string' ||
      Date.now() > data.exp
    ) {
      return null;
    }
    return { username: data.u, followers: data.f, wallet: data.w };
  } catch {
    return null;
  }
}

/** 1. 生成授权 URL（前端跳转用）。wallet 为申请者当前钱包地址（绑定 X 身份）。 */
router.get('/x-auth-url', (req, res) => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    res.status(503).json({ error: 'X_CLIENT_ID/X_CLIENT_SECRET not configured' });
    return;
  }
  const wallet = (req.query.wallet as string | undefined) ?? '';
  if (!wallet) {
    res.status(400).json({ error: 'missing wallet — connect your wallet first' });
    return;
  }
  const verifier = genVerifier();
  const state = signState(verifier, wallet.toLowerCase());

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
      `${FRONTEND_URL}/kol/onboarding?xoauth=denied&error=${encodeURIComponent(error)}`
    );
    return;
  }
  if (!code || !state) {
    res.status(400).send('missing code/state');
    return;
  }

  const verifierState = verifyState(state);
  if (!verifierState) {
    res.status(400).send('state invalid or expired');
    return;
  }
  const { verifier, wallet } = verifierState;

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
        code_verifier: verifier,
      }),
    });
    if (!tokenRes.ok) {
      const t = await tokenRes.text();
      // 重定向回前端并带错误，让用户看到明确反馈
      res.redirect(
        `${FRONTEND_URL}/kol/onboarding?xoauth=error&stage=token&message=${encodeURIComponent(
          `Token exchange failed (${tokenRes.status})`
        )}`
      );
      return;
    }
    const tokenData = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      res.redirect(
        `${FRONTEND_URL}/kol/onboarding?xoauth=error&stage=token&message=${encodeURIComponent(
          'No access_token in response'
        )}`
      );
      return;
    }

    // 4. /2/users/me → 本人 username / id（此端点免费 0 积分）
    const meRes = await fetch(
      'https://api.twitter.com/2/users/me?user.fields=username,public_metrics,name',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!meRes.ok) {
      const t = await meRes.text();
      res.redirect(
        `${FRONTEND_URL}/kol/onboarding?xoauth=error&stage=usersme&message=${encodeURIComponent(
          `users/me failed (${meRes.status})`
        )}`
      );
      return;
    }
    const me = (await meRes.json()) as {
      data?: { id?: string; username?: string; name?: string; public_metrics?: { followers_count?: number } };
    };
    const username = me?.data?.username ?? '';
    const followers = me?.data?.public_metrics?.followers_count ?? 0;

    // 5. 签发一次性验证票据（绑定申请者钱包，防止多钱包冒用同一 X 身份；
    //    不把 username/followers/verified 明文放 URL，防伪造）
    //    前端用 ticket 调 /api/kol/verify-ticket 换取可信结果。
    const ticket = signTicket(username, followers, wallet);
    res.redirect(
      `${FRONTEND_URL}/kol/onboarding?xoauth=success&ticket=${encodeURIComponent(ticket)}`
    );
  } catch (e) {
    res.redirect(
      `${FRONTEND_URL}/kol/onboarding?xoauth=error&stage=callback&message=${encodeURIComponent(
        'Internal error during OAuth callback'
      )}`
    );
  }
});

/**
 * 3. 验证一次性票据（前端 OAuth 回调后调用）
 *    入参：?ticket=..&wallet=<当前钱包地址>
 *    出参：{ verified, username, followers } —— 仅服务器签发的 ticket 可通过，
 *          URL 参数伪造的 username/followers/verified 一律无效。
 *          且 ticket 内嵌的 wallet 必须与请求方当前钱包一致（防多钱包冒用）。
 */
router.get('/verify-ticket', (req, res) => {
  const { ticket, wallet } = req.query as { ticket?: string; wallet?: string };
  if (!ticket) {
    res.status(400).json({ error: 'missing ticket' });
    return;
  }
  if (!wallet) {
    res.status(400).json({ error: 'missing wallet' });
    return;
  }
  const result = verifyTicket(ticket);
  if (!result) {
    res.status(401).json({ error: 'invalid or expired ticket' });
    return;
  }
  // 钱包绑定校验：ticket 只属于签发时的钱包
  if (result.wallet.toLowerCase() !== wallet.toLowerCase()) {
    res.status(403).json({ error: 'ticket wallet mismatch — verify with the same wallet that started OAuth' });
    return;
  }
  res.json({
    verified: result.followers >= FOLLOWERS_THRESHOLD,
    username: result.username,
    followers: result.followers,
  });
});

export default router;
