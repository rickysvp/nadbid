import { env } from './env';

/**
 * Minimal fetch wrapper with base URL resolution, JSON handling and timeout.
 * Replace with axios/ky when the API surface grows.
 */

export class HttpError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message?: string,
  ) {
    super(message ?? `HTTP ${status}`);
    this.name = 'HttpError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export async function http<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, timeoutMs = 15_000, ...rest } = options;
  const url = path.startsWith('http') ? path : `${env.VITE_API_BASE_URL}${path}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...rest,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) throw new HttpError(response.status, payload);
    return payload as T;
  } finally {
    clearTimeout(timeoutId);
  }
}
