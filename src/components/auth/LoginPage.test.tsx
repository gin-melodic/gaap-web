import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LoginPage from './LoginPage';

const mocks = vi.hoisted(() => ({
  demoLogin: vi.fn(),
  login: vi.fn(),
  contextLogin: vi.fn(),
  push: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/context/GlobalContext', () => ({
  useGlobal: () => ({ login: mocks.contextLogin, isLoggedIn: false }),
}));

vi.mock('@/lib/hooks', () => ({
  useLogin: () => ({ mutateAsync: mocks.login, isPending: false }),
  useDemoLogin: () => ({ mutateAsync: mocks.demoLogin, isPending: false }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: () => <div data-testid="turnstile" />,
}));

vi.mock('@/components/features/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
}));

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
    info: vi.fn(),
  },
}));

describe('LoginPage demo login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replaces unimplemented social buttons with a credential-free demo login', async () => {
    mocks.demoLogin.mockResolvedValue({
      auth: {
        accessToken: 'demo-access',
        refreshToken: 'demo-refresh',
        sessionKey: 'demo-session',
        user: {
          email: 'demo@example.com',
          nickname: 'Demo',
          avatar: undefined,
          plan: 1,
          mainCurrency: 'USD',
        },
      },
    });

    render(<LoginPage />);

    expect(screen.queryByText('GitHub')).not.toBeInTheDocument();
    expect(screen.queryByText('微信')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'auth:demo_login' }));

    await waitFor(() => expect(mocks.demoLogin).toHaveBeenCalledWith());
    expect(mocks.login).not.toHaveBeenCalled();
    expect(mocks.contextLogin).toHaveBeenCalledWith({
      email: 'demo@example.com',
      nickname: 'Demo',
      avatar: undefined,
      plan: 1,
      mainCurrency: 'USD',
    });
    expect(mocks.push).toHaveBeenCalledWith('/dashboard');
  });
});
