import { describe, it, expect } from 'vitest';
import { MoneyHelper } from './money';

describe('MoneyHelper', () => {
  describe('toProto()', () => {
    it('should handle normal values', () => {
      const money = MoneyHelper.fromAmount(123.45, 'USD');
      const proto = money.toProto();
      
      expect(proto.currencyCode).toBe('USD');
      expect(proto.units).toBe('123');
      expect(proto.nanos).toBe(450_000_000);
    });

    it('should normalize when nanos rounds to 1_000_000_000', () => {
      // Create a value that when rounded will produce exactly 1_000_000_000 nanos
      // 0.9999999995 should round to 1.0 when multiplied by 1_000_000_000
      const money = MoneyHelper.fromAmount(0.9999999995, 'USD');
      const proto = money.toProto();
      
      expect(proto.units).toBe('1');
      expect(proto.nanos).toBe(0);
    });

    it('should normalize when nanos rounds to -1_000_000_000', () => {
      // Create a value that when rounded will produce exactly -1_000_000_000 nanos
      const money = MoneyHelper.fromAmount(-0.9999999995, 'USD');
      const proto = money.toProto();
      
      expect(proto.units).toBe('-1');
      expect(proto.nanos).toBe(0);
    });

    it('should handle positive values close to rounding boundary', () => {
      const money = MoneyHelper.fromAmount(5.9999999995, 'USD');
      const proto = money.toProto();
      
      expect(proto.units).toBe('6');
      expect(proto.nanos).toBe(0);
    });

    it('should handle negative values close to rounding boundary', () => {
      const money = MoneyHelper.fromAmount(-5.9999999995, 'USD');
      const proto = money.toProto();
      
      expect(proto.units).toBe('-6');
      expect(proto.nanos).toBe(0);
    });

    it('should handle zero', () => {
      const money = MoneyHelper.fromAmount(0, 'USD');
      const proto = money.toProto();
      
      expect(proto.units).toBe('0');
      expect(proto.nanos).toBe(0);
    });

    it('should handle large positive values', () => {
      const money = MoneyHelper.fromAmount(999999.9999999995, 'USD');
      const proto = money.toProto();
      
      expect(proto.units).toBe('1000000');
      expect(proto.nanos).toBe(0);
    });

    it('should handle large negative values', () => {
      const money = MoneyHelper.fromAmount(-999999.9999999995, 'USD');
      const proto = money.toProto();
      
      expect(proto.units).toBe('-1000000');
      expect(proto.nanos).toBe(0);
    });

    it('should maintain consistency: from -> toProto -> from should preserve value', () => {
      const originalAmount = '123.456789012';
      const money1 = MoneyHelper.fromAmount(originalAmount, 'USD');
      const proto = money1.toProto();
      
      // Verify proto has valid nanos (this is the bug fix test)
      expect(proto.nanos).toBeGreaterThanOrEqual(-999_999_999);
      expect(proto.nanos).toBeLessThanOrEqual(999_999_999);
      
      const money2 = MoneyHelper.from(proto);
      
      // The round-trip should preserve the value within reasonable precision
      expect(money2.format(9)).toBe(originalAmount);
    });

    it('should handle arithmetic results that may round to boundary', () => {
      // Test a division that might produce a value close to rounding boundary
      const money = MoneyHelper.fromAmount('10', 'USD');
      const result = money.div('3').mul('3'); // 10/3*3 may have precision issues
      const proto = result.toProto();
      
      // Should not throw and should have valid nanos
      expect(proto.nanos).toBeGreaterThanOrEqual(-999_999_999);
      expect(proto.nanos).toBeLessThanOrEqual(999_999_999);
    });

    it('should always produce valid nanos for any amount', () => {
      // Test various random amounts to ensure nanos is always valid
      const testAmounts = [
        0.9999999995, -0.9999999995,
        1.9999999995, -1.9999999995,
        999.9999999995, -999.9999999995,
        0.123456789, -0.123456789,
        12345.6789, -12345.6789,
      ];

      for (const amount of testAmounts) {
        const proto = MoneyHelper.fromAmount(amount, 'USD').toProto();
        expect(proto.nanos).toBeGreaterThanOrEqual(-999_999_999);
        expect(proto.nanos).toBeLessThanOrEqual(999_999_999);
      }
    });
  });

  describe('from()', () => {
    it('should construct from valid proto', () => {
      const proto = {
        currencyCode: 'USD',
        units: '123',
        nanos: 450_000_000,
      };
      const money = MoneyHelper.from(proto);
      
      expect(money.format(9)).toBe('123.450000000');
      expect(money.currency).toBe('USD');
    });

    it('should handle null/undefined', () => {
      const money1 = MoneyHelper.from(null);
      expect(money1.format(2)).toBe('0.00');
      
      const money2 = MoneyHelper.from(undefined);
      expect(money2.format(2)).toBe('0.00');
    });
  });

  describe('arithmetic operations', () => {
    it('should add correctly', () => {
      const m1 = MoneyHelper.fromAmount('100.50', 'USD');
      const m2 = MoneyHelper.fromAmount('50.25', 'USD');
      const result = m1.add(m2);
      
      expect(result.format(2)).toBe('150.75');
    });

    it('should subtract correctly', () => {
      const m1 = MoneyHelper.fromAmount('100.50', 'USD');
      const m2 = MoneyHelper.fromAmount('50.25', 'USD');
      const result = m1.sub(m2);
      
      expect(result.format(2)).toBe('50.25');
    });

    it('should multiply correctly', () => {
      const money = MoneyHelper.fromAmount('100', 'USD');
      const result = money.mul('1.5');
      
      expect(result.format(2)).toBe('150.00');
    });

    it('should divide correctly', () => {
      const money = MoneyHelper.fromAmount('100', 'USD');
      const result = money.div('4');
      
      expect(result.format(2)).toBe('25.00');
    });

    it('should throw on currency mismatch', () => {
      const m1 = MoneyHelper.fromAmount(100, 'USD');
      const m2 = MoneyHelper.fromAmount(100, 'EUR');
      
      expect(() => m1.add(m2)).toThrow('Currency mismatch');
    });
  });
});
