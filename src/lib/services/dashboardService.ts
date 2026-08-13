import { secureRequest } from '../network/secure-client';
import {
  GetBalanceTrendReq,
  GetBalanceTrendRes,
} from '../proto/dashboard/v1/dashboard';

export const dashboardService = {
  getBalanceTrend: (accounts?: string[]): Promise<GetBalanceTrendRes> => secureRequest(
    '/dashboard/get-balance-trend',
    { accounts: accounts?.filter((account) => account !== 'all') ?? [] },
    GetBalanceTrendReq,
    GetBalanceTrendRes,
  ),
};
