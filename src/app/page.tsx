'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  User,
  Wallet,
  Category,
  Transaction,
  MonthlySummary as MonthlySummaryType,
  Budget,
  RecurringBill,
  Debt,
  AppSettings,
  TransactionType,
} from '@/lib/types';
import { ApiError, apiFetch, endpoints } from '@/lib/apiFetch';
import { AppShell } from '@/components/layout/AppShell';
import { NavTab } from '@/components/layout/BottomNav';
import { BalanceHeader } from '@/components/dashboard/BalanceHeader';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { WalletScroller } from '@/components/dashboard/WalletScroller';
import { MonthlySummary } from '@/components/dashboard/MonthlySummary';
import { TransactionList } from '@/components/transactions/TransactionList';
import { DashboardSkeleton } from '@/components/ui/LoadingSkeleton';
import { clearOfflineQueue } from '@/lib/offlineQueue';

const TransactionModal = dynamic(
  () => import('@/components/transactions/TransactionModal').then((m) => m.TransactionModal),
  { ssr: false }
);
const BudgetView = dynamic(
  () => import('@/components/budget/BudgetView').then((m) => m.BudgetView),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);
const BillsView = dynamic(
  () => import('@/components/bills/BillsView').then((m) => m.BillsView),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);
const DebtsView = dynamic(
  () => import('@/components/debts/DebtsView').then((m) => m.DebtsView),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);
const WalletsView = dynamic(
  () => import('@/components/wallets/WalletsView').then((m) => m.WalletsView),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);
const SettingsView = dynamic(
  () => import('@/components/settings/SettingsView').then((m) => m.SettingsView),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);
const ReportsView = dynamic(
  () => import('@/components/reports/ReportsView').then((m) => m.ReportsView),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);
const AssetsView = dynamic(
  () => import('@/components/assets/AssetsView').then((m) => m.AssetsView),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);
const EvaluationView = dynamic(
  () => import('@/components/evaluation/EvaluationView').then((m) => m.EvaluationView),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);

type BootstrapData = {
  wallets?: Wallet[];
  categories?: Category[];
  transactions?: Transaction[];
  budgets?: Budget[];
  bills?: RecurringBill[];
  debts?: Debt[];
  summary?: MonthlySummaryType;
  settings?: AppSettings;
};

