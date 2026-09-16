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
  History,
  LogOut
} from 'lucide-react';
import { APP_VERSION } from '@/lib/version';
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

  // DEF-031: the settings rows are styled divs with onClick — make them keyboard-operable
  // (Tab reachable, Enter/Space activate) without changing their visual styling. The focus
  // ring only appears for keyboard users.
  const rowKeyHandler = (action: () => void) => (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };
  const rowA11y = (labelKey: string, action: () => void) => ({
    role: 'button',
    tabIndex: 0,
    'aria-label': t(labelKey),
    onClick: action,
    onKeyDown: rowKeyHandler(action),
  });
  const rowA11yClasses = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <h2 className="text-xl font-bold text-[var(--text-main)]">{t('settings:title')}</h2>

      {/* Profile Card */}
      <Card {...rowA11y('settings:profile', () => onNavigate('PROFILE'))} className={`bg-[var(--bg-card)] border-[var(--border)] shadow-sm cursor-pointer hover:shadow-md transition-shadow group py-0 ${rowA11yClasses}`}>
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
        <div {...rowA11y('settings:appearance_title', () => onNavigate('THEME'))} className={`p-4 flex justify-between items-center hover:bg-[var(--bg-main)] cursor-pointer ${rowA11yClasses}`}>
          <div className="flex items-center gap-3"><Palette size={18} className="text-[var(--text-muted)]" /><span className="text-[var(--text-main)] font-medium">{t('settings:appearance_title')}</span></div>
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm"><span>{currentTheme.name}</span><ChevronRight size={16} /></div>
        </div>
      </Card>

      {/* General Settings */}
      <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-sm overflow-hidden py-0 gap-0">
        <div className="p-4 border-b border-[var(--border)] font-bold text-[var(--text-main)] text-sm bg-[var(--bg-main)]">{t('settings:preferences')}</div>
        <div {...rowA11y('settings:currency_management', () => onNavigate('CURRENCY'))} className={`p-4 border-b border-[var(--border)] flex justify-between items-center hover:bg-[var(--bg-main)] cursor-pointer ${rowA11yClasses}`}>
          <div className="flex items-center gap-3"><Globe size={18} className="text-[var(--text-muted)]" /><span className="text-[var(--text-main)] font-medium">{t('settings:currency_management')}</span></div>
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm"><span>{baseCurrency}</span><ChevronRight size={16} /></div>
        </div>
        <div {...rowA11y('settings:language_preference', () => onNavigate('LANGUAGE'))} className={`p-4 border-b border-[var(--border)] flex justify-between items-center hover:bg-[var(--bg-main)] cursor-pointer ${rowA11yClasses}`}>
          <div className="flex items-center gap-3"><Languages size={18} className="text-[var(--text-muted)]" /><span className="text-[var(--text-main)] font-medium">{t('settings:language_preference')}</span></div>
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm"><ChevronRight size={16} /></div>
        </div>
      </Card>

      {/* About */}
      <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-sm overflow-hidden py-0 gap-0">
        <div className="p-4 border-b border-[var(--border)] font-bold text-[var(--text-main)] text-sm bg-[var(--bg-main)]">{t('settings:about')}</div>
        <div {...rowA11y('settings:changelog', () => onNavigate('CHANGELOG'))} className={`p-4 flex justify-between items-center hover:bg-[var(--bg-main)] cursor-pointer ${rowA11yClasses}`}>
          <div className="flex items-center gap-3"><History size={18} className="text-[var(--text-muted)]" /><span className="text-[var(--text-main)] font-medium">{t('settings:changelog')}</span></div>
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm"><span>{APP_VERSION}</span><ChevronRight size={16} /></div>
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

      <div className="text-center text-xs text-[var(--text-muted)] mt-8">GAAP Cloud {APP_VERSION}</div>
    </div>
  );
};
