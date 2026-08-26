/**
 * Unified Network Client for GAAP
 * 
 * All business requests use ALE-encrypted Protobuf.
 */

import { encryptPayload, decryptPayload, signRequest } from '../crypto/browser-crypto';
import { API_BASE_PATH } from './config';
import { ApiError } from './errors';
import { ErrorResponse } from '../proto/base/base';

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
  setToken: (token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
    }
  },
  getRefreshToken: () => (typeof window !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null),
  setRefreshToken: (token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    }
  },
  getSessionKey: () => (typeof window !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null),
  setSessionKey: (key) => {
    if (typeof window !== 'undefined') {
      if (key) {
        localStorage.setItem(SESSION_KEY, key);
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    }
  },
  clear: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(SESSION_KEY);
    }
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
  const publicPaths = ['/login', '/register'];
  if (typeof window !== 'undefined' && !publicPaths.some(p => window.location.pathname.includes(p))) {
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

  // 9. Read the Protobuf response body.
  const resBuffer = await response.arrayBuffer();
  let responseBytes: Uint8Array<ArrayBufferLike> = new Uint8Array(resBuffer);
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/octet-stream')) {
    throw new ApiError('Invalid API response content type', response.status || 502);
  }

  const isEncrypted = response.headers.get('x-ale-encrypted') === '1';
  const isUnencryptedSessionExpiry = response.status === 401
    && keyType === 'session'
    && response.headers.get('x-ale-session-expired') === '1';

  if (!isEncrypted && !isUnencryptedSessionExpiry) {
    throw new ApiError('API response was not ALE encrypted', 502);
  }

  if (isEncrypted) {
    if (responseBytes.length < 12 + 16) {
      throw new ApiError('Invalid encrypted API response', response.status || 502);
    }
    const responseIv = responseBytes.slice(0, 12);
    const responseCiphertext = responseBytes.slice(12);
    try {
      responseBytes = await decryptPayload(responseCiphertext, responseIv, secretKey);
    } catch {
      // A session response encrypted with a different key cannot be inspected for
      // its HTTP/protobuf error. Re-synchronize the key through the bootstrap-
      // protected refresh endpoint, then repeat the original request once.
      if (keyType === 'session' && retryOnUnauth) {
        const refreshed = await attemptTokenRefresh();
        if (refreshed) {
          return secureRequest(url, reqData, ReqType, ResType, keyType, {
            ...options,
            retryOnUnauth: false,
          });
        }
        redirectToLogin();
        throw new ApiError('Secure session expired. Please login again.', 401);
      }

      throw new ApiError('Unable to verify secure API response', 502);
    }
  }

  if (!response.ok) {
    let errorData;
    try {
      errorData = ErrorResponse.decode(responseBytes);
    } catch {
      throw new ApiError(`API Error: ${response.status}`, response.status);
    }

    if (response.status === 401 && retryOnUnauth) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        return secureRequest(url, reqData, ReqType, ResType, keyType, { ...options, retryOnUnauth: false });
      }
      redirectToLogin();
    }

    throw new ApiError(errorData.message || 'API request failed', errorData.code || response.status, {
      requestId: errorData.requestId,
    });
  }

  return ResType.decode(responseBytes);
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

  // Capture the token we are about to use
  const initialRefreshToken = tokenStorage.getRefreshToken();
  if (!initialRefreshToken) {
    onRefreshComplete(false);
    return false;
  }

  try {
    // Import RefreshTokenReq/Res lazily to avoid circular deps
    const { RefreshTokenReq, RefreshTokenRes } = await import('../proto/auth/v1/auth');

    const result = await secureRequest(
      '/auth/refresh-token',
      { refreshToken: initialRefreshToken },
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
    // If refresh failed (e.g. token revoked), check if another tab refreshed it.
    // Give the other tab a moment to update localStorage.
    await new Promise(resolve => setTimeout(resolve, 500));

    const currentRefreshToken = tokenStorage.getRefreshToken();

    // If the token in storage has changed since we started, it means another tab
    // successfully refreshed it. We can consider this a success.
    if (currentRefreshToken && currentRefreshToken !== initialRefreshToken) {
      onRefreshComplete(true);
      return true;
    }

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

/** Login as the server-configured online demo user. */
export async function demoLogin<TReq, TRes extends { auth?: { accessToken?: string; refreshToken?: string; sessionKey?: string } }>(
  ReqType: MessageFns<TReq>,
  ResType: MessageFns<TRes>
): Promise<TRes> {
  const result = await secureRequest('/auth/demo-login', {}, ReqType, ResType, 'bootstrap', { includeToken: false });

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
    // Redirect to login page after logout
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }
}
