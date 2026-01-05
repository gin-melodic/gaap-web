'use client';

import { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useWebSocket } from './useWebSocket';
import { accountKeys } from './useAccounts';
import { transactionKeys } from './useTransactions';
import { useGlobal } from '@/context/GlobalContext';
import { useQueryClient } from '@tanstack/react-query';
import { taskKeys } from './useTasks';

/**
 * Hook that listens to WebSocket for task status changes and shows notifications
 * when tasks complete or fail.
 */
const notifiedTasks = new Set<string>();

export function useTaskNotifications() {
    const { t } = useTranslation('settings');
    const { isLoggedIn, openTaskCenter } = useGlobal();
    const queryClient = useQueryClient();
    const { lastMessage, status } = useWebSocket();

    // Handle open task center (refresh data when opening)
    const handleOpenTaskCenter = useCallback(() => {
        openTaskCenter();
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    }, [openTaskCenter, queryClient]);

    // Refresh related data based on task type
    const refreshRelatedData = useCallback((taskType: string) => {
        if (taskType === 'ACCOUNT_MIGRATION') {
            // Refresh accounts and transactions after account migration
            queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
            queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
        }
        // Always refresh task list
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    }, [queryClient]);

    // Handle WebSocket messages
    useEffect(() => {
        if (!isLoggedIn || !lastMessage) return;

        if (lastMessage.type === 'TASK_UPDATE' && lastMessage.payload) {
            const { taskId, status: taskStatus, taskType } = lastMessage.payload;

            console.log('[TaskNotifications] Received task update:', { taskId, taskStatus, taskType });

            // Skip if already notified for this completed/failed task
            if ((taskStatus === 'COMPLETED' || taskStatus === 'FAILED') && notifiedTasks.has(taskId)) {
                return;
            }

            if (taskStatus === 'COMPLETED') {
                const typeText = getTypeText(taskType, t);
                let message = t('task_completed_notification', { type: typeText });

                if (taskType === 'DATA_IMPORT' && lastMessage.payload.result) {
                    const result = lastMessage.payload.result as {
                        accountsImported?: number;
                        transactionsImported?: number;
                        accountsSkipped?: number;
                        transactionsSkipped?: number;
                    };
                    const added = (result.accountsImported || 0) + (result.transactionsImported || 0);
                    const updated = (result.accountsSkipped || 0) + (result.transactionsSkipped || 0);
                    const duplicated = updated;
                    message = t('settings:import_result_summary', { added, updated, duplicated });
                }

                toast.success(message, {
                    duration: 6000,
                    action: {
                        label: t('view_task_center'),
                        onClick: handleOpenTaskCenter,
                    },
                });
                notifiedTasks.add(taskId);
                refreshRelatedData(taskType);
            } else if (taskStatus === 'FAILED') {
                const typeText = getTypeText(taskType, t);
                toast.error(t('task_failed_notification', { type: typeText }), {
                    duration: 6000,
                    action: {
                        label: t('view_task_center'),
                        onClick: handleOpenTaskCenter,
                    },
                });
                notifiedTasks.add(taskId);
                refreshRelatedData(taskType);
            }
        }
    }, [lastMessage, isLoggedIn, t, handleOpenTaskCenter, refreshRelatedData]);

    return {
        openTaskCenter: handleOpenTaskCenter,
        wsStatus: status,
    };
}

// Helper to get human-readable task type
function getTypeText(type: string, t: (key: string) => string): string {
    if (type === 'ACCOUNT_MIGRATION') {
        return t('task_type_account_migration');
    }
    return type;
}

