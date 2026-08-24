import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import TrendDateRangePicker, {
  clampCalendarStartMonth,
  createInitialTrendDateState,
  getEarliestSelectableDate,
  toLocalDateValue,
} from './TrendDateRangePicker';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', resolvedLanguage: 'en' },
  }),
}));

describe('trend date ranges', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes to sixty inclusive days and a rolling two-year boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 24, 12, 0, 0));

    const initial = createInitialTrendDateState();
    expect(toLocalDateValue(initial.range.from)).toBe('2026-06-26');
    expect(toLocalDateValue(initial.range.to)).toBe('2026-08-24');
    expect(toLocalDateValue(initial.earliestDate)).toBe('2024-08-24');
  });

  it('uses the first non-group account opening date as the lower boundary', () => {
    const earliest = getEarliestSelectableDate([
      { date: '2026-07-10', createdAt: new Date(2026, 6, 20), isGroup: false },
      { date: '2026-06-15', createdAt: new Date(2026, 6, 1), isGroup: false },
      { date: '2026-05-01', createdAt: new Date(2026, 4, 1), isGroup: true },
    ], new Date(2024, 7, 24));

    expect(toLocalDateValue(earliest)).toBe('2026-06-15');
  });

  it('clamps the first visible month so a two-month picker never collapses at the upper boundary', () => {
    const firstMonth = clampCalendarStartMonth(
      new Date(2026, 7, 24),
      new Date(2026, 7, 1),
      new Date(2026, 7, 24),
    );
    expect(toLocalDateValue(firstMonth)).toBe('2026-07-01');
  });

  it('disables dates outside the allowed window and commits a completed range', () => {
    const onChange = vi.fn();
    const { container } = render(
      <TrendDateRangePicker
        value={{ from: new Date(2026, 7, 1), to: new Date(2026, 7, 2) }}
        earliestDate={new Date(2026, 7, 1)}
        latestDate={new Date(2026, 7, 31)}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'select_trend_date_range' }));
    expect(container.ownerDocument.querySelector('[data-disabled="true"]')).not.toBeNull();
    expect(screen.getByRole('dialog').className).toContain('bg-popover');

    fireEvent.click(screen.getByRole('button', { name: /August 10th, 2026$/ }));
    expect(screen.getAllByRole('grid')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: /August 12th, 2026$/ }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const selectedRange = onChange.mock.calls[0][0];
    expect(toLocalDateValue(selectedRange.from)).toBe('2026-08-10');
    expect(toLocalDateValue(selectedRange.to)).toBe('2026-08-12');
  });

  it('allows an inclusive single-day range', () => {
    const onChange = vi.fn();
    render(
      <TrendDateRangePicker
        value={{ from: new Date(2026, 7, 1), to: new Date(2026, 7, 2) }}
        earliestDate={new Date(2026, 7, 1)}
        latestDate={new Date(2026, 7, 31)}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'select_trend_date_range' }));
    fireEvent.click(screen.getByRole('button', { name: /August 15th, 2026$/ }));
    fireEvent.click(screen.getByRole('button', { name: /August 15th, 2026/ }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const selectedRange = onChange.mock.calls[0][0];
    expect(toLocalDateValue(selectedRange.from)).toBe('2026-08-15');
    expect(toLocalDateValue(selectedRange.to)).toBe('2026-08-15');
  });
});
