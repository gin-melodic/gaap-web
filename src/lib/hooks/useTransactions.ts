import { useQuery, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { transactionService } from '../services';
import { TransactionInput, TransactionQuery, TransactionSortBy, SortOrder } from '../types';
import { toast } from 'sonner';
import { accountKeys } from './useAccounts';

// Query Keys
export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (query?: TransactionQuery) => [...transactionKeys.lists(), query] as const,
  details: () => [...transactionKeys.all, 'detail'] as const,
  detail: (id: string) => [...transactionKeys.details(), id] as const,
};

// ========== Standard Hooks ==========

export function useTransactions(query?: TransactionQuery) {
  return useQuery({
    queryKey: transactionKeys.list(query),
    queryFn: () => transactionService.list(query),
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: () => transactionService.get(id),
    enabled: !!id,
  });
}

// ========== Suspense Hooks ==========

export function useTransactionsSuspense(query?: TransactionQuery) {
  return useSuspenseQuery({
    queryKey: transactionKeys.list(query),
    queryFn: () => transactionService.list(query),
  });
}

// ========== Mutation Hooks ==========

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TransactionInput) => transactionService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
      toast.success('交易创建成功');
    },
    onError: (error: Error) => {
      toast.error(error.message || '创建失败');
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TransactionInput> }) =>
      transactionService.update(id, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
      toast.success('交易更新成功');
    },
    onError: (error: Error) => {
      toast.error(error.message || '更新失败');
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => transactionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
      toast.success('交易删除成功');
    },
    onError: (error: Error) => {
      toast.error(error.message || '删除失败');
    },
  });
}

// ========== Convenience Hooks ==========

export function useAllTransactions() {
  const { data, ...rest } = useTransactions({
    limit: 100,
    sortBy: TransactionSortBy.DATE,
    sortOrder: SortOrder.DESC,
  });
  return {
    transactions: data?.data ?? [],
    ...rest,
  };
}

export function useAllTransactionsSuspense() {
  const { data, ...rest } = useTransactionsSuspense({
    limit: 100,
    sortBy: TransactionSortBy.DATE,
    sortOrder: SortOrder.DESC,
  });
  return {
    transactions: data?.data ?? [],
    ...rest,
  };
}
