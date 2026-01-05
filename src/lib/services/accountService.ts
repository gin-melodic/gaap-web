import apiRequest, { API_BASE_PATH } from '../api';
import { Account, AccountInput, AccountQuery, PaginatedResponse } from '../types';

const buildQueryString = (query?: Record<string, unknown>): string => {
  if (!query) return '';
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return qs ? '?' + qs : '';
};

export const accountService = {
  list: (query?: AccountQuery): Promise<PaginatedResponse<Account>> =>
    apiRequest(`${API_BASE_PATH}/accounts${buildQueryString(query)}`),

  get: (id: string): Promise<Account> =>
    apiRequest(`${API_BASE_PATH}/accounts/${id}`),

  create: (input: AccountInput): Promise<Account> =>
    apiRequest(`${API_BASE_PATH}/accounts`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  update: (id: string, input: Partial<AccountInput>): Promise<Account> =>
    apiRequest(`${API_BASE_PATH}/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  delete: (id: string, migrationTargets?: Record<string, string>): Promise<{ taskId?: string }> =>
    apiRequest(`${API_BASE_PATH}/accounts/${id}`, {
      method: 'DELETE',
      body: migrationTargets ? JSON.stringify({ migrationTargets }) : undefined,
    }),

  getTransactionCount: (id: string): Promise<{ count: number }> =>
    apiRequest(`${API_BASE_PATH}/accounts/${id}/transaction-count`),
};

