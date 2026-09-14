import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Server } from 'http';
import { createApp } from './app.js';

let server: Server;
let base: string;

beforeAll(async () => {
  const app = createApp();
  // 显式绑定 127.0.0.1，避免某些环境下 0.0.0.0 导致 EPERM
  server = app.listen(0, '127.0.0.1');
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

  it('OPTIONS preflight → CORS headers for allowed origin', async () => {
    const res = await request(base)
      .options('/health')
      .set('Origin', 'http://localhost:3000');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('unknown origin gets no CORS allow header', async () => {
    const res = await request(base)
      .get('/health')
      .set('Origin', 'https://evil.example.com');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('oversized JSON body is rejected (16kb limit)', async () => {
    const res = await request(base)
      .post('/health')
      .send({ payload: 'x'.repeat(20000) })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(413);
  });
});
