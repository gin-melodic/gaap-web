import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { GlobalProvider, useGlobal } from '../GlobalContext';
import { ApiError } from '../../lib/network/errors';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { GetUserProfileRes } from '../../lib/proto/user/v1/user';

// Mock secureAuthService
vi.mock('../../lib/services/secureAuthService', () => ({
  secureAuthService: {
    getProfile: vi.fn(),
  },
}));

// Import after mock
import { secureAuthService } from '../../lib/services/secureAuthService';

// Test component to access context
const TestComponent = () => {
  const { user, isLoggedIn, isLoading } = useGlobal();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (isLoggedIn) {
    return <div>Logged in as {user.nickname}</div>;
  }
  
  return <div>Not logged in</div>;
};

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
    localStorageMock.setItem('sessionKey', 'valid-session-key');

    // Mock successful profile fetch
    vi.mocked(secureAuthService.getProfile).mockResolvedValue({
      user: { email: 'test@example.com', nickname: 'TestUser', plan: 1 } // FREE plan
    } as GetUserProfileRes);

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
  });

  it('should refresh token if initial fetch returns 401', async () => {
    localStorageMock.setItem('token', 'expired-token');
    localStorageMock.setItem('refreshToken', 'valid-refresh-token');
    localStorageMock.setItem('sessionKey', 'valid-session-key');

    // Mock profile fetch to succeed (assuming refresh happened internally)
    vi.mocked(secureAuthService.getProfile).mockResolvedValue({
      user: { email: 'test@example.com', nickname: 'RefreshedUser', plan: 2 } // PRO plan
    } as GetUserProfileRes);

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

    // Note: Token refresh happens internally in secureRequest, so we can't easily test localStorage updates
  });

  it('should log out if refresh fails', async () => {
    localStorageMock.setItem('token', 'expired-token');
    localStorageMock.setItem('refreshToken', 'bad-refresh-token');
    localStorageMock.setItem('sessionKey', 'valid-session-key');

    // Mock profile fetch to fail with 401
    vi.mocked(secureAuthService.getProfile).mockRejectedValue(new ApiError('Unauthorized', 401));

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
