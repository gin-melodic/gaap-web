import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { CHANGELOG_RELEASES, ChangelogCategory, ChangelogRelease } from '@/lib/changelog';
import { APP_VERSION } from '@/lib/version';

const ReleaseCard = ({ release }: { release: ChangelogRelease }) => {
  const { t } = useTranslation('changelog');

  // Group items by category, preserving first-appearance order (data file order is display order).
  const byCategory = new Map<ChangelogCategory, string[]>();
  for (const item of release.items) {
    const keys = byCategory.get(item.category) ?? [];
    keys.push(item.key);
    byCategory.set(item.category, keys);
  }

  return (
    <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-sm p-0">
      <CardContent className="p-5 sm:p-6">
        {/* Header: version + status badge + release date */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-bold text-[var(--text-main)]">{release.version}</span>
          {release.released ? (
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 text-[10px] px-1.5 py-0.5 rounded font-bold">
              {t('changelog:released')}
            </span>
          ) : (
            <span className="bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] px-1.5 py-0.5 rounded font-bold">
              {t('changelog:upcoming')}
            </span>
          )}
          {release.date && (
            <span className="text-sm text-[var(--text-muted)]">{release.date}</span>
          )}
        </div>

        {/* Notes, grouped by category */}
        <div className="mt-4 space-y-4">
          {Array.from(byCategory.entries()).map(([category, keys]) => (
            <div key={category}>
              <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                {t(`changelog:category_${category}`)}
              </h3>
              <ul className="space-y-2">
                {keys.map(key => (
                  <li key={key} className="flex items-start gap-2 text-sm text-[var(--text-main)]">
                    <span className="mt-[7px] w-1 h-1 rounded-full bg-[var(--text-muted)] shrink-0" />
                    <span>{t(`changelog:${release.version}.${key}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const ChangelogSettings = ({ onBack }: { onBack: () => void }) => {
  const { t } = useTranslation(['changelog', 'common']);

  return (
    <div className="animate-in slide-in-from-right duration-300">
      <div className="flex items-center gap-2 mb-6 cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-main)]" onClick={onBack}>
        <ChevronLeft size={20} />
        <span className="text-sm font-medium">{t('common:back_to_settings')}</span>
      </div>
      <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">{t('changelog:title')}</h2>
      <p className="text-sm text-[var(--text-muted)] mb-6">{t('changelog:subtitle')}</p>

      <div className="space-y-4">
        {CHANGELOG_RELEASES.map(release => (
          <ReleaseCard key={release.version} release={release} />
        ))}
      </div>

      <div className="text-center text-xs text-[var(--text-muted)] mt-8">
        {t('changelog:current_version', { version: APP_VERSION })}
      </div>
    </div>
  );
};
