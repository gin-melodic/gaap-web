'use client';

import React, { useMemo } from 'react';
import { useAllAccountsSuspense, AccountType, useAllTransactions, useProfile } from '@/lib/hooks';
import { useTranslation } from 'react-i18next';
import { EXCHANGE_RATES } from '@/lib/data';
import { TransactionType } from '@/lib/types';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import BalanceTrendChart from './BalanceTrendChart';

const Dashboard = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { data: profile } = useProfile();
  const mainCurrency = profile?.user?.mainCurrency || 'CNY';

  const { accounts } = useAllAccountsSuspense();

  const formatCurrency = (amount: number, currency = mainCurrency) => {
    try {
      const locale = currency === 'CNY' ? 'zh-CN' : 'en-US';
      return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
    } catch (e) {
      return `${currency} ${amount.toFixed(2)}`;
    }
  };

  const summary = useMemo(() => {
    let assets = 0;
    let liabilities = 0;

    // Find rates relative to mainCurrency
    const baseRate = EXCHANGE_RATES[mainCurrency] || 1;

    accounts.forEach(acc => {
      if (acc.isGroup) return;

      const accRate = EXCHANGE_RATES[acc.currency] || 1;
      const convertedBalance = acc.balance * (accRate / baseRate);

      if (acc.type === AccountType.ASSET) assets += convertedBalance;
      if (acc.type === AccountType.LIABILITY) liabilities += convertedBalance;
    });
    return { assets, liabilities, netWorth: assets - liabilities };
  }, [accounts, mainCurrency]);


  const { transactions } = useAllTransactions();

  const monthlyStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM

    let income = 0;
    let expense = 0;

    const baseRate = EXCHANGE_RATES[mainCurrency] || 1;

    transactions.forEach(tx => {
      // Check if transaction is in current month
      // Note: we're using string comparison which is safe for ISO format
      if (!tx.date.startsWith(currentMonth)) return;

      const txRate = EXCHANGE_RATES[tx.currency] || 1;
      const amount = tx.amount * (txRate / baseRate);

      if (tx.type === TransactionType.INCOME) income += amount;
      if (tx.type === TransactionType.EXPENSE) expense += amount;
    });

    return { income, expense };
  }, [transactions, mainCurrency]);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[var(--primary)] text-white shadow-lg shadow-indigo-200/50 border-none">
          <CardContent className="p-6">
            <div className="opacity-80 text-sm font-medium mb-1">{t('dashboard:net_worth', { currency: mainCurrency })}</div>
            <div className="text-3xl font-bold">{formatCurrency(summary.netWorth)}</div>
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[var(--text-muted)] text-sm font-medium">{t('dashboard:total_assets')}</div>
              <div className="p-2 bg-emerald-50 rounded-lg"><TrendingUp className="w-4 h-4 text-emerald-600" /></div>
            </div>
            <div className="text-2xl font-bold text-[var(--text-main)]">{formatCurrency(summary.assets)}</div>
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[var(--text-muted)] text-sm font-medium">{t('dashboard:total_liabilities')}</div>
              <div className="p-2 bg-red-50 rounded-lg"><TrendingDown className="w-4 h-4 text-red-600" /></div>
            </div>
            <div className="text-2xl font-bold text-[var(--text-main)]">{formatCurrency(summary.liabilities)}</div>
          </CardContent>
        </Card>
      </div>

      <BalanceTrendChart />

      <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-sm">
        <CardContent className="p-5">
          <h3 className="text-[var(--text-main)] font-bold mb-4">{t('dashboard:monthly_overview', { currency: mainCurrency })}</h3>
          <div className="space-y-4">
            {(() => {
              const maxAmount = Math.max(monthlyStats.income, monthlyStats.expense);
              const incomePercent = maxAmount > 0 ? (monthlyStats.income / maxAmount) * 100 : 0;
              const expensePercent = maxAmount > 0 ? (monthlyStats.expense / maxAmount) * 100 : 0;
              return (
                <>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--text-muted)]">{t('dashboard:income')}</span>
                      <span className="font-medium text-[var(--text-main)]">{formatCurrency(monthlyStats.income)}</span>
                    </div>
                    <div className="h-2 bg-[var(--bg-main)] rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${incomePercent}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--text-muted)]">{t('dashboard:expense')}</span>
                      <span className="font-medium text-[var(--text-main)]">{formatCurrency(monthlyStats.expense)}</span>
                    </div>
                    <div className="h-2 bg-[var(--bg-main)] rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full transition-all duration-300" style={{ width: `${expensePercent}%` }}></div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
