import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { configService } from '../services';
import { useExchangeRates } from './useExchangeRates';

vi.mock('../services', () => ({
  configService: {
    getExchangeRates: vi.fn(),
    setExchangeRate: vi.fn(),
    addCurrency: vi.fn(),
    deleteCurrency: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

describe('useExchangeRates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds a rate map that always includes the anchor as 1', async () => {
    vi.mocked(configService.getExchangeRates).mockResolvedValue({
      anchor: 'USD',
      rates: [
        { currency: 'CNY', rate: '7.2', source: 'reference', updatedAt: '' },
        { currency: 'JPY', rate: '150', source: 'reference', updatedAt: '' },
      ],
      base: undefined,
    });

    const Wrapper = createWrapper();
    const { result } = renderHook(() => useExchangeRates(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.anchor).toBe('USD');
    expect(result.current.rateMap).toEqual({ USD: '1', CNY: '7.2', JPY: '150' });
  });
});
