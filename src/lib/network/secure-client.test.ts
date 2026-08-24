import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorResponse } from '../proto/base/base';
import { RefreshTokenRes } from '../proto/auth/v1/auth';
import { ApiError } from './errors';

const cryptoMocks = vi.hoisted(() => ({
  encryptPayload: vi.fn(),
  decryptPayload: vi.fn(),
  signRequest: vi.fn(),
}));

vi.mock('../crypto/browser-crypto', () => cryptoMocks);

import { secureRequest, tokenStorage } from './secure-client';

interface TestMessage {
  value: string;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const TestMessageFns = {
  encode: (message: TestMessage) => ({ finish: () => encoder.encode(JSON.stringify(message)) }),
  decode: (input: Uint8Array): TestMessage => JSON.parse(decoder.decode(input)) as TestMessage,
  fromPartial: (object: Partial<TestMessage>): TestMessage => ({ value: object.value ?? '' }),
};

function binaryResponse(
  body: Uint8Array,
  status = 200,
  encrypted = true,
  sessionExpired = false,
): Response {
  const headers: Record<string, string> = { 'content-type': 'application/octet-stream' };
  if (encrypted) {
    headers['x-ale-encrypted'] = '1';
  }
  if (sessionExpired) {
    headers['x-ale-session-expired'] = '1';
  }
  return new Response(Uint8Array.from(body).buffer, { status, headers });
}

describe('secureRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_ALE_BOOTSTRAP_KEY', 'ab'.repeat(32));
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
      key: (index: number) => Array.from(values.keys())[index] ?? null,
      get length() {
        return values.size;
      },
    });
    tokenStorage.clear();
    tokenStorage.setToken('old-access-token');
    tokenStorage.setRefreshToken('old-refresh-token');
    tokenStorage.setSessionKey('cd'.repeat(32));
    cryptoMocks.encryptPayload.mockResolvedValue({
      ciphertext: new Uint8Array(16),
      iv: new Uint8Array(12),
    });
    cryptoMocks.signRequest.mockResolvedValue('signature');
  });

  it('decodes an encrypted protobuf success response', async () => {
    const decrypted = TestMessageFns.encode({ value: 'ok' }).finish();
    cryptoMocks.decryptPayload.mockResolvedValue(decrypted);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(binaryResponse(new Uint8Array(28))));

    const result = await secureRequest(
      '/test',
      { value: 'request' },
      TestMessageFns,
      TestMessageFns,
      'session',
      { retryOnUnauth: false },
    );

    expect(result).toEqual({ value: 'ok' });
    expect(cryptoMocks.decryptPayload).toHaveBeenCalledOnce();
  });

  it('rejects an unencrypted success response', async () => {
    const body = TestMessageFns.encode({ value: 'unsafe' }).finish();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(binaryResponse(body, 200, false)));

    await expect(
      secureRequest('/test', {}, TestMessageFns, TestMessageFns, 'session', { retryOnUnauth: false }),
    ).rejects.toMatchObject({ message: 'API response was not ALE encrypted', code: 502 });
  });

  it('decodes the unified encrypted protobuf error', async () => {
    const errorBody = ErrorResponse.encode({ code: 403, message: 'request rejected', requestId: 'req-1' }).finish();
    cryptoMocks.decryptPayload.mockResolvedValue(errorBody);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(binaryResponse(new Uint8Array(28), 403)));

    try {
      await secureRequest('/test', {}, TestMessageFns, TestMessageFns, 'session', { retryOnUnauth: false });
      expect.fail('secureRequest should reject the response');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        message: 'request rejected',
        code: 403,
        data: { requestId: 'req-1' },
      });
    }
  });

  it('refreshes the session key and retries once when response decryption fails', async () => {
    const bootstrapKey = 'ab'.repeat(32);
    const oldSessionKey = 'cd'.repeat(32);
    const newSessionKey = 'ef'.repeat(32);
    const refreshBody = RefreshTokenRes.encode({
      base: undefined,
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      sessionKey: newSessionKey,
    }).finish();
    const successBody = TestMessageFns.encode({ value: 'recovered' }).finish();

    cryptoMocks.decryptPayload
      .mockRejectedValueOnce(new Error('key mismatch'))
      .mockResolvedValueOnce(refreshBody)
      .mockResolvedValueOnce(successBody);
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(binaryResponse(new Uint8Array(28), 403))
      .mockResolvedValueOnce(binaryResponse(new Uint8Array(28)))
      .mockResolvedValueOnce(binaryResponse(new Uint8Array(28))));

    const result = await secureRequest('/test', { value: 'request' }, TestMessageFns, TestMessageFns);

    expect(result).toEqual({ value: 'recovered' });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(cryptoMocks.encryptPayload.mock.calls.map((call) => call[1])).toEqual([
      oldSessionKey,
      bootstrapKey,
      newSessionKey,
    ]);
    expect(tokenStorage.getToken()).toBe('new-access-token');
    expect(tokenStorage.getRefreshToken()).toBe('new-refresh-token');
    expect(tokenStorage.getSessionKey()).toBe(newSessionKey);
  });

  it('does not expose browser crypto details after the one allowed retry', async () => {
    cryptoMocks.decryptPayload.mockRejectedValue(new Error('OperationError'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(binaryResponse(new Uint8Array(28), 403)));

    await expect(
      secureRequest('/test', {}, TestMessageFns, TestMessageFns, 'session', { retryOnUnauth: false }),
    ).rejects.toMatchObject({ message: 'Unable to verify secure API response', code: 502 });
  });

  it('accepts only a marked unencrypted 401 and clears an unrecoverable session', async () => {
    const sessionError = ErrorResponse.encode({
      code: 401,
      message: 'secure session expired, please login again',
      requestId: 'expired-1',
    }).finish();
    const refreshError = ErrorResponse.encode({
      code: 401,
      message: 'secure session expired, please login again',
      requestId: 'refresh-1',
    }).finish();

    cryptoMocks.decryptPayload.mockResolvedValueOnce(refreshError);
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(binaryResponse(sessionError, 401, false, true))
      .mockResolvedValueOnce(binaryResponse(new Uint8Array(28), 401)));
    window.history.replaceState({}, '', '/login');

    await expect(secureRequest('/test', {}, TestMessageFns, TestMessageFns)).rejects.toMatchObject({
      message: 'secure session expired, please login again',
      code: 401,
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(tokenStorage.getToken()).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
    expect(tokenStorage.getSessionKey()).toBeNull();
  });

  it('rejects an unmarked unencrypted 401 without decoding its body', async () => {
    const body = ErrorResponse.encode({ code: 401, message: 'forged', requestId: 'forged-1' }).finish();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(binaryResponse(body, 401, false)));

    await expect(
      secureRequest('/test', {}, TestMessageFns, TestMessageFns, 'session', { retryOnUnauth: false }),
    ).rejects.toMatchObject({ message: 'API response was not ALE encrypted', code: 502 });
  });
});
