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
  ParsedReceiptResult,
  FinancialEvent,
  Subscription,
} from '@/lib/types';
import { getFinancialEvents } from '@/lib/eventsApi';
import { ApiError, apiFetch, endpoints } from '@/lib/apiFetch';
import { AppShell } from '@/components/layout/AppShell';
import { NavTab } from '@/components/layout/BottomNav';
import { BalanceHeader } from '@/components/dashboard/BalanceHeader';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { WalletScroller } from '@/components/dashboard/WalletScroller';
import { MonthlySummary } from '@/components/dashboard/MonthlySummary';
import { InsightWidget } from '@/components/dashboard/InsightWidget';
import { TransactionList } from '@/components/transactions/TransactionList';
import { DashboardSkeleton } from '@/components/ui/LoadingSkeleton';
import { clearOfflineQueue } from '@/lib/offlineQueue';
import { ReceiptParserModal } from '@/components/transactions/ReceiptParserModal';
import { HouseholdState } from '@/lib/types';
import { ReminderScheduler } from '@/components/pwa/ReminderScheduler';
import { LandingView } from '@/components/landing/LandingView';
import { useToast } from '@/components/ui/Toast';
import { Alert } from '@/components/ui/Alert';


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
const SubscriptionsView = dynamic(
  () => import('@/components/subscriptions/SubscriptionsView').then((m) => m.SubscriptionsView),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);
const DebtsView = dynamic(
  () => import('@/components/debts/DebtsView').then((m) => m.DebtsView),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);
