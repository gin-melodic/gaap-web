import { describe, it, expect } from 'vitest';
import { convertAmount } from './money';
import Decimal from 'decimal.js';

const rateMap: Record<string, string> = {
  USD: '1',
  CNY: '7.2',
  JPY: '150',
  EUR: '0.92',
};

describe('convertAmount', () => {
  it('is the identity for the same currency', () => {
    const result = convertAmount(new Decimal('100'), 'CNY', 'cny', rateMap);
    expect(result?.toString()).toBe('100');
  });

  it('converts using the anchor cross-rate', () => {
    // 100 CNY -> USD = 100 * 1 / 7.2
    const result = convertAmount(new Decimal('100'), 'CNY', 'USD', rateMap);
    expect(result).not.toBeNull();
    expect(result!.toDecimalPlaces(9).toString()).toBe('13.888888889');
  });

  it('converts anchor to quote', () => {
    const result = convertAmount(new Decimal('100'), 'USD', 'CNY', rateMap);
    expect(result!.toString()).toBe('720');
  });

  it('converts cross-currency (JPY to EUR)', () => {
    // 15000 JPY -> EUR = 15000 * 0.92 / 150 = 92
    const result = convertAmount(new Decimal('15000'), 'JPY', 'EUR', rateMap);
    expect(result!.toString()).toBe('92');
  });

  it('returns null when a required rate is missing', () => {
    expect(convertAmount(new Decimal('100'), 'CNY', 'GBP', rateMap)).toBeNull();
    expect(convertAmount(new Decimal('100'), 'GBP', 'USD', rateMap)).toBeNull();
  });

  it('preserves the sign for negative amounts', () => {
    const result = convertAmount(new Decimal('-100'), 'USD', 'CNY', rateMap);
    expect(result!.toString()).toBe('-720');
  });
});
