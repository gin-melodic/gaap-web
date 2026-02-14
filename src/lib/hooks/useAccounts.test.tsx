import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { accountService } from '../services/accountService';
import { useAccounts, useCreateAccount, useAllAccounts, accountKeys } from '../hooks/useAccounts';
import { AccountType, Account } from '../types';
import { Money } from '../proto/base/base';
import { ListAccountsRes } from '../proto/account/v1/account';

// Mock the account service
vi.mock('../services/accountService', () => ({
  accountService: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { queryClient, Wrapper };
};

const mockAccount: Account = {
  id: 'acc_1',
  name: 'Test Account',
  type: AccountType.ACCOUNT_TYPE_ASSET,
  balance: { units: '1000', nanos: 0, currencyCode: 'CNY' } as Money,
  isGroup: false,
  date: '2023-07-01',
  number: 'A001',
  remarks: 'Test account',
  openingVoucherId: 'voucher_1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAccountList: ListAccountsRes = {
  data: [mockAccount],
  pagination: {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
  base: { message: '' },
};

describe('useAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch accounts list successfully', async () => {
    vi.mocked(accountService.list).mockResolvedValue(mockAccountList);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAccounts(), { wrapper: Wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockAccountList);
    expect(accountService.list).toHaveBeenCalledTimes(1);
  });

  it('should fetch accounts with query parameters', async () => {
    vi.mocked(accountService.list).mockResolvedValue(mockAccountList);

    const { Wrapper } = createWrapper();
    const query = { type: AccountType.ACCOUNT_TYPE_ASSET };
    const { result } = renderHook(() => useAccounts(query), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(accountService.list).toHaveBeenCalledWith(expect.objectContaining({
      type: AccountType.ACCOUNT_TYPE_ASSET,
      page: 0,
      limit: 0,
      parentId: '',
    }));
  });
});

describe('useAllAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return accounts array from response', async () => {
    vi.mocked(accountService.list).mockResolvedValue(mockAccountList);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAllAccounts(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.accounts).toEqual([mockAccount]);
  });

  it('should return empty array when no data', async () => {
    vi.mocked(accountService.list).mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, limit: 100, totalPages: 0 },
      base: { message: '' },
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAllAccounts(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.accounts).toEqual([]);
  });
});

describe('useCreateAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create account and invalidate cache', async () => {
    const newAccount = { ...mockAccount, id: 'acc_new' };
    vi.mocked(accountService.create).mockResolvedValue({
      account: newAccount,
      base: { message: '' },
    });
    vi.mocked(accountService.list).mockResolvedValue(mockAccountList);

    const { Wrapper, queryClient } = createWrapper();

    // Pre-populate the cache
    queryClient.setQueryData(accountKeys.lists(), mockAccountList);

    const { result } = renderHook(() => useCreateAccount(), { wrapper: Wrapper });

    const input = {
      name: 'New Account',
      type: AccountType.ACCOUNT_TYPE_ASSET,
      currency: 'CNY',
      balance: 500,
      isGroup: false,
      date: '2023-01-01',
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(accountService.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'New Account',
      type: AccountType.ACCOUNT_TYPE_ASSET,
      isGroup: false,
      date: '2023-01-01',
      balance: {
        units: '500',
        nanos: 0,
        currencyCode: 'CNY',
      },
    }));
  });

  it('should handle creation error', async () => {
    vi.mocked(accountService.create).mockRejectedValue(new Error('Creation failed'));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateAccount(), { wrapper: Wrapper });

    result.current.mutate({
      name: 'New Account',
      type: AccountType.ACCOUNT_TYPE_ASSET,
      currency: 'CNY',
      isGroup: false,
      date: '2023-01-01',
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('accountKeys', () => {
  it('should generate correct query keys', () => {
    expect(accountKeys.all).toEqual(['accounts']);
    expect(accountKeys.lists()).toEqual(['accounts', 'list']);
    expect(accountKeys.list({ type: AccountType.ACCOUNT_TYPE_ASSET })).toEqual(['accounts', 'list', { type: AccountType.ACCOUNT_TYPE_ASSET }]);
    expect(accountKeys.details()).toEqual(['accounts', 'detail']);
    expect(accountKeys.detail('acc_1')).toEqual(['accounts', 'detail', 'acc_1']);
  });
});