const GoalsView = dynamic(
  () => import('@/components/goals/GoalsView').then((m) => m.GoalsView),
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
const CalendarView = dynamic(
  () => import('@/components/calendar/CalendarView').then((m) => m.CalendarView),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);
const HouseholdView = dynamic(
  () => import('@/components/household/HouseholdView').then((m) => m.HouseholdView),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);
const EventModal = dynamic(
  () => import('@/components/events/EventModal').then((m) => m.EventModal),
  { ssr: false }
);

type BootstrapData = {
  wallets?: Wallet[];
  categories?: Category[];
  transactions?: Transaction[];
  budgets?: Budget[];
  bills?: RecurringBill[];
  debts?: Debt[];
  subscriptions?: Subscription[];
  summary?: MonthlySummaryType;
  settings?: AppSettings;
};

const NAV_TABS: NavTab[] = [
  'dashboard',
  'transactions',
  'calendar',
  'budget',
  'reports',
  'evaluation',
  'wallets',
  'bills',
  'subscriptions',
  'debts',
  'assets',
  'goals',
  'household',
  'settings',
];

/** Jumlah transaksi terbaru yang ditampilkan di dashboard (sisanya via "Lihat semua"). */
const DASHBOARD_TX_LIMIT = 5;

// Baca tab aktif tersimpan: history.state → sessionStorage → localStorage.
// (Robust untuk F5/soft vs hard reload; null bila tidak ada yang tersimpan.)
function readSavedTab(): NavTab | null {
  if (typeof window === 'undefined') return null;
  try {
    const fromHistory = (window.history.state as { tab?: string } | null)?.tab;
    if (fromHistory && NAV_TABS.includes(fromHistory as NavTab)) return fromHistory as NavTab;
  } catch {
    // abaikan
  }
  try {
    const saved = window.sessionStorage.getItem('kaskeluarga-active-tab');
    if (saved && NAV_TABS.includes(saved as NavTab)) return saved as NavTab;
  } catch {
    // abaikan
  }
  try {
    const local = window.localStorage.getItem('kaskeluarga-active-tab');
    if (local && NAV_TABS.includes(local as NavTab)) return local as NavTab;
  } catch {
    // abaikan
  }
  return null;
}

function getInitialTab(): NavTab {
  return readSavedTab() ?? 'dashboard';
}

// Simpan tab aktif ke kedua storage (sessionStorage untuk soft reload, localStorage untuk hard reload).
function persistTab(tab: NavTab): void {
  try {
    window.sessionStorage.setItem('kaskeluarga-active-tab', tab);
  } catch {}
  try {
    window.localStorage.setItem('kaskeluarga-active-tab', tab);
  } catch {}
}

export default function MainPage() {
  const router = useRouter();
  const { notify } = useToast();

  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Period State (Month & Year) — lazy init agar tidak jitter tiap render
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());

  // Navigation & History State
  const [activeTab, setActiveTab] = useState<NavTab>(getInitialTab);
  const [tabHistory, setTabHistory] = useState<NavTab[]>(() => [getInitialTab()]);
  const [exitToast, setExitToast] = useState(false);
  const exitToastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasRestoredTabRef = useRef(false);

  // Modal State
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txModalType, setTxModalType] = useState<TransactionType>('expense');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isReceiptParserOpen, setIsReceiptParserOpen] = useState(false);
  const [parsedReceiptData, setParsedReceiptData] = useState<ParsedReceiptResult | null>(null);

  // Financial Events Modal State
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FinancialEvent | null>(null);

  // Application Data States
  const [financialEvents, setFinancialEvents] = useState<FinancialEvent[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
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
  const [householdActivityCount, setHouseholdActivityCount] = useState(0);
  const bootstrapAbortRef = useRef<AbortController | null>(null);


  // 1. Restore persisted tab (hydration-safe, robust untuk F5 soft-reload vs Ctrl+Shift+R hard-reload).
  // getInitialTab() gagal saat SSR/hydration → selalu 'dashboard'. Efek ini memperbaiki setelah mount
  // dengan membaca berlapis history.state → sessionStorage → localStorage. Juga tangani bfcache pageshow.
  useEffect(() => {
    if (hasRestoredTabRef.current) return;
    hasRestoredTabRef.current = true;

    const saved = readSavedTab();
    if (saved && saved !== activeTab) {
      queueMicrotask(() => {
        setActiveTab(saved);
        setTabHistory([saved]);
      });
      try {
        window.history.replaceState({ tab: saved }, '', '');
      } catch {}
    } else {
      try {
        window.history.replaceState({ tab: activeTab }, '', '');
      } catch {}
    }

    const handlePageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      const restored = readSavedTab();
      if (restored) {
        setActiveTab((prev) => (prev !== restored ? restored : prev));
        setTabHistory((prev) => (prev[0] !== restored ? [restored] : prev));
        try {
          window.history.replaceState({ tab: restored }, '', '');
        } catch {}
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 1. Check Authentication on Mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          setIsAuthLoading(false);
          return;
        }
        const data = await res.json();
        const userObj = data?.data?.user || (data?.data?.id ? data.data : null);
        if (data.success && userObj) {
          setUser(userObj);
        }
      } catch {
        // Not authenticated
      } finally {
        setIsAuthLoading(false);
      }
    };

    checkAuth();
  }, []);

  // 1b. Handle URL Search Params Action (e.g. from PWA Shortcuts & push notification)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const consumeAction = (tab: NavTab) => {
      window.history.replaceState({ tab }, '', '/');
    };
    if (action === 'new-expense') {
      queueMicrotask(() => {
        setTxModalType('expense');
        setEditingTransaction(null);
        setIsTxModalOpen(true);
      });
      consumeAction('dashboard');
    } else if (action === 'new-income') {
      queueMicrotask(() => {
        setTxModalType('income');
        setEditingTransaction(null);
        setIsTxModalOpen(true);
      });
      consumeAction('dashboard');
    } else if (action === 'scan-receipt') {
      queueMicrotask(() => {
        setIsReceiptParserOpen(true);
      });
      consumeAction('dashboard');
    } else if (action === 'tab-bills' || action === 'tab-calendar') {
      // Deep link dari notifikasi push pengingat tagihan/event jatuh tempo.
      const target: NavTab = action === 'tab-bills' ? 'bills' : 'calendar';
      queueMicrotask(() => {
        setActiveTab(target);
        setTabHistory([target]);
      });
      persistTab(target);
      consumeAction(target);
    }
  }, []);

  // 2. Fetch Bootstrap Data + Financial Events
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
        setSubscriptions(data.subscriptions || []);
        if (data.summary) setSummary(data.summary);
        if (data.settings) setSettings(data.settings);
        
        // Financial events + badge keluarga paralel: gagal muat tidak boleh menggagalkan bootstrap.
        const [events, household] = await Promise.allSettled([
          getFinancialEvents(user.id),
          apiFetch<HouseholdState>(endpoints.households, { signal: controller.signal }),
        ]);
        setFinancialEvents(events.status === 'fulfilled' ? events.value || [] : []);
        setHouseholdActivityCount(
          household.status === 'fulfilled' ? household.value.new_activity_count || 0 : 0
        );
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
    setActiveTab(newTab);
    setTabHistory((prev) => [...prev, newTab]);
    persistTab(newTab);
    window.history.pushState({ tab: newTab }, '', '');
  }, [activeTab]);

  // Event Handlers for Financial Events
  const handleOpenEventModal = (event?: FinancialEvent) => {
    if (event) {
      setEditingEvent(event);
    } else {
      setEditingEvent(null);
    }
    setIsEventModalOpen(true);
  };

  const handleEditEvent = (event: FinancialEvent) => {
    setEditingEvent(event);
    setIsEventModalOpen(true);
  };

  const handleEventSuccess = () => {
    setIsEventModalOpen(false);
    setEditingEvent(null);
    setReloadKey(prev => prev + 1);
  };
  const handlePeriodChange = (month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  };


  // Handle Mobile Back Button & Exit Confirmation
  // Sinkronisasi history awal ditangani efek restore di atas (hydration-safe).
  // Model state-driven: setiap entry history membawa { tab }, popstate membaca
  // event.state.tab langsung — tanpa pushState ulang yang membuat history bertumpuk.
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // 1. Modal terbuka: tutup dulu, lalu pasang ulang entry intersepsi back.
      if (isTxModalOpen || isEventModalOpen || isReceiptParserOpen) {
        setIsTxModalOpen(false);
        setIsEventModalOpen(false);
        setIsReceiptParserOpen(false);
        setEditingTransaction(null);
        setEditingEvent(null);
        window.history.pushState({ tab: activeTab }, '', '');
        return;
      }

      const target = (e.state as { tab?: string } | null)?.tab;
      const validTarget: NavTab | null =
        target && NAV_TABS.includes(target as NavTab) ? (target as NavTab) : null;

      // 2. Ada tab valid di history: navigasi langsung tanpa pushState ulang.
      if (validTarget && validTarget !== activeTab) {
        setActiveTab(validTarget);
        setTabHistory([validTarget]);
        persistTab(validTarget);
        return;
      }

      // 3. Di beranda tanpa entry tab: konfirmasi keluar dua-kali-tekan.
      if (activeTab !== 'dashboard') {
        setActiveTab('dashboard');
        setTabHistory(['dashboard']);
        persistTab('dashboard');
        window.history.pushState({ tab: 'dashboard' }, '', '');
        return;
      }
      if (!exitToast) {
        setExitToast(true);
        window.history.pushState({ tab: 'dashboard' }, '', '');
        clearTimeout(exitToastTimerRef.current as unknown as NodeJS.Timeout);
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
      clearTimeout(exitToastTimerRef.current as unknown as NodeJS.Timeout);
    };
  }, [activeTab, isTxModalOpen, isEventModalOpen, isReceiptParserOpen, exitToast]);


  const handleOpenAddModal = useCallback((type: TransactionType = 'expense') => {
    setEditingTransaction(null);
    setParsedReceiptData(null);
    setTxModalType(type);
    setIsTxModalOpen(true);
  }, []);

  const handleApplyReceipt = (parsed: ParsedReceiptResult) => {
    setEditingTransaction(null);
    setParsedReceiptData(parsed);
    setTxModalType(parsed.type);
    setIsTxModalOpen(true);
  };


  const handleEditTransaction = (trx: Transaction) => {
    setEditingTransaction(trx);
    setTxModalType(trx.type);
    setIsTxModalOpen(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    setDeleteError(null);
    // Hapus TIDAK didukung offline: menghapus yang tersimpan di server butuh koneksi,
    // dan menyantroningnya ke antrean offline berisiko menghapus saat user lupa.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const offlineMsg = 'Hapus transaksi hanya bisa dilakukan saat online. Coba lagi setelah terhubung.';
      setDeleteError(offlineMsg);
      notify(offlineMsg, { tone: 'error' });
      return;
    }
    try {
      await apiFetch(endpoints.transaction(id), { method: 'DELETE' });
      setReloadKey((k) => k + 1);
      notify('Transaksi berhasil dihapus.', { tone: 'success' });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal menghapus transaksi.';
      setDeleteError(msg);
      notify(msg, { tone: 'error' });
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

  // Multi-device freshness: data lain diperbarui di perangkat lain akan terlihat
  // saat tab kembali fokus (dibatasi maksimal sekali per 5 detik).
  useEffect(() => {
    let last = 0;
    const handler = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - last < 5000) return;
      last = now;
      refetch();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [refetch]);

  // Pengingat cadangan: evaluasi usia backup terakhir setelah user terautentikasi
  const [backupNudgeDismissed, setBackupNudgeDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const last = window.localStorage.getItem('kaskeluarga-last-backup');
      if (!last) return false;
      const days = Math.floor((Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24));
      return days <= 30;
    } catch {
      return false;
    }
  });

  // Keyboard shortcuts for desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      if (isTyping) return;
      // Close modal on Esc (no modifier needed)
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isTxModalOpen) {
          setIsTxModalOpen(false);
          setEditingTransaction(null);
          setParsedReceiptData(null);
          return;
        }
        if (isEventModalOpen) {
          setIsEventModalOpen(false);
          setEditingEvent(null);
          return;
        }
      }
      
      // N = New expense, E = New income, T = Transfer (desktop only)
      if (!isTyping && !isTxModalOpen && !isEventModalOpen) {
        const key = e.key.toLowerCase();
        
        if (key === 'n') {
          e.preventDefault();
          handleOpenAddModal('expense');
        } else if (key === 'e') {
          e.preventDefault();
          handleOpenAddModal('income');
        } else if (key === 't') {
          e.preventDefault();
          handleOpenAddModal('transfer');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTxModalOpen, editingTransaction, handleOpenAddModal, isEventModalOpen]);

  if (isAuthLoading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return <LandingView />;
  }

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={handleTabChange}
      onOpenAddModal={() => handleOpenAddModal('expense')}
      onOpenTypedModal={handleOpenAddModal}
      onOpenReceiptScan={() => setIsReceiptParserOpen(true)}
      currentMonth={currentMonth}
      currentYear={currentYear}
      onPeriodChange={handlePeriodChange}
      userName={user.name}
      userEmail={user.email}
      familyName={settings?.family_name || user.family_name || 'Keluarga Bahagia'}
      userId={user.id}
      onLogout={handleLogout}
      onDataRefresh={refetch}
      pendingBillsCount={summary.bill_pending_count}
      overbudgetCount={summary.budget_over_count}
      unpaidDebtsCount={summary.payable_unpaid_count}
      householdActivityCount={householdActivityCount}
      subscriptionCount={subscriptions.filter((s) => s.is_active).length}
    >
      {/* Error Message */}
      {dataError ? (
        <Alert tone="error" className="justify-center text-center">
          {dataError}
        </Alert>
      ) : isDataLoading && transactions.length === 0 && wallets.length === 0 ? (
        <DashboardSkeleton />
      ) : activeTab === 'dashboard' ? (
        <div className="space-y-3.5 sm:space-y-5">
          {/* Judul bagian untuk struktur heading; pengguna visual sudah melihat kartu saldo. */}
          <h2 className="sr-only">Ringkasan Keuangan</h2>
          {/* Total Balance & Safe-to-Spend Gradient Card */}
          <BalanceHeader
            totalBalance={summary.total_balance}
            walletCount={wallets.length}
            safeToSpend={summary.safe_to_spend}
            pendingBillsAmount={summary.total_bills_pending_amount}
            payableDueAmount={summary.total_payable_due}
            receivableDueAmount={summary.total_receivable_due}
            monthlyRecurringTotal={subscriptions.reduce((sum, s) => {
              if (s.cycle === 'monthly') return sum + s.amount;
              if (s.cycle === 'yearly') return sum + s.amount / 12;
              if (s.cycle === 'weekly') return sum + s.amount * 4.33;
              if (s.cycle === 'daily') return sum + s.amount * 30;
              return sum;
            }, 0)}
            onManageWallets={() => handleTabChange('wallets')}
            onNavigateToDebts={() => handleTabChange('debts')}
          />

          {/* Quick Grid Actions */}
          <QuickActions
            onOpenTransactionModal={handleOpenAddModal}
            onNavigate={handleTabChange}
            onOpenReceiptScan={() => setIsReceiptParserOpen(true)}
            pendingBillsCount={summary.bill_pending_count}
            overbudgetCount={summary.budget_over_count}
            unpaidDebtsCount={summary.payable_unpaid_count}
            subscriptionCount={subscriptions.filter(s => s.is_active).length}
          />

          {/* Recent Transactions List: informasi paling sering dicari, taruh dekat atas */}
          {deleteError && (
            <Alert
              tone="error"
              size="sm"
              onDismiss={() => setDeleteError(null)}
              dismissLabel="Tutup pesan galat"
              dismissText="Tutup"
            >
              {deleteError}
            </Alert>
          )}

          <div className="p-4 sm:p-5 bg-surface border border-border rounded-2xl shadow-2xs">
            <TransactionList
              transactions={transactions}
              onDeleteTransaction={handleDeleteTransaction}
              onEditTransaction={handleEditTransaction}
              onOpenAddModal={handleOpenAddModal}
              isLoading={isDataLoading}
              limit={DASHBOARD_TX_LIMIT}
              onViewAll={() => handleTabChange('transactions')}
            />
          </div>

          {/* Digital Wallets Scroller */}
          <WalletScroller
            wallets={wallets}
            onAddWallet={() => handleTabChange('wallets')}
            onTransfer={() => handleOpenAddModal('transfer')}
          />

          {/* Monthly Cashflow Summary (In / Out / Net) */}
          <MonthlySummary summary={summary} />

          {/* Insight Hari Ini: deteksi pola + saran yang bisa ditindaklanjuti */}
          <InsightWidget />

          {!backupNudgeDismissed && (
            <div className="flex items-center justify-between gap-3 p-3 bg-warning/10 border border-warning/20 rounded-2xl">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-9 h-9 bg-warning/20 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text font-bold text-sm">Jangan lewatkan backup data bulanan!</p>
                  <p className="text-text-muted text-xs mt-0.5">Cadangkan data Anda setiap bulan untuk mengamankan informasi keuangan.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={endpoints.backupExport}
                  target="_blank"
                  onClick={() => {
                    try {
                      window.localStorage.setItem('kaskeluarga-last-backup', new Date().toISOString());
                    } catch { /* abaikan */ }
                    setBackupNudgeDismissed(true);
                  }}
                  className="min-h-[44px] flex items-center px-3 rounded-xl bg-warning text-warning-fg text-xs font-bold hover:opacity-90 active:opacity-80 transition-opacity"
                >
                  Unduh
                </a>
                <button
                  type="button"
                  onClick={() => setBackupNudgeDismissed(true)}
                  aria-label="Tutup pengingat cadangan"
                  className="min-h-[44px] px-2 rounded-xl text-text-muted hover:text-text text-xs font-semibold"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'transactions' ? (
        <>
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
      ) : activeTab === 'goals' ? (
        <GoalsView wallets={wallets} onRefreshParent={refetch} />
      ) : activeTab === 'budget' ? (
        <BudgetView
          budgets={budgets}
          categories={categories}
          wallets={wallets}
          totalExpense={summary.total_expense}
          currentMonth={currentMonth}
          currentYear={currentYear}
          bills={bills}
          debts={debts}
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
      ) : activeTab === 'subscriptions' ? (
        <SubscriptionsView
          subscriptions={subscriptions}
          wallets={wallets}
          categories={categories}
          monthlyTotal={summary.total_income > 0 ? summary.total_income : undefined}
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
          bills={bills}
        />
      ) : activeTab === 'calendar' ? (
        <CalendarView
          transactions={transactions}
          financialEvents={financialEvents}
          currentMonth={currentMonth}
          currentYear={currentYear}
          onPeriodChange={handlePeriodChange}
          onEditTransaction={handleEditTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          onOpenAddModal={handleOpenAddModal}
          onOpenEventModal={handleOpenEventModal}
          onEditEvent={handleEditEvent}
        />
      ) : activeTab === 'assets' ? (
        <AssetsView
          onRefreshParent={refetch}
        />
      ) : activeTab === 'household' ? (
        <HouseholdView onRefreshParent={refetch} />
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
          setParsedReceiptData(null);
        }}
        initialType={txModalType}
        editingTransaction={editingTransaction}
        wallets={wallets}
        categories={categories}
        userId={user.id}
        budgets={budgets}
        onSuccess={refetch}
        initialReceipt={parsedReceiptData}
      />

      {/* Global Financial Event Modal */}
      <EventModal
        key={editingEvent?.id || 'new'}
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setEditingEvent(null);
        }}
        editingEvent={editingEvent}
        userId={user.id}
        onSuccess={handleEventSuccess}
      />

      {/* Global AI Receipt Parser Modal */}
      <ReceiptParserModal
        isOpen={isReceiptParserOpen}
        onClose={() => setIsReceiptParserOpen(false)}
        categories={categories}
        wallets={wallets}
        onApply={handleApplyReceipt}
      />


      {/* Mobile Back Exit Toast */}
      {exitToast && (
        <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 bg-text text-background px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold animate-fade-in flex items-center gap-2 pointer-events-none whitespace-nowrap">
          <span>Tekan sekali lagi untuk keluar dari aplikasi</span>
        </div>
      )}

      {/* Reminder proaktif: tagihan H-1/H-0 & anggaran >= 75% (sekali sehari, via SW) */}
      <ReminderScheduler bills={bills} budgets={budgets} />
    </AppShell>
  );
}
