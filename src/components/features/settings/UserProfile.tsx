import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGlobal } from '@/context/GlobalContext';
import { ChevronLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const UserProfile = ({ onBack }: { onBack: () => void }) => {
  const { t } = useTranslation(['settings', 'common']);
  const { user, baseCurrency } = useGlobal();

  return (
    <div className="animate-in slide-in-from-right duration-300">
      <button
        type="button"
        className="flex items-center gap-2 mb-6 text-[var(--text-muted)] hover:text-[var(--text-main)]"
        onClick={onBack}
      >
        <ChevronLeft size={20} />
        <span className="text-sm font-medium">{t('common:back_to_settings')}</span>
      </button>
      <h2 className="text-2xl font-bold text-[var(--text-main)] mb-6">{t('settings:profile')}</h2>
      <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-6">
            {t('settings:basic_info')}
          </h3>
          <div className="flex items-center gap-6">
            <Avatar className="w-20 h-20 border-2 border-[var(--border)]">
              <AvatarImage src={user.avatar || undefined} />
              <AvatarFallback className="bg-[var(--bg-main)] text-[var(--primary)] text-2xl font-bold">
                {user.nickname?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-[var(--text-muted)]">{t('settings:nickname')}</dt>
                <dd className="font-medium text-[var(--text-main)]">{user.nickname}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">{t('common:email')}</dt>
                <dd className="font-medium text-[var(--text-main)]">{user.email}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">{t('settings:currency_management')}</dt>
                <dd className="font-medium text-[var(--text-main)]">{baseCurrency}</dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
