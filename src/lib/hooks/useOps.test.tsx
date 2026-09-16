import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { opsService } from '../services';
import type { OpsStatus } from '../services/opsService';
import { OPS_DISCOVERED_KEY, opsKeys, useOpsConsole, useOpsReconcile, useOpsStatus } from './useOps';

function sampleStatus(): OpsStatus {
  return {
    server: { startedAt: '2026-09-10T01:59:00Z', uptimeSec: 42, goVersion: 'go1.24', env: 'test', version: 'test' },
    database: { status: 'ok' },
    redis: {},
    rabbitmq: { status: 'ok', queues: [] },
    http: { total: {}, lastHour: {} },
    ale: { total: {}, lastHour: {} },
    auth: { total: {}, lastHour: {} },
    reconciliation: null,
    users: { total: 0, recentSignups: [] },
    recentEvents: [],
  };
}

vi.mock('../services', () => ({
  opsService: {
    getStatus: vi.fn(),
    reconcileNow: vi.fn(),
  },
}));

vi.mock('@/context/GlobalContext', () => ({
  useGlobal: () => ({ isLoggedIn: true }),
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

describe('useOpsStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('queries the status with the ops key', async () => {
    const payload = sampleStatus();
    vi.mocked(opsService.getStatus).mockResolvedValue(payload);

    const { result } = renderHook(() => useOpsStatus(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(opsService.getStatus).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(payload);
    expect(opsKeys.status()).toEqual(['ops', 'status']);
  });

  it('exposes non-JSON auth failures as ApiError with the status code', async () => {
    const { ApiError } = await import('../network/errors');
    vi.mocked(opsService.getStatus).mockRejectedValue(new ApiError('HTTP 403', 403));

    const { result } = renderHook(() => useOpsStatus(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as unknown as { code: number }).code).toBe(403);
  });
});

describe('useOpsReconcile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs the manual reconciliation and refreshes the status query', async () => {
    vi.mocked(opsService.reconcileNow).mockResolvedValue({
      report: { passed: true, accountsChecked: 0, transactionsChecked: 0, differences: [], issues: [] },
      recordedAt: 'now',
    });

    const { result } = renderHook(() => useOpsReconcile(), { wrapper: createWrapper() });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(opsService.reconcileNow).toHaveBeenCalledTimes(1);
  });
});

describe('useOpsConsole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('marks the console as discovered in localStorage after first success', async () => {
    vi.mocked(opsService.getStatus).mockResolvedValue(sampleStatus());

    const { result } = renderHook(() => useOpsConsole(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(window.localStorage.getItem(OPS_DISCOVERED_KEY)).toBe('1');
  });

  it('does not mark discovery while the request is failing', async () => {
    const { ApiError } = await import('../network/errors');
    vi.mocked(opsService.getStatus).mockRejectedValue(new ApiError('HTTP 403', 403));

    const { result } = renderHook(() => useOpsConsole(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(window.localStorage.getItem(OPS_DISCOVERED_KEY)).toBeNull();
  });
});
