import { describe, expect, it } from 'vitest';

import { CHANGELOG_RELEASES, ChangelogCategory } from './changelog';
import enChangelog from '@/locales/en/changelog.json';
import zhCNChangelog from '@/locales/zh-CN/changelog.json';
import zhTWChangelog from '@/locales/zh-TW/changelog.json';
import jaChangelog from '@/locales/ja/changelog.json';

const ALL_CATEGORIES: ChangelogCategory[] = ['added', 'fixed', 'improved'];
const LOCALES: Record<string, Record<string, unknown>> = {
  en: enChangelog,
  'zh-CN': zhCNChangelog,
  'zh-TW': zhTWChangelog,
  ja: jaChangelog,
};

/**
 * Resolve a dotted key path (e.g. `added.multicurrency_accounts`) inside a
 * plain object; undefined when missing. The version prefix is handled by the
 * caller because baseline names themselves contain dots (`v0.0.2-beta`).
 */
const resolve = (obj: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((acc, part) => {
    if (acc === null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[part];
  }, obj);

const versionNumber = (version: string): number => {
  const match = /^v(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) return Number.NaN;
  return Number(match[1]) * 1_000_000 + Number(match[2]) * 1_000 + Number(match[3]);
};

describe('CHANGELOG_RELEASES invariants (VERSIONING.md)', () => {
  it('is ordered newest first by version number', () => {
    const numbers = CHANGELOG_RELEASES.map(r => versionNumber(r.version));
    expect(numbers).toHaveLength(CHANGELOG_RELEASES.length);
    for (let i = 1; i < numbers.length; i += 1) {
      expect(numbers[i - 1]).toBeGreaterThan(numbers[i]);
    }
  });

  it('has unique, well-formed baseline names', () => {
    const versions = CHANGELOG_RELEASES.map(r => r.version);
    expect(new Set(versions).size).toBe(versions.length);
    for (const version of versions) {
      expect(version).toMatch(/^v\d+\.\d+\.\d+(-beta)?$/);
    }
  });

  it('carries an ISO date exactly for released baselines', () => {
    for (const release of CHANGELOG_RELEASES) {
      if (release.released) {
        expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      } else {
        expect(release.date).toBeNull();
      }
    }
  });

  it('only references known note categories', () => {
    for (const release of CHANGELOG_RELEASES) {
      for (const item of release.items) {
        expect(ALL_CATEGORIES).toContain(item.category);
      }
    }
  });

  it('resolves every item key to a non-empty string in all four locales (en is the reference)', () => {
    for (const release of CHANGELOG_RELEASES) {
      expect(Object.prototype.hasOwnProperty.call(LOCALES.en, release.version)).toBe(true);
      for (const item of release.items) {
        for (const [locale, resources] of Object.entries(LOCALES)) {
          const value = resolve(resources[release.version], item.key);
          expect(
            value,
            `${locale}: missing "${release.version}.${item.key}" (parity with en / CHANGELOG.md required)`,
          ).toSatisfy(v => typeof v === 'string' && v.trim().length > 0);
        }
      }
    }
  });
});
