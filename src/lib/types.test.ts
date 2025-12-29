import { describe, it, expect } from 'vitest';
import {
  AccountType,
  TransactionType,
  UserPlan,
  SortOrder,
  TransactionSortBy,
} from './types';

describe('AccountType enum', () => {
  it('should have correct values', () => {
    expect(AccountType.ASSET).toBe('ASSET');
    expect(AccountType.LIABILITY).toBe('LIABILITY');
    expect(AccountType.INCOME).toBe('INCOME');
    expect(AccountType.EXPENSE).toBe('EXPENSE');
  });

  it('should be usable in type checks', () => {
    const type: AccountType = AccountType.ASSET;
    expect(type === AccountType.ASSET).toBe(true);
    expect(type === AccountType.LIABILITY).toBe(false);
  });
});

describe('TransactionType enum', () => {
  it('should have correct values', () => {
    expect(TransactionType.INCOME).toBe('INCOME');
    expect(TransactionType.EXPENSE).toBe('EXPENSE');
    expect(TransactionType.TRANSFER).toBe('TRANSFER');
  });
});

describe('UserPlan enum', () => {
  it('should have correct values', () => {
    expect(UserPlan.FREE).toBe('FREE');
    expect(UserPlan.PRO).toBe('PRO');
  });
});

describe('SortOrder enum', () => {
  it('should have correct values', () => {
    expect(SortOrder.ASC).toBe('asc');
    expect(SortOrder.DESC).toBe('desc');
  });
});

describe('TransactionSortBy enum', () => {
  it('should have correct values', () => {
    expect(TransactionSortBy.DATE).toBe('date');
    expect(TransactionSortBy.AMOUNT).toBe('amount');
    expect(TransactionSortBy.CREATED_AT).toBe('created_at');
  });
});
