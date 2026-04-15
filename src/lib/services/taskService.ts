import apiRequest, { API_BASE_PATH } from '../api';
import { TaskStatusType, TaskTypeType } from '@/lib/constants/taskEnums';

export interface Task {
  id: string;
  type: TaskTypeType;
  status: TaskStatusType;
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
  status?: TaskStatusType;
  type?: TaskTypeType;
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
