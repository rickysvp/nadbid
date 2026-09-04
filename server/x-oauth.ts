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
import { privateKeyToAccount } from 'viem/accounts';
import { keccak256, encodePacked, isAddress, type Hex } from 'viem';

const router = express.Router();

const CLIENT_ID = process.env.X_CLIENT_ID || '';
const CLIENT_SECRET = process.env.X_CLIENT_SECRET || '';
// 回调地址：必须在 X App 的 User authentication settings 中精确登记
const CALLBACK_URL =
  process.env.X_CALLBACK_URL || 'http://localhost:3001/api/kol/x-oauth-callback';
// 前端地址：OAuth 成功后跳回（本地开发默认 localhost:3000，生产用 X_FRONTEND_URL）
const FRONTEND_URL = process.env.X_FRONTEND_URL || 'http://localhost:3000';
// 粉丝门槛：测试网 1000（Vercel X_FOLLOWERS_THRESHOLD 已配 1000）。
// 默认值与测试网合约 MIN_FOLLOWERS=1000 对齐；主网正式值部署时显式配置覆盖。
const FOLLOWERS_THRESHOLD = Number(process.env.X_FOLLOWERS_THRESHOLD) || 1000;
// state / ticket 签名密钥：生产必须配置（随机长串），缺失时拒绝启动（防止用公开默认值伪造）
const STATE_SECRET: string = process.env.X_STATE_SECRET ?? '';
if (!STATE_SECRET) {
  throw new Error('X_STATE_SECRET must be configured (server refuses to start without it)');
}
const STATE_TTL_MS = 10 * 60 * 1000; // 10 分钟

// 平台签名者（P2-2）：持有私钥的 server 在 X 验证通过后，对
// (wallet, username, followers) 签发 ECDSA 注册签名；合约 registerKol 用
// 对应公钥验签，防止绕过前端直调合约伪造粉丝数注册。私钥来自
// PLATFORM_SIGNER_PRIVATE_KEY（与部署合约的 setPlatformSigner 公钥配对）。
const PLATFORM_SIGNER_PRIVATE_KEY: Hex | undefined =
  (process.env.PLATFORM_SIGNER_PRIVATE_KEY as Hex | undefined) || undefined;
const platformSigner = PLATFORM_SIGNER_PRIVATE_KEY
  ? privateKeyToAccount(PLATFORM_SIGNER_PRIVATE_KEY)
  : null;

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

// 已消费票据（尽力而为的单实例消费集合；Vercel 多实例下无法强一致，
// 主防线仍是短 TTL + wallet 绑定）
const usedTickets = new Set<string>();

// ---- KOL 元信息（bio 等 X 资料）轻量持久化 ----
// 说明：X 验证成功时把 { username, followers, bio, avatar } 存到 JSON 文件，供 KOL
// 详情页展示真实推特资料。Vercel serverless 无持久文件系统，meta 可能随实例
// 回收丢失（bio 为空时前端降级展示链上真实信息，不影响主流程）。
import * as fs from 'node:fs';
import * as path from 'node:path';

interface KolMeta {
  username: string;
  followers: number;
  bio: string;
  avatar: string;
  updatedAt: number;
}

const KOL_META_FILE = path.join(process.cwd(), 'server', 'data', 'kol-meta.json');

function readKolMeta(): Record<string, KolMeta> {
  try {
    return JSON.parse(fs.readFileSync(KOL_META_FILE, 'utf8')) as Record<string, KolMeta>;
  } catch {
    return {};
  }
}

function writeKolMeta(meta: Record<string, KolMeta>): void {
  try {
    fs.mkdirSync(path.dirname(KOL_META_FILE), { recursive: true });
    fs.writeFileSync(KOL_META_FILE, JSON.stringify(meta, null, 2), 'utf8');
  } catch {
    // 持久化失败不阻断主流程（meta 仅为增强展示）
  }
}

function upsertKolMeta(wallet: string, username: string, followers: number, bio?: string, avatar?: string): void {
  const meta = readKolMeta();
  const prev = meta[wallet.toLowerCase()];
  meta[wallet.toLowerCase()] = {
    username,
    followers,
    bio: bio ?? prev?.bio ?? '',
    avatar: avatar ?? prev?.avatar ?? '',
    updatedAt: Date.now(),
  };
  writeKolMeta(meta);
}

// ---- F6：OAuth 端点限流（防脚本刷爆 X API 免费额度 / 无成本刷 state）----
// 简单内存滑动窗口（serverless 单实例尽力而为；生产可换 Redis/IP 维度）。
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20; // 每 IP 每分钟最多 20 次 OAuth 相关请求
const rateBuckets = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const arr = (rateBuckets.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (arr.length >= RATE_LIMIT_MAX) {
    rateBuckets.set(key, arr);
    return true;
  }
  arr.push(now);
  rateBuckets.set(key, arr);
  return false;
}

/** 4. 查询 KOL 元信息（GET /api/kol/meta?wallet=）：
 *  X 资料（bio / 头像）供 KOL 详情页展示。
 *  数据来自 KOL 本人 X 授权（users/me）时的持久化；未授权过或 Vercel 实例回收时返回 found:false，
 *  前端降级为默认头像 + 链上摘要。 */
