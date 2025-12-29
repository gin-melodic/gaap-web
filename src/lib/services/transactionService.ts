import apiRequest from '../api';
import { Transaction, TransactionInput, TransactionQuery, PaginatedResponse } from '../types';

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

export const transactionService = {
  list: (query?: TransactionQuery): Promise<PaginatedResponse<Transaction>> =>
    apiRequest(`/api/transactions${buildQueryString(query)}`),

  get: (id: string): Promise<Transaction> =>
    apiRequest(`/api/transactions/${id}`),

  create: (input: TransactionInput): Promise<Transaction> =>
    apiRequest('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  update: (id: string, input: Partial<TransactionInput>): Promise<Transaction> =>
    apiRequest(`/api/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  delete: (id: string): Promise<void> =>
    apiRequest(`/api/transactions/${id}`, { method: 'DELETE' }),
};
