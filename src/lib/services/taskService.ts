import apiRequest, { API_BASE_PATH } from '../api';

export interface Task {
  id: string;
  type: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  payload: unknown;
  result?: unknown;
  progress: number;
  totalItems: number;
  processedItems: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskQuery {
  page?: number;
  limit?: number;
  status?: Task['status'];
  type?: string;
  [key: string]: string | number | undefined;
}

export interface PaginatedTaskResponse {
  data: Task[];
  total: number;
  page: number;
  limit: number;
}

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

export const taskService = {
  list: (query?: TaskQuery): Promise<PaginatedTaskResponse> =>
    apiRequest(`${API_BASE_PATH}/tasks${buildQueryString(query)}`),

  get: (id: string): Promise<Task> =>
    apiRequest(`${API_BASE_PATH}/tasks/${id}`),

  cancel: (id: string): Promise<void> =>
    apiRequest(`${API_BASE_PATH}/tasks/${id}/cancel`, { method: 'POST' }),

  retry: (id: string): Promise<Task> =>
    apiRequest(`${API_BASE_PATH}/tasks/${id}/retry`, { method: 'POST' }),
};
