import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGlobal } from '@/context/GlobalContext';
import { useLogout } from '@/lib/hooks';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  Crown,
  Sparkles,
  Palette,
  Globe,
  Languages,
  ListTodo,
  LogOut,
  HardDrive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SettingsView } from '@/context/GlobalContext';

export const MainSettings = ({ onNavigate }: { onNavigate: (view: SettingsView) => void }) => {
  const { t } = useTranslation(['settings', 'common']);
  const router = useRouter();
  const { user, currentTheme, currencies, openTaskCenter } = useGlobal();
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
              {user.plan === 'PRO' && <div className="bg-indigo-100 text-indigo-600 text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1"><Crown size={10} /> PRO</div>}
              {user.plan === 'FREE' && <div className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded font-bold">FREE</div>}
            </div>
            <div className="text-sm text-[var(--text-muted)]">{user.email}</div>
          </div>
          <ChevronRight className="text-[var(--text-muted)] group-hover:text-[var(--text-main)]" />
        </CardContent>
      </Card>

      {/* Subscription */}
      <div onClick={() => onNavigate('SUBSCRIPTION')} className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-4 text-white shadow-lg shadow-indigo-200/50 cursor-pointer relative overflow-hidden group">
        <div className="relative z-10 flex justify-between items-center">
          <div><div className="font-bold flex items-center gap-2"><Sparkles size={18} className="text-amber-300" />{t('settings:subscription_title')}</div><div className="text-indigo-100 text-sm mt-1">{user.plan === 'PRO' ? t('settings:pro_active') : t('settings:upgrade_hint')}</div></div>
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm group-hover:bg-white/30 transition-colors"><ChevronRight size={20} /></div>
        </div>
        <div className="absolute -right-6 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
      </div>

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
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm"><span>{t('settings:currency_count', { count: currencies.length })}</span><ChevronRight size={16} /></div>
        </div>
        <div onClick={() => onNavigate('LANGUAGE')} className="p-4 border-b border-[var(--border)] flex justify-between items-center hover:bg-[var(--bg-main)] cursor-pointer">
          <div className="flex items-center gap-3"><Languages size={18} className="text-[var(--text-muted)]" /><span className="text-[var(--text-main)] font-medium">{t('settings:language_preference')}</span></div>
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm"><ChevronRight size={16} /></div>
        </div>
        <div onClick={openTaskCenter} className="p-4 flex justify-between items-center hover:bg-[var(--bg-main)] cursor-pointer">
          <div className="flex items-center gap-3"><ListTodo size={18} className="text-[var(--text-muted)]" /><span className="text-[var(--text-main)] font-medium">{t('settings:task_center')}</span></div>
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm"><ChevronRight size={16} /></div>
        </div>
      </Card>

      {/* Data Management */}
      <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-sm overflow-hidden py-0 gap-0">
        <div className="p-4 border-b border-[var(--border)] font-bold text-[var(--text-main)] text-sm bg-[var(--bg-main)]">{t('settings:data_management')}</div>
        <div onClick={() => onNavigate('DATA_EXPORT')} className="p-4 flex justify-between items-center hover:bg-[var(--bg-main)] cursor-pointer">
          <div className="flex items-center gap-3"><HardDrive size={18} className="text-[var(--text-muted)]" /><span className="text-[var(--text-main)] font-medium">{t('settings:data_export.title')}</span></div>
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm"><ChevronRight size={16} /></div>
        </div>
      </Card>

      <Button
        onClick={handleLogout}
        disabled={logoutMutation.isPending}
        variant="destructive"
        className="w-full bg-red-50 text-red-600 hover:bg-red-100 border-none shadow-none py-6 rounded-xl font-medium flex items-center justify-center gap-2 border-[var(--border)] shadow-sm mb-20"
      >
        <LogOut size={18} /> {logoutMutation.isPending ? '...' : t('common:logout')}
      </Button>

      <div className="text-center text-xs text-[var(--text-muted)] mt-8">{t('settings:server_info')}</div>
    </div>
  );
};
