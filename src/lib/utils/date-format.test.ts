import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatDateForDisplay, formatDateForInput, getCurrentDateTime } from './date-format';

// Transaction dates are wall-clock values interpreted in the browser's local
// timezone; production runs for users in Asia/Shanghai (UTC+8), so pin the
// zone to keep boundary expectations deterministic.
process.env.TZ = 'Asia/Shanghai';

describe('transaction date formatting boundaries', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getCurrentDateTime', () => {
    it('emits a local datetime-local value with second precision at the end of year boundary', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 11, 31, 23, 59, 59));

      expect(getCurrentDateTime()).toBe('2026-12-31T23:59:59');
    });

    it('zero-pads single digit months and hours at the start of year boundary', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 0, 1, 0, 4, 7));

      expect(getCurrentDateTime()).toBe('2026-01-01T00:04:07');
    });
  });

  describe('formatDateForInput', () => {
    it('keeps hours minutes and seconds from an RFC3339 timestamp in the same zone', () => {
      expect(formatDateForInput('2026-12-31T23:59:59+08:00')).toBe('2026-12-31T23:59:59');
    });

    it('converts a UTC instant across the local day boundary', () => {
      // 2026-01-01T16:00:00Z is midnight of 2026-01-02 in UTC+8.
      expect(formatDateForInput('2026-01-01T16:00:00Z')).toBe('2026-01-02T00:00:00');
    });

    it('maps a legacy date-only payload to local midnight instead of dropping the value', () => {
      // Bare "YYYY-MM-DD" parses as UTC midnight; in UTC+8 that is 08:00 local.
      expect(formatDateForInput('2026-03-05')).toBe('2026-03-05T08:00:00');
    });

    it('returns unparseable input unchanged', () => {
      expect(formatDateForInput('not-a-date')).toBe('not-a-date');
    });

    it('round-trips a local datetime-local value without altering the instant', () => {
      expect(formatDateForInput('2026-07-20T13:45:10')).toBe('2026-07-20T13:45:10');
    });
  });

  describe('formatDateForDisplay', () => {
    it('renders the full timestamp with second precision for list rows', () => {
      expect(formatDateForDisplay('2026-08-14T15:30:05+08:00')).toBe('2026-08-14 15:30:05');
    });

    it('renders midnight boundary timestamps without losing the date', () => {
      expect(formatDateForDisplay('2026-12-31T00:00:00+08:00')).toBe('2026-12-31 00:00:00');
    });

    it('returns unparseable input unchanged', () => {
      expect(formatDateForDisplay(undefined as unknown as string)).toBe(undefined as unknown as string);
      expect(formatDateForDisplay('not-a-date')).toBe('not-a-date');
    });
  });
});
