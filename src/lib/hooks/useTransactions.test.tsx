import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { transactionService } from '../services/transactionService';
import { useTransactions, useCreateTransaction, useAllTransactions, transactionKeys } from '../hooks/useTransactions';
import { TransactionType, Transaction, PaginatedResponse, SortOrder, TransactionSortBy } from '../types';

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

const mockTransaction: Transaction = {
  id: 'tx_1',
  date: '2024-01-01',
  from: 'acc_1',
  to: 'acc_2',
  amount: 100,
  currency: 'CNY',
  note: 'Test transaction',
  type: TransactionType.EXPENSE,
};

const mockTransactionList: PaginatedResponse<Transaction> = {
  data: [mockTransaction],
  total: 1,
  page: 1,
  limit: 10,
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
    const query = { type: TransactionType.EXPENSE, startDate: '2024-01-01' };
    const { result } = renderHook(() => useTransactions(query), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(transactionService.list).toHaveBeenCalledWith(query);
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
    expect(transactionService.list).toHaveBeenCalledWith({
      limit: 100,
      sortBy: TransactionSortBy.DATE,
      sortOrder: SortOrder.DESC,
    });
  });
});

describe('useCreateTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create transaction successfully', async () => {
    const newTransaction = { ...mockTransaction, id: 'tx_new' };
    vi.mocked(transactionService.create).mockResolvedValue(newTransaction);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateTransaction(), { wrapper: Wrapper });

    const input = {
      date: '2024-01-02',
      from: 'acc_1',
      to: 'acc_2',
      amount: 200,
      currency: 'CNY',
      type: TransactionType.EXPENSE,
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(transactionService.create).toHaveBeenCalledWith(input);
  });
});

describe('transactionKeys', () => {
  it('should generate correct query keys', () => {
    expect(transactionKeys.all).toEqual(['transactions']);
    expect(transactionKeys.lists()).toEqual(['transactions', 'list']);
    expect(transactionKeys.list({ type: TransactionType.EXPENSE })).toEqual(['transactions', 'list', { type: TransactionType.EXPENSE }]);
    expect(transactionKeys.details()).toEqual(['transactions', 'detail']);
    expect(transactionKeys.detail('tx_1')).toEqual(['transactions', 'detail', 'tx_1']);
  });
});
