// Re-export Protobuf types explicitly to avoid conflicts with helper types (DeepPartial, etc.)

// Base
export {
  Money,
  AccountType,
  TransactionType,
  BaseResponse,
  PaginatedResponse as ResponsePagination, // Rename to avoid confusion if needed, or keep as PaginatedResponse
  Theme,
  UserLevelType,
} from './proto/base/base';

// Transaction
export {
  Transaction,
  TransactionInput,
  TransactionQuery,
  ListTransactionsReq,
  ListTransactionsRes,
  CreateTransactionReq,
  CreateTransactionRes,
  UpdateTransactionReq,
  UpdateTransactionRes,
  DeleteTransactionReq,
  DeleteTransactionRes,
} from './proto/transaction/v1/transaction';

// Account
export {
  Account,
  AccountInput,
  AccountQuery,
  ListAccountsReq,
  ListAccountsRes,
  CreateAccountReq,
  CreateAccountRes,
  UpdateAccountReq,
  UpdateAccountRes,
  DeleteAccountReq,
  DeleteAccountRes,
  GetAccountTransactionCountReq,
  GetAccountTransactionCountRes,
} from './proto/account/v1/account';

// User
export {
  User,
  UserInput,
  GetUserProfileReq,
  GetUserProfileRes,
  UpdateUserProfileReq,
  UpdateUserProfileRes,
  UpdateThemePreferenceReq,
  UpdateThemePreferenceRes,
} from './proto/user/v1/user';

// Auth
export {
  AuthResponse,
  LoginReq,
  LoginRes,
  RegisterReq,
  RegisterRes,
  LogoutReq,
  LogoutRes,
  RefreshTokenReq,
  RefreshTokenRes,
  Generate2FAReq,
  Generate2FARes,
  Enable2FAReq,
  Enable2FARes,
  Disable2FAReq,
  Disable2FARes,
  TwoFactorSecret,
} from './proto/auth/v1/auth';

// Dashboard
export {
  DashboardSummary,
  MonthlyStats,
  DailyBalance,
  GetDashboardSummaryReq,
  GetDashboardSummaryRes,
  GetMonthlyStatsReq,
  GetMonthlyStatsRes,
  GetBalanceTrendReq,
  GetBalanceTrendRes,
} from './proto/dashboard/v1/dashboard';

// Aliases
import { LoginReq, RegisterReq } from './proto/auth/v1/auth';
export type LoginInput = LoginReq;
export type RegisterInput = RegisterReq;

// Enums / Types NOT in Protobuf
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum TransactionSortBy {
  DATE = 'date',
  AMOUNT = 'amount',
  CREATED_AT = 'created_at',
}
