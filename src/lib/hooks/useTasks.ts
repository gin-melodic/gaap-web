import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService, Task, TaskQuery } from '../services/taskService';
import { toast } from 'sonner';

// Query Keys
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (query?: TaskQuery) => [...taskKeys.lists(), query] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

// Get task list
export function useTasks(query?: TaskQuery) {
  return useQuery({
    queryKey: taskKeys.list(query),
    queryFn: () => taskService.list(query),
    // Polling removed - task updates now handled by WebSocket via useTaskNotifications
  });
}

// Get single task
export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => taskService.get(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === 'PENDING' || data?.status === 'RUNNING') {
        return 2000;
      }
      return false;
    },
  });
}

// Cancel task
export function useCancelTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taskService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      toast.success('任务已取消');
    },
    onError: (error: Error) => {
      toast.error(error.message || '取消失败');
    },
  });
}

// Retry task
export function useRetryTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taskService.retry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      toast.success('任务已重新提交');
    },
    onError: (error: Error) => {
      toast.error(error.message || '重试失败');
    },
  });
}

// Convenience hook: Get all tasks
export function useAllTasks() {
  const { data, ...rest } = useTasks({ limit: 100 });
  return {
    tasks: data?.data ?? [],
    ...rest,
  };
}

// Convenience hook: Get active task count
export function useActiveTasks() {
  const { tasks, ...rest } = useAllTasks();
  const activeTasks = tasks.filter(t => t.status === 'PENDING' || t.status === 'RUNNING');
  return {
    activeTasks,
    activeCount: activeTasks.length,
    ...rest,
  };
}

export type { Task, TaskQuery };
