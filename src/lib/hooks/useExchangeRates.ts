import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { configService } from '../services';
import { authKeys } from './useAuth';

export const exchangeRateKeys = {
  all: ['exchangeRates'] as const,
};

/**
 * Server-state exchange rates, expressed relative to the anchor currency.
 * `rateMap` maps an uppercase currency code to its decimal rate string and
 * always includes the anchor itself as "1".
 */
export function useExchangeRates() {
  const query = useQuery({
    queryKey: exchangeRateKeys.all,
    queryFn: () => configService.getExchangeRates(),
    staleTime: 1000 * 60 * 5,
  });

  const anchor = (query.data?.anchor || 'USD').toUpperCase();
  const rateMap = useMemo(() => {
    const map: Record<string, string> = { [anchor]: '1' };
    for (const rate of query.data?.rates ?? []) {
      map[rate.currency.toUpperCase()] = rate.rate;
    }
    return map;
  }, [query.data, anchor]);

  return { ...query, anchor, rateMap };
}

export function useSetExchangeRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ currency, rate }: { currency: string; rate: string }) =>
      configService.setExchangeRate(currency, rate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exchangeRateKeys.all });
    },
  });
}

export function useAddCurrency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => configService.addCurrency(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.currencyList });
    },
  });
}

export function useDeleteCurrency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => configService.deleteCurrency(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.currencyList });
      queryClient.invalidateQueries({ queryKey: exchangeRateKeys.all });
    },
  });
}
