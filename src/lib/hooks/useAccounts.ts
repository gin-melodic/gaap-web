import { useQuery, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { accountService } from '../services';
import { AccountInput, AccountQuery } from '../types';
import { toast } from 'sonner';

// Query Keys
export const accountKeys = {
  all: ['accounts'] as const,
  lists: () => [...accountKeys.all, 'list'] as const,
  list: (query?: Partial<AccountQuery>) => [...accountKeys.lists(), query] as const,
  details: () => [...accountKeys.all, 'detail'] as const,
  detail: (id: string) => [...accountKeys.details(), id] as const,
};

// ========== Standard Hooks (with isLoading status) ==========

// Get account list
export function useAccounts(query?: Partial<AccountQuery>) {
  return useQuery({
    queryKey: accountKeys.list(query),
    queryFn: () => accountService.list(AccountQuery.fromPartial(query ?? {})),
  });
}

// Get single account
export function useAccount(id: string) {
  return useQuery({
    queryKey: accountKeys.detail(id),
    queryFn: () => accountService.get(id),
    enabled: !!id,
  });
}

// ========== Suspense Hooks (for use with Suspense component) ==========

// Get account list (Suspense version)
export function useAccountsSuspense(query?: Partial<AccountQuery>) {
  return useSuspenseQuery({
    queryKey: accountKeys.list(query),
    queryFn: () => accountService.list(AccountQuery.fromPartial(query ?? {})),
  });
}

// Get single account (Suspense version)
export function useAccountSuspense(id: string) {
  return useSuspenseQuery({
    queryKey: accountKeys.detail(id),
    queryFn: () => accountService.get(id),
  });
}

import { MoneyHelper } from '../utils/money';

// Extended Input type for UI Forms
export interface AccountFormInput extends Omit<AccountInput, 'balance'> {
  balance?: number; // Optional initial balance
  currency?: string;
}

// ========== Mutation Hooks ==========

// Create account
export function useCreateAccount(options?: { silent?: boolean }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AccountFormInput) => {
      const { balance, currency, ...rest } = input;
      const protoInput: AccountInput = {
        ...rest,
        // Default to zero money if not provided? Or undefined?
        // AccountService create usually expects balance if provided.
        balance: (balance !== undefined && currency)
          ? MoneyHelper.fromAmount(balance, currency).toProto()
          : undefined,
      };

      // If balance is undefined but currency is needed by backend logic? 
      // Proto definition says balance is Money | undefined.

      return accountService.create(protoInput);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
      if (!options?.silent) {
        toast.success('账户创建成功');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || '创建失败');
    },
  });
}

// Update account
export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AccountFormInput> }) => {
      const { balance, currency, ...rest } = input;
      const protoInput: any = { ...rest };
      if (balance !== undefined && currency) {
        protoInput.balance = MoneyHelper.fromAmount(balance, currency).toProto();
      }
      return accountService.update(id, protoInput);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountKeys.detail(id) });
      toast.success('账户更新成功');
    },
    onError: (error: Error) => {
      toast.error(error.message || '更新失败');
    },
  });
}

// Delete account (creates migration task)
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, migrationTargets }: { id: string; migrationTargets?: Record<string, string> }) =>
      accountService.delete(id, migrationTargets),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
      if (result?.taskId) {
        toast.info('迁移任务已创建，请在任务中心查看进度');
      } else {
        toast.success('账户删除成功');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || '删除失败');
    },
  });
}

// Get account transaction count
export function useAccountTransactionCount(id: string, enabled = true) {
  return useQuery({
    queryKey: [...accountKeys.detail(id), 'transactionCount'],
    queryFn: () => accountService.getTransactionCount(id),
    enabled: !!id && enabled,
  });
}

// ========== Convenience Hooks ==========

// Get all accounts (flat list)
export function useAllAccounts() {
  const { data, ...rest } = useAccounts({ limit: 100 });
  return {
    accounts: data?.data ?? [],
    ...rest,
  };
}

// Get all accounts (Suspense version)
export function useAllAccountsSuspense() {
  const { data, ...rest } = useAccountsSuspense({ limit: 100 });
  return {
    accounts: data?.data ?? [],
    ...rest,
  };
}