import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { secureAuthService } from '../services/secureAuthService';
import { LoginInput, RegisterInput } from '../types';
import { toast } from 'sonner';

export const authKeys = {
  profile: ['auth', 'profile'] as const,
  twoFactor: ['auth', '2fa'] as const,
  currencyList: ['auth', 'currencyList'] as const,
};

export function useProfile() {
  return useQuery({
    queryKey: authKeys.profile,
    queryFn: () => secureAuthService.getProfile(),
    retry: false,
    enabled: typeof window !== 'undefined' && secureAuthService.isLoggedIn(),
  });
}

export function useCurrencyList() {
  return useQuery({
    queryKey: authKeys.currencyList,
    queryFn: () => secureAuthService.getCurrencyList(),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours since it rarely changes
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LoginInput) => secureAuthService.login(input),
    onSuccess: () => {
      // Tokens are already handled by secureAuthService
      // Clear ALL cached queries to prevent stale errors from being replayed
      queryClient.clear();
    },
    onError: (error: Error) => {
      console.error('[DEBUG] Login error:', error);
    },
  });
}

export function useRegister() {
  const { t } = useTranslation(['auth', 'common']);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RegisterInput) => secureAuthService.register(input),
    onSuccess: (data) => {
      // Tokens are already handled by secureAuthService if auto-login is desired,
      // but usually register just creates the account.
      // However, secureAuthService.register in this codebase DOES auto-login (returns RegisterRes with auth tokens).
      console.log('RegisterRes:', data);

      // Clear queries just in case
      queryClient.clear();

      toast.success(t('register_success'));
    },
    // onError: (error: Error) => toast.error(error.message || '注册失败'),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => secureAuthService.logout(),
    onSuccess: () => {
      secureAuthService.clearTokens();
      queryClient.clear();
    },
    onSettled: () => {
      secureAuthService.clearTokens();
    },
  });
}

export function useGenerate2FA() {
  return useMutation({
    mutationFn: () => secureAuthService.generate2FA(),
  });
}

export function useEnable2FA() {
  const { t } = useTranslation(['auth', 'common']);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => secureAuthService.enable2FA(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.profile });
      toast.success(t('2fa_enabled'));
    },
    onError: (error: Error) => toast.error(error.message || t('enable_failed')),
  });
}

export function useDisable2FA() {
  const { t } = useTranslation(['auth', 'common']);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ code, password }: { code: string; password: string }) =>
      secureAuthService.disable2FA(code, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.profile });
      toast.success(t('2fa_disabled'));
    },
    onError: (error: Error) => toast.error(error.message || t('disable_failed')),
  });
}

export function useUpdatePassword() {
  const { t } = useTranslation(['auth', 'common']);

  return useMutation({
    mutationFn: ({ password, newPassword, confirmPassword }: { password: string; newPassword: string; confirmPassword: string }) =>
      secureAuthService.updatePassword(password, newPassword, confirmPassword),
    onSuccess: () => {
      toast.success(t('password_updated'));
    },
    onError: (error: Error) => toast.error(error.message || t('update_password_failed')),
  });
}
