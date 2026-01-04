// ============== Enums ==============
export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER',
}

export enum UserPlan {
  FREE = 'FREE',
  PRO = 'PRO',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum TransactionSortBy {
  DATE = 'date',
  AMOUNT = 'amount',
  CREATED_AT = 'created_at',
}

// ============== Common ==============
export interface PaginatedResponse<T> {
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
  data: T[];
}

// ============== Account ==============
export interface Account {
  id: string;
  parentId?: string;
  name: string;
  type: AccountType;
  isGroup: boolean;
  balance: number;
  currency: string;
  defaultChildId?: string;
  date?: string;
  number?: string;
  remarks?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AccountInput {
  parentId?: string;
  name: string;
  type: AccountType;
  isGroup?: boolean;
  balance?: number;
  currency: string;
  defaultChildId?: string;
  date?: string;
  number?: string;
  remarks?: string;
}

export interface AccountQuery {
  page?: number;
  limit?: number;
  type?: AccountType;
  parentId?: string;
  [key: string]: string | number | boolean | undefined;
}

// ============== Transaction ==============
export interface Transaction {
  id: string;
  date: string;
  from: string;
  to: string;
  amount: number;
  currency: string;
  note: string;
  type: TransactionType;
  created_at?: string;
  updated_at?: string;
}

export interface TransactionInput {
  date: string;
  from: string;
  to: string;
  amount: number;
  currency: string;
  note?: string;
  type: TransactionType;
}

export interface TransactionQuery {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  accountId?: string;
  type?: TransactionType;
  sortBy?: TransactionSortBy;
  sortOrder?: SortOrder;
  [key: string]: string | number | boolean | undefined;
}

// ============== User ==============
export interface User {
  email: string;
  nickname: string;
  avatar?: string | null;
  plan: UserPlan;
  twoFactorEnabled?: boolean;
  mainCurrency?: string;
}

// ============== Auth ==============
export interface AuthResponse {
  accessToken?: string;
  refreshToken?: string;
  user?: User;
}

export interface LoginInput {
  email: string;
  password: string;
  code?: string;
  cf_turnstile_response: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  nickname: string;
  cf_turnstile_response?: string;
}

export interface TwoFactorSecret {
  secret: string;
  url: string;
}

// ============== Dashboard ==============
export interface DailyBalance {
  date: string;
  balances: Record<string, number>;
}

export interface BalanceTrendResponse {
  data: DailyBalance[];
}
