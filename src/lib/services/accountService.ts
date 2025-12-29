import apiRequest from '../api';
import { Account, AccountInput, AccountQuery, PaginatedResponse } from '../types';

const buildQueryString = (query?: Record<string, any>): string => {
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
    apiRequest(`/api/accounts${buildQueryString(query)}`),

  get: (id: string): Promise<Account> =>
    apiRequest(`/api/accounts/${id}`),

  create: (input: AccountInput): Promise<Account> =>
    apiRequest('/api/accounts', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  update: (id: string, input: Partial<AccountInput>): Promise<Account> =>
    apiRequest(`/api/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  delete: (id: string, migrationTargets?: Record<string, string>): Promise<{ taskId?: string }> =>
    apiRequest(`/api/accounts/${id}`, {
      method: 'DELETE',
      body: migrationTargets ? JSON.stringify({ migrationTargets }) : undefined,
    }),
};
