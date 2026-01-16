import apiRequest, { API_BASE_PATH } from '../api';
import { GetBalanceTrendRes } from '../types';

export const dashboardService = {
    getBalanceTrend: (accounts?: string[]): Promise<GetBalanceTrendRes> => {
        return apiRequest(`${API_BASE_PATH}/dashboard/get-balance-trend`, {
            method: 'POST',
            body: JSON.stringify({ accounts: accounts && accounts.length > 0 && !accounts.includes('all') ? accounts : undefined }),
        });
    },
};
