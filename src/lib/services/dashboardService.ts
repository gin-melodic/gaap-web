import apiRequest, { API_BASE_PATH } from '../api';
import { BalanceTrendResponse } from '../types';

export const dashboardService = {
    getBalanceTrend: (accounts?: string[]): Promise<BalanceTrendResponse> => {
        let url = `${API_BASE_PATH}/dashboard/balance-trend`;
        if (accounts && accounts.length > 0 && !accounts.includes('all')) {
            const params = new URLSearchParams();
            // GoFrame expects accounts[] or repeated accounts parameter?
            // Usually it's multiple ?accounts=id1&accounts=id2
            accounts.forEach(id => params.append('accounts', id));
            url += `?${params.toString()}`;
        }
        return apiRequest(url);
    },
};
