import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services';
import { LoginInput, RegisterInput } from '../types';
import { toast } from 'sonner';

export const authKeys = {
  profile: ['auth', 'profile'] as const,
  twoFactor: ['auth', '2fa'] as const,
};

export function useProfile() {
  return useQuery({
    queryKey: authKeys.profile,
    queryFn: () => authService.getProfile(),
    retry: false,
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('token'),
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LoginInput) => authService.login(input),
    onSuccess: (data) => {
      if (data.accessToken) localStorage.setItem('token', data.accessToken);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      queryClient.invalidateQueries({ queryKey: authKeys.profile });
    },
    onError: (error: Error) => {
      toast.error(error.message || '登录失败');
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput) => authService.register(input),
    onSuccess: () => toast.success('注册成功，请登录'),
    onError: (error: Error) => toast.error(error.message || '注册失败'),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      queryClient.clear();
    },
    onSettled: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    },
  });
}

export function useGenerate2FA() {
  return useMutation({
    mutationFn: () => authService.generate2FA(),
  });
}

export function useEnable2FA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => authService.enable2FA(code),
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
      authService.disable2FA(code, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.profile });
      toast.success('两步验证已禁用');
    },
    onError: (error: Error) => toast.error(error.message || '禁用失败'),
  });
}
