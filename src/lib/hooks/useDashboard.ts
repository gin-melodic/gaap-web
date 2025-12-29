import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services';

export const dashboardKeys = {
    all: ['dashboard'] as const,
    trends: () => [...dashboardKeys.all, 'trend'] as const,
    trend: (accounts?: string[]) => [...dashboardKeys.trends(), accounts] as const,
};

export function useBalanceTrend(accounts?: string[]) {
    return useQuery({
        queryKey: dashboardKeys.trend(accounts),
        queryFn: () => dashboardService.getBalanceTrend(accounts),
        // Refresh when accounts change
    });
}
