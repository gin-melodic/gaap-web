'use client';

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { AccountType, useAllAccounts, useBalanceTrend, useProfile } from '@/lib/hooks';
import { ChevronDown, Loader2 } from 'lucide-react';
import { MoneyHelper } from '@/lib/utils/money';
import { DailyBalance } from '@/lib/types';
import Decimal from 'decimal.js';
import { resolveDisplayCurrency } from '@/lib/utils/display-currency';
import TrendDateRangePicker, {
  createInitialTrendDateState,
  getEarliestSelectableDate,
  toLocalDateValue,
  type TrendDateRange,
} from './TrendDateRangePicker';

const COLORS = [
  'var(--primary)',
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
];

const BalanceTrendChart = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const { data: profile } = useProfile();

  const { accounts } = useAllAccounts();
  const mainCurrency = resolveDisplayCurrency(
    profile?.user?.mainCurrency,
    accounts.map((account) => account.balance ?? {}),
  );
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(['all']);
  const [initialDateState] = useState(createInitialTrendDateState);
  const { earliestDate: rollingEarliestDate, latestDate } = initialDateState;
  const [dateRange, setDateRange] = useState<TrendDateRange>(initialDateState.range);

  const earliestDate = useMemo(
    () => getEarliestSelectableDate(accounts, rollingEarliestDate),
    [accounts, rollingEarliestDate],
  );
  const effectiveDateRange = useMemo<TrendDateRange>(() => {
    if (dateRange.to < earliestDate) {
      return { from: earliestDate, to: earliestDate };
    }
    return {
      from: dateRange.from < earliestDate ? earliestDate : dateRange.from,
      to: dateRange.to,
    };
  }, [dateRange, earliestDate]);

  // Filter valid asset accounts for the dropdown
  const assetAccounts = useMemo(() => {
    return accounts.filter(acc => acc.type === AccountType.ACCOUNT_TYPE_ASSET && !acc.isGroup);
  }, [accounts]);

  const toggleAccount = (id: string) => {
    setSelectedAccountIds(prev => {
      if (id === 'all') {
        return ['all'];
      } else {
        let newSelection = [...prev];
        if (newSelection.includes('all')) {
          newSelection = newSelection.filter(x => x !== 'all');
        }
        if (newSelection.includes(id)) {
          newSelection = newSelection.filter(x => x !== id);
        } else {
          newSelection.push(id);
        }
        if (newSelection.length === 0) {
          return ['all'];
        }
        return newSelection;
      }
    });
  };

  const startDate = toLocalDateValue(effectiveDateRange.from);
  const endDate = toLocalDateValue(effectiveDateRange.to);
  const { data: trendData, isFetching } = useBalanceTrend(selectedAccountIds, startDate, endDate);

  // Transform backend data for recharts
  const chartData = useMemo(() => {
    if (!trendData?.data || !Array.isArray(trendData.data)) return [];

    const td = trendData.data.map((d: DailyBalance) => {
      let allTotal = new Decimal(0);
      const convertedBalances: Record<string, number> = {};
      const balances = d.balances || {};

      Object.entries(balances).forEach(([id, balance]) => {
        const acc = accounts.find(a => a.id === id);
        let amount = 0;
        try {
          const money = MoneyHelper.from(balance);
          if (money.currency && money.currency !== mainCurrency) return;
          amount = money.toChartNumber();
          if (acc && acc.type === AccountType.ACCOUNT_TYPE_ASSET) {
            allTotal = allTotal.plus(money.toDecimal());
          }
        } catch {
        }
        convertedBalances[id] = amount;
      });

      // Ensure selected accounts always have a numeric value (0 when missing)
      const requiredIds = selectedAccountIds.includes('all')
        ? accounts.filter(a => a.type === AccountType.ACCOUNT_TYPE_ASSET && !a.isGroup).map(a => a.id)
        : selectedAccountIds;

      requiredIds.forEach(id => {
        if (convertedBalances[id] === undefined) convertedBalances[id] = 0;
      });

      return {
        date: d.date,
        ...convertedBalances,
        all: allTotal.toNumber()
      };
    });
    return td;
  }, [trendData, accounts, mainCurrency, selectedAccountIds]);

  const currencySymbol = useMemo(() => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: mainCurrency,
      }).format(0).replace(/\d|\./g, '').trim();
    } catch {
      return mainCurrency === 'CNY' ? '¥' : '$';
    }
  }, [mainCurrency]);

  const formatChartDate = useMemo(() => {
    const language = i18n.resolvedLanguage ?? i18n.language;
    const options: Intl.DateTimeFormatOptions = chartData.length > 370
      ? { year: '2-digit', month: 'short' }
      : { month: 'short', day: 'numeric' };
    const formatter = new Intl.DateTimeFormat(language, options);
    return (value: string) => {
      const [year, month, day] = value.split('-').map(Number);
      return formatter.format(new Date(year, month - 1, day));
    };
  }, [chartData.length, i18n.language, i18n.resolvedLanguage]);

  const formatFullDate = useMemo(() => {
    const language = i18n.resolvedLanguage ?? i18n.language;
    const formatter = new Intl.DateTimeFormat(language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return (value: string) => {
      const [year, month, day] = value.split('-').map(Number);
      return formatter.format(new Date(year, month - 1, day));
    };
  }, [i18n.language, i18n.resolvedLanguage]);

  return (
    <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-sm">
      <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-lg font-bold text-[var(--text-main)]">
          {t('dashboard:balance_trend')}
        </CardTitle>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <TrendDateRangePicker
            value={effectiveDateRange}
            earliestDate={earliestDate}
            latestDate={latestDate}
            onChange={setDateRange}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                {t('dashboard:select_accounts')} <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuCheckboxItem
                checked={selectedAccountIds.includes('all')}
                onCheckedChange={() => toggleAccount('all')}
              >
                {t('dashboard:all_assets')}
              </DropdownMenuCheckboxItem>
              {assetAccounts.map(acc => (
                <DropdownMenuCheckboxItem
                  key={acc.id}
                  checked={selectedAccountIds.includes(acc.id)}
                  onCheckedChange={() => toggleAccount(acc.id)}
                >
                  {acc.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full relative">
          {isFetching && (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-card)]/50 z-10">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 40, bottom: 0 }}>
              <defs>
                {selectedAccountIds.map((id, index) => (
                  <linearGradient key={id} id={`color-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="date"
                stroke="var(--text-muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatChartDate}
                interval="preserveStartEnd"
                minTickGap={32}
              />
              <YAxis
                stroke="var(--text-muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${currencySymbol}${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-main)',
                  borderRadius: '8px'
                }}
                formatter={(value, name) => {
                  const label = name === 'all'
                    ? t('dashboard:all_assets')
                    : accounts.find(a => a.id === name)?.name || name;
                  const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
                  return [`${currencySymbol}${new Decimal(numericValue).toFixed(2)}`, label];
                }}
                labelFormatter={(value) => formatFullDate(String(value))}
              />
              <Legend />
              {selectedAccountIds.map((id, index) => {
                const name = id === 'all'
                  ? t('dashboard:all_assets')
                  : accounts.find(a => a.id === id)?.name || id;

                return (
                  <Area
                    key={id}
                    type="monotone"
                    dataKey={id}
                    name={name}
                    stroke={COLORS[index % COLORS.length]}
                    fillOpacity={1}
                    fill={`url(#color-${id})`}
                    strokeWidth={2}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default BalanceTrendChart;
