'use client';

import React, { useEffect } from 'react';
import { SidebarNav } from './SidebarNav';
import { BottomNav, NavTab } from './BottomNav';
import { TopHeader } from './TopHeader';
import { OfflineBanner } from './OfflineBanner';
import { IosInstallPrompt } from './IosInstallPrompt';

interface AppShellProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenAddModal: () => void;
  currentMonth: number;
  currentYear: number;
  onPeriodChange: (month: number, year: number) => void;
  userName?: string;
  familyName?: string;
  userId: string;
  onLogout: () => void;
  onDataRefresh?: () => void;
  children: React.ReactNode;
}

export function AppShell({
  activeTab,
  onTabChange,
  onOpenAddModal,
  currentMonth,
  currentYear,
  onPeriodChange,
  userName,
  familyName,
  userId,
  onLogout,
  onDataRefresh,
  children,
}: AppShellProps) {
  // Desktop keyboard shortcut listener ('N' for new transaction)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === 'n' &&
        !['input', 'textarea', 'select'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())
      ) {
        e.preventDefault();
        onOpenAddModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenAddModal]);

  return (
    <div className="min-h-screen bg-background text-text flex flex-col md:flex-row">
      {/* Sidebar for Desktop & Tablet */}
      <SidebarNav
        activeTab={activeTab}
        onTabChange={onTabChange}
        onOpenAddModal={onOpenAddModal}
        userName={userName}
        familyName={familyName}
        onLogout={onLogout}
      />

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Offline notification banner */}
        <OfflineBanner userId={userId} onSynced={onDataRefresh} />

        {/* Period & User Top Header */}
        <TopHeader
          currentMonth={currentMonth}
          currentYear={currentYear}
          onPeriodChange={onPeriodChange}
          userName={userName}
          familyName={familyName}
          onLogout={onLogout}
        />

        {/* Content View Body */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={onTabChange}
        onOpenAddModal={onOpenAddModal}
      />

      {/* iOS Safari Home Screen Banner */}
      <IosInstallPrompt />
    </div>
  );
}
