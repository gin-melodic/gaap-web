'use client';

import { useState, useEffect } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useGlobal } from '@/context/GlobalContext';

import { sha256 } from '@/lib/utils';

import { useRegister, useCurrencyList } from '@/lib/hooks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function RegisterPage() {
  const { t } = useTranslation(['auth', 'common', 'settings']);
  const router = useRouter();
  const { login: contextLogin } = useGlobal();
  const registerMutation = useRegister();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [mainCurrency, setMainCurrency] = useState('');

  const { data: currencyData, isLoading: isLoadingCurrencies } = useCurrencyList();

  useEffect(() => {
    if (currencyData?.currencies) {
      // eslint-disable-next-line
      setMainCurrency((prev) => {
        if (prev) return prev; // Only set once
        let defaultCurrency = 'USD';
        if (typeof navigator !== 'undefined') {
          const lang = navigator.language.toLowerCase();
          if (lang.startsWith('zh-cn')) defaultCurrency = 'CNY';
          else if (lang.startsWith('zh')) defaultCurrency = 'HKD';
          else if (lang.startsWith('ja')) defaultCurrency = 'JPY';
          else if (lang.startsWith('en-gb')) defaultCurrency = 'GBP';
          else if (['de', 'fr', 'es', 'it', 'nl'].some(l => lang.startsWith(l))) defaultCurrency = 'EUR';

          const exists = currencyData.currencies.some((c: { code: string }) => c.code === defaultCurrency);
          if (!exists) defaultCurrency = 'USD';
        }
        return defaultCurrency;
      });
    }
  }, [currencyData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) {
      toast.error(t('auth:captcha_required'));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t('auth:password_mismatch'));
      return;
    }

    try {
      const hashedPassword = await sha256(password);
      const data = await registerMutation.mutateAsync({
        email,
        password: hashedPassword,
        nickname,
        cfTurnstileResponse: turnstileToken,
        mainCurrency: mainCurrency || 'USD',
      });

      // Registration with auto-login successful - update global context with user data
      if (data && data.auth && data.auth.user) {
        contextLogin({
          email: data.auth.user.email,
          nickname: data.auth.user.nickname,
          avatar: data.auth.user.avatar,
          plan: data.auth.user.plan
        });
      }

      router.push('/dashboard');
    } catch {
      // Error handled by hook
      toast.error(t('auth:register_failed'), { duration: 4000 });
    }
  };

  const loading = registerMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">{t('auth:register_title')}</h1>
          <p className="text-slate-500 mt-2">{t('auth:register_subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nickname">{t('settings:nickname')}</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              placeholder={t('settings:nickname')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mainCurrency">{t('auth:main_currency')}</Label>
            <Select
              value={mainCurrency}
              onValueChange={setMainCurrency}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingCurrencies ? t('common:loading') : t('auth:main_currency_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {currencyData?.currencies?.map((currency: { code: string }) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('common:email')}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('common:password')}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={8}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('auth:confirm_password')}</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={8}
            />
          </div>

          <div className="flex justify-center py-2">
            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
              onSuccess={(token) => setTurnstileToken(token)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('auth:registering') : t('auth:register_free')}
          </Button>
        </form>

        <div className="text-center text-sm text-slate-500">
          {t('auth:have_account')}
          <a href="/login" className="text-indigo-600 font-bold hover:underline ml-1">
            {t('auth:login_directly')}
          </a>
        </div>
      </div>
    </div>
  );
}
