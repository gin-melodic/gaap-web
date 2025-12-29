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
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="zh-CN">简体中文</SelectItem>
          <SelectItem value="zh-TW">繁體中文</SelectItem>
          <SelectItem value="ja">日本語</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
