import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Server } from 'http';
import { createApp } from './app.js';

let server: Server;
let base: string;

beforeAll(async () => {
  const app = createApp();
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 3001}`;
});

afterAll(() => {
  server?.close();
});

describe('server API', () => {
  it('GET /health → ok', async () => {
    const res = await request(base).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  // ---- /api/kol/x-auth-url（Codex 审计 P1：wallet 严格校验） ----
  it('GET /x-auth-url 缺 wallet → 400', async () => {
    const res = await request(base).get('/api/kol/x-auth-url');
    expect(res.status).toBe(400);
  });

  it('GET /x-auth-url 非法 wallet → 400', async () => {
    const res = await request(base)
      .get('/api/kol/x-auth-url')
      .query({ wallet: 'not-an-address' });
    expect(res.status).toBe(400);
  });

  it('GET /x-auth-url 合法 wallet → 200 且 authUrl 含 client_id / code_challenge', async () => {
    const res = await request(base)
      .get('/api/kol/x-auth-url')
      .query({ wallet: '0x465CC653Ac57A31707bf07Ea2a89637Ea79c334B' });
    // X 凭据未配置时返回 503（测试环境不确定），已配置则必须产出 OAuth URL
    expect([200, 503]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.authUrl).toContain('client_id=');
      expect(res.body.authUrl).toContain('code_challenge=');
      expect(res.body.authUrl).toContain('oauth2/authorize');
      expect(res.body.state).toBeTruthy();
    }
  });

  // ---- /api/kol/verify-ticket ----
  it('POST /verify-ticket 缺 ticket → 400', async () => {
    const res = await request(base)
      .post('/api/kol/verify-ticket')
      .send({ wallet: '0x465CC653Ac57A31707bf07Ea2a89637Ea79c334B' });
    expect(res.status).toBe(400);
  });

  it('POST /verify-ticket 缺 wallet → 400', async () => {
    const res = await request(base).post('/api/kol/verify-ticket').send({ ticket: 'x' });
    expect(res.status).toBe(400);
  });

  it('POST /verify-ticket 非法 wallet → 400（防签名流程强转异常）', async () => {
    const res = await request(base)
      .post('/api/kol/verify-ticket')
      .send({ ticket: 'x', wallet: 'garbage' });
    expect(res.status).toBe(400);
  });

  it('POST /verify-ticket 未知 ticket → 401', async () => {
    const res = await request(base)
      .post('/api/kol/verify-ticket')
      .send({ ticket: 'definitely-not-a-ticket', wallet: '0x465CC653Ac57A31707bf07Ea2a89637Ea79c334B' });
    expect(res.status).toBe(401);
  });

  // ---- CORS / 安全头 / body limit ----
  it('OPTIONS 预检 → 204 且带 CORS 头', async () => {
    const res = await request(base)
      .options('/api/kol/x-auth-url')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'GET');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('白名单外 Origin 不返回 Allow-Origin', async () => {
    const res = await request(base)
      .get('/api/kol/x-auth-url')
      .set('Origin', 'https://evil.example.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('安全响应头存在', async () => {
    const res = await request(base).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['content-security-policy']).toContain('frame-ancestors');
  });

  it('超过 16kb 的 body 被拒绝（400/413）', async () => {
    const res = await request(base)
      .post('/api/kol/verify-ticket')
      .send({ ticket: 'x', wallet: 'y'.repeat(20000) });
    expect([400, 413]).toContain(res.status);
  });
});
