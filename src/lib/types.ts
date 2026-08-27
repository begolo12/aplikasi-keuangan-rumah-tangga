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
  reconciled_at?: string | null;
  last_reconciled_balance?: number | null;
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
  asset_id?: string | null;
  asset_name?: string | null;
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

export type RecurringType = 'expense' | 'income';

export interface RecurringBill {
  id: string;
  user_id: string;
  type?: RecurringType;
  title: string;
  amount: number;
  due_day: number;
  category_id?: string | null;
  category_name?: string | null;
  wallet_id?: string | null;
  wallet_name?: string | null;
  asset_id?: string | null;
  asset_name?: string | null;
  auto_record?: boolean;
  is_active: boolean;
  is_paid?: boolean;
  paid_date?: string | null;
  days_until_due?: number;
  status?: 'paid' | 'due_today' | 'overdue' | 'due_soon' | 'upcoming';
  created_at: string;
}

export interface FinancialSafetyPlan {
  monthly_budget: number;
  reserve_4_months: number; // 4x Anggaran
  risk_buffer_10_pct: number; // 10% dari cadangan 4 bulan (0.4x Anggaran)
  total_min_required: number; // Cadangan 4 Bulan + Cadangan Risiko (4.4x Anggaran)
  current_cash: number; // Saldo kas/tabungan saat ini
  gap_needed: number; // Kekurangan uang yang harus dimiliki dulu
  progress_pct: number;
  can_expand_expense: boolean; // True jika current_cash >= total_min_required
  cold_money_amount: number; // Uang dingin yang bebas dipakai
}

export interface ColdMoneyInfo {
  total_liquid_cash: number;
  safety_reserve_required: number; // 4.4x Anggaran
  pending_obligations: number; // Tagihan & Hutang
  cold_money: number; // Uang dingin riil = max(0, Kas - Cadangan 4.4x - Kewajiban)
  is_available: boolean;
  status_title: string;
  recommendations: string[];
}

export interface FinancialRatiosResult {
  der_ratio: number; // Debt to Equity Ratio (%)
  dar_ratio: number; // Debt to Asset Ratio (%)
  dsr_ratio: number; // Debt Service Ratio (%)
  liquidity_months: number; // Liquidity / Emergency reserve (Months)
  savings_ratio: number; // Savings Rate (%)
  oer_ratio: number; // Operating Expense Ratio (%)
  health_score: number; // 0 - 100
  condition_status: 'excellent' | 'good' | 'warning' | 'critical';
  condition_title: string;
  verdict_summary: string;
  ratio_details: {
    name: string;
    value: string;
    ideal: string;
    status: 'safe' | 'warning' | 'danger';
    description: string;
  }[];
  action_recommendations: string[];
}

export interface ExpenseProjection {
  planned_budget: number; // Rencana Anggaran Awal (mis. 1.500.000)
  current_spent: number; // Realisasi sampai hari ini (mis. 1.000.000)
  remaining_estimated: number; // Sisa estimasi kebutuhan (mis. 300.000)
  projected_total: number; // Proyeksi akhir bulan = Realisasi + Sisa (mis. 1.300.000)
  projected_savings: number; // Potensi hemat vs rencana = Rencana - Proyeksi (mis. 200.000)
  savings_percentage: number; // % penghematan vs rencana
  days_passed: number;
  days_in_month: number;
  burn_rate_daily: number;
}

export interface DebtSimulationResult {
  principal: number;
  tenor_months: number;
  annual_rate_pct: number;
  monthly_installment: number;
  total_interest: number;
  total_payment: number;
  dti_ratio: number; // Debt-to-Income %
  cashflow_impact_pct: number;
  safety_status: 'safe' | 'warning' | 'danger';
  safety_score: number;
  conclusion: string;
  recommendations: string[];
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
  market_diff_purchase?: number; // Taksiran Pasar - Harga Beli (+/-)
  market_diff_book?: number; // Taksiran Pasar - Nilai Buku (+/-)
  market_diff_pct?: number; // % perubahan terhadap harga beli
  is_market_gain?: boolean; // True jika taksiran pasar >= harga beli
  is_sold?: boolean; // Status aset terjual / dilepas
  sold_date?: string | null;
  selling_price?: number | null;
  gain_loss?: number | null; // Untung (+) atau Rugi (-) = Harga Jual - Nilai Buku Saat Terjual
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
