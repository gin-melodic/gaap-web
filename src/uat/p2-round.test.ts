import { readFileSync } from 'node:fs';

import { beforeAll, describe, expect, it } from 'vitest';

import { installUatFetch } from './retry-fetch';
import { accountService } from '../lib/services/accountService';
import { secureAuthService } from '../lib/services/secureAuthService';
import { transactionService } from '../lib/services/transactionService';
import { tokenStorage } from '../lib/network/secure-client';
import { AccountType, TransactionType } from '../lib/proto/base/base';

// DEF-027 protocol gate: transaction dates must round-trip with full second
// precision (RFC3339 responses) while plain "YYYY-MM-DD" inputs keep working.
const runUat = process.env.RUN_GAAP_UAT === '1';
const describeUat = runUat ? describe : describe.skip;
const turnstileToken = 'XXXX.DUMMY.TOKEN.XXXX';
const rfc3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/u;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for UAT`);
  return value;
}

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
  const envFile = requiredEnv('GAAP_UAT_ENV_FILE');
  const line = readFileSync(envFile, 'utf8')
    .split(/\r?\n/u)
    .find((candidate) => candidate.startsWith(`${name}=`));
  if (!line) throw new Error(`${name} is missing from GAAP_UAT_ENV_FILE`);

  const value = line.slice(name.length + 1).trim().replace(/^['"]|['"]$/gu, '');
  if (!value) throw new Error(`${name} is empty in GAAP_UAT_ENV_FILE`);
  return value;
}

function money(units: string): { currencyCode: string; units: string; nanos: number } {
  return { currencyCode: 'CNY', units, nanos: 0 };
}

describeUat('GAAP local UAT P2 post-beta round (DEF-027 datetime)', () => {
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

  const startSession = async (): Promise<void> => {
    tokenStorage.clear();
    try {
      await secureAuthService.login({ email, password, cfTurnstileResponse: turnstileToken });
      return;
    } catch {
      // Fresh UAT database: the dedicated P2 user does not exist yet.
    }
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
  };

  it('keeps full date/time precision for transactions end-to-end', async () => {
      await secureAuthService.login({ email, password, cfTurnstileResponse: turnstileToken });
    await startSession();

    const accountResponse = await accountService.create({
      name: 'codex-p2-asset',
      type: AccountType.ACCOUNT_TYPE_ASSET,
      isGroup: false,
      balance: money('100'),
      date: '2026-09-01',
    });
    const assetId = accountResponse.account?.id ?? '';
    expect(assetId, 'asset account was not created').not.toBe('');

    const expenseResponse = await accountService.create({
      name: 'codex-p2-expense',
      type: AccountType.ACCOUNT_TYPE_EXPENSE,
      isGroup: false,
      balance: money('0'),
      date: '2026-09-01',
    });
    const expenseId = expenseResponse.account?.id ?? '';
    expect(expenseId, 'expense account was not created').not.toBe('');

    // Plain "YYYY-MM-DD" wall-clock input must round-trip as RFC3339.
    const plainDateTx = await transactionService.create({
      date: '2026-09-01T08:00:00',
      from: assetId,
      to: expenseId,
      amount: money('5'),
      note: 'codex-p2-plain-date',
      type: TransactionType.TRANSACTION_TYPE_EXPENSE,
    });
    const plainDate = plainDateTx.transaction?.date ?? '';
    expect(rfc3339.test(plainDate), `expected RFC3339 date, got "${plainDate}"`).toBe(true);
    expect(plainDate.includes('08:00:00'), plainDate).toBe(true);

    // Explicit wall-clock time must round-trip with second precision.
    const preciseTx = await transactionService.create({
      date: '2026-09-01T13:45:09',
      from: assetId,
      to: expenseId,
      amount: money('7'),
      note: 'codex-p2-midday',
      type: TransactionType.TRANSACTION_TYPE_EXPENSE,
    });
    const preciseDate = preciseTx.transaction?.date ?? '';
    expect(rfc3339.test(preciseDate), `expected RFC3339 date, got "${preciseDate}"`).toBe(true);
    expect(preciseDate.startsWith('2026-09-01T'), preciseDate).toBe(true);
    expect(preciseDate.includes('13:45:09'), `hour/minute/second were lost: ${preciseDate}`).toBe(true);

    // Boundary values: midnight and end of day.
    const midnightTx = await transactionService.create({
      date: '2026-09-02T00:00:00',
      from: assetId,
      to: expenseId,
      amount: money('1'),
      note: 'codex-p2-midnight',
      type: TransactionType.TRANSACTION_TYPE_EXPENSE,
    });
    const midnightDate = midnightTx.transaction?.date ?? '';
    expect(rfc3339.test(midnightDate), `expected RFC3339 date, got "${midnightDate}"`).toBe(true);
    expect(midnightDate.startsWith('2026-09-02T'), midnightDate).toBe(true);

    const endOfDayTx = await transactionService.create({
      date: '2026-09-03T23:59:59',
      from: assetId,
      to: expenseId,
      amount: money('1'),
      note: 'codex-p2-end-of-day',
      type: TransactionType.TRANSACTION_TYPE_EXPENSE,
    });
    const endOfDayDate = endOfDayTx.transaction?.date ?? '';
    expect(rfc3339.test(endOfDayDate), `expected RFC3339 date, got "${endOfDayDate}"`).toBe(true);
    expect(endOfDayDate.includes('23:59:59'), endOfDayDate).toBe(true);

    // Updating the transaction date must preserve the new time of day.
    await transactionService.update(preciseTx.transaction!.id, {
      ...preciseTx.transaction!,
      amount: money('7'),
      date: '2026-09-04T08:07:06',
    });
    const updated = await transactionService.get(preciseTx.transaction!.id);
    const updatedDate = updated.transaction?.date ?? '';
    expect(rfc3339.test(updatedDate), `expected RFC3339 date, got "${updatedDate}"`).toBe(true);
    expect(updatedDate.startsWith('2026-09-04T'), updatedDate).toBe(true);
    expect(updatedDate.includes('08:07:06'), `updated time of day was lost: ${updatedDate}`).toBe(true);

    // Plain "YYYY-MM-DD" list filters keep working and every result is RFC3339.
    const listed = await transactionService.list({
      page: 1,
      limit: 50,
      startDate: '2026-09-01',
      endDate: '2026-09-04',
      accountId: '',
      type: 0,
      sortBy: 'date',
      sortOrder: 'desc',
    });
    expect(listed.data.length).toBeGreaterThanOrEqual(4);
    for (const tx of listed.data) {
      expect(rfc3339.test(tx.date), `list returned non-RFC3339 date "${tx.date}"`).toBe(true);
      expect(tx.date.startsWith('2026-09-'), `${tx.date} outside filter window`).toBe(true);
    }

    console.log(
      'GAAP_UAT_P2_EVIDENCE=' + JSON.stringify({
        plainDate,
        preciseDate,
        midnightDate,
        endOfDayDate,
        updatedDate,
      }),
    );
  }, 120_000);
});
