import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useLogin, useRegister, useLogout, useProfile, authKeys } from './useAuth';
import { secureAuthService } from '../services/secureAuthService';
import { UserLevelType } from '../types';

// Mock dependencies
vi.mock('../services/secureAuthService', () => ({
  secureAuthService: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getProfile: vi.fn(),
    isLoggedIn: vi.fn(),
    clearTokens: vi.fn(),
    generate2FA: vi.fn(),
    enable2FA: vi.fn(),
    disable2FA: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

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

const mockUser = {
  id: 'user_1',
  email: 'test@example.com',
  nickname: 'Test User',
  plan: UserLevelType.USER_LEVEL_TYPE_FREE,
  twoFactorEnabled: false,
  mainCurrency: 'CNY',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('useAuth Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('useProfile', () => {
    it('should fetch profile when logged in', async () => {
      vi.mocked(secureAuthService.isLoggedIn).mockReturnValue(true);
      vi.mocked(secureAuthService.getProfile).mockResolvedValue({ user: mockUser, base: undefined });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useProfile(), { wrapper: Wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ user: mockUser, base: undefined });
      expect(secureAuthService.getProfile).toHaveBeenCalled();
    });

    it('should not fetch profile when not logged in', async () => {
      vi.mocked(secureAuthService.isLoggedIn).mockReturnValue(false);

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useProfile(), { wrapper: Wrapper });

      expect(result.current.isPending).toBe(true);
      expect(secureAuthService.getProfile).not.toHaveBeenCalled();
    });
  });

  describe('useLogin', () => {
    it('should login successfully', async () => {
      const loginResponse = {
        auth: {
          accessToken: 'token',
          refreshToken: 'refresh',
          user: mockUser,
          sessionKey: 'key'
        },
        base: undefined
      };

      vi.mocked(secureAuthService.login).mockResolvedValue(loginResponse);

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useLogin(), { wrapper: Wrapper });

      result.current.mutate({ email: 'test@example.com', password: 'password', code: '', cfTurnstileResponse: '' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(secureAuthService.login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password', code: '', cfTurnstileResponse: '' });
    });

    it('should handle login error', async () => {
      vi.mocked(secureAuthService.login).mockRejectedValue(new Error('Login failed'));

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useLogin(), { wrapper: Wrapper });

      result.current.mutate({ email: 'test@example.com', password: 'password', code: '', cfTurnstileResponse: '' });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useRegister', () => {
    it('should register successfully', async () => {
      vi.mocked(secureAuthService.register).mockResolvedValue({ auth: undefined, base: undefined });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useRegister(), { wrapper: Wrapper });

      result.current.mutate({ email: 'test@example.com', password: 'password', nickname: 'test', cfTurnstileResponse: '' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(secureAuthService.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
        nickname: 'test',
        cfTurnstileResponse: '',
      });
    });
  });

  describe('useLogout', () => {
    it('should logout and clear tokens', async () => {
      vi.mocked(secureAuthService.logout).mockResolvedValue(undefined);

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useLogout(), { wrapper: Wrapper });

      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(secureAuthService.logout).toHaveBeenCalled();
      expect(secureAuthService.clearTokens).toHaveBeenCalled();
    });
  });

  describe('authKeys', () => {
    it('should generate correct query keys', () => {
      expect(authKeys.profile).toEqual(['auth', 'profile']);
      expect(authKeys.twoFactor).toEqual(['auth', '2fa']);
    });
  });
});
