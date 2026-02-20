'use client';

import { useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useGlobal } from '@/context/GlobalContext';

import { sha256 } from '@/lib/utils';

import { useRegister } from '@/lib/hooks';

export default function RegisterPage() {
  const { t } = useTranslation(['auth', 'common', 'settings']);
  const router = useRouter();
  const { login: contextLogin, currencies } = useGlobal();
  const registerMutation = useRegister();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [mainCurrency, setMainCurrency] = useState(currencies[0] || 'USD');
  const effectiveMainCurrency = currencies.includes(mainCurrency) ? mainCurrency : (currencies[0] || 'USD');

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
        mainCurrency: effectiveMainCurrency,
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('auth:register_title')}</h1>
          <p className="text-slate-500 dark:text-slate-300 mt-2">{t('auth:register_subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nickname" className="text-slate-700 dark:text-slate-200">{t('settings:nickname')}</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              placeholder={t('settings:nickname')}
              className="placeholder:text-slate-400 dark:placeholder:text-slate-400 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-700 dark:text-slate-200">{t('common:email')}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@example.com"
              className="placeholder:text-slate-400 dark:placeholder:text-slate-400 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mainCurrency" className="text-slate-700 dark:text-slate-200">{t('common:currency')}</Label>
            <Select value={effectiveMainCurrency} onValueChange={setMainCurrency}>
              <SelectTrigger id="mainCurrency" className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder={t('common:currency')} />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-700 dark:text-slate-200">{t('common:password')}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={8}
              className="placeholder:text-slate-400 dark:placeholder:text-slate-400 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-200">{t('auth:confirm_password')}</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={8}
              className="placeholder:text-slate-400 dark:placeholder:text-slate-400 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
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

        <div className="text-center text-sm text-slate-500 dark:text-slate-300">
          {t('auth:have_account')}
          <a href="/login" className="text-indigo-600 font-bold hover:underline ml-1">
            {t('auth:login_directly')}
          </a>
        </div>
      </div>
    </div>
  );
}
