'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobal } from '@/context/GlobalContext';
import { useDemoLogin, useLogin } from '@/lib/hooks';
import { useTranslation } from 'react-i18next';
import { Turnstile } from '@marsidev/react-turnstile';
import {
  Wallet,
  CheckCircle2,
  Mail,
  Lock,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LanguageSwitcher } from '@/components/features/LanguageSwitcher';
import { toast } from 'sonner';
import Link from 'next/link';
import { classifyLoginError } from '@/lib/utils/login-error';
import type { LoginRes } from '@/lib/services/secureAuthService';

const LoginPage = () => {
  const { t } = useTranslation(['common', 'auth']);
  const { login: contextLogin, isLoggedIn } = useGlobal();
  const loginMutation = useLogin();
  const demoLoginMutation = useDemoLogin();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState(1); // 1: Email/Password, 2: 2FA Code
  const [turnstileToken, setTurnstileToken] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (isLoggedIn) {
      router.push('/dashboard');
    }
  }, [isLoggedIn, router]);

  const completeLogin = (data: LoginRes) => {
    if (!data?.auth?.user) {
      throw new Error('Invalid response format');
    }

    contextLogin({
      email: data.auth.user.email,
      nickname: data.auth.user.nickname,
      avatar: data.auth.user.avatar,
      plan: data.auth.user.plan,
      mainCurrency: data.auth.user.mainCurrency
    });
    toast.success(t('auth:login_success'), { duration: 4000 });
    router.push('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (step === 1 && !turnstileToken) {
      toast.error(t('auth:captcha_required'));
      return;
    }

    try {
      const data = await loginMutation.mutateAsync({
        email,
        password,
        code: step === 2 ? code : '',
        cfTurnstileResponse: turnstileToken
      });

      completeLogin(data);
    } catch (err: unknown) {
      const errorKind = classifyLoginError(err);

      if (errorKind === 'two-factor-required') {
        setStep(2);
        toast.info(t('auth:enter_2fa_code'), { duration: 4000 });
        return;
      }

      const message = errorKind === 'invalid-credentials'
        ? t('auth:invalid_email_or_password')
        : t('auth:login_failed');
      setFormError(message);
      toast.error(message, { duration: 4000 });
    }
  };

  const handleDemoLogin = async () => {
    try {
      const data = await demoLoginMutation.mutateAsync();
      completeLogin(data);
    } catch {
      toast.error(t('auth:demo_login_failed'), { duration: 4000 });
    }
  };

  const loading = loginMutation.isPending;
  const demoLoading = demoLoginMutation.isPending;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Left Side: Marketing Display Area (Desktop) */}
      <div className="hidden lg:flex lg:w-1/4 bg-indigo-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-900 to-purple-900 opacity-90 z-0"></div>
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center border border-white/20">
              <Wallet className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight">GAAP Cloud</span>
          </div>

          <h1 className="text-5xl font-bold leading-tight mb-6" dangerouslySetInnerHTML={{ __html: t('auth:marketing_title') }}>
          </h1>
          <p className="text-indigo-200 text-lg mb-8 max-w-md">
            {t('auth:marketing_subtitle')}
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-1 bg-green-500/20 rounded-full text-green-400"><CheckCircle2 size={18} /></div>
              <span>{t('auth:feature_1')}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-1 bg-green-500/20 rounded-full text-green-400"><CheckCircle2 size={18} /></div>
              <span>{t('auth:feature_2')}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-1 bg-green-500/20 rounded-full text-green-400"><CheckCircle2 size={18} /></div>
              <span>{t('auth:feature_3')}</span>
            </div>
          </div>
        </div>

        {/* <div className="relative z-10 bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 mt-12">
          <div className="flex items-center gap-2 text-amber-300 font-bold mb-2">
            <Sparkles size={20} />
            <span>{t('auth:saas_promo')}</span>
          </div>
          <p className="text-sm text-indigo-100">
            <Trans i18nKey="auth:saas_desc" components={{ 1: <strong /> }} />
          </p>
        </div> */}

        <div className="relative z-10 text-xs text-indigo-400 mt-6">
          {t('auth:copyright')}
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-3/4 flex items-center justify-center p-4 lg:p-8 bg-white dark:bg-slate-900 relative">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                <Wallet className="text-white w-6 h-6" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {t('auth:welcome')}
            </h2>
            <p className="mt-2 text-slate-500 dark:text-slate-300">
              {t('auth:login_description')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 dark:text-slate-200">{t('common:email')}</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Mail size={18} />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      required
                      aria-invalid={Boolean(formError)}
                      placeholder="name@company.com"
                      className={`pl-10 py-6 rounded-xl placeholder:text-slate-400 dark:placeholder:text-slate-400 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 ${formError ? 'border-red-500 ring-2 ring-red-500/30 focus-visible:border-red-500 focus-visible:ring-red-500/40 dark:border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                      value={email}
                      onChange={e => {
                        setEmail(e.target.value);
                        setFormError('');
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700 dark:text-slate-200">{t('common:password')}</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Lock size={18} />
                    </div>
                    <Input
                      id="password"
                      type="password"
                      required
                      aria-invalid={Boolean(formError)}
                      placeholder="••••••••"
                      className={`pl-10 py-6 rounded-xl placeholder:text-slate-400 dark:placeholder:text-slate-400 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 ${formError ? 'border-red-500 ring-2 ring-red-500/30 focus-visible:border-red-500 focus-visible:ring-red-500/40 dark:border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                      value={password}
                      onChange={e => {
                        setPassword(e.target.value);
                        setFormError('');
                      }}
                    />
                  </div>
                </div>

                <div className="flex justify-center py-2">
                  <Turnstile
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                    onSuccess={(token) => setTurnstileToken(token)}
                    options={{ theme: 'auto' }}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2 animate-in fade-in slide-in-from-right duration-300">
                <Label htmlFor="code" className="text-slate-700 dark:text-slate-200">{t('auth:enter_2fa_code')}</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <ShieldCheck size={18} />
                  </div>
                  <Input
                    id="code"
                    type="text"
                    required
                    aria-invalid={Boolean(formError)}
                    placeholder="••••••"
                    className={`pl-10 py-6 rounded-xl tracking-widest text-center text-lg placeholder:text-slate-400 dark:placeholder:text-slate-400 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 ${formError ? 'border-red-500 ring-2 ring-red-500/30 focus-visible:border-red-500 focus-visible:ring-red-500/40 dark:border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                    value={code}
                    onChange={e => {
                      setCode(e.target.value);
                      setFormError('');
                    }}
                    maxLength={6}
                    autoFocus
                  />
                </div>
                <Button
                  type="button"
                  variant="link"
                  className="text-sm text-slate-500 dark:text-slate-300"
                  onClick={() => setStep(1)}
                >
                  {t('auth:back_to_login')}
                </Button>
              </div>
            )}

            <Button type="submit" disabled={loading || demoLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 rounded-xl font-bold shadow-lg shadow-indigo-200">
              {loading ? t('auth:logging_in') : (step === 1 ? t('auth:sign_in') : t('auth:verify_and_login'))}
            </Button>

          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-300">{t('auth:or_continue_with')}</span>
            </div>
          </div>

          <Button
            variant="outline"
            type="button"
            disabled={loading || demoLoading}
            onClick={handleDemoLogin}
            className="flex w-full items-center justify-center gap-2 py-6 rounded-xl text-indigo-700 hover:bg-indigo-50 dark:hover:bg-slate-800 dark:border-slate-700 dark:text-indigo-300"
          >
            <Sparkles size={20} />
            <span>{demoLoading ? t('auth:demo_login_loading') : t('auth:demo_login')}</span>
          </Button>

          <div className="text-center text-sm">
            <span className="text-slate-500 dark:text-slate-300">
              {t('auth:no_account')}
            </span>
            <Link
              href="/register"
              className="ml-1 text-indigo-600 font-bold hover:underline"
            >
              {t('auth:register_free')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