export default function MainPage() {
  const router = useRouter();

  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Period State (Month & Year)
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  // Navigation & History State
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [_tabHistory, setTabHistory] = useState<NavTab[]>(['dashboard']);
  const [exitToast, setExitToast] = useState(false);
  const exitToastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Modal State
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txModalType, setTxModalType] = useState<TransactionType>('expense');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Application Data States
  const [reloadKey, setReloadKey] = useState(0);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [summary, setSummary] = useState<MonthlySummaryType>({
    month: currentMonth,
    year: currentYear,
    total_balance: 0,
    total_income: 0,
    total_expense: 0,
    net_cash_flow: 0,
    total_transfer: 0,
    bill_pending_count: 0,
    budget_over_count: 0,
    total_bills_pending_amount: 0,
    total_payable_due: 0,
    total_receivable_due: 0,
    safe_to_spend: 0,
    payable_unpaid_count: 0,
    receivable_unpaid_count: 0,
  });
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const bootstrapAbortRef = useRef<AbortController | null>(null);

  // 1. Check Authentication on Mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.replace('/login');
          return;
        }
        const data = await res.json();
        const userObj = data?.data?.user || (data?.data?.id ? data.data : null);
        if (data.success && userObj) {
          setUser(userObj);
        } else {
          router.replace('/login');
        }
      } catch {
        router.replace('/login');
      } finally {
        setIsAuthLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // 2. Fetch Bootstrap Data
  useEffect(() => {
    if (!user) return;
    let ignore = false;
    const controller = new AbortController();
    bootstrapAbortRef.current = controller;

    const loadData = async () => {
      setIsDataLoading(true);
      setDataError(null);
      try {
        const data = await apiFetch<BootstrapData>(endpoints.bootstrap(currentMonth, currentYear), {
          signal: controller.signal,
        });
        if (ignore) return;
        setWallets(data.wallets || []);
        setCategories(data.categories || []);
        setTransactions(data.transactions || []);
        setBudgets(data.budgets || []);
        setBills(data.bills || []);
        setDebts(data.debts || []);
        if (data.summary) setSummary(data.summary);
        if (data.settings) setSettings(data.settings);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (ignore) return;
        setDataError(err instanceof ApiError ? err.message : 'Terjadi kesalahan jaringan.');
      } finally {
        if (!ignore) {
          setIsDataLoading(false);
        }
      }
    };

    loadData();

    return () => {
      ignore = true;
      controller.abort();
      bootstrapAbortRef.current = null;
    };
  }, [user, currentMonth, currentYear, reloadKey]);

  // Handle Tab Navigation with History Stack
  const handleTabChange = useCallback((newTab: NavTab) => {
    if (newTab === activeTab) return;
    setTabHistory((prev) => [...prev, newTab]);
    setActiveTab(newTab);
    window.history.pushState({ tab: newTab }, '', '');
  }, [activeTab]);

  // Handle Mobile Back Button & Exit Confirmation
  useEffect(() => {
    window.history.replaceState({ tab: 'dashboard' }, '', '');

    const handlePopState = () => {
      // 1. If transaction modal is open, close it first
      if (isTxModalOpen) {
        setIsTxModalOpen(false);
        window.history.pushState({ tab: activeTab }, '', '');
        return;
      }

      // 2. If on non-dashboard tab, pop history back to previous tab
      if (activeTab !== 'dashboard') {
        setTabHistory((prev) => {
          const next = [...prev];
          next.pop(); // remove current tab
          const previous = next.length > 0 ? next[next.length - 1] : 'dashboard';
          setActiveTab(previous);
          return next.length > 0 ? next : ['dashboard'];
        });
        window.history.pushState({ tab: 'dashboard' }, '', '');
        return;
      }

      // 3. If on root dashboard tab, trigger double-back exit confirmation
      if (!exitToast) {
        setExitToast(true);
        window.history.pushState({ tab: 'dashboard' }, '', '');
        if (exitToastTimerRef.current) clearTimeout(exitToastTimerRef.current);
        exitToastTimerRef.current = setTimeout(() => {
          setExitToast(false);
        }, 2500);
      } else {
        setExitToast(false);
        window.history.back();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (exitToastTimerRef.current) clearTimeout(exitToastTimerRef.current);
    };
  }, [activeTab, isTxModalOpen, exitToast]);

  const handlePeriodChange = (month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  };

  const handleOpenAddModal = (type: TransactionType = 'expense') => {
    setEditingTransaction(null);
    setTxModalType(type);
    setIsTxModalOpen(true);
  };

  const handleEditTransaction = (trx: Transaction) => {
    setEditingTransaction(trx);
    setTxModalType(trx.type);
    setIsTxModalOpen(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    setDeleteError(null);
    try {
      await apiFetch(endpoints.transaction(id), { method: 'DELETE' });
      setReloadKey((k) => k + 1);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Gagal menghapus transaksi.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(endpoints.authLogout, { method: 'POST' });
      if (user) {
        await clearOfflineQueue(user.id);
      }
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  const refetch = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-text-muted">Memuat KasKeluarga...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={handleTabChange}
      onOpenAddModal={() => handleOpenAddModal('expense')}
      onOpenTypedModal={handleOpenAddModal}
      currentMonth={currentMonth}
      currentYear={currentYear}
      onPeriodChange={handlePeriodChange}
      userName={user.name}
      userEmail={user.email}
      familyName={settings?.family_name || user.family_name}
      userId={user.id}
      onLogout={handleLogout}
      onDataRefresh={refetch}
    >
      {/* Dynamic View Switcher */}
      {dataError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3">
          <p className="text-sm font-semibold text-red-700">{dataError}</p>
          <button
            type="button"
            onClick={refetch}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 active:opacity-80 transition-opacity"
          >
            Coba lagi
          </button>
        </div>
      ) : isDataLoading && transactions.length === 0 && wallets.length === 0 ? (
        <DashboardSkeleton />
      ) : activeTab === 'dashboard' ? (
        <div className="space-y-3.5 sm:space-y-5">
          {/* Total Balance & Safe-to-Spend Gradient Card */}
          <BalanceHeader
            totalBalance={summary.total_balance}
            walletCount={wallets.length}
            safeToSpend={summary.safe_to_spend}
            pendingBillsAmount={summary.total_bills_pending_amount}
            payableDueAmount={summary.total_payable_due}
            onManageWallets={() => handleTabChange('wallets')}
            onNavigateToDebts={() => handleTabChange('debts')}
          />

          {/* Quick Grid Actions */}
          <QuickActions
            onOpenTransactionModal={handleOpenAddModal}
            onNavigate={handleTabChange}
            pendingBillsCount={summary.bill_pending_count}
            overbudgetCount={summary.budget_over_count}
            unpaidDebtsCount={summary.payable_unpaid_count}
          />

          {/* Digital Wallets Scroller */}
          <WalletScroller
            wallets={wallets}
            onAddWallet={() => handleTabChange('wallets')}
            onTransfer={() => handleOpenAddModal('transfer')}
          />

          {/* Monthly Cashflow Summary (In / Out / Net) */}
          <MonthlySummary summary={summary} />

          {/* Recent Transactions List */}
          {deleteError && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {deleteError}
            </div>
          )}
          <TransactionList
            transactions={transactions}
            onDeleteTransaction={handleDeleteTransaction}
            onEditTransaction={handleEditTransaction}
            onOpenAddModal={handleOpenAddModal}
            isLoading={isDataLoading}
          />
        </div>
      ) : activeTab === 'transactions' ? (
        <>
          {deleteError && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {deleteError}
            </div>
          )}
          <TransactionList
            month={currentMonth}
            year={currentYear}
            refreshKey={reloadKey}
            onDeleteTransaction={handleDeleteTransaction}
            onEditTransaction={handleEditTransaction}
            onOpenAddModal={handleOpenAddModal}
          />
        </>
      ) : activeTab === 'debts' ? (
        <DebtsView
          debts={debts}
          wallets={wallets}
          summary={summary}
          budgets={budgets}
          onRefresh={refetch}
        />
      ) : activeTab === 'budget' ? (
        <BudgetView
          budgets={budgets}
          categories={categories}
          wallets={wallets}
          totalExpense={summary.total_expense}
          currentMonth={currentMonth}
          currentYear={currentYear}
          onRefresh={refetch}
          onNavigateToWallets={() => handleTabChange('wallets')}
        />
      ) : activeTab === 'bills' ? (
        <BillsView
          bills={bills}
          wallets={wallets}
          categories={categories}
          currentMonth={currentMonth}
          currentYear={currentYear}
          onRefresh={refetch}
        />
      ) : activeTab === 'wallets' ? (
        <WalletsView
          wallets={wallets}
          onRefresh={refetch}
          onOpenTransfer={() => handleOpenAddModal('transfer')}
        />
      ) : activeTab === 'reports' ? (
        <ReportsView
          summary={summary}
          currentMonth={currentMonth}
          currentYear={currentYear}
          onPeriodChange={handlePeriodChange}
        />
      ) : activeTab === 'evaluation' ? (
        <EvaluationView
          summary={summary}
          currentMonth={currentMonth}
          currentYear={currentYear}
          debts={debts}
          budgets={budgets}
          wallets={wallets}
        />
      ) : activeTab === 'assets' ? (
        <AssetsView
          onRefreshParent={refetch}
        />
      ) : activeTab === 'settings' ? (
        <SettingsView
          user={user}
          settings={settings}
          onRefresh={refetch}
          onLogout={handleLogout}
        />
      ) : null}

      {/* Global Add/Edit Transaction Modal */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTransaction(null);
        }}
        initialType={txModalType}
        editingTransaction={editingTransaction}
        wallets={wallets}
        categories={categories}
        userId={user.id}
        onSuccess={refetch}
      />

      {/* Mobile Back Exit Toast */}
      {exitToast && (
        <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 bg-text text-background px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold animate-fade-in flex items-center gap-2 pointer-events-none whitespace-nowrap">
          <span>Tekan sekali lagi untuk keluar dari aplikasi</span>
        </div>
      )}
    </AppShell>
  );
}
