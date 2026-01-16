import Decimal from 'decimal.js';

// 配置 decimal.js 的全局默认值
// Configure Decimal.js global settings
Decimal.config({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

const NANOS_MOD = 1_000_000_000;

// 宽松的输入接口 (用于 from 方法)
export interface MoneyInput {
  currencyCode: string;
  units: string | number;
  nanos: number;
}

// 严格的输出接口 (对应 Proto 定义)
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
   * 对应 Go 的 NewFromEntity
   */
  static from(input: MoneyInput | undefined | null): MoneyHelper {
    if (!input) {
      return new MoneyHelper(new Decimal(0), '');
    }

    const unitsDec = new Decimal(input.units);
    const nanosDec = new Decimal(input.nanos).div(NANOS_MOD);

    const total = unitsDec.plus(nanosDec);

    return new MoneyHelper(total, input.currencyCode);
  }

  /**
   * 从普通数字或字符串创建
   */
  static fromAmount(amount: number | string, currency: string): MoneyHelper {
    const dec = new Decimal(amount);
    return new MoneyHelper(dec, currency);
  }

  /**
   * 对应 Go 的 ToEntityValues
   */
  toProto(): MoneyProto {
    const unitsDec = this.amount.trunc();
    const nanosDec = this.amount.minus(unitsDec).times(NANOS_MOD).round();

    return {
      currencyCode: this.currency,
      units: unitsDec.toString(),
      nanos: nanosDec.toNumber(),
    };
  }

  // ---------------------------------------------------------
  // 算术方法
  // ---------------------------------------------------------

  // Add 加法
  add(other: MoneyHelper): MoneyHelper {
    this.checkCurrency(other);
    return new MoneyHelper(this.amount.plus(other.amount), this.currency);
  }

  // Sub 减法
  sub(other: MoneyHelper): MoneyHelper {
    this.checkCurrency(other);
    return new MoneyHelper(this.amount.minus(other.amount), this.currency);
  }

  // Mul 乘法
  mul(multiplier: number | string): MoneyHelper {
    const mulDec = new Decimal(multiplier);
    return new MoneyHelper(this.amount.times(mulDec), this.currency);
  }

  // Div 除法
  div(divisor: number | string): MoneyHelper {
    const divDec = new Decimal(divisor);
    // 对应 Go 的 DivRound(d, 9)
    // 保留 9 位小数 (Nanos 精度)
    const result = this.amount.div(divDec).toDecimalPlaces(9);
    return new MoneyHelper(result, this.currency);
  }

  // ---------------------------------------------------------
  // 辅助 / 格式化方法 (前端特有)
  // ---------------------------------------------------------

  // 检查币种
  private checkCurrency(other: MoneyHelper) {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
  }

  // 格式化为字符串显示 (例如 "100.50")
  format(decimalPlaces: number = 2): string {
    return this.amount.toFixed(decimalPlaces);
  }

  // 格式化为货币字符串 (例如 "¥100.50")
  formatCurrency(): string {
    // fallback if currency is empty
    if (!this.currency) return this.amount.toFixed(2);

    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: this.currency,
    }).format(this.amount.toNumber());
  }

  /**
   * 转为普通数字 (可能丢失精度，用于 UI 控件显示)
   */
  toNumber(): number {
    return this.amount.toNumber();
  }
}
