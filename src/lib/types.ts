export type WalletType = 'cash' | 'bank' | 'ewallet' | 'savings';
export type TransactionType = 'expense' | 'income' | 'transfer';
export type CategoryType = 'expense' | 'income';

export interface User {
  id: string;
  name: string;
  email: string;
  family_name: string;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  name: string;
  type: WalletType;
  balance: number;
  icon: string;
  color: string;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  is_default: boolean;
  sort_order: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  admin_fee: number;
  category_id?: string | null;
  category_name?: string | null;
  category_icon?: string | null;
  category_color?: string | null;
  wallet_id: string;
  wallet_name?: string | null;
  wallet_icon?: string | null;
  to_wallet_id?: string | null;
  to_wallet_name?: string | null;
  description?: string | null;
  date: string; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  category_name?: string | null;
  category_icon?: string | null;
  category_color?: string | null;
  monthly_limit: number;
  spent: number;
  remaining: number;
  percentage: number;
  month: number;
  year: number;
  created_at: string;
}

export interface RecurringBill {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  due_day: number;
  category_id?: string | null;
  category_name?: string | null;
  wallet_id?: string | null;
  wallet_name?: string | null;
  is_active: boolean;
  is_paid?: boolean;
  paid_date?: string | null;
  days_until_due?: number;
  status?: 'paid' | 'due_today' | 'overdue' | 'due_soon' | 'upcoming';
  created_at: string;
}

export interface BillPayment {
  id: string;
  user_id: string;
  bill_id: string;
  paid_date: string;
  amount: number;
  month: number;
  year: number;
  created_at: string;
}

export interface AppSettings {
  id: string;
  user_id: string;
  family_name: string;
  currency: string;
  updated_at: string;
}

export type DebtType = 'payable' | 'receivable';
export type DebtStatus = 'unpaid' | 'partial' | 'paid';

export interface Debt {
  id: string;
  user_id: string;
  type: DebtType;
  person_name: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date?: string | null;
  notes?: string | null;
  status: DebtStatus;
  days_until_due?: number;
  is_overdue?: boolean;
  created_at: string;
  updated_at: string;
}

export interface DebtPayment {
  id: string;
  debt_id: string;
  user_id: string;
  wallet_id: string;
  wallet_name?: string | null;
  amount: number;
  payment_date: string;
  notes?: string | null;
  created_at: string;
}

export type AssetCategory =
  | 'kendaraan'
  | 'elektronik'
  | 'properti'
  | 'perhiasan_emas'
  | 'alat_usaha'
  | 'lainnya';

export type DepreciationMethod = 'straight_line' | 'declining_balance' | 'none';

export interface Asset {
  id: string;
  user_id: string;
  name: string;
  category: AssetCategory;
  purchase_date: string; // YYYY-MM-DD
  purchase_price: number;
  current_value: number; // calculated or user-adjusted current market value
  depreciation_method: DepreciationMethod;
  useful_life_years: number;
  salvage_value: number;
  notes?: string | null;
  accumulated_depreciation?: number;
  book_value?: number;
  monthly_depreciation?: number;
  annual_depreciation?: number;
  age_months?: number;
  created_at: string;
  updated_at: string;
}

export interface MonthlySummary {
  month: number;
  year: number;
  total_balance: number;
  total_income: number;
  total_expense: number;
  net_cash_flow: number;
  total_transfer: number;
  bill_pending_count: number;
  budget_over_count: number;
  total_bills_pending_amount?: number;
  total_payable_due?: number;
  total_receivable_due?: number;
  safe_to_spend?: number;
  payable_unpaid_count?: number;
  receivable_unpaid_count?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}
