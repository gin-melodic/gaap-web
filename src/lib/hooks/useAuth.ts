import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { secureAuthService } from '../services/secureAuthService';
import { LoginInput, RegisterInput } from '../types';
import { toast } from 'sonner';

export const authKeys = {
  profile: ['auth', 'profile'] as const,
  twoFactor: ['auth', '2fa'] as const,
};

export function useProfile() {
  return useQuery({
    queryKey: authKeys.profile,
    queryFn: () => secureAuthService.getProfile(),
    retry: false,
    enabled: typeof window !== 'undefined' && secureAuthService.isLoggedIn(),
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LoginInput) => secureAuthService.login(input),
    onSuccess: (data) => {
      // Tokens are already handled by secureAuthService
      // Clear ALL cached queries to prevent stale errors from being replayed
      queryClient.clear();
    },
    onError: (error: Error) => {
      toast.error(error.message || '登录失败');
    },
  });
}

export function useRegister() {
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

      toast.success('注册成功');
    },
    onError: (error: Error) => toast.error(error.message || '注册失败'),
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => secureAuthService.enable2FA(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.profile });
      toast.success('两步验证已启用');
    },
    onError: (error: Error) => toast.error(error.message || '启用失败'),
  });
}

export function useDisable2FA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ code, password }: { code: string; password: string }) =>
      secureAuthService.disable2FA(code, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.profile });
      toast.success('两步验证已禁用');
    },
    onError: (error: Error) => toast.error(error.message || '禁用失败'),
  });
}
