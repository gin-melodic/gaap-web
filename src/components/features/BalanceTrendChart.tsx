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
import { EXCHANGE_RATES } from '@/lib/data';
import { ChevronDown, Loader2 } from 'lucide-react';
import { MoneyHelper } from '@/lib/utils/money';
import { DailyBalance } from '@/lib/types';
import { DEFAULT_CURRENCY_CODE } from '@/lib/utils/constant';

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
  const { t } = useTranslation(['dashboard', 'common']);
  const { data: profile } = useProfile();
  const mainCurrency = profile?.user?.mainCurrency || 'CNY';

  const { accounts } = useAllAccounts();
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(['all']);

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

  const { data: trendData, isLoading } = useBalanceTrend(selectedAccountIds);

  // Transform backend data for recharts
  const chartData = useMemo(() => {
    if (!trendData?.data) return [];

    const baseRate = EXCHANGE_RATES[mainCurrency] || 1;

    return trendData.data.map((d: DailyBalance) => {
      let allTotal = 0;
      const convertedBalances: Record<string, number> = {};

      Object.entries(d.balances).forEach(([id, balance]) => {
        const acc = accounts.find(a => a.id === id);
        const accRate = acc ? (EXCHANGE_RATES[acc.balance?.currencyCode || DEFAULT_CURRENCY_CODE] || 1) : 1;
        const amount = MoneyHelper.from(balance).toNumber();
        const converted = amount * (accRate / baseRate);

        convertedBalances[id] = converted;

        if (acc && acc.type === AccountType.ACCOUNT_TYPE_ASSET) {
          allTotal += converted;
        }
      });

      return {
        date: d.date,
        displayDate: d.date.substring(5), // MM-DD
        ...convertedBalances,
        all: allTotal
      };
    });
  }, [trendData, accounts, mainCurrency]);

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

  return (
    <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold text-[var(--text-main)]">
          {t('dashboard:trend_30_days')}
        </CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
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
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full relative">
          {isLoading && (
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
                dataKey="displayDate"
                stroke="var(--text-muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
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
                formatter={(value: number, name: string) => {
                  const label = name === 'all'
                    ? t('dashboard:all_assets')
                    : accounts.find(a => a.id === name)?.name || name;
                  return [`${currencySymbol}${value.toFixed(2)}`, label];
                }}
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
