import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { accountService } from '../lib/services/accountService';
import { secureAuthService } from '../lib/services/secureAuthService';
import { transactionService } from '../lib/services/transactionService';
import { tokenStorage } from '../lib/network/secure-client';
import { AccountType, TransactionType } from '../lib/proto/base/base';
import { TransactionQuery } from '../lib/proto/transaction/v1/transaction';

import { installUatFetch } from './retry-fetch';

// Seeds a browser session for the Playwright P2 UI round: logs in (or registers)
// the dedicated codex user and persists token material to disk.
const runBrowserSession = process.env.RUN_GAAP_UAT_BROWSER_SESSION === '1';
const describeBrowserSession = runBrowserSession ? describe : describe.skip;
const turnstileToken = 'XXXX.DUMMY.TOKEN.XXXX';

function requiredSecret(name: string, fileVariable: string): string {
  const direct = process.env[name]?.trim();
  if (direct) return direct;

  const file = process.env[fileVariable]?.trim();
  if (!file) throw new Error(`${name} or ${fileVariable} is required for UAT`);

  const value = readFileSync(file, 'utf8').trim();
  if (!value) throw new Error(`${fileVariable} is empty`);
  return value;
}

function requiredDotEnv(name: string): string {
  const envFile = process.env.GAAP_UAT_ENV_FILE?.trim();
  if (!envFile) throw new Error('GAAP_UAT_ENV_FILE is required for UAT');

  const line = readFileSync(envFile, 'utf8')
    .split(/\r?\n/u)
    .find((candidate) => candidate.startsWith(`${name}=`));
  if (!line) throw new Error(`"${name}" is missing from GAAP_UAT_ENV_FILE`);

  const value = line.slice(name.length + 1).trim().replace(/^['"]|['"]$/gu, '');
  if (!value) throw new Error(`"${name}" is empty in GAAP_UAT_ENV_FILE`);
  return value;
}

describeBrowserSession('GAAP local UAT browser session bootstrap (P2 UI round)', () => {
  const baseUrl = process.env.GAAP_UAT_BASE_URL ?? 'https://gaap.local';
  const email = process.env.GAAP_UAT_P2_EMAIL ?? 'codex-uat-20260812@gaap.local';
  let password: string;

  beforeAll(() => {
    password = requiredSecret('GAAP_UAT_PASSWORD_P2', 'GAAP_UAT_PASSWORD_P2_FILE');
    process.env.NEXT_PUBLIC_ALE_BOOTSTRAP_KEY =
      process.env.NEXT_PUBLIC_ALE_BOOTSTRAP_KEY?.trim() || requiredDotEnv('NEXT_PUBLIC_ALE_BOOTSTRAP_KEY');

    const storageValues = new Map<string, string>();
    const storage: Storage = {
      get length() { return storageValues.size; },
      clear: () => storageValues.clear(),
      getItem: (key) => storageValues.get(key) ?? null,
      key: (index) => [...storageValues.keys()][index] ?? null,
      removeItem: (key) => { storageValues.delete(key); },
      setItem: (key, value) => { storageValues.set(key, String(value)); },
    };
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
    Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });

    installUatFetch(baseUrl);
  });

  it('writes the codex session and guarantees chart data exists', async () => {
    tokenStorage.clear();
    try {
      await secureAuthService.login({ email, password, cfTurnstileResponse: turnstileToken });
    } catch {
      const registered = await secureAuthService.register({
        email,
        password,
        nickname: 'codex-uat-20260812',
        mainCurrency: 'CNY',
        cfTurnstileResponse: turnstileToken,
      });
      tokenStorage.setToken(registered.auth?.accessToken ?? '');
      tokenStorage.setRefreshToken(registered.auth?.refreshToken ?? '');
      tokenStorage.setSessionKey(registered.auth?.sessionKey ?? '');
    }
    expect(tokenStorage.getToken(), 'access token was not stored after login').not.toBe('');

    const money = (units: string) => ({ currencyCode: 'CNY', units, nanos: 0 });
    const accounts = (await accountService.list()).data;
    let asset = accounts.find((candidate) => candidate.name === 'codex-p2-asset');
    if (!asset) {
      asset = (await accountService.create({
        name: 'codex-p2-asset',
        type: AccountType.ACCOUNT_TYPE_ASSET,
        isGroup: false,
        balance: money('100'),
        date: '2026-09-01',
      })).account;
    }
    let expense = accounts.find((candidate) => candidate.name === 'codex-p2-expense');
    if (!expense) {
      expense = (await accountService.create({
        name: 'codex-p2-expense',
        type: AccountType.ACCOUNT_TYPE_EXPENSE,
        isGroup: false,
        balance: money('0'),
        date: '2026-09-01',
      })).account;
    }
    expect(asset?.id, 'asset account is missing an id').not.toBe('');
    expect(expense?.id, 'expense account is missing an id').not.toBe('');

    if ((await transactionService.list(TransactionQuery.fromPartial({}))).data.length === 0) {
      await transactionService.create({
        date: '2026-09-01T08:30:00',
        from: asset!.id,
        to: expense!.id,
        amount: money('5'),
        note: 'browser-session-seed',
        type: TransactionType.TRANSACTION_TYPE_EXPENSE,
      });
    }

    const sessionFile = process.env.GAAP_UAT_BROWSER_SESSION_FILE ?? '/tmp/gaap-uat-pw/session.json';
    mkdirSync(path.dirname(sessionFile), { recursive: true });
    writeFileSync(
      sessionFile,
      JSON.stringify({
        email,
        accessToken: tokenStorage.getToken() ?? '',
        refreshToken: tokenStorage.getRefreshToken() ?? '',
        sessionKey: tokenStorage.getSessionKey() ?? '',
      }, null, 2),
    );
    console.log(`GAAP_UAT_BROWSER_SESSION=${sessionFile}`);
  }, 180_000);
});
