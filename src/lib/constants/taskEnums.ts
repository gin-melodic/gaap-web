// Task status constants (must match backend)
export const TaskStatus = {
  UNSPECIFIED: 0,
  PENDING: 1,
  RUNNING: 2,
  COMPLETED: 3,
  FAILED: 4,
  CANCELLED: 5,
} as const;

export type TaskStatusType = typeof TaskStatus[keyof typeof TaskStatus];

// Task type constants (must match backend)
export const TaskType = {
  UNSPECIFIED: 0,
  ACCOUNT_MIGRATION: 1,
  DATA_EXPORT: 2,
  DATA_IMPORT: 3,
} as const;

export type TaskTypeType = typeof TaskType[keyof typeof TaskType];

// Helper function to get status text for display
export function getStatusText(status: TaskStatusType | string | number): string {
  const statusNum = typeof status === 'string' ? parseInt(status, 10) : status;
  switch (statusNum) {
    case TaskStatus.UNSPECIFIED:
      return 'UNSPECIFIED';
    case TaskStatus.PENDING:
      return 'PENDING';
    case TaskStatus.RUNNING:
      return 'RUNNING';
    case TaskStatus.COMPLETED:
      return 'COMPLETED';
    case TaskStatus.FAILED:
      return 'FAILED';
    case TaskStatus.CANCELLED:
      return 'CANCELLED';
    default:
      console.warn('[getStatusText] Unknown status:', status, 'parsed as:', statusNum);
      return 'UNKNOWN';
  }
}

// Helper function to get task type text for display
export function getTaskTypeText(type: TaskTypeType | string | number): string {
  const typeNum = typeof type === 'string' ? parseInt(type, 10) : type;
  switch (typeNum) {
    case TaskType.UNSPECIFIED:
      return 'UNSPECIFIED';
    case TaskType.ACCOUNT_MIGRATION:
      return 'ACCOUNT_MIGRATION';
    case TaskType.DATA_EXPORT:
      return 'DATA_EXPORT';
    case TaskType.DATA_IMPORT:
      return 'DATA_IMPORT';
    default:
      console.warn('[getTaskTypeText] Unknown type:', type, 'parsed as:', typeNum);
      return 'UNKNOWN';
  }
}
