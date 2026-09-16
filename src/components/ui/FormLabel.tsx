'use client';

import React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Label form bersama (Paket D4).
 *
 * Dua masalah yang diselesaikan:
 * 1. Gaya label `block text-xs font-semibold text-text-muted` disalin manual di
 *    puluhan tempat, sehingga ada label yang ukuran/bobotnya menyimpang.
 * 2. Ada label "yatim" tanpa `htmlFor` yang tidak terhubung ke kontrol mana pun,
 *    sehingga pembaca layar tidak tahu input mana yang dimaksud.
 *
 * Untuk label yatim yang sebenarnya menamai sekelompok tombol/checkbox (mis.
 * pemilih warna), pakai `as="group"`: komponen menghasilkan `<span id>` yang bisa
 * dirujuk lewat `aria-labelledby` pada pembungkusnya.
 */
export interface FormLabelProps {
  children: React.ReactNode;
  /** Id kontrol yang dinamai label ini. Wajib untuk `as="label"`. */
  htmlFor?: string;
  /** Id label itu sendiri; dipakai saat `as="group"`. */
  id?: string;
  /** Tampilkan tanda wajib (`*`) di samping teks. */
  required?: boolean;
  /** Teks bantuan kecil di bawah label. */
  hint?: React.ReactNode;
  /**
   * `label` (bawaan) untuk satu kontrol form; `group` untuk menamai sekelompok
   * kontrol, menghasilkan `<span>` alih-alih `<label>`.
   */
  as?: 'label' | 'group';
  className?: string;
}

const BASE_CLASS = 'block text-xs font-semibold text-text-muted';

export function FormLabel({
  children,
  htmlFor,
  id,
  required = false,
  hint,
  as = 'label',
  className,
}: FormLabelProps) {
  const content = (
    <>
      {children}
      {required && (
        <span className="text-expense ml-0.5" aria-hidden="true">
          *
        </span>
      )}
      {hint && <span className="block font-normal text-[11px] text-text-muted mt-0.5">{hint}</span>}
    </>
  );

  const classes = twMerge(clsx(BASE_CLASS, className));

  if (as === 'group') {
    return (
      <span id={id} className={classes}>
        {content}
      </span>
    );
  }

  return (
    <label htmlFor={htmlFor} className={classes}>
      {content}
    </label>
  );
}
