import { AccountType, TransactionType } from '../proto/base/base';

export function resolveTransactionType(
  fromType: AccountType,
  toType: AccountType,
): TransactionType {
  if (
    fromType === AccountType.ACCOUNT_TYPE_INCOME &&
    (toType === AccountType.ACCOUNT_TYPE_ASSET || toType === AccountType.ACCOUNT_TYPE_LIABILITY)
  ) {
    return TransactionType.TRANSACTION_TYPE_INCOME;
  }

  if (
    (fromType === AccountType.ACCOUNT_TYPE_ASSET || fromType === AccountType.ACCOUNT_TYPE_LIABILITY) &&
    toType === AccountType.ACCOUNT_TYPE_EXPENSE
  ) {
    return TransactionType.TRANSACTION_TYPE_EXPENSE;
  }

  if (
    (fromType === AccountType.ACCOUNT_TYPE_ASSET || fromType === AccountType.ACCOUNT_TYPE_LIABILITY) &&
    (toType === AccountType.ACCOUNT_TYPE_ASSET || toType === AccountType.ACCOUNT_TYPE_LIABILITY)
  ) {
    return TransactionType.TRANSACTION_TYPE_TRANSFER;
  }

  throw new Error('invalid account type combination');
}
