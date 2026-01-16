/**
 * Unified Network Client for GAAP
 * 
 * Supports two modes:
 * 1. Legacy JSON mode (for gradual migration)
 * 2. ALE + Protobuf mode (secure, encrypted)
 * 
 * Usage:
 * - For legacy JSON: use jsonRequest()
 * - For ALE+Protobuf: use secureRequest()
 */

import { encryptPayload, decryptPayload, signRequest } from '../crypto/browser-crypto';
import { API_BASE_PATH, ApiError } from '../api';

// ============================================================================
// Types
// ============================================================================

/** Protobuf message interface (ts-proto generated have these methods) */
export interface MessageFns<T> {
  encode(message: T): { finish(): Uint8Array };
  decode(input: Uint8Array): T;
  fromPartial(object: Partial<T>): T;
}

/** Key type for ALE encryption */
export type ALEKeyType = 'bootstrap' | 'session';

/** Token storage interface */
interface TokenStorage {
  getToken(): string | null;
  setToken(token: string): void;
  getRefreshToken(): string | null;
  setRefreshToken(token: string): void;
  getSessionKey(): string | null;
  setSessionKey(key: string | null): void;
  clear(): void;
}

// ============================================================================
// Token Storage (localStorage-based)
// ============================================================================

const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';
const SESSION_KEY = 'sessionKey';

export const tokenStorage: TokenStorage = {
  getToken: () => (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null),
  setToken: (token) => localStorage.setItem(TOKEN_KEY, token),
  getRefreshToken: () => (typeof window !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null),
  setRefreshToken: (token) => localStorage.setItem(REFRESH_TOKEN_KEY, token),
  getSessionKey: () => (typeof window !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null),
  setSessionKey: (key) => {
    if (key) {
      localStorage.setItem(SESSION_KEY, key);
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
  },
};

// ============================================================================
// ALE Configuration
// ============================================================================

/** Check if ALE is available (bootstrap key configured) */
export function isALEAvailable(): boolean {
  return !!process.env.NEXT_PUBLIC_ALE_BOOTSTRAP_KEY;
}

/** Get bootstrap key for auth endpoints */
function getBootstrapKey(): string {
  const key = process.env.NEXT_PUBLIC_ALE_BOOTSTRAP_KEY;
  if (!key) {
    throw new Error('NEXT_PUBLIC_ALE_BOOTSTRAP_KEY not configured');
  }
  return key;
}

/** Get the appropriate key for the given key type */
function getKeyForType(keyType: ALEKeyType): string {
  if (keyType === 'bootstrap') {
    return getBootstrapKey();
  }
  const sessionKey = tokenStorage.getSessionKey();
  if (!sessionKey) {
    throw new Error('Session key not available. Please login first.');
  }
  return sessionKey;
}

// ============================================================================
// Token Refresh Logic
// ============================================================================

let isRefreshing = false;
let refreshSubscribers: Array<(success: boolean) => void> = [];

function onRefreshComplete(success: boolean) {
  refreshSubscribers.forEach(callback => callback(success));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (success: boolean) => void) {
  refreshSubscribers.push(callback);
}

/** Reset state (call after login) */
export function resetNetworkState() {
  isRefreshing = false;
  refreshSubscribers = [];
}

/** Redirect to login page */
function redirectToLogin() {
  tokenStorage.clear();
  if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
}

// ============================================================================
// Secure Request (ALE + Protobuf)
// ============================================================================

/**
 * Send an ALE-encrypted Protobuf request
 * 
 * @param url API endpoint (relative path like '/auth/login')
 * @param reqData Request data object
 * @param ReqType Protobuf request message type
 * @param ResType Protobuf response message type
 * @param keyType Which key to use ('bootstrap' for auth, 'session' for other)
 * @param options Additional options
 */
export async function secureRequest<TReq, TRes>(
  url: string,
  reqData: Partial<TReq>,
  ReqType: MessageFns<TReq>,
  ResType: MessageFns<TRes>,
  keyType: ALEKeyType = 'session',
  options: { includeToken?: boolean; retryOnUnauth?: boolean } = {}
): Promise<TRes> {
  const { includeToken = keyType === 'session', retryOnUnauth = keyType === 'session' } = options;

  const fullUrl = url.startsWith('/') ? `${API_BASE_PATH}${url}` : url;
  const secretKey = getKeyForType(keyType);

  // 1. Create message from partial
  const message = ReqType.fromPartial(reqData as TReq);

  // 2. Serialize (Protobuf Encode)
  const rawBytes = ReqType.encode(message).finish();

  // 3. Encrypt (AES-GCM)
  const { ciphertext, iv } = await encryptPayload(rawBytes, secretKey);

  // 4. Prepare anti-replay parameters
  const timestamp = Date.now().toString();
  const nonce = crypto.randomUUID();

  // 5. Sign (HMAC)
  const signature = await signRequest(ciphertext, iv, timestamp, nonce, secretKey);

  // 6. Combine final binary body (IV + Ciphertext)
  const body = new Uint8Array(iv.length + ciphertext.length);
  body.set(iv, 0);
  body.set(ciphertext, iv.length);

  // 7. Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/octet-stream',
    'X-Signature': signature,
    'X-Timestamp': timestamp,
    'X-Nonce': nonce,
  };

  if (includeToken) {
    const token = tokenStorage.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // 8. Send request
  const response = await fetch(fullUrl, {
    method: 'POST',
    headers,
    body: body,
  });

  // Handle non-OK responses
  if (!response.ok) {
    // Check for 401 and attempt refresh
    if (response.status === 401 && retryOnUnauth) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        // Retry the request
        return secureRequest(url, reqData, ReqType, ResType, keyType, { ...options, retryOnUnauth: false });
      }
      redirectToLogin();
    }
    throw new ApiError(`API Error: ${response.status} ${response.statusText}`, response.status);
  }

  // 9. Read response body (binary)
  const resBuffer = await response.arrayBuffer();
  const resBytes = new Uint8Array(resBuffer);

  // Check if response is encrypted (binary) or JSON (error)
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    // Error response in JSON format
    const text = new TextDecoder().decode(resBytes);
    const errorData = JSON.parse(text);

    if (errorData.code === 401 && retryOnUnauth) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        return secureRequest(url, reqData, ReqType, ResType, keyType, { ...options, retryOnUnauth: false });
      }
      redirectToLogin();
    }

    throw new ApiError(errorData.message || 'Unknown error', errorData.code || response.status);
  }

  // 10. Decrypt response
  if (resBytes.length < 12 + 16) {
    // Response might be empty or unencrypted
    return ResType.fromPartial({} as TRes);
  }

  const resIv = resBytes.slice(0, 12);
  const resCiphertext = resBytes.slice(12);

  const decryptedBytes = await decryptPayload(resCiphertext, resIv, secretKey);

  // 11. Deserialize (Protobuf Decode)
  return ResType.decode(decryptedBytes);
}

