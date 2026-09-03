import { readFileSync } from 'node:fs';

import Decimal from 'decimal.js';
import { beforeAll, describe, expect, it } from 'vitest';

import { accountService } from '../lib/services/accountService';
import { dashboardService } from '../lib/services/dashboardService';
import { secureAuthService } from '../lib/services/secureAuthService';
import { transactionService } from '../lib/services/transactionService';
import { secureRequest, tokenStorage } from '../lib/network/secure-client';
import { AccountType, TransactionType } from '../lib/proto/base/base';
import {
  GetDashboardSummaryReq,
  GetDashboardSummaryRes,
  GetMonthlyStatsReq,
  GetMonthlyStatsRes,
} from '../lib/proto/dashboard/v1/dashboard';
import {
  GetAccountTypesReq,
  GetAccountTypesRes,
  ListCurrenciesReq,
  ListCurrenciesRes,
} from '../lib/proto/config/v1/config';
import { GetUserProfileReq, GetUserProfileRes } from '../lib/proto/user/v1/user';

type Session = {
  accessToken: string;
  refreshToken: string;
  sessionKey: string;
};

type GateResult = {
  id: string;
  status: 'PASS' | 'FAIL';
  detail: string;
};

const runUat = process.env.RUN_GAAP_UAT === '1';
const describeUat = runUat ? describe : describe.skip;
const results: GateResult[] = [];
const turnstileToken = 'XXXX.DUMMY.TOKEN.XXXX';

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for UAT`);
  }
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

async function gate(id: string, action: () => Promise<void>): Promise<void> {
  try {
    await action();
    results.push({ id, status: 'PASS', detail: 'expected behavior observed' });
    console.log(`GAAP_UAT_GATE=${JSON.stringify({ id, status: 'PASS' })}`);
  } catch (error) {
    const result: GateResult = {
      id,
      status: 'FAIL',
      detail: error instanceof Error ? error.message : String(error),
    };
    results.push(result);
    console.log(`GAAP_UAT_GATE=${JSON.stringify(result)}`);
  }
}

async function expectRejected(action: () => Promise<unknown>, status?: number): Promise<void> {
  try {
    await action();
  } catch (error) {
    if (status !== undefined) {
      expect(error).toMatchObject({ code: status });
    }
    return;
  }
  throw new Error('request unexpectedly succeeded');
}

function captureSession(): Session {
  return {
    accessToken: requiredStored('access token', tokenStorage.getToken()),
    refreshToken: requiredStored('refresh token', tokenStorage.getRefreshToken()),
    sessionKey: requiredStored('session key', tokenStorage.getSessionKey()),
  };
}

function requiredStored(label: string, value: string | null): string {
  if (!value) {
    throw new Error(`${label} was not returned`);
  }
  return value;
}

function useSession(session: Session): void {
  tokenStorage.setToken(session.accessToken);
  tokenStorage.setRefreshToken(session.refreshToken);
  tokenStorage.setSessionKey(session.sessionKey);
}

function money(units: string, nanos = 0): { currencyCode: string; units: string; nanos: number } {
  return { currencyCode: 'CNY', units, nanos };
}

function moneyValue(value: { units: string; nanos: number } | undefined) {
  if (!value) throw new Error('money value was not returned');
  return new Decimal(value.units).plus(new Decimal(value.nanos).div(1_000_000_000));
}

async function waitFor<T>(read: () => Promise<T>, matches: (value: T) => boolean): Promise<T> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const value = await read();
    if (matches(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('derived dashboard state did not converge within 10 seconds');
}

async function register(email: string, password: string, nickname: string): Promise<Session> {
  tokenStorage.clear();
  const response = await secureAuthService.register({
    email,
    password,
    nickname,
    mainCurrency: 'CNY',
    cfTurnstileResponse: turnstileToken,
  });
  return {
    accessToken: requiredStored('access token', response.auth?.accessToken ?? null),
    refreshToken: requiredStored('refresh token', response.auth?.refreshToken ?? null),
    sessionKey: requiredStored('session key', response.auth?.sessionKey ?? null),
  };
}

async function login(email: string, password: string): Promise<Session> {
  tokenStorage.clear();
  const response = await secureAuthService.login({
    email,
    password,
    cfTurnstileResponse: turnstileToken,
  });
  return {
    accessToken: requiredStored('access token', response.auth?.accessToken ?? null),
    refreshToken: requiredStored('refresh token', response.auth?.refreshToken ?? null),
    sessionKey: requiredStored('session key', response.auth?.sessionKey ?? null),
  };
}

describeUat('GAAP local UAT full gate', () => {
  const baseUrl = process.env.GAAP_UAT_BASE_URL ?? 'https://gaap.local';
  const emailA = process.env.GAAP_UAT_EMAIL_A ?? 'uat-20260813-a@gaap.local';
  const emailB = process.env.GAAP_UAT_EMAIL_B ?? 'uat-20260813-b@gaap.local';
  const specialEmail = process.env.GAAP_UAT_SPECIAL_EMAIL ?? 'uat-20260813-special+tag@gaap.local';
  const unicodeEmail = process.env.GAAP_UAT_UNICODE_EMAIL ?? 'uat-20260813-unicode@gaap.local';
  let passwordA: string;
  let passwordB: string;
  let sessionA: Session;
  let sessionB: Session;

  beforeAll(() => {
    passwordA = requiredSecret('GAAP_UAT_PASSWORD_A', 'GAAP_UAT_PASSWORD_A_FILE');
    passwordB = requiredSecret('GAAP_UAT_PASSWORD_B', 'GAAP_UAT_PASSWORD_B_FILE');
    process.env.NEXT_PUBLIC_ALE_BOOTSTRAP_KEY =
      process.env.NEXT_PUBLIC_ALE_BOOTSTRAP_KEY?.trim() || requiredDotEnv('NEXT_PUBLIC_ALE_BOOTSTRAP_KEY');

    // Node 25 exposes an experimental global localStorage accessor without a
    // backing file. Use an in-memory implementation with the browser Storage
    // contract; only token persistence is simulated, never authentication.
    const storageValues = new Map<string, string>();
    const storage: Storage = {
      get length() { return storageValues.size; },
      clear: () => storageValues.clear(),
      getItem: (key) => storageValues.get(key) ?? null,
      key: (index) => [...storageValues.keys()][index] ?? null,
      removeItem: (key) => { storageValues.delete(key); },
      setItem: (key, value) => { storageValues.set(key, String(value)); },
    };
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: storage,
    });
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: storage,
    });

    const nativeFetch = globalThis.fetch.bind(globalThis);
    globalThis.fetch = (input: string | URL | Request, init?: RequestInit) => {
      if (typeof input === 'string' && input.startsWith('/')) {
        return nativeFetch(`${baseUrl}${input}`, init);
      }
      return nativeFetch(input, init);
    };
  });

  it('executes the protocol-backed CORE gates and emits redacted evidence', async () => {
    await gate('TC-AUTH-REG-001', async () => {
      sessionA = await register(emailA, passwordA, 'uat-20260813-a');
    });
    await gate('TC-AUTH-REG-002', async () => {
      await expectRejected(() => register(emailA, passwordA, 'duplicate'));
    });
    await gate('TC-AUTH-REG-003', async () => {
      await expectRejected(() => register('invalid-email', passwordA, 'invalid'));
    });
    await gate('TC-AUTH-REG-004', async () => {
      await expectRejected(() => register('uat-20260813-weak@gaap.local', '123456', 'weak'));
    });
    await gate('TC-AUTH-REG-005', async () => {
      await expectRejected(() => register('', passwordA, 'empty'));
    });
    await gate('TC-AUTH-LOGIN-001', async () => {
      sessionA = await login(emailA, passwordA);
    });
    await gate('TC-AUTH-LOGIN-002', async () => {
      await expectRejected(() => login(emailA, `${passwordA}-wrong`));
    });
    await gate('TC-AUTH-LOGIN-003', async () => {
      await expectRejected(() => login('uat-20260813-missing@gaap.local', passwordA));
    });

    await gate('TC-AUTH-REFRESH-001', async () => {
      useSession(sessionA);
      const previousRefresh = sessionA.refreshToken;
      const refreshed = await secureAuthService.refresh();
      expect(refreshed.accessToken).not.toBe('');
      expect(refreshed.refreshToken).not.toBe('');
      expect(refreshed.refreshToken).not.toBe(previousRefresh);
      sessionA = captureSession();
    });
    await gate('TC-AUTH-REFRESH-002', async () => {
      useSession(sessionA);
      tokenStorage.setRefreshToken('not-a-refresh-token');
      await expectRejected(() => secureAuthService.refresh());
      useSession(sessionA);
    });
    await gate('TC-AUTH-REFRESH-003', async () => {
      useSession(sessionA);
      tokenStorage.setRefreshToken('eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjF9.invalid');
      await expectRejected(() => secureAuthService.refresh());
      useSession(sessionA);
    });
    await gate('TC-EDGE-AUTH-001', async () => {
      const localPart = 'a'.repeat(250);
      await expectRejected(() => register(`${localPart}@gaap.local`, passwordA, 'long-email'));
    });
    await gate('TC-EDGE-AUTH-002', async () => {
      await expectRejected(() => register('uat-20260813-long-password@gaap.local', 'P'.repeat(101), 'long-password'));
    });
    await gate('TC-EDGE-AUTH-003', async () => {
      const special = await register(specialEmail, passwordA, 'special');
      expect(special.accessToken).not.toBe('');
    });
    await gate('TC-EDGE-AUTH-004', async () => {
      const unicode = await register(unicodeEmail, `密碼-${passwordA}`, 'unicode');
      expect(unicode.accessToken).not.toBe('');
    });

    await gate('TC-EDGE-CONC-003', async () => {
      const sessions = await Promise.all(Array.from({ length: 5 }, () => login(emailA, passwordA)));
      expect(new Set(sessions.map((session) => session.sessionKey)).size).toBe(5);
      useSession(sessions[0]);
      await secureAuthService.refresh();
      const refreshedFirst = captureSession();
      expect(refreshedFirst.sessionKey).not.toBe(sessions[1].sessionKey);
      useSession(sessions[1]);
      await secureAuthService.refresh();
      const refreshedSecond = captureSession();
      expect(refreshedSecond.sessionKey).not.toBe(refreshedFirst.sessionKey);
      useSession(refreshedFirst);
      await secureAuthService.logout();
      useSession(refreshedSecond);
      await accountService.list({ page: 1, limit: 1, type: 0, parentId: '' });
      sessionA = refreshedSecond;
    });

    await gate('TC-ACCT-LIST-003', async () => {
      sessionB = await register(emailB, passwordB, 'uat-20260813-b');
      useSession(sessionB);
      const response = await accountService.list({
        page: 1,
        limit: 100,
        type: AccountType.ACCOUNT_TYPE_UNSPECIFIED,
        parentId: '',
      });
      expect(response.data).toEqual([]);
    });
    await gate('TC-DASH-SUMMARY-002', async () => {
      useSession(sessionB);
      const response = await secureRequest('/dashboard/get-dashboard-summary', {}, GetDashboardSummaryReq, GetDashboardSummaryRes);
      expect(moneyValue(response.summary?.assets).isZero()).toBe(true);
      expect(moneyValue(response.summary?.liabilities).isZero()).toBe(true);
      expect(moneyValue(response.summary?.netWorth).isZero()).toBe(true);
    });

    useSession(sessionA);
    const created: Record<string, string> = {};
    const createAccount = async (
      key: string,
      name: string,
      type: AccountType,
      units: string,
      nanos = 0,
      remarks = '',
    ) => {
      const response = await accountService.create({
        name,
        type,
        isGroup: false,
        balance: money(units, nanos),
        date: '2026-08-01',
        remarks,
      });
      const account = response.account;
      if (!account?.id) throw new Error(`account ${key} was not returned`);
      created[key] = account.id;
      return account;
    };

    await gate('TC-ACCT-CREATE-001', async () => {
      const account = await createAccount('assetA', 'uat-20260813-asset-a', AccountType.ACCOUNT_TYPE_ASSET, '1000');
      expect(account.balance?.units).toBe('1000');
    });
    await gate('TC-ACCT-CREATE-002', async () => {
      const account = await createAccount('liability', 'uat-20260813-liability', AccountType.ACCOUNT_TYPE_LIABILITY, '-500');
      expect(account.balance?.units).toBe('-500');
    });
    await gate('TC-ACCT-CREATE-007', async () => {
      const account = await createAccount('assetB', 'uat-20260813-asset-b', AccountType.ACCOUNT_TYPE_ASSET, '0');
      expect(account.balance?.units).toBe('0');
    });
    await gate('TC-ACCT-CREATE-008', async () => {
      const account = await createAccount('overdraft', 'uat-20260813-overdraft', AccountType.ACCOUNT_TYPE_ASSET, '-100');
      expect(account.balance?.units).toBe('-100');
    });
    await gate('TC-EDGE-ACCT-001', async () => {
      const account = await createAccount('huge', 'uat-20260813-huge', AccountType.ACCOUNT_TYPE_ASSET, '999999999999999999', 990000000);
      expect(account.balance?.units).toBe('999999999999999999');
    });
    await gate('TC-ACCT-CREATE-005', async () => {
      await expectRejected(() => createAccount('invalid-empty', '', AccountType.ACCOUNT_TYPE_ASSET, '0'));
    });
    await gate('TC-ACCT-CREATE-006', async () => {
      await expectRejected(() => createAccount('invalid-type', 'uat-20260813-invalid', 999 as AccountType, '0'));
    });
    await gate('TC-EDGE-ACCT-002', async () => {
      await expectRejected(() => createAccount('long-name', 'x'.repeat(101), AccountType.ACCOUNT_TYPE_ASSET, '0'));
    });
    // A rejected protected request may rotate the session during the client's
    // one-shot resynchronization. Establish a clean, independently verified
    // session before the next positive gate so failures cannot cascade.
    sessionA = await login(emailA, passwordA);
    useSession(sessionA);
    await gate('TC-EDGE-SEC-001', async () => {
      const account = await createAccount('sql', "uat-20260813-' OR '1'='1", AccountType.ACCOUNT_TYPE_ASSET, '0');
      expect(account.name).toContain("' OR '1'='1");
    });
    await gate('TC-EDGE-SEC-002', async () => {
      const account = await createAccount(
        'xss',
        'uat-20260813-xss',
        AccountType.ACCOUNT_TYPE_ASSET,
        '0',
        0,
        "<script>globalThis.__GAAP_XSS_EXECUTED__=true</script>",
      );
      expect(account.remarks).toContain('<script>');
    });
    await gate('TC-ACCT-LIST-001', async () => {
      const response = await accountService.list({ page: 1, limit: 100, type: 0, parentId: '' });
      expect(response.data.length).toBeGreaterThanOrEqual(7);
    });
    await gate('TC-ACCT-LIST-002', async () => {
      const response = await accountService.list({ page: 1, limit: 100, type: AccountType.ACCOUNT_TYPE_ASSET, parentId: '' });
      expect(response.data.every((account) => account.type === AccountType.ACCOUNT_TYPE_ASSET)).toBe(true);
    });
    await gate('TC-ACCT-GET-001', async () => {
      const response = await accountService.get(created.assetA);
      expect(response.account?.name).toBe('uat-20260813-asset-a');
    });
    await gate('TC-ACCT-GET-002', async () => {
      await expectRejected(() => accountService.get(crypto.randomUUID()));
    });
    await gate('TC-ACCT-UPDATE-001', async () => {
      const current = (await accountService.get(created.assetB)).account;
      if (!current?.balance) throw new Error('asset B missing');
      const response = await accountService.update(created.assetB, {
        name: 'uat-20260813-asset-b-renamed',
        type: current.type,
        isGroup: false,
        balance: current.balance,
        date: current.date,
        remarks: current.remarks,
      });
      expect(response.account?.name).toBe('uat-20260813-asset-b-renamed');
    });
    await gate('TC-ACCT-UPDATE-002', async () => {
      const current = (await accountService.get(created.assetB)).account;
      if (!current?.balance) throw new Error('asset B missing');
      const response = await accountService.update(created.assetB, {
        name: current.name,
        type: current.type,
        isGroup: false,
        balance: current.balance,
        date: current.date,
        remarks: 'uat-20260813-updated-remarks',
      });
      expect(response.account?.remarks).toBe('uat-20260813-updated-remarks');
    });
    await gate('TC-ACCT-UPDATE-003', async () => {
      await expectRejected(() => accountService.update(crypto.randomUUID(), {
        name: 'missing',
        type: AccountType.ACCOUNT_TYPE_ASSET,
        isGroup: false,
        balance: money('0'),
        date: '2026-08-01',
      }));
    });
    sessionA = await login(emailA, passwordA);
    useSession(sessionA);
    await gate('TC-ACCT-COUNT-002', async () => {
      const response = await accountService.getTransactionCount(created.assetB);
      expect(response.count).toBe(0);
    });
    await gate('TC-ACCT-DELETE-001', async () => {
      const disposable = await createAccount('disposable', 'uat-20260813-disposable', AccountType.ACCOUNT_TYPE_ASSET, '0');
      await accountService.delete(disposable.id);
      await expectRejected(() => accountService.get(disposable.id));
    });

    await createAccount('income', 'uat-20260813-income', AccountType.ACCOUNT_TYPE_INCOME, '0');
    await createAccount('expense', 'uat-20260813-expense', AccountType.ACCOUNT_TYPE_EXPENSE, '0');

    await gate('TC-EDGE-SEC-003', async () => {
      useSession(sessionB);
      await expectRejected(() => accountService.get(created.assetA));
      await expectRejected(() => accountService.create({
        name: 'uat-20260813-group-denied',
        type: AccountType.ACCOUNT_TYPE_ASSET,
        isGroup: true,
        balance: money('0'),
        date: '2026-08-01',
      }));
      await expectRejected(() => accountService.create({
        parentId: created.assetA,
        name: 'uat-20260813-child-denied',
        type: AccountType.ACCOUNT_TYPE_ASSET,
        isGroup: false,
        balance: money('0'),
        date: '2026-08-01',
      }));
      useSession(sessionA);
    });

    const createTransaction = async (
      key: string,
      from: string,
      to: string,
      units: string,
      nanos: number,
      type: TransactionType,
      date = '2026-08-10',
      note = key,
    ) => {
      const response = await transactionService.create({
        date,
        from,
        to,
        amount: money(units, nanos),
        note: `uat-20260813-${note}`,
        type,
      });
      if (!response.transaction?.id) throw new Error(`transaction ${key} missing`);
      return response.transaction;
    };

    const transactions: Record<string, Awaited<ReturnType<typeof createTransaction>>> = {};
    await gate('TC-TXN-CREATE-001', async () => {
      transactions.income = await createTransaction('income', created.income, created.assetA, '50', 0, TransactionType.TRANSACTION_TYPE_INCOME);
    });
    await gate('TC-TXN-CREATE-002', async () => {
      transactions.expense = await createTransaction('expense', created.assetA, created.expense, '10', 0, TransactionType.TRANSACTION_TYPE_EXPENSE);
    });
    await gate('TC-TXN-CREATE-003', async () => {
      transactions.transfer = await createTransaction('transfer', created.assetA, created.assetB, '20', 0, TransactionType.TRANSACTION_TYPE_TRANSFER);
    });
    await gate('TC-TXN-CREATE-004', async () => {
      await expectRejected(() => createTransaction('zero', created.assetA, created.expense, '0', 0, TransactionType.TRANSACTION_TYPE_EXPENSE));
    });
    await gate('TC-TXN-CREATE-005', async () => {
      await expectRejected(() => createTransaction('negative', created.assetA, created.expense, '-1', 0, TransactionType.TRANSACTION_TYPE_EXPENSE));
    });
    await gate('TC-TXN-CREATE-006', async () => {
      await expectRejected(() => createTransaction('missing', crypto.randomUUID(), created.expense, '1', 0, TransactionType.TRANSACTION_TYPE_EXPENSE));
    });
    await gate('TC-TXN-CREATE-007', async () => {
      await expectRejected(() => createTransaction('same', created.assetA, created.assetA, '1', 0, TransactionType.TRANSACTION_TYPE_TRANSFER));
    });
    sessionA = await login(emailA, passwordA);
    useSession(sessionA);
    await gate('TC-TXN-CREATE-008', async () => {
      transactions.future = await createTransaction('future', created.assetA, created.assetB, '1', 0, TransactionType.TRANSACTION_TYPE_TRANSFER, '2027-01-01');
    });
    await gate('TC-TXN-CREATE-009', async () => {
      transactions.small = await createTransaction('small', created.assetA, created.expense, '0', 1_000_000, TransactionType.TRANSACTION_TYPE_EXPENSE);
      expect(transactions.small.amount?.nanos).toBe(1_000_000);
    });
    await gate('TC-EDGE-TXN-001', async () => {
      transactions.nano = await createTransaction('nano', created.assetA, created.expense, '0', 100_000, TransactionType.TRANSACTION_TYPE_EXPENSE);
      expect(transactions.nano.amount?.nanos).toBe(100_000);
    });
    await gate('TC-TXN-CREATE-010', async () => {
      transactions.large = await createTransaction('large', created.income, created.assetA, '999999999999', 990000000, TransactionType.TRANSACTION_TYPE_INCOME);
    });
    await gate('TC-EDGE-TXN-002', async () => {
      transactions.ancient = await createTransaction('ancient', created.assetA, created.expense, '1', 0, TransactionType.TRANSACTION_TYPE_EXPENSE, '1900-01-01');
    });
    await gate('TC-EDGE-TXN-003', async () => {
      await expectRejected(() => createTransaction('long-note', created.assetA, created.expense, '1', 0, TransactionType.TRANSACTION_TYPE_EXPENSE, '2026-08-10', 'x'.repeat(1001)));
    });
    sessionA = await login(emailA, passwordA);
    useSession(sessionA);

    await gate('TC-TXN-LIST-001', async () => {
      const response = await transactionService.list({ page: 1, limit: 100, startDate: '', endDate: '', accountId: '', type: 0, sortBy: 'date', sortOrder: 'desc' });
      expect(response.data.length).toBeGreaterThanOrEqual(8);
    });
    await gate('TC-TXN-LIST-002', async () => {
      const response = await transactionService.list({ page: 1, limit: 100, startDate: '2026-08-09', endDate: '2026-08-11', accountId: '', type: 0, sortBy: 'date', sortOrder: 'desc' });
      expect(response.data.every((transaction) => transaction.date.startsWith('2026-08-1'))).toBe(true);
    });
    await gate('TC-TXN-LIST-003', async () => {
      const response = await transactionService.list({ page: 1, limit: 100, startDate: '', endDate: '', accountId: created.assetB, type: 0, sortBy: 'date', sortOrder: 'desc' });
      expect(response.data.every((transaction) => transaction.from === created.assetB || transaction.to === created.assetB)).toBe(true);
    });
    await gate('TC-TXN-LIST-004', async () => {
      const response = await transactionService.list({ page: 1, limit: 100, startDate: '', endDate: '', accountId: '', type: TransactionType.TRANSACTION_TYPE_INCOME, sortBy: 'date', sortOrder: 'desc' });
      expect(response.data.every((transaction) => transaction.type === TransactionType.TRANSACTION_TYPE_INCOME)).toBe(true);
    });
    await gate('TC-TXN-LIST-005', async () => {
      const response = await transactionService.list({ page: 1, limit: 100, startDate: '', endDate: '', accountId: '', type: 0, sortBy: 'date', sortOrder: 'desc' });
      const dates = response.data.map((transaction) => transaction.date);
      expect(dates).toEqual([...dates].sort().reverse());
    });
    await gate('TC-TXN-LIST-006', async () => {
      const response = await transactionService.list({ page: 1, limit: 2, startDate: '', endDate: '', accountId: '', type: 0, sortBy: 'date', sortOrder: 'desc' });
      expect(response.data.length).toBeLessThanOrEqual(2);
      expect(response.pagination?.limit).toBe(2);
    });
    await gate('TC-TXN-GET-001', async () => {
      const response = await transactionService.get(transactions.expense.id);
      expect(response.transaction?.id).toBe(transactions.expense.id);
    });
    await gate('TC-TXN-GET-002', async () => {
      await expectRejected(() => transactionService.get(crypto.randomUUID()));
    });
    sessionA = await login(emailA, passwordA);
    useSession(sessionA);

    await gate('TC-TXN-UPDATE-001', async () => {
      const response = await transactionService.update(transactions.expense.id, {
        ...transactions.expense,
        amount: money('12'),
      });
      expect(response.transaction?.amount?.units).toBe('12');
      transactions.expense = response.transaction!;
    });
    await gate('TC-TXN-UPDATE-002', async () => {
      const response = await transactionService.update(transactions.expense.id, {
        ...transactions.expense,
        date: '2026-08-11',
      });
      expect(response.transaction?.date).toContain('2026-08-11');
      transactions.expense = response.transaction!;
    });
    await gate('TC-TXN-UPDATE-003', async () => {
      const response = await transactionService.update(transactions.expense.id, {
        ...transactions.expense,
        note: 'uat-20260813-updated-note',
      });
      expect(response.transaction?.note).toBe('uat-20260813-updated-note');
      transactions.expense = response.transaction!;
    });
    await gate('TC-TXN-UPDATE-004', async () => {
      const response = await transactionService.update(transactions.transfer.id, {
        ...transactions.transfer,
        to: created.overdraft,
      });
      expect(response.transaction?.to).toBe(created.overdraft);
      transactions.transfer = response.transaction!;
    });
    await gate('TC-ACCT-COUNT-001', async () => {
      const response = await accountService.getTransactionCount(created.assetA);
      expect(response.count).toBeGreaterThan(0);
    });
    await gate('TC-EDGE-DATA-002', async () => {
      await transactionService.delete(transactions.small.id);
      await expectRejected(() => transactionService.get(transactions.small.id));
    });
    await gate('TC-TXN-DELETE-001', async () => {
      await transactionService.delete(transactions.nano.id);
      await expectRejected(() => transactionService.get(transactions.nano.id));
    });
    await gate('TC-TXN-DELETE-002', async () => {
      await expectRejected(() => transactionService.delete(crypto.randomUUID()));
    });
    sessionA = await login(emailA, passwordA);
    useSession(sessionA);
    await gate('TC-EDGE-DATA-003', async () => {
      const response = await transactionService.get(transactions.expense.id);
      expect(response.transaction?.amount?.units).toBe('12');
    });

    await gate('TC-EDGE-CONC-001', async () => {
      const responses = await Promise.all(Array.from({ length: 10 }, (_, index) => createAccount(
        `concurrent-${index}`,
        `uat-20260813-concurrent-${index}`,
        AccountType.ACCOUNT_TYPE_ASSET,
        '0',
      )));
      expect(new Set(responses.map((account) => account.id)).size).toBe(10);
    });
    await gate('TC-EDGE-CONC-002', async () => {
      const amounts = ['21', '22', '23', '24', '25'];
      await Promise.allSettled(amounts.map((units) => transactionService.update(transactions.transfer.id, {
        ...transactions.transfer,
        amount: money(units),
      })));
      const final = (await transactionService.get(transactions.transfer.id)).transaction;
      expect(amounts).toContain(final?.amount?.units ?? '-1');
      transactions.transfer = final!;
    });

    await gate('TC-DASH-SUMMARY-001', async () => {
      const response = await secureRequest('/dashboard/get-dashboard-summary', {}, GetDashboardSummaryReq, GetDashboardSummaryRes);
      expect(response.summary?.assets).toBeDefined();
    });
    await gate('TC-DASH-MONTHLY-001', async () => {
      const response = await secureRequest('/dashboard/get-monthly-stats', {}, GetMonthlyStatsReq, GetMonthlyStatsRes);
      expect(response.stats?.income).toBeDefined();
      expect(response.stats?.expense).toBeDefined();
    });
    await gate('TC-DASH-TREND-001', async () => {
      const readTrend = () => dashboardService.getBalanceTrend([created.assetA]);
      const balanceOn = (response: Awaited<ReturnType<typeof readTrend>>, date: string) => {
        const day = response.data.find((candidate) => candidate.date === date);
        if (!day) throw new Error(`trend date ${date} was not returned`);
        return moneyValue(day.balances[created.assetA]);
      };
      const before = await readTrend();
      expect(before.data.length).toBe(30);
      const beforeEight = balanceOn(before, '2026-08-08');
      const beforeNine = balanceOn(before, '2026-08-09');
      const historical = await createTransaction(
        'trend-lifecycle',
        created.assetA,
        created.expense,
        '3',
        0,
        TransactionType.TRANSACTION_TYPE_EXPENSE,
        '2026-08-08',
      );
      const afterCreate = await waitFor(readTrend, (trend) => balanceOn(trend, '2026-08-08').equals(beforeEight.minus(3)));
      expect(balanceOn(afterCreate, '2026-08-09').equals(beforeNine.minus(3))).toBe(true);
      await transactionService.update(historical.id, { ...historical, date: '2026-08-09' });
      const afterMove = await waitFor(readTrend, (trend) => balanceOn(trend, '2026-08-08').equals(beforeEight));
      expect(balanceOn(afterMove, '2026-08-09').equals(beforeNine.minus(3))).toBe(true);
      await transactionService.delete(historical.id);
      const afterDelete = await waitFor(readTrend, (trend) => balanceOn(trend, '2026-08-09').equals(beforeNine));
      expect(balanceOn(afterDelete, '2026-08-08').equals(beforeEight)).toBe(true);
    });
    await gate('TC-CFG-CURR-001', async () => {
      const response = await secureRequest('/config/list-currencies', {}, ListCurrenciesReq, ListCurrenciesRes);
      expect(response.currencies).toContain('CNY');
    });
    await gate('TC-CFG-ACCTTYPE-001', async () => {
      const response = await secureRequest('/config/get-account-types', {}, GetAccountTypesReq, GetAccountTypesRes);
      expect(Object.keys(response.types).length).toBeGreaterThanOrEqual(4);
    });
    await gate('TC-USER-PROFILE-001', async () => {
      const response = await secureRequest('/user/get-profile', {}, GetUserProfileReq, GetUserProfileRes);
      expect(response.user?.email).toBe(emailA);
    });

    await gate('TC-ACCT-DELETE-001-with-transactions', async () => {
      await expectRejected(() => accountService.delete(created.assetA));
    });

    console.log(`GAAP_UAT_RESULTS=${JSON.stringify(results)}`);
    const failed = results.filter((result) => result.status === 'FAIL');
    expect(failed, JSON.stringify(failed, null, 2)).toEqual([]);
  }, 180_000);
});
