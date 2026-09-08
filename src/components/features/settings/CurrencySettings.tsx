import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGlobal } from '@/context/GlobalContext';
import { ChevronLeft, Sparkles, CheckCircle2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { UserLevelType, authKeys } from '@/lib/hooks';
import { useQueryClient } from '@tanstack/react-query';
import {
  useSupportedCurrencies,
  useExchangeRates,
  useSetExchangeRate,
  useAddCurrency,
  useDeleteCurrency,
} from '@/lib/hooks';

import { secureAuthService } from '@/lib/services/secureAuthService';

export const CurrencySettings = ({ onBack, onUpgrade }: { onBack: () => void; onUpgrade: () => void }) => {
  const { t } = useTranslation(['settings', 'common']);
  const { user, baseCurrency, setBaseCurrency } = useGlobal();
  const currencies = useSupportedCurrencies();
  const { anchor, rateMap } = useExchangeRates();
  const addCurrencyMutation = useAddCurrency();
  const deleteCurrencyMutation = useDeleteCurrency();
  const setExchangeRateMutation = useSetExchangeRate();

  const [editingCurrency, setEditingCurrency] = useState<string | null>(null);
  const [confirmingBase, setConfirmingBase] = useState<string | null>(null);
  const [editRate, setEditRate] = useState('');
  const [newCurrency, setNewCurrency] = useState('');
  const [isUpdatingBase, setIsUpdatingBase] = useState(false);
  const queryClient = useQueryClient();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = newCurrency.trim().toUpperCase();
    if (code.length !== 3) return;
    try {
      await addCurrencyMutation.mutateAsync(code);
      setNewCurrency('');
      toast.success(t('settings:rates_synced'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settings:sync_failed'));
    }
  };

  const handleSetBaseCurrency = async (currency: string) => {
    if (confirmingBase === currency) {
      setIsUpdatingBase(true);
      try {
        await secureAuthService.updateProfile({
          nickname: user.nickname,
          plan: user.plan,
          avatar: user.avatar || undefined,
          mainCurrency: currency
        });
        setBaseCurrency(currency);
        queryClient.invalidateQueries({ queryKey: authKeys.profile });
        setConfirmingBase(null);
        toast.success(t('settings:base_currency_updated'));
      } catch (error) {
        console.error('Failed to update base currency:', error);
        toast.error(t('settings:update_failed'));
      } finally {
        setIsUpdatingBase(false);
      }
    } else {
      setConfirmingBase(currency);
      setTimeout(() => setConfirmingBase(prev => prev === currency ? null : prev), 3000);
    }
  };

  const handleSaveRate = async (currency: string) => {
    const rate = editRate.trim();
    if (!rate || Number.isNaN(Number(rate)) || Number(rate) <= 0) {
      toast.error(t('settings:invalid_rate'));
      return;
    }
    try {
      await setExchangeRateMutation.mutateAsync({ currency, rate });
      setEditingCurrency(null);
      setEditRate('');
      toast.success(t('settings:rates_synced'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settings:sync_failed'));
    }
  };

  const handleDelete = async (currency: string) => {
    try {
      await deleteCurrencyMutation.mutateAsync(currency);
      toast.success(t('settings:rates_synced'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settings:sync_failed'));
    }
  };

  return (
    <div className="animate-in slide-in-from-right duration-300">
      <div className="flex items-center gap-2 mb-6 cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-main)]" onClick={onBack}>
        <ChevronLeft size={20} />
        <span className="text-sm font-medium">{t('common:back_to_settings')}</span>
      </div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[var(--text-main)]">{t('settings:currency_management')}</h2>
        <div className="flex flex-col items-end gap-1">
          {user.plan === UserLevelType.USER_LEVEL_TYPE_PRO && (
            <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-3 py-1.5 rounded-full font-medium">
              <Sparkles size={12} />
              {t('settings:realtime_rates_active')}
            </div>
          )}
          {user.plan === UserLevelType.USER_LEVEL_TYPE_FREE && (
            <Button
              onClick={onUpgrade}
              variant="outline"
              className="flex items-center gap-2 text-xs border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/40 px-3 py-1.5 h-auto"
            >
              <Sparkles size={12} />
              {t('settings:upgrade_for_auto_sync')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">{t('settings:base_currency')}</h3>
            <div className="flex flex-wrap gap-2">
              {currencies.map(curr => {
                const isSelected = baseCurrency === curr;
                const isConfirming = confirmingBase === curr;

                return (
                  <Button
                    key={curr}
                    variant="outline"
                    onClick={() => handleSetBaseCurrency(curr)}
                    disabled={isUpdatingBase || (isSelected && !isConfirming)}
                    className={`h-9 relative transition-all duration-200 ${isSelected
                      ? 'bg-[var(--primary)] text-white'
                      : isConfirming
                        ? 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200'
                        : 'border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--bg-main)]'
                      }`}
                  >
                    {isConfirming ? (
                      <span className="flex items-center animate-in fade-in zoom-in duration-200">
                        {t('common:confirm')}
                      </span>
                    ) : (
                      <>
                        {curr} {isSelected && <CheckCircle2 size={14} className="ml-1" />}
                      </>
                    )}
                  </Button>
                )
              })}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-3">
              {t('settings:base_currency_desc')}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-sm">
          <CardContent className="p-0">
            <div className="p-6 border-b border-[var(--border)]">
              <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">{t('settings:exchange_rates')}</h3>
              <p className="text-sm text-[var(--text-muted)] mb-4">
                {t('settings:exchange_rates_desc', { anchor })}
              </p>

              <form onSubmit={handleAdd} className="flex gap-2 mb-6">
                <Input
                  type="text"
                  maxLength={3}
                  placeholder={t('settings:currency_placeholder')}
                  className="flex-1 uppercase bg-[var(--bg-main)] text-[var(--text-main)] border-[var(--border)]"
                  value={newCurrency}
                  onChange={e => setNewCurrency(e.target.value)}
                />
                <Button type="submit" disabled={newCurrency.trim().length !== 3 || addCurrencyMutation.isPending} className="bg-[var(--primary)] text-white hover:opacity-90">{t('common:add')}</Button>
              </form>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {currencies.map(curr => {
                const rate = rateMap[curr];
                return (
                  <div key={curr} className="p-4 flex items-center justify-between hover:bg-[var(--bg-main)] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] font-bold text-xs">
                        {curr}
                      </div>
                      <div>
                        <div className="font-bold text-[var(--text-main)]">{curr}</div>
                        <div className="text-xs text-[var(--text-muted)]">
                          {curr === anchor
                            ? 'Base'
                            : (rate ? `1 ${anchor} ≈ ${rate} ${curr}` : t('settings:missing_rate'))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingCurrency === curr ? (
                        <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                          <Input
                            type="number"
                            step="any"
                            value={editRate}
                            onChange={(e) => setEditRate(e.target.value)}
                            className="w-24 h-8 text-sm bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border)]"
                            autoFocus
                            placeholder="Rate"
                          />
                          <Button size="sm" onClick={() => handleSaveRate(curr)} disabled={setExchangeRateMutation.isPending} className="h-8 w-8 p-0 bg-green-500 hover:bg-green-600 text-white"><Check size={14} /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingCurrency(null)} className="h-8 w-8 p-0"><X size={14} /></Button>
                        </div>
                      ) : (
                        <>
                          {curr !== anchor && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingCurrency(curr);
                                setEditRate(rate ?? '');
                              }}
                              className="h-8 w-8 p-0 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--bg-main)]"
                            >
                              <div className="w-4 h-4"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg></div>
                            </Button>
                          )}
                          {curr !== 'CNY' && curr !== 'USD' && curr !== baseCurrency && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(curr)}
                              disabled={deleteCurrencyMutation.isPending}
                              className="h-8 w-8 p-0 text-[var(--text-muted)] hover:text-red-500 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40"
                            >
                              <div className="w-4 h-4"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></div>
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
