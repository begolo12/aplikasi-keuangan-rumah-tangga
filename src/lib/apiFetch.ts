import { ApiResponse } from './types';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Timeout bawaan: request yang menggantung dihentikan, bukan menggantung selamanya. */
const DEFAULT_TIMEOUT_MS = 15_000;

async function request<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<ApiResponse<T>> {
  const { json, timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init as (RequestInit & { json?: unknown; timeoutMs?: number }) ?? {};
  const signal = rest.signal ?? (typeof AbortSignal !== 'undefined' ? AbortSignal.timeout(timeoutMs) : undefined);
  const res = await fetch(path, {
    ...rest,
    signal,
    headers: { ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(rest.headers ?? {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  let body: ApiResponse<T> | null = null;
  try { body = await res.json(); } catch { /* biarkan null */ }
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
  authMe: '/api/auth/me',
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
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const sp = new URLSearchParams();
    if (params.month !== undefined) sp.set('month', String(params.month));
    if (params.year !== undefined) sp.set('year', String(params.year));
    if (params.type && params.type !== 'all') sp.set('type', params.type);
    if (params.wallet_id) sp.set('wallet_id', params.wallet_id);
    if (params.search?.trim()) sp.set('search', params.search.trim());
    if (params.limit !== undefined) sp.set('limit', String(params.limit));
    if (params.offset !== undefined) sp.set('offset', String(params.offset));
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
  settings: '/api/settings',
  goals: '/api/goals',
  goal: (id: string) => `/api/goals/${id}`,
  contributeGoal: (id: string) => `/api/goals/${id}/contribute`,
  aiParseReceipt: '/api/ai/parse-receipt',
  backupExport: '/api/backup/export',
  backupImport: '/api/backup/import',
};

