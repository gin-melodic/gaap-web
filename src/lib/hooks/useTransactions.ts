import { useQuery, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { transactionService } from '../services';
import { TransactionInput, TransactionQuery, TransactionSortBy, SortOrder } from '../types';
import { toast } from 'sonner';
import { accountKeys } from './useAccounts';
import { MoneyHelper } from '../utils/money';


// Extended Input type for UI Forms (Legacy compatibility)
export interface TransactionFormInput extends Omit<TransactionInput, 'amount'> {
  amount: number;
  currency: string;
}

// Query Keys
export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (query?: Partial<TransactionQuery>) => [...transactionKeys.lists(), query] as const,
  details: () => [...transactionKeys.all, 'detail'] as const,
  detail: (id: string) => [...transactionKeys.details(), id] as const,
};

// ========== Standard Hooks ==========

export function useTransactions(query?: Partial<TransactionQuery>) {
  return useQuery({
    queryKey: transactionKeys.list(query),
    queryFn: () => transactionService.list(TransactionQuery.fromPartial(query ?? {})),
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

export function useTransactionsSuspense(query?: Partial<TransactionQuery>) {
  return useSuspenseQuery({
    queryKey: transactionKeys.list(query),
    queryFn: () => transactionService.list(TransactionQuery.fromPartial(query ?? {})),
  });
}

// ========== Mutation Hooks ==========

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('transactions');

  return useMutation({
    mutationFn: (input: TransactionFormInput) => {
      const { amount, currency, ...rest } = input;
      // Convert to Proto format with Money object
      const protoInput: TransactionInput = {
        ...rest,
        amount: MoneyHelper.fromAmount(amount, currency).toProto(),
      };
      return transactionService.create(protoInput);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
      toast.success(t('create_success'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('create_error'));
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('transactions');

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TransactionFormInput> }) => {
      // Convert Partial Form Input to Partial Proto Input
      const { amount, currency, ...rest } = input;
      const protoInput: Partial<TransactionInput> = { ...rest };
      if (amount !== undefined && currency !== undefined) {
        protoInput.amount = MoneyHelper.fromAmount(amount, currency).toProto();
      }
      return transactionService.update(id, protoInput);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
      toast.success(t('update_success'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('update_error'));
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('transactions');

  return useMutation({
    mutationFn: (id: string) => transactionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
      toast.success(t('delete_success'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('delete_error'));
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
