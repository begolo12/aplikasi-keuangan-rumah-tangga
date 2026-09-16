import React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export type StatTone = 'default' | 'income' | 'expense' | 'transfer' | 'primary' | 'muted';

/** Kartu statistik tunggal: label kecil, angka besar, keterangan pendukung. */
export interface StatCardProps {
  /** Judul metrik, mis. "Total Pemasukan". */
  label: string;
  /** Nilai utama; sudah diformat oleh pemanggil (mis. `formatRupiah(x)`). */
  value: React.ReactNode;
  /** Keterangan kecil di bawah angka. */
  hint?: React.ReactNode;
  /** Warna angka sekaligus warna ikon. */
  tone?: StatTone;
  /** Ikon opsional di samping label. */
  icon?: React.ReactNode;
  /** Kelas warna ikon bila berbeda dari warna angka (`tone`). */
  iconClassName?: string;
  /** Kartu sorotan (latar berwarna) untuk metrik paling penting. */
  accent?: boolean;
  /** Ukuran kartu: `compact` untuk strip ringkas, `default` untuk kartu standar. */
  size?: 'compact' | 'default';
  className?: string;
}

const TONE_TEXT: Record<StatTone, string> = {
  default: 'text-text',
  income: 'text-income',
  expense: 'text-expense',
  transfer: 'text-transfer',
  primary: 'text-primary',
  muted: 'text-text-muted',
};

const TONE_ICON: Record<StatTone, string> = {
  default: 'text-text-muted',
  income: 'text-income',
  expense: 'text-expense',
  transfer: 'text-transfer',
  primary: 'text-primary',
  muted: 'text-text-muted',
};

const VALUE_SIZE: Record<'compact' | 'default', string> = {
  compact: 'text-xs sm:text-sm md:text-base',
  default: 'text-sm sm:text-lg',
};

/**
 * Kartu statistik bersama (Paket D1).
 *
 * Sebelumnya pola "label kecil + angka besar + keterangan" disalin ulang di
 * sebelas tempat dengan ukuran huruf, padding, dan warna yang berbeda-beda
 * (`p-3` vs `p-3 sm:p-4`, `text-xs sm:text-sm md:text-base` vs `text-sm sm:text-lg`).
 * Akibatnya kartu yang berdampingan terlihat tidak sejajar. Komponen ini
 * menyatukan pola tersebut, dengan dua ukuran yang memang dibutuhkan.
 */
export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
  icon,
  iconClassName,
  accent = false,
  size = 'default',
  className,
}: StatCardProps) {
  return (
    <div
      className={twMerge(
        clsx(
          'min-w-0 flex flex-col justify-between gap-1',
          size === 'compact' ? 'p-2.5 sm:p-3 rounded-2xl' : 'p-3 sm:p-4 rounded-2xl',
          accent
            ? 'bg-primary/10 border border-primary/20'
            : 'bg-surface border border-border shadow-2xs'
        ),
        className
      )}
    >
      <div
        className={clsx(
          'flex items-center gap-1.5 text-xs',
          accent ? 'text-primary font-bold' : 'font-semibold',
          !accent && 'text-text-muted'
        )}
      >
        {icon && (
          <span
            className={clsx('shrink-0', iconClassName ?? (accent ? 'text-primary' : TONE_ICON[tone]))}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <span className="truncate">{label}</span>
      </div>

      <p
        className={clsx(
          'font-extrabold whitespace-nowrap tabular-nums truncate',
          VALUE_SIZE[size],
          accent ? 'text-primary' : TONE_TEXT[tone]
        )}
      >
        {value}
      </p>

      {hint !== undefined && hint !== null && (
        <span className="text-[11px] text-text-muted block">{hint}</span>
      )}
    </div>
  );
}

/** Grid pembungkus kartu statistik; kolomnya responsif dan bisa diatur. */
export interface StatGridProps {
  children: React.ReactNode;
  /**
   * Susunan kolom: `[kolom mobile, kolom >= sm]`.
   * Ditulis sebagai pasangan agar seluruh kelas tetap statis dan terbaca
   * Tailwind JIT (kelas dinamis seperti `sm:grid-cols-${n}` tidak akan dibuat).
   */
  layout?: '2' | '3' | '4' | '2-4' | '2-3' | '3-2' | '4-2' | '2-4-lg' | '2-3-lg' | '1-2-3';
  className?: string;
}

const GRID_LAYOUT: Record<NonNullable<StatGridProps['layout']>, string> = {
  '2': 'grid-cols-2',
  '3': 'grid-cols-3',
  '4': 'grid-cols-4',
  '2-4': 'grid-cols-2 sm:grid-cols-4',
  '2-3': 'grid-cols-2 sm:grid-cols-3',
  '3-2': 'grid-cols-3 sm:grid-cols-2',
  '4-2': 'grid-cols-4 sm:grid-cols-2',
  '2-4-lg': 'grid-cols-2 lg:grid-cols-4',
  '2-3-lg': 'grid-cols-2 lg:grid-cols-3',
  '1-2-3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
};

export function StatGrid({ children, layout = '2-4', className }: StatGridProps) {
  return (
    <div className={twMerge(clsx('grid gap-2.5', GRID_LAYOUT[layout], className))}>
      {children}
    </div>
  );
}
