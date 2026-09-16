'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, WarningCircle, Info, X } from '@phosphor-icons/react';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastOptions {
  tone?: ToastTone;
  /** Durasi tampil dalam milidetik. 0 = harus ditutup manual. */
  duration?: number;
  description?: string;
}

interface ToastItem extends ToastOptions {
  id: number;
  message: string;
}

interface ToastContextValue {
  /** Tampilkan notifikasi singkat. */
  notify: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLE: Record<ToastTone, string> = {
  success: 'bg-income/10 border-income/25 text-income',
  error: 'bg-expense/10 border-expense/25 text-expense',
  info: 'bg-surface border-border text-text',
};

const TONE_ICON: Record<ToastTone, React.ElementType> = {
  success: CheckCircle,
  error: WarningCircle,
  info: Info,
};

const DEFAULT_DURATION = 3200;

/**
 * Provider notifikasi ringan (toast) untuk umpan balik aksi.
 * Dipasang sekali di AppShell; komponen anak memakai `useToast()`.
 * Tidak memakai animasi berjalan terus-menerus agar hemat repaint di HP.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seqRef = useRef(0);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const id = ++seqRef.current;
      const duration = options.duration ?? DEFAULT_DURATION;
      setToasts((prev) => {
        // Maksimal 3 toast sekaligus agar tidak menutupi layar HP.
        const next = [...prev, { id, message, ...options }];
        return next.slice(-3);
      });
      if (duration > 0) {
        timersRef.current.set(
          id,
          setTimeout(() => dismiss(id), duration)
        );
      }
    },
    [dismiss]
  );

  // Bersihkan timer saat provider dilepas agar tidak ada setState setelah unmount.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Live region: pembaca layar membacakan pesan tanpa memindahkan fokus. */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed z-[60] left-1/2 -translate-x-1/2 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] md:bottom-6 w-[calc(100%-1.5rem)] max-w-sm flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((toast) => {
          const tone = toast.tone ?? 'info';
          const Icon = TONE_ICON[tone];
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-2.5 px-3.5 py-3 rounded-2xl border shadow-lg ${TONE_STYLE[tone]}`}
            >
              <Icon size={18} weight="fill" className="shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold leading-snug">{toast.message}</p>
                {toast.description && (
                  <p className="text-[11px] text-text-muted mt-0.5 leading-snug">{toast.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Tutup notifikasi"
                className="shrink-0 inline-flex items-center justify-center min-w-[32px] min-h-[32px] -m-1 rounded-xl hover:bg-surface-2 transition-colors"
              >
                <X size={14} weight="bold" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Akses fungsi `notify`. Bila dipanggil di luar ToastProvider, menjadi no-op
 * agar komponen tetap aman dipakai di halaman yang belum dibungkus provider.
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { notify: () => {} };
  }
  return ctx;
}
