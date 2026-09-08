import { ApiResponse } from './types';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Timeout bawaan: request yang menggantung dihentikan, bukan menggantung selamanya. */
const DEFAULT_TIMEOUT_MS = 15_000;

async function request<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<ApiResponse<T>> {
  const { json, timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init as (RequestInit & { json?: unknown; timeoutMs?: number }) ?? {};
  const signal = rest.signal ?? (typeof AbortSignal !== 'undefined' ? AbortSignal.timeout(timeoutMs) : undefined);
  const res = await fetch(path, { ...rest, signal, body: json ? JSON.stringify(json) : undefined, headers: { 'Content-Type': 'application/json', ...rest.headers } });
  let body: ApiResponse<T> | null = null;
  try { body = await res.json(); } catch { /* biarkan null */ }
  // Sesi mati tengah jalan: kembalikan ke login (kecuali pemanggil auth sendiri).
  if (res.status === 401 && typeof window !== 'undefined' && !path.startsWith('/api/auth/')) {
    window.location.href = '/api/auth/login?callback=' + encodeURIComponent(window.location.pathname);
    return { success: false, error: 'Unauthorized' };
  }
  if (!res.ok || !body?.success) {
    throw new ApiError(body?.error || 'Terjadi kesalahan jaringan.', res.status);
  }
  return body;
}

export async function apiFetch<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const body = await request<T>(path, init);
  return body.data as T;
}

/** Seperti apiFetch, tetapi juga mengembalikan metadata tambahan (mis. total untuk paginasi). */
export async function apiFetchMeta<T>(
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<{ data: T; total?: number }> {
  const body = await request<T>(path, init);
  const meta = body as ApiResponse<T> & { total?: number };
  return { data: body.data as T, total: meta.total };
}

export const endpoints = {
  authLogin: '/api/auth/login',
  authRegister: '/api/auth/register',
  authLogout: '/api/auth/logout',
  bootstrap: (month: number, year: number) => `/api/dashboard/bootstrap?month=${month}&year=${year}`,
  transactions: '/api/transactions',
  transaction: (id: string) => `/api/transactions/${id}`,
  transactionsQuery: (params: {
    month?: number;
    year?: number;
    type?: string;
    wallet_id?: string;
    category_id?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    limit?: number;
    offset?: number;
    sort?: 'date' | 'amount';
    order?: 'ASC' | 'DESC';
  }) => {
    const sp = new URLSearchParams();
    if (params.month !== undefined) sp.set('month', String(params.month));
    if (params.year !== undefined) sp.set('year', String(params.year));
    if (params.type && params.type !== 'all') sp.set('type', params.type);
    if (params.wallet_id) sp.set('wallet_id', params.wallet_id);
    if (params.category_id) sp.set('category_id', params.category_id);
    if (params.start_date) sp.set('start_date', params.start_date);
    if (params.end_date) sp.set('end_date', params.end_date);
    if (params.search?.trim()) sp.set('search', params.search.trim());
    if (params.limit !== undefined) sp.set('limit', String(params.limit));
    if (params.offset !== undefined) sp.set('offset', String(params.offset));
    if (params.sort) sp.set('sort', params.sort);
    if (params.order) sp.set('order', params.order);
    const qs = sp.toString();
    return `/api/transactions${qs ? `?${qs}` : ''}`;
  },
  wallets: '/api/wallets',
  wallet: (id: string) => `/api/wallets/${id}`,
  reconcileWallet: (id: string) => `/api/wallets/${id}/reconcile`,
  categories: '/api/categories',
  category: (id: string) => `/api/categories/${id}`,
  budgets: '/api/budgets',
  budget: (id: string) => `/api/budgets/${id}`,
  budgetAiRecommend: '/api/budgets/ai/recommend',
  bills: '/api/bills',
  bill: (id: string) => `/api/bills/${id}`,
  payBill: (id: string) => `/api/bills/${id}/pay`,
  autoProcessBills: (month: number, year: number) => `/api/bills/auto-process?month=${month}&year=${year}`,
  debts: '/api/debts',
  debt: (id: string) => `/api/debts/${id}`,
  payDebt: (id: string) => `/api/debts/${id}/pay`,
  assets: '/api/assets',
  asset: (id: string) => `/api/assets/${id}`,
  sellAsset: (id: string) => `/api/assets/${id}/sell`,
  reportsMonthly: (month: number, year: number) => `/api/reports/monthly?month=${month}&year=${year}`,
  reportsCategory: (month: number, year: number) => `/api/reports/category?month=${month}&year=${year}`,
  reportsYearly: (year: number) => `/api/reports/yearly?year=${year}`,
  insights: '/api/insights',
  settings: '/api/settings',
  resetData: '/api/settings/reset-data',
  goals: '/api/goals',
  goal: (id: string) => `/api/goals/${id}`,
  contributeGoal: (id: string) => `/api/goals/${id}/contribute`,
  aiParseReceipt: '/api/ai/parse-receipt',
  aiMerchantMap: '/api/ai/merchant-map',
  backupExport: '/api/backup/export',
  backupImport: '/api/backup/import',
  households: '/api/households',
  householdsJoin: '/api/households/join',
  householdMember: (id: string) => `/api/households/members/${id}`,
  householdReport: (month: number, year: number) => `/api/households/report?month=${month}&year=${year}`,
  financialEvents: '/api/events',
  financialEvent: (id: string) => `/api/events/${id}`,
  subscriptions: '/api/subscriptions',
  subscription: (id: string) => `/api/subscriptions/${id}`,
  budgetTemplates: '/api/budgets/templates',
  budgetTemplate: (id: string) => `/api/budgets/templates/${id}`,
  applyBudgetTemplate: '/api/budgets/templates/apply',
};
