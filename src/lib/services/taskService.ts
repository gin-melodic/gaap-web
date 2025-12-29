import apiRequest from '../api';

export interface Task {
  id: string;
  type: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  payload: any;
  result?: any;
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
}

export interface PaginatedTaskResponse {
  data: Task[];
  total: number;
  page: number;
  limit: number;
}

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

export const taskService = {
  list: (query?: TaskQuery): Promise<PaginatedTaskResponse> =>
    apiRequest(`/api/tasks${buildQueryString(query)}`),

  get: (id: string): Promise<Task> =>
    apiRequest(`/api/tasks/${id}`),

  cancel: (id: string): Promise<void> =>
    apiRequest(`/api/tasks/${id}/cancel`, { method: 'POST' }),

  retry: (id: string): Promise<Task> =>
    apiRequest(`/api/tasks/${id}/retry`, { method: 'POST' }),
};
