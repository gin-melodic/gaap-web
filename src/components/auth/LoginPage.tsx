'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobal } from '@/context/GlobalContext';
import { useLogin } from '@/lib/hooks';
import { useTranslation } from 'react-i18next';
import { Turnstile } from '@marsidev/react-turnstile';
import {
  Wallet,
  CheckCircle2,
  Mail,
  Lock,
  MessageCircle,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LanguageSwitcher } from '@/components/features/LanguageSwitcher';
import { toast } from 'sonner';
import Link from 'next/link';
import { ApiError } from '@/lib/api';
import { sha256 } from '@/lib/utils';

const GithubIcon = ({ size = 24, className, ...props }: { size?: number, className?: string } & React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LoginPage = () => {
  const { t } = useTranslation(['common', 'auth']);
  const { login: contextLogin, isLoggedIn } = useGlobal();
  const loginMutation = useLogin();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState(1); // 1: Email/Password, 2: 2FA Code
  const [turnstileToken, setTurnstileToken] = useState('');

  useEffect(() => {
    if (isLoggedIn) {
      router.push('/dashboard');
    }
  }, [isLoggedIn, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step === 1 && !turnstileToken) {
      toast.error(t('auth:captcha_required'));
      return;
    }

    try {
      const hashedPassword = await sha256(password);
      const data = await loginMutation.mutateAsync({
        email,
        password: hashedPassword,
        code: step === 2 ? code : undefined,
        cf_turnstile_response: turnstileToken
      });

      // Login success
      if (!data || !data.user) {
        throw new Error('Invalid response format');
      }

      contextLogin({
        email: data.user.email,
        nickname: data.user.nickname,
        avatar: data.user.avatar,
        plan: data.user.plan
      });

      toast.success(t('auth:login_success'), { duration: 4000 });
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.message && err.message.includes('2FA code required')) {
          setStep(2);
          toast.info(t('auth:enter_2fa_code'), { duration: 4000 });
          return;
        }
        if (err.message === 'invalid email or password') {
          toast.error(t('auth:invalid_email_or_password'), { duration: 4000 });
          return;
        }
        // Error already handled by hook
      } else if (err instanceof Error) {
        // Error already handled by hook
      }
    }
  };

  const loading = loginMutation.isPending;

  return (
    <div className="min-h-screen bg-slate-50 flex">
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
      <div className="w-full lg:w-3/4 flex items-center justify-center p-4 lg:p-8 bg-white relative">
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
            <h2 className="text-3xl font-bold text-slate-900">
              {t('auth:welcome')}
            </h2>
            <p className="mt-2 text-slate-500">
              {t('auth:login_description')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('common:email')}</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail size={18} />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="name@company.com"
                      className="pl-10 py-6 rounded-xl placeholder:text-slate-300 text-slate-900 bg-white border-slate-200"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t('common:password')}</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock size={18} />
                    </div>
                    <Input
                      id="password"
                      type="password"
                      required
                      placeholder="••••••••"
                      className="pl-10 py-6 rounded-xl placeholder:text-slate-300 text-slate-900 bg-white border-slate-200"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-center py-2">
                  <Turnstile
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                    onSuccess={(token) => setTurnstileToken(token)}
                    options={{ theme: 'light' }}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2 animate-in fade-in slide-in-from-right duration-300">
                <Label htmlFor="code">{t('auth:enter_2fa_code')}</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <ShieldCheck size={18} />
                  </div>
                  <Input
                    id="code"
                    type="text"
                    required
                    placeholder="••••••"
                    className="pl-10 py-6 rounded-xl tracking-widest text-center text-lg placeholder:text-slate-300 text-slate-900 bg-white border-slate-200"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    maxLength={6}
                    autoFocus
                  />
                </div>
                <Button
                  type="button"
                  variant="link"
                  className="text-sm text-slate-500"
                  onClick={() => setStep(1)}
                >
                  {t('auth:back_to_login')}
                </Button>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 rounded-xl font-bold shadow-lg shadow-indigo-200">
              {loading ? t('auth:logging_in') : (step === 1 ? t('auth:sign_in') : t('auth:verify_and_login'))}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-500">{t('auth:or_continue_with')}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                contextLogin({ email: 'github_user@example.com', nickname: 'GitHub User', plan: 'PRO' });
                router.push('/dashboard');
              }}
              className="flex items-center justify-center gap-2 py-6 rounded-xl hover:bg-slate-50"
            >
              <GithubIcon size={20} />
              <span>GitHub</span>
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                contextLogin({ email: 'wechat_user@example.com', nickname: t('auth:default_wechat_username'), plan: 'FREE' });
                router.push('/dashboard');
              }}
              className="flex items-center justify-center gap-2 py-6 rounded-xl hover:bg-slate-50"
            >
              <MessageCircle size={20} className="text-green-600" />
              <span>微信</span>
            </Button>
          </div>

          <div className="text-center text-sm">
            <span className="text-slate-500">
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
