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
      body: JSON.stringify({
        ...input,
        cf_turnstile_response: input.cfTurnstileResponse,
      }),
    }),

  logout: (): Promise<void> =>
    apiRequest(`${API_BASE_PATH}/auth/logout`, { method: 'POST' }),

  refresh: (refreshToken: string): Promise<{ accessToken: string; refreshToken?: string }> =>
    apiRequest(`${API_BASE_PATH}/auth/refresh-token`, {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  generate2FA: (): Promise<TwoFactorSecret> =>
    apiRequest(`${API_BASE_PATH}/auth/generate2-f-a`, { method: 'POST' }),

  enable2FA: (code: string): Promise<void> =>
    apiRequest(`${API_BASE_PATH}/auth/enable2-f-a`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  disable2FA: (code: string, password: string): Promise<void> =>
    apiRequest(`${API_BASE_PATH}/auth/disable2-f-a`, {
      method: 'POST',
      body: JSON.stringify({ code, password }),
    }),

  getProfile: (): Promise<{ user: User }> =>
    apiRequest(`${API_BASE_PATH}/user/get-profile`, { method: 'POST' }),
};
