import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGlobal } from '@/context/GlobalContext';
import { THEMES } from '@/lib/data';
import { ChevronLeft, CheckCircle2, Lock, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { UserLevelType } from '@/lib/hooks';

export const ThemeSettings = ({ onBack, onUpgrade }: { onBack: () => void, onUpgrade: () => void }) => {
  const { t } = useTranslation(['settings', 'common']);
  const { user, currentTheme, setTheme } = useGlobal();

  return (
    <div className="animate-in slide-in-from-right duration-300">
      <div className="flex items-center gap-2 mb-6 cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-main)]" onClick={onBack}>
        <ChevronLeft size={20} />
        <span className="text-sm font-medium">{t('common:back_to_settings')}</span>
      </div>
      <h2 className="text-2xl font-bold text-[var(--text-main)] mb-6">{t('settings:appearance_title')}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {THEMES.map(theme => {
          const isActive = currentTheme.id === theme.id;
          const isLocked = user.plan === UserLevelType.USER_LEVEL_TYPE_FREE && theme.id !== 'default';

          return (
            <div
              key={theme.id}
              onClick={() => {
                if (isLocked) {
                  toast.error(t('settings:unlock_themes_desc'));
                  return;
                }
                setTheme(theme);
              }}
              className={`
                relative p-4 rounded-xl border-2 cursor-pointer transition-all overflow-hidden group
                ${isActive ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--primary)]/50'}
              `}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`font-bold text-sm ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text-main)]'}`}>{theme.name}</span>
                {isActive && <CheckCircle2 size={18} className="text-[var(--primary)]" />}
                {isLocked && <Lock size={16} className="text-[var(--text-muted)]" />}
              </div>

              {/* Color scheme preview */}
              <div className="flex gap-2">
                <div className="h-8 flex-1 rounded-lg" style={{ backgroundColor: theme.colors.bg, border: `1px solid ${theme.colors.border}` }}></div>
                <div className="h-8 flex-1 rounded-lg" style={{ backgroundColor: theme.colors.card, border: `1px solid ${theme.colors.border}` }}></div>
                <div className="h-8 flex-1 rounded-lg" style={{ backgroundColor: theme.colors.primary }}></div>
              </div>
            </div>
          );
        })}
      </div>
      {user.plan === UserLevelType.USER_LEVEL_TYPE_FREE && (
        <div className="mt-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 text-white flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg"><Crown size={20} /></div>
            <div>
              <div className="font-bold">{t('settings:unlock_themes_title')}</div>
              <div className="text-xs text-indigo-100">{t('settings:unlock_themes_desc')}</div>
            </div>
          </div>
          <Button onClick={onUpgrade} className="bg-white text-indigo-600 hover:bg-indigo-50 font-bold">{t('common:go_upgrade')}</Button>
        </div>
      )}
    </div>
  );
};
