import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGlobal } from '@/context/GlobalContext';
import { useLogout, UserLevelType } from '@/lib/hooks';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  Crown,
  Palette,
  Globe,
  Languages,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SettingsView } from '@/context/GlobalContext';

export const MainSettings = ({ onNavigate }: { onNavigate: (view: SettingsView) => void }) => {
  const { t } = useTranslation(['settings', 'common']);
  const router = useRouter();
  const { user, currentTheme, baseCurrency } = useGlobal();
  const logoutMutation = useLogout();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    router.replace('/login');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <h2 className="text-xl font-bold text-[var(--text-main)]">{t('settings:title')}</h2>

      {/* Profile Card */}
      <Card onClick={() => onNavigate('PROFILE')} className="bg-[var(--bg-card)] border-[var(--border)] shadow-sm cursor-pointer hover:shadow-md transition-shadow group py-0">
        <CardContent className="p-4 flex items-center gap-4">
          <Avatar className="w-16 h-16 border-2 border-[var(--border)] group-hover:border-[var(--primary)]">
            <AvatarImage src={user.avatar || undefined} />
            <AvatarFallback className="bg-[var(--bg-main)] text-[var(--primary)] text-xl font-bold">
              {user.nickname?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="font-bold text-[var(--text-main)] text-lg">{user.nickname}</div>
              {user.plan === UserLevelType.USER_LEVEL_TYPE_PRO && <div className="bg-indigo-100 text-indigo-600 text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1"><Crown size={10} /> PRO</div>}
              {user.plan === UserLevelType.USER_LEVEL_TYPE_FREE && <div className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 text-[10px] px-1.5 py-0.5 rounded font-bold">FREE</div>}
            </div>
            <div className="text-sm text-[var(--text-muted)]">{user.email}</div>
          </div>
          <ChevronRight className="text-[var(--text-muted)] group-hover:text-[var(--text-main)]" />
        </CardContent>
      </Card>

      {/* Appearance & Theme */}
      <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-sm overflow-hidden py-0 gap-0">
        <div className="p-4 border-b border-[var(--border)] font-bold text-[var(--text-main)] text-sm bg-[var(--bg-main)]">{t('settings:personalization')}</div>
        <div onClick={() => onNavigate('THEME')} className="p-4 flex justify-between items-center hover:bg-[var(--bg-main)] cursor-pointer">
          <div className="flex items-center gap-3"><Palette size={18} className="text-[var(--text-muted)]" /><span className="text-[var(--text-main)] font-medium">{t('settings:appearance_title')}</span></div>
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm"><span>{currentTheme.name}</span><ChevronRight size={16} /></div>
        </div>
      </Card>

      {/* General Settings */}
      <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-sm overflow-hidden py-0 gap-0">
        <div className="p-4 border-b border-[var(--border)] font-bold text-[var(--text-main)] text-sm bg-[var(--bg-main)]">{t('settings:preferences')}</div>
        <div onClick={() => onNavigate('CURRENCY')} className="p-4 border-b border-[var(--border)] flex justify-between items-center hover:bg-[var(--bg-main)] cursor-pointer">
          <div className="flex items-center gap-3"><Globe size={18} className="text-[var(--text-muted)]" /><span className="text-[var(--text-main)] font-medium">{t('settings:currency_management')}</span></div>
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm"><span>{baseCurrency}</span><ChevronRight size={16} /></div>
        </div>
        <div onClick={() => onNavigate('LANGUAGE')} className="p-4 border-b border-[var(--border)] flex justify-between items-center hover:bg-[var(--bg-main)] cursor-pointer">
          <div className="flex items-center gap-3"><Languages size={18} className="text-[var(--text-muted)]" /><span className="text-[var(--text-main)] font-medium">{t('settings:language_preference')}</span></div>
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm"><ChevronRight size={16} /></div>
        </div>
      </Card>

      <Button
        onClick={handleLogout}
        disabled={logoutMutation.isPending}
        variant="destructive"
        className="w-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/60 border-none shadow-none py-6 rounded-xl font-medium flex items-center justify-center gap-2 border-[var(--border)] shadow-sm mb-20"
      >
        <LogOut size={18} /> {logoutMutation.isPending ? '...' : t('common:logout')}
      </Button>

      <div className="text-center text-xs text-[var(--text-muted)] mt-8">{t('settings:server_info')}</div>
    </div>
  );
};