router.get('/meta', (req, res) => {
  const wallet = (req.query.wallet as string | undefined) ?? '';
  // Codex 审计：严格校验 wallet 为合法地址（防非法值污染 state/ticket/签名流程）
  if (!wallet) {
    res.status(400).json({ error: 'missing wallet' });
    return;
  }
  if (!isAddress(wallet)) {
    res.status(400).json({ error: 'invalid wallet' });
    return;
  }
  const local = readKolMeta()[wallet.toLowerCase()];
  if (!local) {
    res.json({ found: false });
    return;
  }
  res.json({ found: true, ...local });
});

interface VerifyTicket {
  u: string; // username
  f: number; // followers
  w: string; // 申请者钱包地址（绑定 X 身份，防多钱包冒用）
  b?: string; // X 简介（bio）— 可选字段，旧 ticket 兼容
  a?: string; // X 头像 URL — 可选字段，旧 ticket 兼容
  exp: number; // 过期时间（毫秒）
}

/** 注册签名过期时间（秒级 Unix 时间戳，与合约 registerKol 的 expiry 校验一致） */
const REG_SIG_TTL_SEC = 5 * 60; // 5 分钟

function signTicket(username: string, followers: number, wallet: string, bio?: string, avatar?: string): string {
  const payload: VerifyTicket = { u: username, f: followers, w: wallet, exp: Date.now() + TICKET_TTL_MS };
  if (bio) payload.b = bio;
  if (avatar) payload.a = avatar;
  const encoded = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = b64url(crypto.createHmac('sha256', STATE_SECRET).update(encoded).digest());
  return `${encoded}.${sig}`;
}

/**
 * 平台注册签名（F3：hash 含 expiry，签名只在 expiry 前有效，防永久有效被重放）。
 * 与合约 registerKol 验签逻辑一致：
 *   keccak256(abi.encodePacked(wallet, twitterHandle, followers, expiry))
 */
async function signRegistration(
  wallet: string,
  username: string,
  followers: number,
): Promise<{ signature: `0x${string}`; expiry: number }> {
  const expiry = Math.floor(Date.now() / 1000) + REG_SIG_TTL_SEC;
  const hash = keccak256(
    encodePacked(
      ['address', 'string', 'uint256', 'uint256'],
      [wallet as Hex, username, BigInt(followers), BigInt(expiry)],
    ),
  );
  const signature = (await platformSigner!.sign({ hash })) as `0x${string}`;
  return { signature, expiry };
}

