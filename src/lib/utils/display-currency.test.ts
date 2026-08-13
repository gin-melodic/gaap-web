import { describe, expect, it } from 'vitest';

import { resolveDisplayCurrency } from './display-currency';

describe('resolveDisplayCurrency', () => {
  it('uses account currency while a newly logged-in profile is still loading', () => {
    expect(resolveDisplayCurrency(undefined, [{ currencyCode: 'CNY' }])).toBe('CNY');
  });

  it('prefers the authoritative profile currency once available', () => {
    expect(resolveDisplayCurrency('jpy', [{ currencyCode: 'CNY' }])).toBe('JPY');
  });

  it('falls back to transaction currency and then USD for empty users', () => {
    expect(resolveDisplayCurrency(undefined, [], [{ currencyCode: 'EUR' }])).toBe('EUR');
    expect(resolveDisplayCurrency(undefined, [])).toBe('USD');
  });
});
