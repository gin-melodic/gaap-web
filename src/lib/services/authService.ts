import apiRequest from '../api';
import { AuthResponse, LoginInput, RegisterInput, TwoFactorSecret, User } from '../types';

export const authService = {
  login: (input: LoginInput): Promise<AuthResponse> =>
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  register: (input: RegisterInput): Promise<AuthResponse> =>
    apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  logout: (): Promise<void> =>
    apiRequest('/api/auth/logout', { method: 'POST' }),

  refresh: (refreshToken: string): Promise<{ accessToken: string; refreshToken?: string }> =>
    apiRequest('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  generate2FA: (): Promise<TwoFactorSecret> =>
    apiRequest('/api/auth/2fa/generate', { method: 'POST' }),

  enable2FA: (code: string): Promise<void> =>
    apiRequest('/api/auth/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  disable2FA: (code: string, password: string): Promise<void> =>
    apiRequest('/api/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ code, password }),
    }),

  getProfile: (): Promise<{ user: User }> =>
    apiRequest('/api/user/profile'),
};
