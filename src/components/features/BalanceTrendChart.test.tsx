import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import BalanceTrendChart from './BalanceTrendChart';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', resolvedLanguage: 'en' },
  }),
}));

vi.mock('@/lib/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/hooks')>();
  return {
    ...actual,
    useProfile: () => ({ data: { user: { mainCurrency: 'CNY' } }, isLoading: false }),
    useAllAccounts: () => ({ accounts: [], isPending: false }),
    useBalanceTrend: () => ({ data: null, isFetching: false }),
  };
});

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('balance trend chart container sizing (DEF-025)', () => {
  let warnings: string[];

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
    warnings = [];
  });

  it('mounts without recharts width(-1)/height(-1) console warnings', async () => {
    warnings = [];
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
      warnings.push(args.map(String).join(' '));
    });

    (globalThis as unknown as { ResizeObserver?: typeof ResizeObserverStub }).ResizeObserver = ResizeObserverStub;
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 640 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 300 });

    const { container } = render(<BalanceTrendChart />);

    // The chart must actually mount once the measured size is known.
    await vi.waitFor(() => {
      expect(container.querySelector('svg.recharts-surface')).not.toBeNull();
    });

    const sizeWarnings = warnings.filter(
      (message) => message.includes('should be greater than 0') || message.includes('width(-1)'),
    );
    expect(sizeWarnings).toEqual([]);
    warnSpy.mockRestore();
  });
});
