'use client';

import React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export type ProgressTone =
  | 'primary'
  | 'income'
  | 'expense'
  | 'transfer'
  | 'warning'
  | 'neutral';

export type ProgressSize = 'sm' | 'md' | 'lg';

interface ProgressBarProps {
  /** Persentase 0-100. Nilai di luar rentang dipangkas otomatis. */
  value: number;
  tone?: ProgressTone;
  size?: ProgressSize;
  /**
   * Tampilkan bantalan dalam di dalam track (batang terlihat "mengambang").
   * Dipakai pada kartu anggaran & hutang yang punya padding di sekeliling bar.
   */
  inset?: boolean;
  /** Kelas warna kustom untuk batang, menimpa `tone`. */
  barClassName?: string;
  /** Kelas untuk track (mis. menambah border). */
  className?: string;
  /** Label aksesibilitas; kosongkan bila nilai sudah dibacakan di teks sebelah. */
  ariaLabel?: string;
  /** Tampilkan sebagai indikator tak-tentu (mis. sedang memuat). */
  indeterminate?: boolean;
}

const TONE_BAR: Record<ProgressTone, string> = {
  primary: 'bg-primary',
  income: 'bg-income',
  expense: 'bg-expense',
  transfer: 'bg-transfer',
  warning: 'bg-warning',
  neutral: 'bg-surface-3',
};

const SIZE_TRACK: Record<ProgressSize, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-3',
};

/**
 * Batang progres bersama.
 *
 * Sebelumnya ada tujuh implementasi batang progres dengan tinggi, warna, dan
 * transisi berbeda-beda (h-1.5/h-2.5/h-3, duration-500/700) sehingga tampilan
 * antar modul terasa tidak satu tangan. Komponen ini menyatukannya, dan
 * sekaligus menambahkan peran `progressbar` + `aria-valuenow` yang sebelumnya
 * tidak ada di satu pun implementasi (pembaca layar tidak tahu ada progres).
 */
export function ProgressBar({
  value,
  tone = 'primary',
  size = 'md',
  inset = false,
  barClassName,
  className,
  ariaLabel,
  indeterminate = false,
}: ProgressBarProps) {
  const pct = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : 100}
      aria-valuenow={indeterminate ? undefined : Math.round(pct)}
      className={twMerge(
        clsx(
          'w-full rounded-full overflow-hidden',
          SIZE_TRACK[size],
          inset ? 'p-0.5 bg-surface-2' : 'bg-surface-2',
          className
        )
      )}
    >
      <div
        className={twMerge(
          clsx(
            'h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none',
            barClassName ?? TONE_BAR[tone]
          )
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
