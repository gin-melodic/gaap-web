import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { dashboardService } from '../services';
import { dashboardKeys, useBalanceTrend } from './useDashboard';

vi.mock('../services', () => ({
  dashboardService: {
    getBalanceTrend: vi.fn(),
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

describe('useBalanceTrend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes accounts and the inclusive range in the query and service call', async () => {
    vi.mocked(dashboardService.getBalanceTrend).mockResolvedValue({ data: [], base: undefined });
    const Wrapper = createWrapper();
    const { result } = renderHook(
      () => useBalanceTrend(['account-1'], '2026-06-26', '2026-08-24'),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(dashboardService.getBalanceTrend).toHaveBeenCalledWith(
      ['account-1'],
      '2026-06-26',
      '2026-08-24',
    );
    expect(dashboardKeys.trend(['account-1'], '2026-06-26', '2026-08-24')).toEqual([
      'dashboard',
      'trend',
      ['account-1'],
      '2026-06-26',
      '2026-08-24',
    ]);
  });

  it('keeps the previous chart data while a new range is loading', async () => {
    const firstResponse = { data: [], base: undefined };
    let resolveSecond: ((value: typeof firstResponse) => void) | undefined;
    vi.mocked(dashboardService.getBalanceTrend)
      .mockResolvedValueOnce(firstResponse)
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveSecond = resolve;
      }));

    const Wrapper = createWrapper();
    const { result, rerender } = renderHook(
      ({ startDate }) => useBalanceTrend(['all'], startDate, '2026-08-24'),
      { initialProps: { startDate: '2026-06-26' }, wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ startDate: '2026-01-01' });
    await waitFor(() => expect(result.current.isFetching).toBe(true));
    expect(result.current.data).toBe(firstResponse);

    resolveSecond?.(firstResponse);
    await waitFor(() => expect(result.current.isFetching).toBe(false));
  });
});
