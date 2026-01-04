'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { THEMES } from '@/lib/data';
import apiRequest, { ApiError } from '@/lib/api';

interface User {
  email: string;
  nickname: string;
  avatar: string | null;
  plan: 'FREE' | 'PRO';
  twoFactorEnabled?: boolean;
}

interface Theme {
  id: string;
  name: string;
  isDark?: boolean;
  colors: {
    primary: string;
    bg: string;
    card: string;
    text: string;
    muted: string;
    border: string;
  };
}

export type SettingsView = 'MAIN' | 'PROFILE' | 'SUBSCRIPTION' | 'CURRENCY' | 'THEME' | 'LANGUAGE' | 'TASKS';

interface GlobalContextType {
  user: User;
  isLoggedIn: boolean;
  isLoading: boolean;
  currencies: string[];
  currentTheme: Theme;
  settingsView: SettingsView;
  isTaskCenterOpen: boolean;
  exchangeRates: Record<string, number>;
  exchangeRatesLastUpdated: number | null;
  baseCurrency: string;
  login: (user: Partial<User>) => void;
  logout: () => void;
  addCurrency: (code: string) => void;
  deleteCurrency: (code: string) => void;
  setTheme: (theme: Theme) => void;
  updateUser: (updates: Partial<User>) => void;
  setSettingsView: (view: SettingsView) => void;
  openTaskCenter: () => void;
  closeTaskCenter: () => void;
  setExchangeRate: (currency: string, rate: number) => void;
  setBaseCurrency: (code: string) => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User>({ email: '', nickname: '', avatar: null, plan: 'FREE' });
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [exchangeRatesLastUpdated, setExchangeRatesLastUpdated] = useState<number | null>(null);
  const [baseCurrency, setBaseCurrency] = useState('CNY');

  const [currencies, setCurrencies] = useState(['CNY', 'USD', 'HKD', 'EUR', 'JPY']);
  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[0]);
  const [settingsView, setSettingsView] = useState<SettingsView>('MAIN');
  const [isTaskCenterOpen, setIsTaskCenterOpen] = useState(false);

  const openTaskCenter = () => setIsTaskCenterOpen(true);
  const closeTaskCenter = () => setIsTaskCenterOpen(false);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const storedState = localStorage.getItem('gaap_state');

      // Restore non-sensitive state from local storage first (preferences, etc)
      if (storedState) {
        try {
          const parsed = JSON.parse(storedState);
          // Only restore preferences, not data that should be fetched fresh
          if (parsed.currencies) setCurrencies(parsed.currencies);
          if (parsed.currentTheme) setCurrentTheme(parsed.currentTheme);
          if (parsed.exchangeRates) setExchangeRates(parsed.exchangeRates);
          if (parsed.exchangeRatesLastUpdated) setExchangeRatesLastUpdated(parsed.exchangeRatesLastUpdated);
          if (parsed.baseCurrency) setBaseCurrency(parsed.baseCurrency);
        } catch (e) {
          console.error('Failed to parse stored state', e);
        }
      }

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Validate token by fetching profile
        const data = await apiRequest<{ user: User }>('/api/user/profile');

        if (data && data.user) {
          setUser(data.user);
          setIsLoggedIn(true);
        } else {
          throw new Error('Invalid user profile data');
        }

      } catch (error) {
        // Handle token expiration / 401
        if (error instanceof ApiError && error.code === 401) {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            setIsLoggedIn(false);
            setIsLoading(false);
            return;
          }

          try {
            const refreshData = await apiRequest<{ accessToken: string; refreshToken?: string }>('/api/auth/refresh', {
              method: 'POST',
              body: JSON.stringify({ refreshToken })
            });

            const newToken = refreshData.accessToken;
            if (newToken) {
              localStorage.setItem('token', newToken);
              if (refreshData.refreshToken) {
                localStorage.setItem('refreshToken', refreshData.refreshToken);
              }

              // Retry profile fetch with new token
              const userData = await apiRequest<{ user: User }>('/api/user/profile');
              if (userData && userData.user) {
                setUser(userData.user);
                setIsLoggedIn(true);
              }
            }
          } catch (refreshErr) {
            console.error('Refresh failed:', refreshErr);
            // Only clear if the token hasn't been updated (e.g. by a parallel login)
            if (localStorage.getItem('token') === token) {
              localStorage.removeItem('token');
              localStorage.removeItem('refreshToken');
              setIsLoggedIn(false);
              setUser({ email: '', nickname: '', avatar: null, plan: 'FREE' });
            }
          }
        } else if (error instanceof ApiError && (error.code === 503 || error.code === 502 || error.code === 504)) {
          // Backend service unavailable - keep tokens, user can retry later
          console.warn('Backend service unavailable, will retry later');
          // Don't clear tokens or logout - just leave current state
        } else if (error instanceof Error && (error.message.includes('Network') || error.message.includes('fetch'))) {
          // Network error - backend might be down
          console.warn('Network error - backend may be unavailable');
          // Don't clear tokens or logout - just leave current state  
        } else {
          console.error('Auth verification failed:', error);
          // Only clear if the token hasn't been updated (e.g. by a parallel login)
          if (localStorage.getItem('token') === token) {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            setIsLoggedIn(false);
            setUser({ email: '', nickname: '', avatar: null, plan: 'FREE' });
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Save preferences to localStorage on change
  useEffect(() => {
    if (isLoading) return;
    const state = {
      currencies,
      currentTheme,
      exchangeRates,
      exchangeRatesLastUpdated,
      baseCurrency
    };
    localStorage.setItem('gaap_state', JSON.stringify(state));
  }, [currencies, currentTheme, exchangeRates, exchangeRatesLastUpdated, baseCurrency, isLoading]);

  const login = (userData: Partial<User>) => {
    setUser(prev => ({ ...prev, ...userData }));
    setIsLoggedIn(true);
  };

  const logout = () => {
    setIsLoggedIn(false);
    setUser({ email: '', nickname: '', avatar: null, plan: 'FREE' });
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const addCurrency = (code: string) => {
    if (!currencies.includes(code)) setCurrencies(prev => [...prev, code]);
  };

  const deleteCurrency = (code: string) => {
    setCurrencies(prev => prev.filter(c => c !== code));
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  const setExchangeRate = (currency: string, rate: number) => {
    setExchangeRates(prev => ({ ...prev, [currency]: rate }));
    setExchangeRatesLastUpdated(Date.now());
  };

  return (
    <GlobalContext.Provider value={{
      user,
      isLoggedIn,
      isLoading,
      currencies,
      currentTheme,
      settingsView,
      isTaskCenterOpen,
      exchangeRates,
      exchangeRatesLastUpdated,
      baseCurrency,
      login,
      logout,
      addCurrency,
      deleteCurrency,
      setTheme: setCurrentTheme,
      updateUser,
      setSettingsView,
      openTaskCenter,
      closeTaskCenter,
      setExchangeRate,
      setBaseCurrency
    }}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobal = () => {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error('useGlobal must be used within a GlobalProvider');
  }
  return context;
};
