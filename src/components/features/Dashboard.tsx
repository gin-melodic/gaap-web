'use client';

import React, { useMemo } from 'react';
import { useAllAccountsSuspense, AccountType, useAllTransactions, useProfile } from '@/lib/hooks';
import { useTranslation } from 'react-i18next';
import { TransactionType } from '@/lib/types';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import BalanceTrendChart from './BalanceTrendChart';
import { MoneyHelper } from '@/lib/utils/money';
import Decimal from 'decimal.js';
import { resolveDisplayCurrency } from '@/lib/utils/display-currency';

const Dashboard = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { data: profile } = useProfile();

  const { accounts } = useAllAccountsSuspense();
  const { transactions } = useAllTransactions();
  const mainCurrency = resolveDisplayCurrency(
    profile?.user?.mainCurrency,
    accounts.map((account) => account.balance ?? {}),
    transactions.map((transaction) => transaction.amount ?? {}),
  );

  const summary = useMemo(() => {
    let assets = MoneyHelper.fromAmount('0', mainCurrency);
    let liabilities = MoneyHelper.fromAmount('0', mainCurrency);

    accounts.forEach(acc => {
      if (acc.isGroup) return;

      const balance = MoneyHelper.from(acc.balance);
      if (acc.type === AccountType.ACCOUNT_TYPE_ASSET) assets = assets.add(balance);
      if (acc.type === AccountType.ACCOUNT_TYPE_LIABILITY) liabilities = liabilities.add(balance);
    });
    return { assets, liabilities, netWorth: assets.sub(liabilities) };
  }, [accounts, mainCurrency]);


  const monthlyStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM

    let income = MoneyHelper.fromAmount('0', mainCurrency);
    let expense = MoneyHelper.fromAmount('0', mainCurrency);

    transactions.forEach(tx => {
      // Check if transaction is in current month
      // Note: we're using string comparison which is safe for ISO format
      if (!tx.date.startsWith(currentMonth)) return;

      const amount = MoneyHelper.from(tx.amount);

      if (tx.type === TransactionType.TRANSACTION_TYPE_INCOME) income = income.add(amount);
      if (tx.type === TransactionType.TRANSACTION_TYPE_EXPENSE) expense = expense.add(amount);
    });

    return { income, expense };
  }, [transactions, mainCurrency]);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[var(--primary)] text-white shadow-lg shadow-indigo-200/50 border-none">
          <CardContent className="p-6">
            <div className="opacity-80 text-sm font-medium mb-1">{t('dashboard:net_worth', { currency: mainCurrency })}</div>
            <div className="text-3xl font-bold">{summary.netWorth.formatCurrency()}</div>
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[var(--text-muted)] text-sm font-medium">{t('dashboard:total_assets')}</div>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg"><TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-300" /></div>
            </div>
            <div className="text-2xl font-bold text-[var(--text-main)]">{summary.assets.formatCurrency()}</div>
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[var(--text-muted)] text-sm font-medium">{t('dashboard:total_liabilities')}</div>
              <div className="p-2 bg-red-50 dark:bg-red-950/40 rounded-lg"><TrendingDown className="w-4 h-4 text-red-600 dark:text-red-300" /></div>
            </div>
            <div className="text-2xl font-bold text-[var(--text-main)]">{summary.liabilities.formatCurrency()}</div>
          </CardContent>
        </Card>
      </div>

      <BalanceTrendChart />

      <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-sm">
        <CardContent className="p-5">
          <h3 className="text-[var(--text-main)] font-bold mb-4">{t('dashboard:monthly_overview', { currency: mainCurrency })}</h3>
          <div className="space-y-4">
            {(() => {
              const maxAmount = Decimal.max(monthlyStats.income.toDecimal(), monthlyStats.expense.toDecimal());
              const incomePercent = maxAmount.gt(0) ? monthlyStats.income.toDecimal().div(maxAmount).times(100).toFixed(4) : '0';
              const expensePercent = maxAmount.gt(0) ? monthlyStats.expense.toDecimal().div(maxAmount).times(100).toFixed(4) : '0';
              return (
                <>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--text-muted)]">{t('dashboard:income')}</span>
                      <span className="font-medium text-[var(--text-main)]">{monthlyStats.income.formatCurrency()}</span>
                    </div>
                    <div className="h-2 bg-[var(--bg-main)] rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${incomePercent}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--text-muted)]">{t('dashboard:expense')}</span>
                      <span className="font-medium text-[var(--text-main)]">{monthlyStats.expense.formatCurrency()}</span>
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
