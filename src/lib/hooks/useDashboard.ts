import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services';

export const dashboardKeys = {
    all: ['dashboard'] as const,
    trends: () => [...dashboardKeys.all, 'trend'] as const,
    trend: (accounts?: string[], startDate?: string, endDate?: string) => [
        ...dashboardKeys.trends(),
        accounts,
        startDate,
        endDate,
    ] as const,
};

export function useBalanceTrend(accounts?: string[], startDate?: string, endDate?: string) {
    return useQuery({
        queryKey: dashboardKeys.trend(accounts, startDate, endDate),
        queryFn: () => dashboardService.getBalanceTrend(accounts, startDate, endDate),
        placeholderData: (previousData) => previousData,
    });
}
