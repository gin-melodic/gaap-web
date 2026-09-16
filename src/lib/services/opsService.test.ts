import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ApiError } from '../network/errors';
import { tokenStorage } from '../network/secure-client';
import { opsService } from './opsService';

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: new Headers(),
  };
}

function binaryError(status: number) {
  // Mirrors the auth middleware's proto-bytes 401/403 body: not JSON.
  return {
    ok: false,
    status,
    json: async () => {
      throw new Error('not json');
    },
    text: async () => 'proto-bytes',
    headers: new Headers(),
  };
}

describe('opsService', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('GETs /api/v1/<code>/status with the bearer token', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ server: {} }) as never);
    vi.spyOn(tokenStorage, 'getToken').mockReturnValue('jwt-token');

    await opsService.getStatus();

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe('/api/v1/v7qk2xm9/status');
    expect((init?.headers as Record<string, string>)['Authorization']).toBe('Bearer jwt-token');
  });

  it('POSTs to the reconcile endpoint', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ report: {} }) as never);

    await opsService.reconcileNow();

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe('/api/v1/v7qk2xm9/reconcile');
    expect(init?.method).toBe('POST');
  });

  it('parses JSON error bodies into the ApiError message', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: 'too many requests' }, 429) as never);

    const err = await opsService.getStatus().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).message).toBe('too many requests');
    expect((err as ApiError).code).toBe(429);
  });

  it('classifies non-JSON auth errors by status code', async () => {
    vi.mocked(fetch).mockResolvedValue(binaryError(401) as never);

    const err = await opsService.getStatus().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe(401);
  });

  it('returns the status payload on success', async () => {
    const payload = { server: { uptimeSec: 1 }, database: { status: 'ok' } };
    vi.mocked(fetch).mockResolvedValue(jsonResponse(payload) as never);

    await expect(opsService.getStatus()).resolves.toEqual(payload);
  });
});
