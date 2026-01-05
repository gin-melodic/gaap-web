import apiRequest, { API_BASE_PATH } from '../api';
import { Transaction, TransactionInput, TransactionQuery, PaginatedResponse } from '../types';

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

export const transactionService = {
  list: (query?: TransactionQuery): Promise<PaginatedResponse<Transaction>> =>
    apiRequest(`${API_BASE_PATH}/transactions${buildQueryString(query)}`),

  get: (id: string): Promise<Transaction> =>
    apiRequest(`${API_BASE_PATH}/transactions/${id}`),

  create: (input: TransactionInput): Promise<Transaction> =>
    apiRequest(`${API_BASE_PATH}/transactions`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  update: (id: string, input: Partial<TransactionInput>): Promise<Transaction> =>
    apiRequest(`${API_BASE_PATH}/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  delete: (id: string): Promise<void> =>
    apiRequest(`${API_BASE_PATH}/transactions/${id}`, { method: 'DELETE' }),
};
