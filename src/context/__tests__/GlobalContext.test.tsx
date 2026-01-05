import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { GlobalProvider, useGlobal } from '../GlobalContext';
import { API_BASE_PATH } from '../../lib/api';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Test component to consume context
const TestComponent = () => {
  const { isLoggedIn, user, isLoading } = useGlobal();
  if (isLoading) return <div>Loading...</div>;
  if (isLoggedIn) return <div>Logged in as {user.nickname}</div>;
  return <div>Not logged in</div>;
};

// Helper to create mock response
const createMockResponse = (data: unknown, code = 0, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: {
    get: (name: string) => name === 'content-type' ? 'application/json' : null,
  },
  json: async () => ({ code, message: code === 0 ? 'success' : 'error', data }),
});

// Mock fetch
global.fetch = vi.fn();

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
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('GlobalContext Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('should start with loading state and not logged in', async () => {
    render(
      <GlobalProvider>
        <TestComponent />
      </GlobalProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Not logged in')).toBeInTheDocument();
    });
  });

  it('should authenticate automatically if valid token exists', async () => {
    localStorageMock.setItem('token', 'valid-token');

    // Mock successful profile fetch
    vi.mocked(global.fetch).mockResolvedValueOnce(
      createMockResponse({ user: { email: 'test@example.com', nickname: 'TestUser', plan: 'FREE' } }) as Response
    );

    await act(async () => {
      render(
        <GlobalProvider>
          <TestComponent />
        </GlobalProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Logged in as TestUser')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_PATH}/user/profile`, expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer valid-token' })
    }));
  });

  it('should refresh token if initial fetch returns 401', async () => {
    localStorageMock.setItem('token', 'expired-token');
    localStorageMock.setItem('refreshToken', 'valid-refresh-token');

    // 1. Profile fetch -> 401 (business error code)
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(createMockResponse(null, 401) as Response)
      // 2. Refresh fetch -> 200
      .mockResolvedValueOnce(
        createMockResponse({ accessToken: 'new-access-token', refreshToken: 'new-refresh-token' }) as Response
      )
      // 3. Retry profile fetch -> 200
      .mockResolvedValueOnce(
        createMockResponse({ user: { email: 'test@example.com', nickname: 'RefreshedUser', plan: 'PRO' } }) as Response
      );

    await act(async () => {
      render(
        <GlobalProvider>
          <TestComponent />
        </GlobalProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Logged in as RefreshedUser')).toBeInTheDocument();
    });

    // Check localStorage updates
    expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'new-access-token');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'new-refresh-token');
  });

  it('should log out if refresh fails', async () => {
    localStorageMock.setItem('token', 'expired-token');
    localStorageMock.setItem('refreshToken', 'bad-refresh-token');

    // 1. Profile fetch -> 401
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(createMockResponse(null, 401) as Response)
      // 2. Refresh fetch -> 401
      .mockResolvedValueOnce(createMockResponse(null, 401) as Response);

    await act(async () => {
      render(
        <GlobalProvider>
          <TestComponent />
        </GlobalProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Not logged in')).toBeInTheDocument();
    });

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
  });
});
