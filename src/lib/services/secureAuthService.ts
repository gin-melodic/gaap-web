import {
  login,
  demoLogin,
  register,
  logout,
  secureRequest,
  tokenStorage,
  isALEAvailable,
} from '../network/secure-client';

import {
  LoginReq,
  LoginRes,
  DemoLoginReq,
  RegisterReq,
  RegisterRes,
  LogoutReq,
  LogoutRes,
  RefreshTokenReq,
  RefreshTokenRes,
  Generate2FAReq,
  Generate2FARes,
  Enable2FAReq,
  Enable2FARes,
  Disable2FAReq,
  Disable2FARes,
  UpdatePasswordReq,
  UpdatePasswordRes,
  GetCurrencyListReq,
  GetCurrencyListRes,
} from '../proto/auth/v1/auth';

import {
  GetUserProfileReq,
  GetUserProfileRes,
  UpdateUserProfileReq,
  UpdateUserProfileRes,
  UserInput,
} from '../proto/user/v1/user';

// Re-export types for convenience
export type { LoginRes, RegisterRes, RefreshTokenRes, UserInput, GetCurrencyListRes };

/**
 * Secure Auth Service using ALE + Protobuf
 */
export const secureAuthService = {
  /**
   * Check if ALE is available
   */
  isAvailable: isALEAvailable,

  /**
   * Login with email and password
   * Automatically stores access token, refresh token, and session key
   */
  login: async (input: {
    email: string;
    password: string;
    code?: string;
    cfTurnstileResponse?: string;
  }): Promise<LoginRes> => {
    return login(
      {
        email: input.email,
        password: input.password,
        code: input.code || '',
        cfTurnstileResponse: input.cfTurnstileResponse || '',
      },
      LoginReq,
      LoginRes
    );
  },

  /** Login as the online demo user without exposing its credentials. */
  demoLogin: async (): Promise<LoginRes> => {
    return demoLogin(DemoLoginReq, LoginRes);
  },

  /**
   * Register a new account
   * Automatically stores access token, refresh token, and session key
   */
  register: async (input: {
    email: string;
    password: string;
    nickname: string;
    mainCurrency: string;
    cfTurnstileResponse?: string;
  }): Promise<RegisterRes> => {
    return register(
      {
        email: input.email,
        password: input.password,
        nickname: input.nickname,
        mainCurrency: input.mainCurrency,
        cfTurnstileResponse: input.cfTurnstileResponse || '',
      },
      RegisterReq,
      RegisterRes
    );
  },

  /**
   * Logout and clear all tokens
   */
  logout: async (): Promise<void> => {
    return logout(LogoutReq, LogoutRes);
  },

  /**
   * Refresh access token
   */
  refresh: async (): Promise<RefreshTokenRes> => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const result = await secureRequest(
      '/auth/refresh-token',
      { refreshToken },
      RefreshTokenReq,
      RefreshTokenRes,
      'bootstrap',
      { includeToken: false, retryOnUnauth: false }
    );

    // Update stored tokens
    if (result.accessToken) {
      tokenStorage.setToken(result.accessToken);
    }
    if (result.refreshToken) {
      tokenStorage.setRefreshToken(result.refreshToken);
    }
    if (result.sessionKey) {
      tokenStorage.setSessionKey(result.sessionKey);
    }

    return result;
  },

  /**
   * Generate 2FA secret
   */
  generate2FA: async (): Promise<Generate2FARes> => {
    return secureRequest('/auth/generate2-f-a', {}, Generate2FAReq, Generate2FARes, 'session');
  },

  /**
   * Enable 2FA with verification code
   */
  enable2FA: async (code: string): Promise<Enable2FARes> => {
    return secureRequest('/auth/enable2-f-a', { code }, Enable2FAReq, Enable2FARes, 'session');
  },

  /**
   * Disable 2FA
   */
  disable2FA: async (code: string, password: string): Promise<Disable2FARes> => {
    return secureRequest('/auth/disable2-f-a', { code, password }, Disable2FAReq, Disable2FARes, 'session');
  },

  /**
   * Update password
   */
  updatePassword: async (password: string, newPassword: string, confirmPassword: string): Promise<UpdatePasswordRes> => {
    return secureRequest('/auth/update-password', { password, newPassword, confirmPassword }, UpdatePasswordReq, UpdatePasswordRes, 'session');
  },

  /**
   * Get user profile
   */
  getProfile: async (): Promise<GetUserProfileRes> => {
    return secureRequest('/user/get-profile', {}, GetUserProfileReq, GetUserProfileRes, 'session');
  },

  /**
   * Get currency list
   */
  getCurrencyList: async (): Promise<GetCurrencyListRes> => {
    return secureRequest('/auth/get-currency-list', {}, GetCurrencyListReq, GetCurrencyListRes, 'bootstrap', { includeToken: false });
  },

  /**
   * Update user profile
   */
  updateProfile: async (input: UserInput): Promise<UpdateUserProfileRes> => {
    return secureRequest('/user/update-profile', { input }, UpdateUserProfileReq, UpdateUserProfileRes, 'session');
  },

  /**
   * Get stored tokens (for checking auth state)
   */
  getStoredTokens: () => ({
    accessToken: tokenStorage.getToken(),
    refreshToken: tokenStorage.getRefreshToken(),
    sessionKey: tokenStorage.getSessionKey(),
  }),

  /**
   * Check if user is logged in (has valid tokens)
   */
  isLoggedIn: () => {
    return !!tokenStorage.getToken() && !!tokenStorage.getSessionKey();
  },

  /**
   * Clear all tokens (manual logout without API call)
   */
  clearTokens: () => {
    tokenStorage.clear();
  },
};

export default secureAuthService;
