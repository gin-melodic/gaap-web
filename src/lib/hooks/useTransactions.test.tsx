import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { transactionService } from '../services/transactionService';
import { useTransactions, useCreateTransaction, useAllTransactions, transactionKeys } from '../hooks/useTransactions';
import { TransactionType, Transaction, ListTransactionsRes } from '../types';
import { Money } from '../proto/base/base';

// Mock the transaction service
vi.mock('../services/transactionService', () => ({
  transactionService: {
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

const mockMoney: Money = {
  currencyCode: 'CNY',
  units: '100',
  nanos: 0,
};

const mockTransaction: Transaction = {
  id: 'tx_1',
  date: '2024-01-01',
  from: 'acc_1',
  to: 'acc_2',
  amount: mockMoney,
  note: 'Test transaction',
  type: TransactionType.TRANSACTION_TYPE_EXPENSE,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockTransactionList: ListTransactionsRes = {
  data: [mockTransaction],
  pagination: {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
  base: undefined,
};

describe('useTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch transactions list successfully', async () => {
    vi.mocked(transactionService.list).mockResolvedValue(mockTransactionList);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTransactions(), { wrapper: Wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockTransactionList);
    expect(transactionService.list).toHaveBeenCalledTimes(1);
  });

  it('should fetch transactions with query parameters', async () => {
    vi.mocked(transactionService.list).mockResolvedValue(mockTransactionList);

    const { Wrapper } = createWrapper();
    const query = { type: TransactionType.TRANSACTION_TYPE_EXPENSE, startDate: '2024-01-01' };
    const { result } = renderHook(() => useTransactions(query), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(transactionService.list).toHaveBeenCalled();
  });
});

describe('useAllTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return transactions array with default sorting', async () => {
    vi.mocked(transactionService.list).mockResolvedValue(mockTransactionList);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAllTransactions(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.transactions).toEqual([mockTransaction]);
    expect(transactionService.list).toHaveBeenCalled();
  });
});

describe('useCreateTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create transaction successfully', async () => {
    const createResponse = {
      transaction: { ...mockTransaction, id: 'tx_new' },
      base: undefined,
    };
    vi.mocked(transactionService.create).mockResolvedValue(createResponse);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateTransaction(), { wrapper: Wrapper });

    const input = {
      date: '2024-01-02',
      from: 'acc_1',
      to: 'acc_2',
      amount: 200,
      currency: 'CNY',
      note: 'New transaction',
      type: TransactionType.TRANSACTION_TYPE_EXPENSE,
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(transactionService.create).toHaveBeenCalled();
  });
});

describe('transactionKeys', () => {
  it('should generate correct query keys', () => {
    expect(transactionKeys.all).toEqual(['transactions']);
    expect(transactionKeys.lists()).toEqual(['transactions', 'list']);
    expect(transactionKeys.list({ type: TransactionType.TRANSACTION_TYPE_EXPENSE })).toEqual(['transactions', 'list', { type: TransactionType.TRANSACTION_TYPE_EXPENSE }]);
    expect(transactionKeys.details()).toEqual(['transactions', 'detail']);
    expect(transactionKeys.detail('tx_1')).toEqual(['transactions', 'detail', 'tx_1']);
  });
});
