import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGlobal } from '@/context/GlobalContext';
import { ChevronLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Subscription = ({ onBack }: { onBack: () => void }) => {
  const { t } = useTranslation(['settings', 'common']);
  const { user } = useGlobal();

  const plans = [
    {
      id: 'free',
      name: t('settings:plans.free.name'),
      price: '¥0',
      period: t('settings:plans.free.period'),
      features: [
        t('settings:plans.free.features.0'),
        t('settings:plans.free.features.1'),
        t('settings:plans.free.features.2'),
        t('settings:plans.free.features.3')
      ],
      current: user.plan === 'FREE'
    },
    {
      id: 'pro',
      name: t('settings:plans.pro.name'),
      price: '¥15',
      period: t('settings:plans.pro.period'),
      features: [
        t('settings:plans.pro.features.0'),
        t('settings:plans.pro.features.1'),
        t('settings:plans.pro.features.2'),
        t('settings:plans.pro.features.3'),
        t('settings:plans.pro.features.4')
      ],
      current: user.plan === 'PRO',
      popular: true
    },
    {
      id: 'lifetime',
      name: t('settings:plans.lifetime.name'),
      price: '¥299',
      period: t('settings:plans.lifetime.period'),
      features: [
        t('settings:plans.lifetime.features.0'),
        t('settings:plans.lifetime.features.1'),
        t('settings:plans.lifetime.features.2'),
        t('settings:plans.lifetime.features.3')
      ],
      current: false
    }
  ];

  return (
    <div className="animate-in slide-in-from-right duration-300">
      <div className="flex items-center gap-2 mb-6 cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-main)]" onClick={onBack}><ChevronLeft size={20} /><span className="text-sm font-medium">{t('common:back_to_settings')}</span></div>
      <div className="text-center mb-10"><h2 className="text-3xl font-bold text-[var(--text-main)] mb-2">{t('settings:subscription_title')}</h2><p className="text-[var(--text-muted)]">{t('settings:subscription_subtitle')}</p></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {plans.map(plan => (
          <div key={plan.id} className={`relative bg-[var(--bg-card)] rounded-2xl p-6 border flex flex-col ${plan.popular ? 'border-[var(--primary)] ring-4 ring-indigo-50/50 shadow-xl' : 'border-[var(--border)] shadow-sm'}`}>
            {plan.popular && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--primary)] text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">{t('settings:most_popular')}</div>}
            <div className="mb-4"><h3 className="text-lg font-bold text-[var(--text-main)]">{plan.name}</h3><div className="mt-2 flex items-baseline"><span className="text-3xl font-bold text-[var(--text-main)]">{plan.price}</span><span className="text-[var(--text-muted)] text-sm ml-1">{plan.period}</span></div></div>
            <div className="flex-1 space-y-3 mb-6">{plan.features.map((feature, i) => (<div key={i} className="flex items-start gap-2 text-sm text-[var(--text-muted)]"><Check size={16} className="text-[var(--primary)] shrink-0 mt-0.5" /><span>{feature}</span></div>))}</div>
            <Button disabled={plan.current} className={`w-full rounded-xl font-bold text-sm ${plan.current ? 'bg-[var(--bg-main)] text-[var(--text-muted)] cursor-default' : plan.popular ? 'bg-[var(--primary)] text-white hover:opacity-90 shadow-lg' : 'bg-[var(--bg-card)] border-2 border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--bg-main)] hover:border-slate-300'}`}>{plan.current ? t('common:current_plan') : t('common:upgrade_now')}</Button>
          </div>
        ))}
      </div>
    </div>
  );
};
