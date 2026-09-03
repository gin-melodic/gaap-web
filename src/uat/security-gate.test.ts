import { readFileSync } from 'node:fs';

import { beforeAll, describe, expect, it } from 'vitest';

import { encryptPayload, signRequest } from '../lib/crypto/browser-crypto';
import { tokenStorage } from '../lib/network/secure-client';
import { secureAuthService } from '../lib/services/secureAuthService';
import { AccountType } from '../lib/proto/base/base';
import { ListAccountsReq } from '../lib/proto/account/v1/account';

type Session = {
  accessToken: string;
  sessionKey: string;
};

const runUat = process.env.RUN_GAAP_UAT_SECURITY === '1';
const describeUat = runUat ? describe : describe.skip;
const turnstileToken = 'XXXX.DUMMY.TOKEN.XXXX';

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for UAT`);
  return value;
}

function requiredFile(variable: string): string {
  return readFileSync(requiredEnv(variable), 'utf8').trim();
}

function envFileValue(name: string): string {
  const line = readFileSync(requiredEnv('GAAP_UAT_ENV_FILE'), 'utf8')
    .split(/\r?\n/u)
    .find((candidate) => candidate.startsWith(`${name}=`));
  if (!line) throw new Error(`${name} is missing from GAAP_UAT_ENV_FILE`);
  return line.slice(name.length + 1).trim().replace(/^['"]|['"]$/gu, '');
}

function base64Url(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/gu, '');
}

function decodeJwtPart(part: string): Record<string, unknown> {
  const normalized = part.replace(/-/gu, '+').replace(/_/gu, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
  return JSON.parse(atob(normalized)) as Record<string, unknown>;
}

async function signJwt(header: Record<string, unknown>, claims: Record<string, unknown>, secret: string): Promise<string> {
  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claims))}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64Url(new Uint8Array(signature))}`;
}

async function requestParts(session: Session, timestamp = Date.now().toString()) {
  const plaintext = ListAccountsReq.encode(ListAccountsReq.fromPartial({
    query: {
      page: 1,
      limit: 10,
      type: AccountType.ACCOUNT_TYPE_UNSPECIFIED,
      parentId: '',
    },
  })).finish();
  const { ciphertext, iv } = await encryptPayload(plaintext, session.sessionKey);
  const nonce = crypto.randomUUID();
  const signature = await signRequest(ciphertext, iv, timestamp, nonce, session.sessionKey);
  const body = new Uint8Array(iv.length + ciphertext.length);
  body.set(iv);
  body.set(ciphertext, iv.length);
  return { body, nonce, signature, timestamp };
}

async function send(
  baseUrl: string,
  token: string,
  parts: Awaited<ReturnType<typeof requestParts>>,
  overrides: Partial<Record<'signature' | 'timestamp' | 'nonce', string>> = {},
  body = parts.body,
): Promise<Response> {
  return fetch(`${baseUrl}/api/v1/account/list-accounts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
      'X-Nonce': overrides.nonce ?? parts.nonce,
      'X-Signature': overrides.signature ?? parts.signature,
      'X-Timestamp': overrides.timestamp ?? parts.timestamp,
    },
    body,
  });
}

describeUat('GAAP ALE raw security gates', () => {
  const baseUrl = process.env.GAAP_UAT_BASE_URL ?? 'https://gaap.local';
  let session: Session;
  let jwtSecret: string;

  beforeAll(async () => {
    const values = new Map<string, string>();
    const storage: Storage = {
      get length() { return values.size; },
      clear: () => values.clear(),
      getItem: (key) => values.get(key) ?? null,
      key: (index) => [...values.keys()][index] ?? null,
      removeItem: (key) => { values.delete(key); },
      setItem: (key, value) => { values.set(key, String(value)); },
    };
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
    Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });

    const nativeFetch = globalThis.fetch.bind(globalThis);
    globalThis.fetch = (input: string | URL | Request, init?: RequestInit) => {
      if (typeof input === 'string' && input.startsWith('/')) {
        return nativeFetch(`${baseUrl}${input}`, init);
      }
      return nativeFetch(input, init);
    };

    process.env.NEXT_PUBLIC_ALE_BOOTSTRAP_KEY = envFileValue('NEXT_PUBLIC_ALE_BOOTSTRAP_KEY');
    jwtSecret = envFileValue('JWT_SECRET');
    const response = await secureAuthService.login({
      email: requiredEnv('GAAP_UAT_EMAIL'),
      password: requiredFile('GAAP_UAT_PASSWORD_FILE'),
      cfTurnstileResponse: turnstileToken,
    });
    session = {
      accessToken: response.auth?.accessToken ?? '',
      sessionKey: response.auth?.sessionKey ?? '',
    };
    expect(session.accessToken).not.toBe('');
    expect(session.sessionKey).not.toBe('');
    tokenStorage.clear();
  });

  it('rejects exact request replay', async () => {
    const parts = await requestParts(session);
    expect((await send(baseUrl, session.accessToken, parts)).status).toBe(200);
    expect((await send(baseUrl, session.accessToken, parts)).status).toBe(403);
  });

  it('rejects a tampered signature', async () => {
    const parts = await requestParts(session);
    const replacement = parts.signature.endsWith('0') ? '1' : '0';
    expect((await send(baseUrl, session.accessToken, parts, {
      signature: `${parts.signature.slice(0, -1)}${replacement}`,
    })).status).toBe(403);
  });

  it('rejects tampered ciphertext', async () => {
    const parts = await requestParts(session);
    const tampered = parts.body.slice();
    tampered[tampered.length - 1] ^= 1;
    expect((await send(baseUrl, session.accessToken, parts, {}, tampered)).status).toBe(403);
  });

  it('rejects an expired request timestamp', async () => {
    const stale = (Date.now() - 10 * 60 * 1000).toString();
    const parts = await requestParts(session, stale);
    expect((await send(baseUrl, session.accessToken, parts)).status).toBe(403);
  });

  it('rejects a random signed session id', async () => {
    const [headerPart, claimsPart] = session.accessToken.split('.');
    const token = await signJwt(
      decodeJwtPart(headerPart),
      { ...decodeJwtPart(claimsPart), sid: crypto.randomUUID() },
      jwtSecret,
    );
    const parts = await requestParts(session);
    const response = await send(baseUrl, token, parts);
    expect(response.status).toBe(401);
    expect(response.headers.get('x-ale-session-expired')).toBe('1');
  });

  it('rejects an expired access token', async () => {
    const [headerPart, claimsPart] = session.accessToken.split('.');
    const token = await signJwt(decodeJwtPart(headerPart), { ...decodeJwtPart(claimsPart), exp: 1 }, jwtSecret);
    const parts = await requestParts(session);
    expect((await send(baseUrl, token, parts)).status).toBe(401);
  });

  it('rejects an invalid token', async () => {
    const parts = await requestParts(session);
    const response = await send(baseUrl, 'not-a-jwt', parts);
    expect(response.status).toBe(401);
    expect(response.headers.get('x-ale-session-expired')).toBe('1');
  });
});
