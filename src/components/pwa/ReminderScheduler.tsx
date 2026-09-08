'use client';

import { useEffect, useRef } from 'react';
import { RecurringBill, Budget } from '@/lib/types';
import { formatRupiah } from '@/lib/formatters';
import { getUpcomingEvents } from '@/lib/eventsApi';

const LAST_SENT_KEY = 'kaskeluarga-reminder-last';
const ENABLED_KEY = 'kaskeluarga-reminders-enabled';

interface ReminderSchedulerProps {
  bills: RecurringBill[];
  budgets: Budget[];
}

/**
 * Scheduler reminder harian: mengirim tagihan mendesak (H-1/H-0, belum lunas)
 * dan anggaran terpakai >= 75% ke service worker untuk ditampilkan sebagai
 * notifikasi. Maksimal sekali per hari per perangkat, dan hanya bila user
 * telah mengaktifkan pengingat dari Pengaturan.
 */
export function ReminderScheduler({ bills, budgets }: ReminderSchedulerProps) {
  const sentTodayRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return;
    if (typeof navigator.serviceWorker.controller === 'undefined') return;
    if (Notification.permission !== 'granted') return;

    let enabled = false;
    try {
      enabled = window.localStorage.getItem(ENABLED_KEY) === 'true';
    } catch {
      return;
    }
    if (!enabled || sentTodayRef.current) return;

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    let lastSent: string | null = null;
    try {
      lastSent = window.localStorage.getItem(LAST_SENT_KEY);
    } catch {
      return;
    }
    if (lastSent === today) return;

    // Handle urgent bills
    const urgentBills = bills
      .filter((b) => !b.is_paid && (b.type ?? 'expense') === 'expense' && typeof b.days_until_due === 'number' && b.days_until_due >= 0 && b.days_until_due <= 1)
      .slice(0, 2)
      .map((b) => ({
        id: b.id,
        title: b.title,
        due_label: b.days_until_due === 0 ? 'Jatuh tempo hari ini' : 'Jatuh tempo besok',
        amount_label: formatRupiah(b.amount),
      }));

    const nearLimitBudgets = budgets
      .filter((b) => b.percentage >= 75)
      .slice(0, 2)
      .map((b) => ({
        id: b.id,
        name: b.category_name || 'Anggaran',
        percentage_label: `${Math.round(b.percentage)}%`,
      }));

    const colorMap = {
      bonus: '#10b181',
      insurance_renewal: '#f59e0b',
      tax_deadline: '#ef4444',
      investment_contribution: '#3b82f6',
    };

    const eventColor = (type: string): string => colorMap[type as keyof typeof colorMap] || '#6b7280';

    // Fetch and filter upcoming events for notifications
    getUpcomingEvents()
      .then((events) => {
        const eventsDueSoon = events
          .slice(0, 2)
          .map((e) => ({
            id: e.id,
            title: e.title,
            type: e.type,
            color: eventColor(e.type),
            date: e.date,
            amount_label: e.amount ? formatRupiah(e.amount) : undefined,
          }));

        const hasNotifications = urgentBills.length > 0 || nearLimitBudgets.length > 0 || (eventsDueSoon && eventsDueSoon.length > 0);

        if (hasNotifications) {
          navigator.serviceWorker.ready
            .then((registration) => {
              if (!registration.active) return;
              registration.active.postMessage({
                type: 'KAS_REMINDERS',
                bills: urgentBills,
                budgets: nearLimitBudgets,
                events: eventsDueSoon,
              });
              sentTodayRef.current = true;
              try {
                window.localStorage.setItem(LAST_SENT_KEY, today);
              } catch {
                // ignore
              }
            })
            .catch(() => {
              sentTodayRef.current = false;
            });
        }
      })
      .catch(() => {
        sentTodayRef.current = false;
      });
  }, [bills, budgets]);

  return null;
}
