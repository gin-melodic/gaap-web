'use client';

import React, { useMemo } from 'react';
import { useAllAccountsSuspense, AccountType, useAllTransactions, useProfile, useExchangeRates } from '@/lib/hooks';
import { useTranslation } from 'react-i18next';
import { TransactionType } from '@/lib/types';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import BalanceTrendChart from './BalanceTrendChart';
import { MoneyHelper, convertAmount } from '@/lib/utils/money';
import Decimal from 'decimal.js';
import { resolveDisplayCurrency } from '@/lib/utils/display-currency';

type DecimalValue = InstanceType<typeof Decimal>;

/** Sum per-currency buckets into a single target currency, recording any
 *  currency that lacks a rate. Financial math stays in Decimal (never floats). */
function sumConverted(
  buckets: Record<string, DecimalValue>,
  target: string,
  rateMap: Record<string, string>,
  missing: Set<string>,
): DecimalValue {
  let total = new Decimal(0);
  for (const [currency, amount] of Object.entries(buckets)) {
    const converted = convertAmount(amount, currency, target, rateMap);
    if (converted === null) {
      missing.add(currency);
      continue;
    }
    total = total.plus(converted);
  }
  return total;
}

const Dashboard = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { data: profile } = useProfile();

  const { accounts } = useAllAccountsSuspense();
  const { transactions } = useAllTransactions();
  const { rateMap } = useExchangeRates();
  const mainCurrency = resolveDisplayCurrency(
    profile?.user?.mainCurrency,
    accounts.map((account) => account.balance ?? {}),
    transactions.map((transaction) => transaction.amount ?? {}),
  );

  const summary = useMemo(() => {
    const assetBuckets: Record<string, DecimalValue> = {};
    const liabilityBuckets: Record<string, DecimalValue> = {};
    const missing = new Set<string>();

    accounts.forEach(acc => {
      if (acc.isGroup) return;
      const money = MoneyHelper.from(acc.balance);
      const currency = (money.currency || mainCurrency).toUpperCase();
      const target = acc.type === AccountType.ACCOUNT_TYPE_ASSET
        ? assetBuckets
        : acc.type === AccountType.ACCOUNT_TYPE_LIABILITY
          ? liabilityBuckets
          : null;
      if (!target) return;
      target[currency] = (target[currency] ?? new Decimal(0)).plus(money.toDecimal());
    });

    const assets = sumConverted(assetBuckets, mainCurrency, rateMap, missing);
    const liabilities = sumConverted(liabilityBuckets, mainCurrency, rateMap, missing);
    return {
      assets: new MoneyHelper(assets, mainCurrency),
      liabilities: new MoneyHelper(liabilities, mainCurrency),
      netWorth: new MoneyHelper(assets.minus(liabilities), mainCurrency),
      missing: Array.from(missing).sort(),
    };
  }, [accounts, mainCurrency, rateMap]);

  const monthlyStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM

    const incomeBuckets: Record<string, DecimalValue> = {};
    const expenseBuckets: Record<string, DecimalValue> = {};
    const missing = new Set<string>();

    transactions.forEach(tx => {
      if (!tx.date.startsWith(currentMonth)) return;

      const money = MoneyHelper.from(tx.amount);
      const currency = (money.currency || mainCurrency).toUpperCase();
      const target = tx.type === TransactionType.TRANSACTION_TYPE_INCOME
        ? incomeBuckets
        : tx.type === TransactionType.TRANSACTION_TYPE_EXPENSE
          ? expenseBuckets
          : null;
      if (!target) return;
      target[currency] = (target[currency] ?? new Decimal(0)).plus(money.toDecimal());
    });

    const income = sumConverted(incomeBuckets, mainCurrency, rateMap, missing);
    const expense = sumConverted(expenseBuckets, mainCurrency, rateMap, missing);
    return {
      income: new MoneyHelper(income, mainCurrency),
      expense: new MoneyHelper(expense, mainCurrency),
      missing: Array.from(missing).sort(),
    };
  }, [transactions, mainCurrency, rateMap]);

  const allMissing = useMemo(
    () => Array.from(new Set([...summary.missing, ...monthlyStats.missing])).sort(),
    [summary.missing, monthlyStats.missing],
  );

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {allMissing.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          {t('dashboard:missing_rates', { currencies: allMissing.join(', ') })}
        </div>
      )}

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
