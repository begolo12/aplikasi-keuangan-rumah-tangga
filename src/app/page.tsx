'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, Wallet, Category, Transaction, MonthlySummary as MonthlySummaryType, Budget, RecurringBill, AppSettings, TransactionType } from '@/lib/types';
import { AppShell } from '@/components/layout/AppShell';
import { NavTab } from '@/components/layout/BottomNav';
import { BalanceHeader } from '@/components/dashboard/BalanceHeader';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { WalletScroller } from '@/components/dashboard/WalletScroller';
import { MonthlySummary } from '@/components/dashboard/MonthlySummary';
import { TransactionList } from '@/components/transactions/TransactionList';
import { TransactionModal } from '@/components/transactions/TransactionModal';
import { BudgetView } from '@/components/budget/BudgetView';
import { BillsView } from '@/components/bills/BillsView';
import { WalletsView } from '@/components/wallets/WalletsView';
import { ReportsView } from '@/components/reports/ReportsView';
import { SettingsView } from '@/components/settings/SettingsView';
import { DashboardSkeleton } from '@/components/ui/LoadingSkeleton';

export default function MainPage() {
  const router = useRouter();

  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Period State (Month & Year)
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  // Navigation State
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // Modal State
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txModalType, setTxModalType] = useState<TransactionType>('expense');

  // Application Data States
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [bills, setBills] = useState<RecurringBill[]>([]);
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
  });
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // 1. Check Authentication on Mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (data.success && data.data) {
          setUser(data.data);
        } else {
          router.push('/login');
        }
      } catch (err) {
        router.push('/login');
      } finally {
        setIsAuthLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // 2. Fetch All Application Data for the Current Period
  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsDataLoading(true);

    try {
      const [wRes, cRes, tRes, bRes, billRes, sRes, setRes] = await Promise.all([
        fetch('/api/wallets'),
        fetch('/api/categories'),
        fetch(`/api/transactions?month=${currentMonth}&year=${currentYear}`),
        fetch(`/api/budgets?month=${currentMonth}&year=${currentYear}`),
        fetch(`/api/bills?month=${currentMonth}&year=${currentYear}`),
        fetch(`/api/reports/monthly?month=${currentMonth}&year=${currentYear}`),
        fetch('/api/settings'),
      ]);

      const [wData, cData, tData, bData, billData, sData, setData] = await Promise.all([
        wRes.json(),
        cRes.json(),
        tRes.json(),
        bRes.json(),
        billRes.json(),
        sRes.json(),
        setRes.json(),
      ]);

      if (wData.success) setWallets(wData.data || []);
      if (cData.success) setCategories(cData.data || []);
      if (tData.success) setTransactions(tData.data || []);
      if (bData.success) setBudgets(bData.data || []);
      if (billData.success) setBills(billData.data || []);
      if (sData.success) setSummary(sData.data?.summary || summary);
      if (setData.success) setSettings(setData.data || null);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsDataLoading(false);
    }
  }, [user, currentMonth, currentYear]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  // Handlers
  const handleOpenAddModal = (type: TransactionType = 'expense') => {
    setTxModalType(type);
    setIsTxModalOpen(true);
  };

  const handlePeriodChange = (month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Gagal menghapus transaksi.');
        return;
      }
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

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
      onTabChange={setActiveTab}
      onOpenAddModal={() => handleOpenAddModal('expense')}
      currentMonth={currentMonth}
      currentYear={currentYear}
      onPeriodChange={handlePeriodChange}
      userName={user.name}
      familyName={settings?.family_name || user.family_name}
      userId={user.id}
      onLogout={handleLogout}
      onDataRefresh={fetchData}
    >
      {/* Dynamic View Switcher */}
      {isDataLoading && transactions.length === 0 && wallets.length === 0 ? (
        <DashboardSkeleton />
      ) : activeTab === 'dashboard' ? (
        <div className="space-y-6">
          {/* Total Balance Gradient Card */}
          <BalanceHeader
            totalBalance={summary.total_balance}
            walletCount={wallets.length}
            onManageWallets={() => setActiveTab('wallets')}
          />

          {/* Quick 8-Button Grid Actions */}
          <QuickActions
            onOpenTransactionModal={handleOpenAddModal}
            onNavigate={setActiveTab}
            pendingBillsCount={summary.bill_pending_count}
            overbudgetCount={summary.budget_over_count}
          />

          {/* Digital Wallets Scroller */}
          <WalletScroller
            wallets={wallets}
            onAddWallet={() => setActiveTab('wallets')}
            onTransfer={() => handleOpenAddModal('transfer')}
          />

          {/* Monthly Cashflow Summary (In / Out / Net) */}
          <MonthlySummary summary={summary} />

          {/* Recent Transactions List */}
          <TransactionList
            transactions={transactions}
            onDeleteTransaction={handleDeleteTransaction}
            onOpenAddModal={handleOpenAddModal}
          />
        </div>
      ) : activeTab === 'transactions' ? (
        <TransactionList
          transactions={transactions}
          onDeleteTransaction={handleDeleteTransaction}
          onOpenAddModal={handleOpenAddModal}
        />
      ) : activeTab === 'budget' ? (
        <BudgetView
          budgets={budgets}
          categories={categories}
          currentMonth={currentMonth}
          currentYear={currentYear}
          onRefresh={fetchData}
        />
      ) : activeTab === 'bills' ? (
        <BillsView
          bills={bills}
          wallets={wallets}
          categories={categories}
          onRefresh={fetchData}
        />
      ) : activeTab === 'wallets' ? (
        <WalletsView
          wallets={wallets}
          onRefresh={fetchData}
          onOpenTransfer={() => handleOpenAddModal('transfer')}
        />
      ) : activeTab === 'reports' ? (
        <ReportsView
          summary={summary}
          currentMonth={currentMonth}
          currentYear={currentYear}
        />
      ) : activeTab === 'settings' ? (
        <SettingsView
          user={user}
          settings={settings}
          onRefresh={fetchData}
          onLogout={handleLogout}
        />
      ) : null}

      {/* Global Add/Edit Transaction Modal */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        initialType={txModalType}
        wallets={wallets}
        categories={categories}
        userId={user.id}
        onSuccess={fetchData}
      />
    </AppShell>
  );
}
