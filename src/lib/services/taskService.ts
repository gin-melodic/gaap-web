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



export const taskService = {
  list: (query?: TaskQuery): Promise<PaginatedTaskResponse> =>
    apiRequest(`${API_BASE_PATH}/task/list-tasks`, {
      method: 'POST',
      body: JSON.stringify({ query })
    }),

  get: (id: string): Promise<Task> =>
    apiRequest(`${API_BASE_PATH}/task/get-task`, {
      method: 'POST',
      body: JSON.stringify({ id })
    }),

  cancel: (id: string): Promise<void> =>
    apiRequest(`${API_BASE_PATH}/task/cancel-task`, { method: 'POST', body: JSON.stringify({ id }) }),

  retry: (id: string): Promise<Task> =>
    apiRequest(`${API_BASE_PATH}/task/retry-task`, { method: 'POST', body: JSON.stringify({ id }) }),
};
