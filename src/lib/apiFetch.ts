import { ApiResponse } from './types';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(path, {
    ...rest,
    headers: { ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(rest.headers ?? {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  let body: ApiResponse<T> | null = null;
  try { body = await res.json(); } catch { /* biarkan null */ }
  if (!res.ok || !body?.success) {
    throw new ApiError(body?.error || 'Terjadi kesalahan jaringan.', res.status);
  }
  return body.data as T;
}

export const endpoints = {
  authMe: '/api/auth/me',
  authLogin: '/api/auth/login',
  authRegister: '/api/auth/register',
  authLogout: '/api/auth/logout',
  bootstrap: (month: number, year: number) => `/api/dashboard/bootstrap?month=${month}&year=${year}`,
  transactions: '/api/transactions',
  transaction: (id: string) => `/api/transactions/${id}`,
  wallets: '/api/wallets',
  wallet: (id: string) => `/api/wallets/${id}`,
  categories: '/api/categories',
  category: (id: string) => `/api/categories/${id}`,
  budgets: '/api/budgets',
  budget: (id: string) => `/api/budgets/${id}`,
  bills: '/api/bills',
  bill: (id: string) => `/api/bills/${id}`,
  payBill: (id: string) => `/api/bills/${id}/pay`,
  debts: '/api/debts',
  debt: (id: string) => `/api/debts/${id}`,
  payDebt: (id: string) => `/api/debts/${id}/pay`,
  assets: '/api/assets',
  asset: (id: string) => `/api/assets/${id}`,
  reportsMonthly: (month: number, year: number) => `/api/reports/monthly?month=${month}&year=${year}`,
  reportsCategory: (month: number, year: number) => `/api/reports/category?month=${month}&year=${year}`,
  settings: '/api/settings',
  backupExport: '/api/backup/export',
  backupImport: '/api/backup/import',
};
