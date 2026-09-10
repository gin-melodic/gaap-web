/**
 * In-app changelog data for the Settings "Changelog" module.
 *
 * Rules (see repo-root `VERSIONING.md`):
 * - `CHANGELOG_RELEASES` is ordered NEWEST FIRST.
 * - `released: true` entries must carry an ISO `date`.
 * - `items[].key` is the i18n key RELATIVE to the release node inside the
 *   `changelog` namespace: `t(\`changelog:${version}.${key}\`)`.
 * - Note text lives exclusively in `src/locales/{en,zh-CN,zh-TW,ja}/changelog.json`;
 *   the `en` locale must stay 1:1 with the root `CHANGELOG.md`.
 * - This version of the app is frontend-only: no backend API is involved.
 */

export type ChangelogCategory = 'added' | 'fixed' | 'improved';

export interface ChangelogItem {
  category: ChangelogCategory;
  /** i18n key relative to the `${version}` node in the `changelog` namespace. */
  key: string;
}

export interface ChangelogRelease {
  /** Baseline name, e.g. `v0.0.2-beta` (see `VERSIONING.md`). */
  version: string;
  /** `true` once the baseline has been released by the release owner. */
  released: boolean;
  /** ISO release date (e.g. `2026-08-14`); `null` until release. */
  date: string | null;
  items: ChangelogItem[];
}

export const CHANGELOG_RELEASES: ChangelogRelease[] = [
  {
    version: 'v0.0.2-beta',
    released: false,
    date: null,
    items: [
      { category: 'added', key: 'added.multicurrency_accounts' },
      { category: 'added', key: 'added.rate_management' },
      { category: 'added', key: 'added.dashboard_valuation' },
      { category: 'added', key: 'added.currency_settings' },
      { category: 'fixed', key: 'fixed.trend_bucketing' },
      { category: 'fixed', key: 'fixed.tx_currency_pairing' },
      { category: 'fixed', key: 'fixed.settings_keyboard_nav' },
      { category: 'fixed', key: 'fixed.profile_update_wire' },
    ],
  },
  {
    version: 'v0.0.1-beta',
    released: true,
    date: '2026-08-14',
    items: [
      { category: 'added', key: 'added.auth_sessions' },
      { category: 'added', key: 'added.accounts' },
      { category: 'added', key: 'added.transactions' },
      { category: 'added', key: 'added.dashboard_trend' },
      { category: 'added', key: 'added.settings_profile' },
    ],
  },
];
