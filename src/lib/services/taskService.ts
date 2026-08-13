import { secureRequest } from '../network/secure-client';
import { TaskStatusType, TaskTypeType } from '@/lib/constants/taskEnums';
import {
  CancelTaskReq,
  CancelTaskRes,
  GetTaskReq,
  GetTaskRes,
  ListTasksReq,
  ListTasksRes,
  RetryTaskReq,
  RetryTaskRes,
  Task as ProtoTask,
} from '../proto/task/v1/task';

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
}

export interface PaginatedTaskResponse {
  data: Task[];
  total: number;
  page: number;
  limit: number;
}

const toISOString = (value?: Date): string | undefined => value?.toISOString();

const mapTask = (task: ProtoTask): Task => ({
  id: task.id,
  type: task.type as TaskTypeType,
  status: task.status as TaskStatusType,
  payload: task.payload,
  result: task.result,
  progress: task.progress,
  totalItems: task.totalItems,
  processedItems: task.processedItems,
  startedAt: toISOString(task.startedAt),
  completedAt: toISOString(task.completedAt),
  createdAt: toISOString(task.createdAt) ?? '',
  updatedAt: toISOString(task.updatedAt) ?? '',
});

export const taskService = {
  list: async (query: TaskQuery = {}): Promise<PaginatedTaskResponse> => {
    const response = await secureRequest(
      '/task/list-tasks',
      { query: { page: query.page ?? 1, limit: query.limit ?? 20, status: query.status ?? 0, type: query.type ?? 0 } },
      ListTasksReq,
      ListTasksRes,
    );
    return {
      data: response.data.map(mapTask),
      total: response.pagination?.total ?? 0,
      page: response.pagination?.page ?? 1,
      limit: response.pagination?.limit ?? 20,
    };
  },

  get: async (id: string): Promise<Task> => {
    const response = await secureRequest('/task/get-task', { id }, GetTaskReq, GetTaskRes);
    if (!response.task) throw new Error('Task not found');
    return mapTask(response.task);
  },

  cancel: async (id: string): Promise<void> => {
    await secureRequest('/task/cancel-task', { id }, CancelTaskReq, CancelTaskRes);
  },

  retry: async (id: string): Promise<Task> => {
    const response = await secureRequest('/task/retry-task', { id }, RetryTaskReq, RetryTaskRes);
    if (!response.task) throw new Error('Task not found');
    return mapTask(response.task);
  },
};
