import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGlobal } from '@/context/GlobalContext';
import { ChevronLeft, Sparkles, CheckCircle2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { UserLevelType } from '@/lib/hooks';

export const CurrencySettings = ({ onBack, onUpgrade }: { onBack: () => void; onUpgrade: () => void }) => {
  const { t } = useTranslation(['settings', 'common']);
  const { user, currencies, addCurrency, deleteCurrency, exchangeRates, exchangeRatesLastUpdated, setExchangeRate, baseCurrency, setBaseCurrency } = useGlobal();
  const [editingCurrency, setEditingCurrency] = useState<string | null>(null);
  const [editRate, setEditRate] = useState('');
  const [newCurrency, setNewCurrency] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCurrency && newCurrency.length === 3) {
      addCurrency(newCurrency.toUpperCase());
      setNewCurrency('');
    }
  };

  // Fetch rates for Pro users
  useEffect(() => {
    if (user.plan === UserLevelType.USER_LEVEL_TYPE_PRO && baseCurrency) {
      const fetchRates = async () => {
        setIsRefreshing(true);
        try {
          const response = await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${baseCurrency.toLowerCase()}.json`);
          if (!response.ok) throw new Error('Failed to fetch rates');
          const data = await response.json();
          const rates = data[baseCurrency.toLowerCase()];

          // Update rates for all existing currencies
          currencies.forEach(curr => {
            if (curr !== baseCurrency && rates[curr.toLowerCase()]) {
              setExchangeRate(curr, rates[curr.toLowerCase()]);
            }
          });
          setExchangeRate(baseCurrency, 1);
          toast.success(t('settings:rates_synced'));
        } catch (error) {
          console.error('Failed to fetch rates:', error);
          toast.error(t('settings:sync_failed'));
        } finally {
          setIsRefreshing(false);
        }
      };

      fetchRates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseCurrency, user.plan, currencies.length]);

  const handleSaveRate = (currency: string) => {
    const rate = parseFloat(editRate);
    if (!isNaN(rate) && rate > 0) {
      setExchangeRate(currency, rate);
      setEditingCurrency(null);
      setEditRate('');
    } else {
      toast.error(t('settings:invalid_rate'));
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
            <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full font-medium">
              <Sparkles size={12} />
              {isRefreshing ? t('settings:syncing') : t('settings:realtime_rates_active')}
            </div>
          )}
          {user.plan === UserLevelType.USER_LEVEL_TYPE_PRO && exchangeRatesLastUpdated && (
            <div className="text-xs text-[var(--text-muted)]">
              {t('settings:last_updated', { time: new Date(exchangeRatesLastUpdated).toLocaleString() })}
            </div>
          )}
          {user.plan === UserLevelType.USER_LEVEL_TYPE_FREE && (
            <Button
              onClick={onUpgrade}
              variant="outline"
              className="flex items-center gap-2 text-xs border-amber-300 text-amber-600 hover:bg-amber-50 px-3 py-1.5 h-auto"
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
              {currencies.map(curr => (
                <Button
                  key={curr}
                  variant={baseCurrency === curr ? "default" : "outline"}
                  onClick={() => setBaseCurrency(curr)}
                  className={`h-9 ${baseCurrency === curr ? 'bg-[var(--primary)] text-white' : 'border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--bg-main)]'}`}
                >
                  {curr} {baseCurrency === curr && <CheckCircle2 size={14} className="ml-1" />}
                </Button>
              ))}
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
              <p className="text-sm text-[var(--text-muted)] mb-4">{t('settings:exchange_rates_desc')}</p>

              <form onSubmit={handleAdd} className="flex gap-2 mb-6">
                <Input
                  type="text"
                  maxLength={3}
                  placeholder={t('settings:currency_placeholder')}
                  className="flex-1 uppercase bg-[var(--bg-main)] text-[var(--text-main)] border-[var(--border)]"
                  value={newCurrency}
                  onChange={e => setNewCurrency(e.target.value)}
                />
                <Button type="submit" disabled={newCurrency.length !== 3} className="bg-[var(--primary)] text-white hover:opacity-90">{t('common:add')}</Button>
              </form>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {currencies.map(curr => (
                <div key={curr} className="p-4 flex items-center justify-between hover:bg-[var(--bg-main)] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] font-bold text-xs">
                      {curr}
                    </div>
                    <div>
                      <div className="font-bold text-[var(--text-main)]">{curr}</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {curr === baseCurrency ? 'Base' : `1 ${baseCurrency} ≈ ${(exchangeRates[curr] || 0).toFixed(4)} ${curr}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {editingCurrency === curr ? (
                      <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                        <Input
                          type="number"
                          value={editRate}
                          onChange={(e) => setEditRate(e.target.value)}
                          className="w-24 h-8 text-sm bg-[var(--bg-card)]"
                          autoFocus
                          placeholder="Rate"
                        />
                        <Button size="sm" onClick={() => handleSaveRate(curr)} className="h-8 w-8 p-0 bg-green-500 hover:bg-green-600 text-white"><Check size={14} /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingCurrency(null)} className="h-8 w-8 p-0"><X size={14} /></Button>
                      </div>
                    ) : (
                      <>
                        {curr !== baseCurrency && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingCurrency(curr);
                              setEditRate(exchangeRates[curr]?.toString() || '');
                            }}
                            className="h-8 w-8 p-0 text-[var(--text-muted)] hover:text-[var(--primary)]"
                          >
                            <div className="w-4 h-4"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg></div>
                          </Button>
                        )}
                        {curr !== 'CNY' && curr !== 'USD' && curr !== baseCurrency && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCurrency(curr)}
                            className="h-8 w-8 p-0 text-[var(--text-muted)] hover:text-red-500"
                          >
                            <div className="w-4 h-4"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></div>
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
