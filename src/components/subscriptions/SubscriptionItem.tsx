'use client';

import React from 'react';
import { Clock, CalendarCheck, Wallet, Trash2 } from '@phosphor-icons/react';
import { Subscription } from '@/lib/types';
import { formatRupiah, formatDateISO } from '@/lib/formatters';

interface SubscriptionItemProps {
  subscription: Subscription;
  onEdit?: (sub: Subscription) => void;
  onDelete?: (id: string) => void;
}

export function SubscriptionItem({ subscription, onEdit, onDelete }: SubscriptionItemProps) {
  const cycleLabels: Record<string, string> = {
    daily: 'Harian',
    weekly: 'Mingguan',
    monthly: 'Bulanan',
    yearly: 'Tahunan',
  };

  const cycleIcons: Record<string, number> = {
    daily: 16,
    weekly: 18,
    monthly: 20,
    yearly: 24,
  };

  const getNextChargeLabel = (nextDate: string): string => {
    const date = new Date(nextDate);
    const today = new Date();
    const diffTime = Math.abs(date.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (date < today) {
      return `Telat ${diffDays} hari`;
    } else if (diffDays === 0) {
      return 'Hari ini';
    } else if (diffDays === 1) {
      return 'Besok';
    } else {
      return `${diffDays} hari lagi`;
    }
  };

  const isOverdue = new Date(subscription.next_charge_date) < new Date();

  return (
    <div
      className={`group p-3 sm:p-4 bg-surface border rounded-2xl shadow-xs transition-all hover:border-primary/30 hover:shadow-sm ${
        isOverdue ? 'border-expense/30 bg-expense/5' : 'border-border'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Provider Icon */}
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shrink-0 shadow-xs">
          <CalendarCheck size={cycleIcons[subscription.cycle]} weight="fill" className="text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-text truncate">{subscription.provider_name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">
                  {cycleLabels[subscription.cycle]}
                </span>
                {subscription.wallet_name && (
                  <span className="text-[10px] sm:text-xs text-text-muted flex items-center gap-0.5">
                    <Wallet size={10} weight="bold" />
                    {subscription.wallet_name}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onEdit && (
                <button
                  onClick={() => onEdit(subscription)}
                  className="p-1.5 hover:bg-surface-2 rounded-lg transition-colors text-text-muted hover:text-text"
                  aria-label="Edit subscription"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M14.7 2.3a2.3 2.3 0 0 0-3.3 0L9 3.7l-1 1-1.3-.7a2.3 2.3 0 0 0-2.7.4l-.7.7a2.3 2.3 0 0 0-.4 2.7l-.7 1.3v4a2.3 2.3 0 0 0 2.3 2.3h4l1.3-.7a2.3 2.3 0 0 0 .4-2.7l-.7-1.3 1-1 1.4-1.4a2.3 2.3 0 0 0 0-3.3l-1-1zM4 11v-2l1.5-1.5a1.3 1.3 0 0 1 1.8 0l.2.2L6 10v2H4zm8-5l1.5 1.5L11 8V6l1-1z"/>
                  </svg>
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(subscription.id)}
                  className="p-1.5 hover:bg-expense/10 rounded-lg transition-colors text-text-muted hover:text-expense"
                  aria-label="Delete subscription"
                >
                  <Trash2 size={14} weight="bold" />
                </button>
              )}
            </div>
          </div>

          {/* Amount & Next Charge */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="text-right">
              <p className="font-extrabold text-lg sm:text-xl text-expense tabular-nums">
                {formatRupiah(subscription.amount)}
              </p>
              <p className="text-[10px] sm:text-xs text-text-muted">per {cycleLabels[subscription.cycle].toLowerCase()}</p>
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <Clock size={14} weight="bold" className="text-warning shrink-0" />
              <div className="text-right">
                <p className={`text-xs font-bold ${isOverdue ? 'text-expense' : 'text-text'}`}>
                  {getNextChargeLabel(subscription.next_charge_date)}
                </p>
                <p className="text-[10px] text-text-muted">
                  {formatDateISO(subscription.next_charge_date)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
