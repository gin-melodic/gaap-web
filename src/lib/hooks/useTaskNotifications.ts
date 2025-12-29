'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useWebSocket, WebSocketMessage } from './useWebSocket';
import { accountKeys } from './useAccounts';
import { transactionKeys } from './useTransactions';
import { useGlobal } from '@/context/GlobalContext';
import { useQueryClient } from '@tanstack/react-query';
import { taskKeys } from './useTasks';

/**
 * Hook that listens to WebSocket for task status changes and shows notifications
 * when tasks complete or fail.
 */
export function useTaskNotifications() {
    const { t } = useTranslation('settings');
    const { isLoggedIn, openTaskCenter } = useGlobal();
    const queryClient = useQueryClient();
    const { lastMessage, status } = useWebSocket();

    // Handle open task center (refresh data when opening)
    const handleOpenTaskCenter = () => {
        openTaskCenter();
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    };

    // Refresh related data based on task type
    const refreshRelatedData = (taskType: string) => {
        if (taskType === 'ACCOUNT_MIGRATION') {
            // Refresh accounts and transactions after account migration
            queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
            queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
        }
        // Always refresh task list
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    };

    // Handle WebSocket messages
    useEffect(() => {
        if (!isLoggedIn || !lastMessage) return;

        if (lastMessage.type === 'TASK_UPDATE' && lastMessage.payload) {
            const { taskId, status: taskStatus, taskType } = lastMessage.payload;

            console.log('[TaskNotifications] Received task update:', { taskId, taskStatus, taskType });

            if (taskStatus === 'COMPLETED') {
                const typeText = getTypeText(taskType, t);
                toast.success(t('task_completed_notification', { type: typeText }), {
                    duration: 6000,
                    action: {
                        label: t('view_task_center'),
                        onClick: handleOpenTaskCenter,
                    },
                });
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
                refreshRelatedData(taskType);
            }
        }
    }, [lastMessage, isLoggedIn, t, queryClient]);

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

