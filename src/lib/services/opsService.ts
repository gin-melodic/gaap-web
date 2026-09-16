import { API_BASE_PATH } from '../network/config';
import { ApiError } from '../network/errors';
import { tokenStorage } from '../network/secure-client';

// The ops console is mounted under a random path segment on the API. The code
// ships as a build-time env var so it can be rotated without code changes.
export const OPS_CODE = process.env.NEXT_PUBLIC_OPS_CODE || 'v7qk2xm9';

export type OpsDependencyState = 'ok' | 'error' | 'not_configured';

export interface OpsDependencyStatus {
  status: OpsDependencyState;
  latencyMs?: number;
  error?: string;
}

export interface OpsQueueStatus {
  name: string;
  depth: number;
  consumers: number;
  error?: string;
}

export interface OpsRabbitMQStatus {
  status: OpsDependencyState;
  queues: OpsQueueStatus[];
}

export interface OpsEventStats {
  total: Record<string, number>;
  lastHour: Record<string, number>;
}

export interface OpsAccountDifference {
  accountId: string;
  userId: string;
  name: string;
  type: number;
  currency: string;
  actual: string;
  expected: string;
  difference: string;
}

export interface OpsReport {
  passed: boolean;
  accountsChecked: number;
  transactionsChecked: number;
  differences: OpsAccountDifference[];
  issues: string[];
}

export interface OpsReconView {
  at: string;
  source: 'startup' | 'manual';
  report: OpsReport;
}

export interface OpsSignupView {
  email: string;
  createdAt: string;
}

export interface OpsUsersView {
  total: number;
  recentSignups: OpsSignupView[];
}

export interface OpsEvent {
  time: string;
  level: string;
  event: string;
  detail: string;
}

export interface OpsServerInfo {
  startedAt: string;
  uptimeSec: number;
  goVersion: string;
  env: string;
  version: string;
}

export interface OpsStatus {
  server: OpsServerInfo;
  database: OpsDependencyStatus;
  redis: Record<string, OpsDependencyStatus>;
  rabbitmq: OpsRabbitMQStatus;
  http: OpsEventStats;
  ale: OpsEventStats;
  auth: OpsEventStats;
  reconciliation: OpsReconView | null;
  users: OpsUsersView;
  recentEvents: OpsEvent[];
}

export interface OpsReconcileResult {
  report: OpsReport;
  recordedAt: string;
}

// opsRequest performs a plain JSON request to the ops endpoints. It is
// deliberately separate from secureRequest: the ops API speaks JSON (not
// ALE-encrypted protobuf) and its error bodies may be proto bytes, so errors
// are classified by HTTP status instead of by body content.
async function opsRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = tokenStorage.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // Optional shared secret for server-to-server monitoring.
  if (process.env.NEXT_PUBLIC_OPS_TOKEN) {
    headers['X-Ops-Token'] = process.env.NEXT_PUBLIC_OPS_TOKEN;
  }

  const response = await fetch(`${API_BASE_PATH}/${OPS_CODE}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers ?? {}) },
  });

  if (!response.ok) {
    let message = '';
    try {
      const text = await response.text();
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed?.message) {
        message = parsed.message;
      } else if (text) {
        message = text;
      }
    } catch {
      // Non-JSON body (e.g. proto bytes from the auth middleware): fall back
      // to the status code so the UI can render a generic panel.
    }
    throw new ApiError(message || `HTTP ${response.status}`, response.status);
  }

  return (await response.json()) as T;
}

export const opsService = {
  getStatus: (): Promise<OpsStatus> => opsRequest<OpsStatus>('/status'),

  reconcileNow: (): Promise<OpsReconcileResult> =>
    opsRequest<OpsReconcileResult>('/reconcile', { method: 'POST' }),
};
