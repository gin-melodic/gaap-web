import { describe, expect, it } from 'vitest';
import { AccountType, TransactionType } from '../proto/base/base';
import { resolveTransactionType } from './transaction-type';

describe('resolveTransactionType', () => {
  it('classifies an asset payment to an instant-created expense account as expense', () => {
    expect(resolveTransactionType(
      AccountType.ACCOUNT_TYPE_ASSET,
      AccountType.ACCOUNT_TYPE_EXPENSE,
    )).toBe(TransactionType.TRANSACTION_TYPE_EXPENSE);
  });

  it('classifies an instant-created income account deposit as income', () => {
    expect(resolveTransactionType(
      AccountType.ACCOUNT_TYPE_INCOME,
      AccountType.ACCOUNT_TYPE_ASSET,
    )).toBe(TransactionType.TRANSACTION_TYPE_INCOME);
  });

  it('classifies asset and liability movements as transfer', () => {
    expect(resolveTransactionType(
      AccountType.ACCOUNT_TYPE_ASSET,
      AccountType.ACCOUNT_TYPE_LIABILITY,
    )).toBe(TransactionType.TRANSACTION_TYPE_TRANSFER);
  });

  it('rejects income directly to expense', () => {
    expect(() => resolveTransactionType(
      AccountType.ACCOUNT_TYPE_INCOME,
      AccountType.ACCOUNT_TYPE_EXPENSE,
    )).toThrow('invalid account type combination');
  });
});
