'use client';

import { useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import apiRequest, { ApiError } from '@/lib/api';
import { sha256 } from '@/lib/utils';

export default function RegisterPage() {
  const { t } = useTranslation(['auth', 'common', 'settings']);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) {
      toast.error(t('auth:captcha_required'));
      return;
    }
    setLoading(true);

    try {
      const hashedPassword = await sha256(password);
      await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: hashedPassword,
          nickname,
          cf_turnstile_response: turnstileToken
        })
      });

      toast.success(t('auth:register_success'));
      router.push('/login');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error(t('auth:unknown_error'));
      }
    } finally {
      setLoading(false);
    }
  };

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
