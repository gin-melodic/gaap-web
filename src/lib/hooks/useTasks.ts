import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService, Task, TaskQuery } from '../services/taskService';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { TaskStatus } from '@/lib/constants/taskEnums';

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
      if (data?.status === TaskStatus.PENDING || data?.status === TaskStatus.RUNNING) {
        return 2000;
      }
      return false;
    },
  });
}

// Cancel task
export function useCancelTask() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('common');

  return useMutation({
    mutationFn: (id: string) => taskService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      toast.success(t('task_cancelled'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('cancel_failed'));
    },
  });
}

// Retry task
export function useRetryTask() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('common');

  return useMutation({
    mutationFn: (id: string) => taskService.retry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      toast.success(t('task_resubmitted'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('retry_failed'));
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
  const activeTasks = tasks.filter(t => t.status === TaskStatus.PENDING || t.status === TaskStatus.RUNNING);
  return {
    activeTasks,
    activeCount: activeTasks.length,
    ...rest,
  };
}

export type { Task, TaskQuery };