/** 验证票据，返回 { username, followers, wallet, bio, avatar } 或 null（无效/过期/伪造） */
function verifyTicket(
  ticket: string,
): { username: string; followers: number; wallet: string; bio?: string; avatar?: string } | null {
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
    return {
      username: data.u,
      followers: data.f,
      wallet: data.w,
      bio: typeof data.b === 'string' ? data.b : undefined,
      avatar: typeof data.a === 'string' ? data.a : undefined,
    };
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
  // F6：限流（按 IP）
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  if (rateLimited(`auth:${ip}`)) {
    res.status(429).json({ error: 'Too many requests — try again in a minute' });
    return;
  }
  const wallet = (req.query.wallet as string | undefined) ?? '';
  // Codex 审计：严格校验 wallet 为合法地址（防非法值污染 state/ticket/签名流程）
  if (!wallet) {
    res.status(400).json({ error: 'missing wallet — connect your wallet first' });
    return;
  }
  if (!isAddress(wallet)) {
    res.status(400).json({ error: 'invalid wallet' });
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
  // F6：限流（按 IP，回调每次消耗 X token exchange + users/me 两次免费额度）
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  if (rateLimited(`cb:${ip}`)) {
    res.status(429).send('Too many requests — try again in a minute');
    return;
  }
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
    //    审计修复：外部请求加 10s 超时，防止上游卡住长期占用 serverless 实例
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
      signal: AbortSignal.timeout(10_000),
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

    // 4. /2/users/me → 本人 username / id / 简介 / 头像（此端点免费 0 积分）
    //    审计修复：外部请求加 10s 超时
    const meRes = await fetch(
      'https://api.twitter.com/2/users/me?user.fields=username,public_metrics,name,description,profile_image_url',
      { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10_000) }
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
      data?: {
        id?: string;
        username?: string;
        name?: string;
        description?: string;
        profile_image_url?: string;
        public_metrics?: { followers_count?: number };
      };
    };
    const username = me?.data?.username ?? '';
    const followers = me?.data?.public_metrics?.followers_count ?? 0;
    const bio = me?.data?.description ?? '';
    const avatar = me?.data?.profile_image_url ?? '';

    // 审计修复（D10）：校验 X 返回数据再签发 ticket——拒绝空/畸形 username、
    // 非数值或越界 followers、超长 bio、非 http(s) avatar。X 官方 username 规则：
    // 字母/数字/下划线，1-30 字符（数字开头除外）。非法数据一律视为流程失败。
    const USERNAME_RE = /^[A-Za-z_][A-Za-z0-9_]{0,29}$/;
    if (!USERNAME_RE.test(username)) {
      res.redirect(
        `${FRONTEND_URL}/kol/onboarding?xoauth=error&stage=usersme&message=${encodeURIComponent(
          'Invalid username returned by X'
        )}`
      );
      return;
    }
    if (!Number.isFinite(followers) || followers < 0 || followers > 1_000_000_000) {
      res.redirect(
        `${FRONTEND_URL}/kol/onboarding?xoauth=error&stage=usersme&message=${encodeURIComponent(
          'Invalid followers count returned by X'
        )}`
      );
      return;
    }
    // bio / avatar 为非关键字段：超长截断，非法 URL 置空（不阻断流程）
    const safeBio = bio.length > 400 ? bio.slice(0, 400) : bio;
    const safeAvatar =
      /^https:\/\//.test(avatar) && avatar.length <= 500 ? avatar : '';

    // 5. 签发一次性验证票据（绑定申请者钱包，防止多钱包冒用同一 X 身份；
    //    不把 username/followers/verified 明文放 URL，防伪造）
    //    前端用 ticket 调 /api/kol/verify-ticket 换取可信结果。
    //    F5：ticket 改放 URL fragment（#ticket=...）——fragment 不随 HTTP 请求头发送、
    //    不进入服务器/Vercel 访问日志，避免 ticket 泄露被中间人抢先消费。
    const ticket = signTicket(username, followers, wallet, safeBio, safeAvatar);
    res.redirect(
      `${FRONTEND_URL}/kol/onboarding#xoauth=success&ticket=${encodeURIComponent(ticket)}`
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
 * 3. 验证票据（POST，body: { ticket, wallet }）
 *    出参：{ verified, username, followers, threshold, signature }
 *      - threshold：当前粉丝门槛（server 配置值，前端展示文案用）
 *      - signature：平台对 (wallet, username, followers) 的 ECDSA 注册签名
 *        （P2-2），前端 registerKol 时随 handle/followers 一起上链验签。
 *        **仅 verified=true 时签发**（F1：签名即平台背书，粉丝不足不签发）。
 *    一次性：短 TTL（5min）+ wallet 绑定；ticket 使用后标记（尽力而为的单实例
 *    消费集合；Vercel 多实例下无法强一致，故以短时效 + 钱包绑定为主防线）。
 *    改 POST：避免 ticket 出现在 URL/访问日志。
 */
router.post('/verify-ticket', async (req, res) => {
  const { ticket, wallet } = (req.body ?? {}) as { ticket?: string; wallet?: string };
  if (!ticket) {
    res.status(400).json({ error: 'missing ticket' });
    return;
  }
  if (!wallet) {
    res.status(400).json({ error: 'missing wallet' });
    return;
  }
  // Codex 审计：严格校验 wallet 为合法地址——非法值会进入 signRegistration 的
  // encodePacked(address,...) 强转并抛异常，且不在 try/catch 内（500 而非明确 400）。
  if (!isAddress(wallet)) {
    res.status(400).json({ error: 'invalid wallet' });
    return;
  }
  if (usedTickets.has(ticket)) {
    res.status(401).json({ error: 'ticket already used — please re-authorize' });
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
  // 签名（P2-2）：合约 registerKol 需要平台 ECDSA 签名。缺失私钥时无法注册。
  // 注意：私钥未配置时不得消费 ticket（返回 503 让用户补配置后可重试同一 ticket）。
  if (!platformSigner) {
    res.status(503).json({ error: 'PLATFORM_SIGNER_PRIVATE_KEY not configured' });
    return;
  }  // 粉丝门槛判定（F1/F3）：verified=false 时**不签发注册签名** ——
  // 平台签名是注册的硬前提，签名一经签发即代表平台背书该账号已达门槛；
  // 若仍照常签发，当合约 MIN_FOLLOWERS < server 阈值时，攻击者可绕过前端
  // 直接拿签名调合约 registerKol，让 server 的更高门槛形同虚设。
  // 同时返回 threshold，供前端展示真实门槛文案。
  const verified = result.followers >= FOLLOWERS_THRESHOLD;
  if (!verified) {
    usedTickets.add(ticket); // 结果已确定，一次性标记（无需重试）
    res.json({
      verified: false,
      username: result.username,
      followers: result.followers,
      threshold: FOLLOWERS_THRESHOLD,
      bio: result.bio ?? null,
      signature: null,
    });
    return;
  }
  // 平台注册签名（F3：hash 含 expiry，签名只在 5 分钟内有效）
  const { signature, expiry } = await signRegistration(wallet, result.username, result.followers);
  // 一次性：使用后标记（放在签名成功之后，避免配置错误浪费 ticket）
  usedTickets.add(ticket);
  // KOL 元信息持久化：X 简介等资料供详情页展示（失败不阻断主流程）
  upsertKolMeta(wallet, result.username, result.followers, result.bio, result.avatar);
  res.json({
    verified: true,
    username: result.username,
    followers: result.followers,
    threshold: FOLLOWERS_THRESHOLD,
    bio: result.bio ?? null,
    expiry,
    signature,
  });
});

export default router;