// ============================================================================
// Token Refresh
// ============================================================================

async function attemptTokenRefresh(): Promise<boolean> {
  if (isRefreshing) {
    // Wait for ongoing refresh
    return new Promise((resolve) => {
      addRefreshSubscriber(resolve);
    });
  }

  isRefreshing = true;

  try {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      onRefreshComplete(false);
      return false;
    }

    // Import RefreshTokenReq/Res lazily to avoid circular deps
    const { RefreshTokenReq, RefreshTokenRes } = await import('../proto/auth/v1/auth');

    const result = await secureRequest(
      '/auth/refresh-token',
      { refreshToken },
      RefreshTokenReq,
      RefreshTokenRes,
      'bootstrap',
      { includeToken: false, retryOnUnauth: false }
    );

    if (result.accessToken) {
      tokenStorage.setToken(result.accessToken);
      if (result.refreshToken) {
        tokenStorage.setRefreshToken(result.refreshToken);
      }
      if (result.sessionKey) {
        tokenStorage.setSessionKey(result.sessionKey);
      }
      onRefreshComplete(true);
      return true;
    }

    onRefreshComplete(false);
    return false;
  } catch {
    onRefreshComplete(false);
    return false;
  } finally {
    isRefreshing = false;
  }
}

// ============================================================================
// Auth-specific helpers
// ============================================================================

/**
 * Login with ALE encryption
 * Automatically stores tokens and session key
 */
export async function login<TReq, TRes extends { auth?: { accessToken?: string; refreshToken?: string; sessionKey?: string } }>(
  reqData: Partial<TReq>,
  ReqType: MessageFns<TReq>,
  ResType: MessageFns<TRes>
): Promise<TRes> {
  const result = await secureRequest('/auth/login', reqData, ReqType, ResType, 'bootstrap', { includeToken: false });

  // Store tokens from auth response
  if (result.auth) {
    if (result.auth.accessToken) {
      tokenStorage.setToken(result.auth.accessToken);
    }
    if (result.auth.refreshToken) {
      tokenStorage.setRefreshToken(result.auth.refreshToken);
    }
    if (result.auth.sessionKey) {
      tokenStorage.setSessionKey(result.auth.sessionKey);
    }
  }

  resetNetworkState();
  return result;
}

/**
 * Register with ALE encryption
 * Automatically stores tokens and session key
 */
export async function register<TReq, TRes extends { auth?: { accessToken?: string; refreshToken?: string; sessionKey?: string } }>(
  reqData: Partial<TReq>,
  ReqType: MessageFns<TReq>,
  ResType: MessageFns<TRes>
): Promise<TRes> {
  const result = await secureRequest('/auth/register', reqData, ReqType, ResType, 'bootstrap', { includeToken: false });

  // Store tokens from auth response
  if (result.auth) {
    if (result.auth.accessToken) {
      tokenStorage.setToken(result.auth.accessToken);
    }
    if (result.auth.refreshToken) {
      tokenStorage.setRefreshToken(result.auth.refreshToken);
    }
    if (result.auth.sessionKey) {
      tokenStorage.setSessionKey(result.auth.sessionKey);
    }
  }

  resetNetworkState();
  return result;
}

/**
 * Logout - clears all tokens
 */
export async function logout<TReq, TRes>(
  ReqType: MessageFns<TReq>,
  ResType: MessageFns<TRes>
): Promise<void> {
  try {
    await secureRequest('/auth/logout', {}, ReqType, ResType, 'session');
  } finally {
    tokenStorage.clear();
    resetNetworkState();
  }
}
