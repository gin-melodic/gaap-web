import { describe, it, expect } from 'vitest';
import { AccountType, TransactionType, UserLevelType } from './types';

describe('Enums', () => {
  describe('AccountType', () => {
    it('should have correct values', () => {
      expect(AccountType.ACCOUNT_TYPE_ASSET).toBe(1);
      expect(AccountType.ACCOUNT_TYPE_LIABILITY).toBe(2);
      expect(AccountType.ACCOUNT_TYPE_INCOME).toBe(3);
      expect(AccountType.ACCOUNT_TYPE_EXPENSE).toBe(4);
      expect(AccountType.ACCOUNT_TYPE_EQUITY).toBe(5);
    });

    it('should map from string keys if needed (manual mapping required for proto enums usually)', () => {
      // Proto enums are numbers at runtime usually, with reverse mapping
      expect(AccountType[1]).toBe('ACCOUNT_TYPE_ASSET');
    });

    it('should support reverse mapping', () => {
      expect(AccountType[AccountType.ACCOUNT_TYPE_ASSET]).toBe('ACCOUNT_TYPE_ASSET');
      expect(AccountType[AccountType.ACCOUNT_TYPE_LIABILITY]).toBe('ACCOUNT_TYPE_LIABILITY');
    });
  });

  describe('TransactionType', () => {
    it('should have correct values', () => {
      expect(TransactionType.TRANSACTION_TYPE_INCOME).toBe(1);
      expect(TransactionType.TRANSACTION_TYPE_EXPENSE).toBe(2);
      expect(TransactionType.TRANSACTION_TYPE_TRANSFER).toBe(3);
    });
  });

  describe('UserLevelType', () => {
    it('should have correct values', () => {
      expect(UserLevelType.USER_LEVEL_TYPE_FREE).toBe(1);
      expect(UserLevelType.USER_LEVEL_TYPE_PRO).toBe(2);
    })
  })
});
