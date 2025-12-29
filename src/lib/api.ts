import { toast } from 'sonner';

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export class ApiError extends Error {
  code: number;
  data: any;

  constructor(message: string, code: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.data = data;
  }
}

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
// Queue of requests waiting for token refresh
let refreshSubscribers: Array<(token: string) => void> = [];

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

function redirectToLogin() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.code !== 0 || !data.data?.accessToken) {
      return null;
    }

    const newToken = data.data.accessToken;
    localStorage.setItem('token', newToken);
    if (data.data.refreshToken) {
      localStorage.setItem('refreshToken', data.data.refreshToken);
    }
    return newToken;
  } catch {
    return null;
  }
}

async function apiRequest<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const makeRequest = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, {
      ...options,
      headers,
    });
  };

  const parseResponse = async <R>(response: Response): Promise<R> => {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const resData: ApiResponse<R> = await response.json();
      if (resData.code !== 0) {
        throw new ApiError(resData.message || 'Unknown error', resData.code, resData.data);
      }
      return resData.data;
    } else {
      if (!response.ok) {
        throw new ApiError(`HTTP Error: ${response.status} ${response.statusText}`, response.status);
      }
      return {} as R;
    }
  };

  try {
    const token = localStorage.getItem('token');
    const response = await makeRequest(token);

    // Check Content-Type
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const resData: ApiResponse<T> = await response.json();

      // Handle 401 Unauthorized - attempt token refresh
      if (resData.code === 401) {
        // Skip refresh for auth endpoints
        if (url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh')) {
          throw new ApiError(resData.message || 'Unauthorized', resData.code, resData.data);
        }

        if (!isRefreshing) {
          isRefreshing = true;
          const newToken = await refreshAccessToken();
          isRefreshing = false;

          if (newToken) {
            onTokenRefreshed(newToken);
            // Retry original request with new token
            const retryResponse = await makeRequest(newToken);
            return parseResponse<T>(retryResponse);
          } else {
            // Refresh failed - redirect to login
            redirectToLogin();
            // Return a never-resolving promise to prevent further execution/errors while redirecting
            return new Promise<T>(() => { });
          }
        } else {
          // Wait for the ongoing refresh to complete
          return new Promise<T>((resolve, reject) => {
            addRefreshSubscriber(async (newToken: string) => {
              try {
                const retryResponse = await makeRequest(newToken);
                resolve(await parseResponse<T>(retryResponse));
              } catch (error) {
                reject(error);
              }
            });
          });
        }
      }

      // If code is not 0, it's a business error
      if (resData.code !== 0) {
        throw new ApiError(resData.message || 'Unknown error', resData.code, resData.data);
      }
      return resData.data;
    } else {
      // Non-JSON response (e.g. 404 html page)
      if (!response.ok) {
        throw new ApiError(`HTTP Error: ${response.status} ${response.statusText}`, response.status);
      }
      return {} as T;
    }

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network errors etc
    throw new Error(error instanceof Error ? error.message : 'Network error');
  }
}

export default apiRequest;

