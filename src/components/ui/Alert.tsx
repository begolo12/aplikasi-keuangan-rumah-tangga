'use client';

import React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CheckCircle, Info, WarningCircle, WifiSlash, X } from '@phosphor-icons/react';

export type AlertTone = 'info' | 'success' | 'warning' | 'error' | 'offline' | 'primary';

/**
 * Kartu pesan sebaris untuk galat, peringatan, atau konfirmasi.
 *
 * Sebelumnya pola `role="alert"` + `bg-expense/10 border-expense/20` disalin
 * ulang di lima tempat dengan ukuran huruf (`text-xs` vs `text-sm`), radius
 * (`rounded-xl` vs `rounded-2xl`), dan padding yang berbeda-beda. Komponen ini
 * menyatukannya. `role` dipilih dari nada pesan: galat/peringatan memakai
 * `alert` (menghentikan pembaca layar), sedangkan info/sukses memakai `status`
 * agar tidak terasa mendesak.
 */
export interface AlertProps {
  tone?: AlertTone;
  /** Isi pesan; teks atau simpul React. */
  children: React.ReactNode;
  /** Ganti ikon bawaan; kirim `null` untuk tanpa ikon. */
  icon?: React.ReactNode | null;
  /** Ukuran teks dan radius kartu. */
  size?: 'sm' | 'md';
  /** Bila diisi, tombol tutup muncul di kanan. */
  onDismiss?: () => void;
  /** Label tombol tutup untuk pembaca layar. */
  dismissLabel?: string;
  /** Teks tombol tutup; kosong berarti hanya ikon. */
  dismissText?: string;
  className?: string;
}

const TONE_STYLE: Record<AlertTone, string> = {
  info: 'bg-surface border-border text-text',
  success: 'bg-income/10 border-income/25 text-income',
  warning: 'bg-warning/10 border-warning/30 text-warning',
  error: 'bg-expense/10 border-expense/25 text-expense',
  offline: 'bg-warning/10 border-warning/30 text-warning',
  primary: 'bg-primary/10 border-primary/20 text-primary',
};

const TONE_ROLE: Record<AlertTone, 'alert' | 'status'> = {
  info: 'status',
  success: 'status',
  warning: 'alert',
  error: 'alert',
  offline: 'status',
  primary: 'status',
};

const TONE_ICON: Record<AlertTone, React.ElementType | null> = {
  info: Info,
  success: CheckCircle,
  warning: WarningCircle,
  error: WarningCircle,
  offline: WifiSlash,
  primary: null,
};

export function Alert({
  tone = 'info',
  children,
  icon,
  size = 'md',
  onDismiss,
  dismissLabel = 'Tutup pesan',
  dismissText,
  className,
}: AlertProps) {
  const Icon = icon === undefined ? TONE_ICON[tone] : null;
  const customIcon = icon === undefined ? null : icon;

  return (
    <div
      role={TONE_ROLE[tone]}
      className={twMerge(
        clsx(
          'flex items-start gap-2 font-semibold border',
          size === 'sm' ? 'p-3 rounded-xl text-xs' : 'p-3.5 rounded-2xl text-sm',
          TONE_STYLE[tone]
        ),
        className
      )}
    >
      {customIcon ?? (Icon && <Icon size={18} weight="fill" className="shrink-0 mt-0.5" aria-hidden="true" />)}
      <div className="flex-1 min-w-0">{children}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className={clsx(
            'shrink-0 inline-flex items-center justify-center gap-1 font-bold rounded-xl hover:opacity-70 transition-opacity',
            size === 'sm' ? '-m-1 min-w-[32px] min-h-[32px]' : '-m-0.5 min-w-[36px] min-h-[36px]'
          )}
        >
          {dismissText ? <span>{dismissText}</span> : <X size={14} weight="bold" aria-hidden="true" />}
        </button>
      )}
    </div>
  );
}
