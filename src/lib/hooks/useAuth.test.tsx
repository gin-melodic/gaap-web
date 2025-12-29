import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { authService } from '../services/authService';
import { useProfile, useLogin, useLogout, authKeys } from '../hooks/useAuth';
import { UserPlan } from '../types';

// Mock the auth service
vi.mock('../services/authService', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    generate2FA: vi.fn(),
    enable2FA: vi.fn(),
    disable2FA: vi.fn(),
    getProfile: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

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
  email: 'test@example.com',
  nickname: 'Test User',
  avatar: null,
  plan: UserPlan.FREE,
  twoFactorEnabled: false,
};

describe('useProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('should not fetch profile when token is not present', async () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useProfile(), { wrapper: Wrapper });

    // Should not be loading since enabled=false
    expect(result.current.isFetching).toBe(false);
    expect(authService.getProfile).not.toHaveBeenCalled();
  });

  it('should fetch profile when token is present', async () => {
    localStorageMock.getItem.mockReturnValue('valid_token');
    vi.mocked(authService.getProfile).mockResolvedValue({ user: mockUser });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useProfile(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ user: mockUser });
    expect(authService.getProfile).toHaveBeenCalledTimes(1);
  });
});

describe('useLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should login successfully and store tokens', async () => {
    const loginResponse = {
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      user: mockUser,
    };
    vi.mocked(authService.login).mockResolvedValue(loginResponse);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useLogin(), { wrapper: Wrapper });

    const loginInput = {
      email: 'test@example.com',
      password: 'password123',
      cf_turnstile_response: 'token',
    };

    result.current.mutate(loginInput);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(authService.login).toHaveBeenCalledWith(loginInput);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'access_token');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'refresh_token');
  });

  it('should handle login error', async () => {
    vi.mocked(authService.login).mockRejectedValue(new Error('Invalid credentials'));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useLogin(), { wrapper: Wrapper });

    result.current.mutate({
      email: 'test@example.com',
      password: 'wrong',
      cf_turnstile_response: 'token',
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useLogout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should logout and clear tokens', async () => {
    vi.mocked(authService.logout).mockResolvedValue();

    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useLogout(), { wrapper: Wrapper });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(authService.logout).toHaveBeenCalled();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
  });

  it('should clear tokens even on logout error', async () => {
    vi.mocked(authService.logout).mockRejectedValue(new Error('Server error'));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useLogout(), { wrapper: Wrapper });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // onSettled should clear tokens even on error
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
  });
});

describe('authKeys', () => {
  it('should generate correct query keys', () => {
    expect(authKeys.profile).toEqual(['auth', 'profile']);
    expect(authKeys.twoFactor).toEqual(['auth', '2fa']);
  });
});
