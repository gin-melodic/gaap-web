import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ApiError } from '@/lib/network/errors';
import Ops from './Ops';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', resolvedLanguage: 'en' },
  }),
}));

// Shared mutable query-state stand-in so each test can flip the console state.
type QueryState = {
  isSuccess: boolean;
  isError: boolean;
  isLoading: boolean;
  error: unknown;
  dataUpdatedAt: number;
  data?: Record<string, unknown>;
};

const statusMock: QueryState = {
  isSuccess: true,
  isError: false,
  isLoading: false,
  error: undefined,
  dataUpdatedAt: Date.parse('2026-09-10T02:00:00Z'),
  data: {
    server: {
      startedAt: '2026-09-10T01:59:00Z',
      uptimeSec: 600,
      goVersion: 'go1.24',
      env: 'uat',
      version: 'test',
    },
    database: { status: 'ok', latencyMs: 3 },
    redis: { sync_lock: { status: 'ok', latencyMs: 1 }, ale: { status: 'ok', latencyMs: 2 } },
    rabbitmq: {
      status: 'ok',
      queues: [
        { name: 'gaap.dashboard', depth: 4, consumers: 2 },
        { name: 'gaap.tasks', depth: 0, consumers: 1 },
      ],
    },
    http: {
      total: { 'http.5xx': 7 },
      lastHour: { 'http.5xx': 2 },
    },
    ale: {
      total: { 'ale.signature_invalid': 3 },
      lastHour: { 'ale.signature_invalid': 1 },
    },
    auth: {
      total: { 'auth.login_success': 10 },
      lastHour: { 'auth.login_success': 4 },
    },
    reconciliation: {
      at: '2026-09-10T01:59:05Z',
      source: 'startup',
      report: {
        passed: false,
        accountsChecked: 30,
        transactionsChecked: 102,
        differences: [
          {
            accountId: 'acc-1',
            userId: 'user-1',
            name: 'CMB',
            type: 1,
            currency: 'CNY',
            actual: '86243.57',
            expected: '86000.00',
            difference: '243.57',
          },
        ],
        issues: [],
      },
    },
    users: {
      total: 2,
      recentSignups: [
        { email: 'windane@example.com', createdAt: '2026-09-09T10:00:00Z' },
        { email: 'gaap_test_feedback@example.com', createdAt: '2026-09-10T02:00:00Z' },
      ],
    },
    recentEvents: [
      { time: '2026-09-10T02:00:00Z', level: 'error', event: 'ale.signature_invalid', detail: '' },
    ],
  },
};

vi.mock('@/lib/hooks/useOps', () => ({
  useOpsConsole: () => statusMock,
  useOpsStatus: () => statusMock,
  useOpsReconcile: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}));

vi.mock('@/context/GlobalContext', () => ({
  useGlobal: () => ({ isLoggedIn: true }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

const fullData = statusMock.data;

function resetStatus() {
  statusMock.isSuccess = true;
  statusMock.isError = false;
  statusMock.isLoading = false;
  statusMock.error = undefined;
  statusMock.data = fullData;
}

describe('Ops console', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStatus();
  });

  it('renders dependency health, counters, reconciliation and user activity', () => {
    render(<Ops />);

    // Server + dependencies
    expect(screen.getByText('ops:title')).toBeInTheDocument();
    expect(screen.getByText('database')).toBeInTheDocument();
    expect(screen.getByText('gaap.dashboard')).toBeInTheDocument();
    expect(screen.getByText('queueDepth: 4 · consumers: 2')).toBeInTheDocument();

    // Counters: ALE error names appear in the metrics table
    expect(screen.getAllByText('ale.signature_invalid').length).toBeGreaterThanOrEqual(1);

    // Reconciliation result with the decimal difference, rendered verbatim
    expect(screen.getByText('reconFailed')).toBeInTheDocument();
    expect(screen.getByText('243.57')).toBeInTheDocument();
    expect(screen.getByText('reconRunNow')).toBeInTheDocument();

    // Users: recent signups
    expect(screen.getByText('gaap_test_feedback@example.com')).toBeInTheDocument();
  });

  it('shows the admin-only panel on 403', () => {
    statusMock.isSuccess = false;
    statusMock.isError = true;
    statusMock.error = new ApiError('forbidden', 403);
    statusMock.data = undefined;

    render(<Ops />);
    expect(screen.getByText('ops:forbiddenTitle')).toBeInTheDocument();
    resetStatus();
  });

  it('shows the not-found panel on 404', () => {
    statusMock.isSuccess = false;
    statusMock.isError = true;
    statusMock.error = new ApiError('not found', 404);
    statusMock.data = undefined;

    render(<Ops />);
    expect(screen.getByText('ops:notFoundTitle')).toBeInTheDocument();
    resetStatus();
  });

  it('shows the generic error panel with the status code for other failures', () => {
    statusMock.isSuccess = false;
    statusMock.isError = true;
    statusMock.error = new ApiError('HTTP 502', 502);
    statusMock.data = undefined;

    render(<Ops />);
    expect(screen.getByText('ops:errorTitle')).toBeInTheDocument();
    expect(screen.getByText(/HTTP 502/)).toBeInTheDocument();
    resetStatus();
  });
});
