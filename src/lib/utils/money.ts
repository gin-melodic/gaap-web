import Decimal from 'decimal.js';

// Configure Decimal.js global settings
Decimal.config({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

const NANOS_MOD = 1_000_000_000;

// Loose input interface (used by the from method)
export interface MoneyInput {
  currencyCode: string;
  units: string | number;
  nanos: number;
}

// Strict output interface (matches the Proto definition)
export interface MoneyProto {
  currencyCode: string;
  units: string;
  nanos: number;
}

export class MoneyHelper {
  private amount: InstanceType<typeof Decimal>;
  public currency: string;

  constructor(amount: InstanceType<typeof Decimal>, currency: string) {
    this.amount = amount;
    this.currency = currency;
  }

  /**
   * Equivalent to Go's NewFromEntity
   */
  static from(input: MoneyInput | undefined | null): MoneyHelper {
    if (!input) {
      return new MoneyHelper(new Decimal(0), '');
    }

    // Allow missing units/nanos (server may omit them when value is zero)
    const units = input.units ?? 0;
    const nanos = input.nanos ?? 0;

    const unitsDec = new Decimal(units);
    const nanosDec = new Decimal(nanos).div(NANOS_MOD);

    const total = unitsDec.plus(nanosDec);

    return new MoneyHelper(total, input.currencyCode || '');
  }

  /**
   * Create from a plain number or string
   */
  static fromAmount(amount: number | string, currency: string): MoneyHelper {
    const dec = new Decimal(amount);
    return new MoneyHelper(dec, currency);
  }

  /**
   * Equivalent to Go's ToEntityValues
   */
  toProto(): MoneyProto {
    let units = this.amount.trunc();
    let nanos = this.amount.minus(units).times(NANOS_MOD).round();

    // Normalize: carry overflow/underflow nanos into units
    // Use >= and <= for defensive programming, though rounding should only produce exactly ±NANOS_MOD
    if (nanos.gte(NANOS_MOD)) {
      units = units.plus(1);
      nanos = nanos.minus(NANOS_MOD);
    } else if (nanos.lte(-NANOS_MOD)) {
      units = units.minus(1);
      nanos = nanos.plus(NANOS_MOD);
    }

    return {
      currencyCode: this.currency,
      units: units.toString(),
      nanos: nanos.toNumber(),
    };
  }

  // ---------------------------------------------------------
  // Arithmetic methods
  // ---------------------------------------------------------

  // Add
  add(other: MoneyHelper): MoneyHelper {
    this.checkCurrency(other);
    return new MoneyHelper(this.amount.plus(other.amount), this.currency);
  }

  // Sub
  sub(other: MoneyHelper): MoneyHelper {
    this.checkCurrency(other);
    return new MoneyHelper(this.amount.minus(other.amount), this.currency);
  }

  // Mul
  mul(multiplier: number | string): MoneyHelper {
    const mulDec = new Decimal(multiplier);
    return new MoneyHelper(this.amount.times(mulDec), this.currency);
  }

  // Div
  div(divisor: number | string): MoneyHelper {
    const divDec = new Decimal(divisor);
    // Equivalent to Go's DivRound(d, 9)
    // Keep 9 decimal places (Nanos precision)
    const result = this.amount.div(divDec).toDecimalPlaces(9);
    return new MoneyHelper(result, this.currency);
  }

  // ---------------------------------------------------------
  // Helper / formatting methods (frontend only)
  // ---------------------------------------------------------

  // Check currency
  private checkCurrency(other: MoneyHelper) {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
  }

  // Format as a plain string display (e.g. "100.50")
  format(decimalPlaces: number = 2): string {
    return this.amount.toFixed(decimalPlaces);
  }

  // Format as a currency string (e.g. "¥100.50")
  formatCurrency(): string {
    const fixed = this.amount.toFixed(2);
    if (!this.currency) return fixed;

    try {
      const parts = new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: this.currency,
      }).formatToParts(0);
      const symbol = parts.find(part => part.type === 'currency')?.value || this.currency;
      const [integer, fraction] = fixed.replace('-', '').split('.');
      const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return `${this.amount.isNegative() ? '-' : ''}${symbol}${grouped}.${fraction}`;
    } catch {
      return `${this.currency} ${fixed}`;
    }
  }

  toDecimal(): InstanceType<typeof Decimal> {
    return new Decimal(this.amount);
  }

  /** Chart libraries require IEEE-754 values; never use this for financial calculations. */
  toChartNumber(): number {
    return this.amount.toNumber();
  }
}

/**
 * Converts an exact amount from one currency to another using anchor-relative
 * rates, where `rateMap[currency]` is the decimal string "1 anchor = rate
 * currency". Same-currency conversion is the identity; a missing rate yields
 * null so callers can report incompleteness instead of throwing.
 */
export function convertAmount(
  amount: InstanceType<typeof Decimal>,
  from: string,
  to: string,
  rateMap: Record<string, string>,
): InstanceType<typeof Decimal> | null {
  const fromCode = (from || '').toUpperCase();
  const toCode = (to || '').toUpperCase();
  if (fromCode === toCode) return amount;

  const rateFrom = rateMap[fromCode];
  const rateTo = rateMap[toCode];
  if (rateFrom === undefined || rateTo === undefined) return null;

  return amount.times(rateTo).div(rateFrom);
}

/**
 * Sums a list of proto Money values into a single target currency using
 * anchor-relative rates. Values without a currency code are treated as the
 * target currency. Currencies lacking a rate are skipped and reported in
 * `missing` (sorted) so callers can surface incompleteness instead of
 * throwing on mixed-currency groups. Financial math stays in Decimal.
 */
export function sumMoneyInCurrency(
  moneys: Array<MoneyInput | null | undefined>,
  target: string,
  rateMap: Record<string, string>,
): { total: MoneyHelper; missing: string[] } {
  const buckets = new Map<string, InstanceType<typeof Decimal>>();
  for (const input of moneys) {
    const money = MoneyHelper.from(input);
    const currency = (money.currency || target).toUpperCase();
    buckets.set(currency, (buckets.get(currency) ?? new Decimal(0)).plus(money.toDecimal()));
  }

  let total = new Decimal(0);
  const missing = new Set<string>();
  for (const [currency, amount] of buckets) {
    const converted = convertAmount(amount, currency, target, rateMap);
    if (converted === null) {
      missing.add(currency);
      continue;
    }
    total = total.plus(converted);
  }

  return { total: new MoneyHelper(total, target), missing: Array.from(missing).sort() };
}
