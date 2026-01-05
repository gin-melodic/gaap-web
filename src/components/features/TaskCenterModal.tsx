'use client';

import React, { useState, useMemo } from 'react';
import { useGlobal } from '@/context/GlobalContext';
import { useTasks, useCancelTask, useRetryTask, Task } from '@/lib/hooks/useTasks';
import { useAllAccounts } from '@/lib/hooks/useAccounts';
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    CheckCircle2,
    X,
    Loader2,
    XCircle,
    Clock,
    ListTodo,
    RefreshCw,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

// Account migration payload structure
interface AccountMigrationPayload {
    accountId: string;
    childAccountIds?: string[];
    migrationTargets: Record<string, string>;
}

type SortField = 'createdAt' | 'type' | 'status';
type SortOrder = 'asc' | 'desc';

const PAGE_SIZE = 10;

const TaskCenterModal = () => {
    const { t } = useTranslation(['settings', 'common']);
    const { isTaskCenterOpen, closeTaskCenter } = useGlobal();
    const { data: tasksData, isLoading } = useTasks({ limit: 100 });
    const cancelMutation = useCancelTask();
    const retryMutation = useRetryTask();
    const { accounts } = useAllAccounts();
    const tasks = useMemo(() => tasksData?.data || [], [tasksData?.data]);

    // Filter states
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Sort states
    const [sortField, setSortField] = useState<SortField>('createdAt');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);

    // Get unique task types
    const taskTypes = useMemo(() => {
        const types = new Set(tasks.map(t => t.type));
        return Array.from(types);
    }, [tasks]);

    // Status options
    const statusOptions = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'];

    // Get account name by ID
    const getAccountName = (accountId: string): string => {
        const account = accounts.find(a => a.id === accountId);
        return account?.name || accountId;
    };

    // Get detailed task title with account names
    const getDetailedTaskTitle = (task: Task): string => {
        if (task.type === 'ACCOUNT_MIGRATION' && task.payload) {
            const payload = task.payload as AccountMigrationPayload;
            const sourceAccountName = getAccountName(payload.accountId);
            const targetAccountIds = Object.values(payload.migrationTargets || {});
            if (targetAccountIds.length === 1) {
                const targetAccountName = getAccountName(targetAccountIds[0]);
                return `${sourceAccountName} → ${targetAccountName}`;
            } else if (targetAccountIds.length > 1) {
                return `${sourceAccountName} → ${targetAccountIds.length} ${t('common:accounts')}`;
            }
            return sourceAccountName;
        } else if (task.type === 'DATA_EXPORT' && task.payload) {
            const payload = task.payload as { startDate: string; endDate: string };
            return `${payload.startDate} - ${payload.endDate}`;
        } else if (task.type === 'DATA_IMPORT' && task.payload) {
            const payload = task.payload as { fileName: string };
            // Extract filename from path if needed, or just show it
            const fileName = payload.fileName.split(/[/\\]/).pop() || payload.fileName;

            if (task.status === 'COMPLETED' && task.result) {
                const result = task.result as {
                    accountsImported?: number;
                    transactionsImported?: number;
                    accountsSkipped?: number;
                    transactionsSkipped?: number;
                };
                const added = (result.accountsImported || 0) + (result.transactionsImported || 0);
                const updated = (result.accountsSkipped || 0) + (result.transactionsSkipped || 0);
                const duplicated = updated;
                return `${fileName} (${t('settings:import_result_summary', { added, updated, duplicated })})`;
            }

            return fileName;
        }
        return '';
    };

    const getTypeText = (type: string) => {
        if (type === 'ACCOUNT_MIGRATION') return t('settings:task_type_account_migration');
        if (type === 'DATA_EXPORT') return t('settings:task_type_data_export');
        if (type === 'DATA_IMPORT') return t('settings:task_type_data_import');
        return type;
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PENDING': return <Clock size={14} className="text-amber-500" />;
            case 'RUNNING': return <Loader2 size={14} className="text-blue-500 animate-spin" />;
            case 'COMPLETED': return <CheckCircle2 size={14} className="text-green-500" />;
            case 'FAILED': return <XCircle size={14} className="text-red-500" />;
            case 'CANCELLED': return <X size={14} className="text-slate-400" />;
            default: return null;
        }
    };

    const getStatusText = (status: string) => {
        const key = `settings:task_status_${status.toLowerCase()}`;
        return t(key);
    };

    const formatDateTime = (dateString?: string | null) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const getErrorMessage = (task: Task): string | null => {
        if (task.status !== 'FAILED') return null;
        const result = task.result as { error?: string } | undefined;
        return result?.error || null;
    };

    // Handle sort toggle
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
        setCurrentPage(1);
    };

    // Get sort icon
    const getSortIcon = (field: SortField) => {
        if (sortField !== field) {
            return <ArrowUpDown size={14} className="ml-1 opacity-50" />;
        }
        return sortOrder === 'asc'
            ? <ArrowUp size={14} className="ml-1" />
            : <ArrowDown size={14} className="ml-1" />;
    };

    // Filter and sort tasks
    const filteredAndSortedTasks = useMemo(() => {
        let result = [...tasks];

        // Apply filters
        if (typeFilter !== 'all') {
            result = result.filter(t => t.type === typeFilter);
        }
        if (statusFilter !== 'all') {
            result = result.filter(t => t.status === statusFilter);
        }

        // Apply sorting
        result.sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case 'createdAt': {
                    const dateA = new Date(a.createdAt || 0).getTime();
                    const dateB = new Date(b.createdAt || 0).getTime();
                    comparison = dateA - dateB;
                    break;
                }
                case 'type':
                    comparison = a.type.localeCompare(b.type);
                    break;
                case 'status':
                    comparison = a.status.localeCompare(b.status);
                    break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [tasks, typeFilter, statusFilter, sortField, sortOrder]);

    // Pagination
    const totalPages = Math.ceil(filteredAndSortedTasks.length / PAGE_SIZE);
    const paginatedTasks = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredAndSortedTasks.slice(start, start + PAGE_SIZE);
    }, [filteredAndSortedTasks, currentPage]);

    // Reset to page 1 when filters change
    const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
        setter(value);
        setCurrentPage(1);
    };

    return (
        <Dialog
            open={isTaskCenterOpen}
            onOpenChange={(open) => {
                if (!open) closeTaskCenter();
            }}
        >
            <DialogContent
                className="!w-[90vw] sm:!max-w-none max-h-[85vh] overflow-y-auto"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ListTodo size={20} />
                        {t('settings:task_center')}
                    </DialogTitle>
                </DialogHeader>

                {/* Filters */}
                <div className="flex flex-wrap gap-4 py-4 border-b border-[var(--border)]">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-[var(--text-muted)]">{t('settings:task_filter_type')}:</span>
                        <Select value={typeFilter} onValueChange={handleFilterChange(setTypeFilter)}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('common:all')}</SelectItem>
                                {taskTypes.map(type => (
                                    <SelectItem key={type} value={type}>{getTypeText(type)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-[var(--text-muted)]">{t('settings:task_filter_status')}:</span>
                        <Select value={statusFilter} onValueChange={handleFilterChange(setStatusFilter)}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('common:all')}</SelectItem>
                                {statusOptions.map(status => (
                                    <SelectItem key={status} value={status}>{getStatusText(status)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Table */}
                <div className="py-4">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 size={24} className="text-[var(--primary)] animate-spin" />
                        </div>
                    ) : tasks.length === 0 ? (
                        <div className="text-center py-12 text-[var(--text-muted)]">
                            <ListTodo size={48} className="mx-auto mb-4 opacity-30" />
                            <p>{t('settings:task_no_tasks')}</p>
                        </div>
                    ) : filteredAndSortedTasks.length === 0 ? (
                        <div className="text-center py-12 text-[var(--text-muted)]">
                            <p>{t('settings:task_no_match')}</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-[var(--bg-main)]">
                                    <TableHead
                                        className="cursor-pointer select-none hover:bg-[var(--bg-hover)]"
                                        onClick={() => handleSort('type')}
                                    >
                                        <div className="flex items-center">
                                            {t('settings:task_column_type')}
                                            {getSortIcon('type')}
                                        </div>
                                    </TableHead>
                                    <TableHead>{t('settings:task_column_detail')}</TableHead>
                                    <TableHead
                                        className="cursor-pointer select-none hover:bg-[var(--bg-hover)]"
                                        onClick={() => handleSort('status')}
                                    >
                                        <div className="flex items-center">
                                            {t('settings:task_column_status')}
                                            {getSortIcon('status')}
                                        </div>
                                    </TableHead>
                                    <TableHead>{t('settings:task_progress')}</TableHead>
                                    <TableHead
                                        className="cursor-pointer select-none hover:bg-[var(--bg-hover)]"
                                        onClick={() => handleSort('createdAt')}
                                    >
                                        <div className="flex items-center">
                                            {t('settings:task_created_at')}
                                            {getSortIcon('createdAt')}
                                        </div>
                                    </TableHead>
                                    <TableHead>{t('settings:task_column_actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedTasks.map((task) => (
                                    <TableRow key={task.id} className="hover:bg-[var(--bg-hover)]">
                                        <TableCell className="font-medium">
                                            {getTypeText(task.type)}
                                        </TableCell>
                                        <TableCell className="max-w-[200px]">
                                            <div className="truncate" title={getDetailedTaskTitle(task)}>
                                                {getDetailedTaskTitle(task) || '-'}
                                            </div>
                                            {getErrorMessage(task) && (
                                                <div className="text-xs text-red-500 truncate mt-1" title={getErrorMessage(task) || ''}>
                                                    {getErrorMessage(task)}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                {getStatusIcon(task.status)}
                                                <span className="text-sm">{getStatusText(task.status)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {(task.status === 'RUNNING' || task.status === 'PENDING') ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-1.5 bg-[var(--bg-main)] rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-[var(--primary)] transition-all duration-300"
                                                            style={{ width: `${task.progress}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-[var(--text-muted)]">{task.progress}%</span>
                                                </div>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell className="text-sm text-[var(--text-muted)]">
                                            {formatDateTime(task.createdAt)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                {(task.status === 'PENDING' || task.status === 'RUNNING') && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                        onClick={() => cancelMutation.mutate(task.id)}
                                                        disabled={cancelMutation.isPending}
                                                    >
                                                        <X size={14} />
                                                    </Button>
                                                )}
                                                {task.status === 'FAILED' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 px-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                                        onClick={() => retryMutation.mutate(task.id)}
                                                        disabled={retryMutation.isPending}
                                                    >
                                                        <RefreshCw size={14} />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between py-4 border-t border-[var(--border)]">
                        <div className="text-sm text-[var(--text-muted)]">
                            {t('settings:task_page_info', {
                                current: currentPage,
                                total: totalPages,
                                count: filteredAndSortedTasks.length
                            })}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft size={16} />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight size={16} />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Footer with close button */}
                <div className="flex justify-end pt-4 border-t border-[var(--border)]">
                    <Button onClick={closeTaskCenter}>
                        {t('common:close')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default TaskCenterModal;
