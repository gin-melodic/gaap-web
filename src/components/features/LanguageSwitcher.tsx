'use client';

import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation('common');

  const handleLanguageChange = (value: string) => {
    i18n.changeLanguage(value);
  };

  return (
    <div className="flex items-center space-x-2">
      <Select
        value={i18n.language === 'zh' ? 'zh-CN' : i18n.language}
        onValueChange={handleLanguageChange}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={t('language')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">{t('lang_en')}</SelectItem>
          <SelectItem value="zh-CN">{t('lang_zh_cn')}</SelectItem>
          <SelectItem value="zh-TW">{t('lang_zh_tw')}</SelectItem>
          <SelectItem value="ja">{t('lang_ja')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
