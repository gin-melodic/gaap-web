import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/features/LanguageSwitcher';

export const LanguageSettings = ({ onBack }: { onBack: () => void }) => {
  const { t } = useTranslation(['settings', 'common']);

  return (
    <div className="animate-in slide-in-from-right duration-300">
      <div className="flex items-center gap-2 mb-6 cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-main)]" onClick={onBack}>
        <ChevronLeft size={20} />
        <span className="text-sm font-medium">{t('common:back_to_settings')}</span>
      </div>
      <h2 className="text-2xl font-bold text-[var(--text-main)] mb-6">{t('settings:language_preference')}</h2>
      <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-sm p-0">
        <CardContent className="p-6">
          <p className="text-sm text-[var(--text-muted)] mb-4">{t('settings:select_language')}</p>
          <LanguageSwitcher />
        </CardContent>
      </Card>
    </div>
  );
};
