import apiRequest, { API_BASE_PATH } from '../api';
import { AuthResponse, LoginInput, RegisterInput, TwoFactorSecret, User } from '../types';

export const authService = {
  login: (input: LoginInput): Promise<AuthResponse> =>
    apiRequest(`${API_BASE_PATH}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  register: (input: RegisterInput): Promise<AuthResponse> =>
    apiRequest(`${API_BASE_PATH}/auth/register`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  logout: (): Promise<void> =>
    apiRequest(`${API_BASE_PATH}/auth/logout`, { method: 'POST' }),

  refresh: (refreshToken: string): Promise<{ accessToken: string; refreshToken?: string }> =>
    apiRequest(`${API_BASE_PATH}/auth/refresh`, {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  generate2FA: (): Promise<TwoFactorSecret> =>
    apiRequest(`${API_BASE_PATH}/auth/2fa/generate`, { method: 'POST' }),

  enable2FA: (code: string): Promise<void> =>
    apiRequest(`${API_BASE_PATH}/auth/2fa/enable`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  disable2FA: (code: string, password: string): Promise<void> =>
    apiRequest(`${API_BASE_PATH}/auth/2fa/disable`, {
      method: 'POST',
      body: JSON.stringify({ code, password }),
    }),

  getProfile: (): Promise<{ user: User }> =>
    apiRequest(`${API_BASE_PATH}/user/profile`),
};
