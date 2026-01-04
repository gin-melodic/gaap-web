import {
  Building2,
  CreditCard,
  Briefcase,
  Receipt,
  LucideProps
} from 'lucide-react';

// Simulated exchange rates (relative to CNY)
export const EXCHANGE_RATES: Record<string, number> = {
  CNY: 1,
  USD: 7.23,
  HKD: 0.92,
  EUR: 7.85,
  JPY: 0.048,
  GBP: 9.12
};

// Theme definitions
export const THEMES = [
  {
    id: 'default',
    name: 'Classic Blue',
    colors: {
      primary: '#4F46E5', // Indigo-600
      bg: '#F8FAFC',      // Slate-50
      card: '#FFFFFF',
      text: '#1E293B',    // Slate-800
      muted: '#64748B',   // Slate-500
      border: '#E2E8F0'   // Slate-200
    }
  },
  {
    id: 'rose',
    name: 'Retro Red (Rose)',
    colors: {
      primary: '#D13C58',
      bg: '#E3D4B5',
      card: '#FDFBF7',
      text: '#4A0404',
      muted: '#8C6B6B',
      border: '#D4C5A9'
    }
  },
  {
    id: 'midnight',
    name: 'Midnight Purple',
    colors: {
      primary: '#3A022B',
      bg: '#E3E7F3',
      card: '#FFFFFF',
      text: '#2D1B36',
      muted: '#7A6E85',
      border: '#D1D5DB'
    }
  },
  {
    id: 'dark',
    name: 'Night Mode (Dark)',
    isDark: true,
    colors: {
      primary: '#D4C5B0', // Light Taupe for contrast
      bg: '#2A2A2E',
      card: '#38383C',
      text: '#E3E3E3',
      muted: '#A1A1AA',
      border: '#45454A'
    }
  },
  {
    id: 'pop',
    name: 'Pop Style (Pop)',
    colors: {
      primary: '#FF204F',
      bg: '#FFE8AB',
      card: '#FFFDF5',
      text: '#4A3B2A',
      muted: '#9C8C74',
      border: '#E6D5A8'
    }
  },
  {
    id: 'cyber',
    name: 'Cyberpunk (Cyber)',
    isDark: true,
    colors: {
      primary: '#2DC8E1',
      bg: '#4C2F6C',
      card: '#5D3A85',
      text: '#FFFFFF',
      muted: '#D8B4E2',
      border: '#7A5499'
    }
  }
];

// Account type definitions
export const ACCOUNT_TYPES: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<LucideProps> }> = {
  ASSET: { label: 'Assets', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: Building2 },
  LIABILITY: { label: 'Liabilities', color: 'text-red-600', bg: 'bg-red-100', icon: CreditCard },
  INCOME: { label: 'Income', color: 'text-blue-600', bg: 'bg-blue-100', icon: Briefcase },
  EXPENSE: { label: 'Expenses', color: 'text-orange-600', bg: 'bg-orange-100', icon: Receipt },
};

// Initial account data (includes parent-child structure)
export const INITIAL_ACCOUNTS = [
  // Parent account: Chase Bank (Logical container)
  { id: 'bank_cmb', name: 'Chase Bank', type: 'ASSET', isGroup: true, balance: 0, currency: 'CNY' },
  // Child account: Checking Account
  { id: 'a1', parentId: 'bank_cmb', name: 'Checking Account', type: 'ASSET', balance: 25400.00, currency: 'CNY' },
  // Child account: USD Savings
  { id: 'a1_usd', parentId: 'bank_cmb', name: 'USD Savings', type: 'ASSET', balance: 1200.00, currency: 'USD' },
  // Child account: JPY Travel Fund
  { id: 'a1_jpy', parentId: 'bank_cmb', name: 'Travel Fund (JPY)', type: 'ASSET', balance: 50000.00, currency: 'JPY' },

  { id: 'a2', name: 'PayPal', type: 'ASSET', balance: 450.00, currency: 'USD' },
  { id: 'a3', name: 'Credit Card', type: 'LIABILITY', balance: 1200.00, currency: 'CNY' },

  { id: 'inc_salary', name: 'Salary', type: 'INCOME', balance: 0, currency: 'CNY' },
  { id: 'inc_bonus', name: 'Year End Bonus', type: 'INCOME', balance: 0, currency: 'CNY' }, // Demonstrate multiple incomes

  { id: 'exp_food', name: 'Dining & Groceries', type: 'EXPENSE', balance: 0, currency: 'CNY' },
  { id: 'exp_transport', name: 'Transport', type: 'EXPENSE', balance: 0, currency: 'CNY' },

  { id: 'a7', name: 'Investment Account', type: 'ASSET', balance: 50000.00, currency: 'CNY' },
  { id: 'a8', name: 'Mortgage Loan', type: 'LIABILITY', balance: 800000.00, currency: 'CNY' },
];

// Initial transaction data
export const INITIAL_TRANSACTIONS = [
  { id: 't1', date: '2023-11-24', from: 'inc_salary', to: 'a1', amount: 15000.00, currency: 'CNY', note: 'November Salary', type: 'INCOME' },
  { id: 't2', date: '2023-11-25', from: 'a1', to: 'a3', amount: 1200.00, currency: 'CNY', note: 'Pay off Credit Card', type: 'TRANSFER' },
  { id: 't3', date: '2023-11-25', from: 'a2', to: 'exp_food', amount: 12.50, currency: 'USD', note: 'AWS Subscription', type: 'EXPENSE' },
];
