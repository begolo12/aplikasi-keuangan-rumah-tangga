'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AmountInput } from '../ui/AmountInput';
import { formatRupiah } from '@/lib/formatters';
import { Wallet } from '@/lib/types';
import { ApiError, apiFetch, endpoints } from '@/lib/apiFetch';
import {
  ArrowsClockwise,
  CheckCircle,
  Scales,
} from '@phosphor-icons/react';

interface ReconcileModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: Wallet | null;
  onSuccess: () => void;
}

export function ReconcileModal({
  isOpen,
  onClose,
  wallet,
  onSuccess,
}: ReconcileModalProps) {
  const [actualBalance, setActualBalance] = useState<number>(() => wallet?.balance || 0);
  const [reconcileDate, setReconcileDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [autoAdjust, setAutoAdjust] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update initial value when wallet changes
  React.useEffect(() => {
    if (wallet) {
      setActualBalance(wallet.balance);
      setNotes('');
      setAutoAdjust(true);
      setError(null);
    }
  }, [wallet]);

  if (!wallet) return null;

  const systemBalance = wallet.balance || 0;
  const difference = actualBalance - systemBalance;
  const isMatch = Math.abs(difference) <= 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await apiFetch(endpoints.reconcileWallet(wallet.id), {
        method: 'POST',
        json: {
          actual_balance: actualBalance,
          reconcile_date: reconcileDate,
          notes: notes.trim() || null,
          auto_adjust: autoAdjust,
        },
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memproses rekonsiliasi saldo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <ArrowsClockwise size={22} className="text-primary" weight="bold" />
          <span>Rekonsiliasi Saldo Riil: {wallet.name}</span>
        </div>
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="p-3.5 bg-expense/10 border border-expense/20 rounded-2xl text-expense text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Current App Balance vs Real Account Input */}
        <div className="p-4 bg-surface-2 border border-border rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted font-semibold">Saldo Tercatat di Aplikasi:</span>
            <span className="font-extrabold text-text tabular-nums">{formatRupiah(systemBalance)}</span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
            <span className="text-text-muted font-semibold">Status Terakhir:</span>
            <span className="text-text-muted text-[11px]">
              {wallet.reconciled_at
                ? `Dicek pada ${new Date(wallet.reconciled_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : 'Belum pernah direkonsiliasi'}
            </span>
          </div>
        </div>

        {/* Input Real Actual Balance */}
        <div className="space-y-1">
          <AmountInput
            id="actualBalance"
            label="Saldo Fisik / Mutasi Rekening Bank Riil Saat Ini (Rp)"
            value={actualBalance}
            onChange={setActualBalance}
          />
          <p className="text-[11px] text-text-muted">
            Buka m-Banking atau hitung uang tunai fisik nyata Anda, lalu masukkan nominalnya di sini.
          </p>
        </div>

        {/* Discrepancy & Variance Analysis Card */}
        <div
          className={`p-4 rounded-2xl border transition-all space-y-2 ${
            isMatch
              ? 'bg-income/10 border-income/20'
              : difference > 0
              ? 'bg-primary/10 border-primary/20'
              : 'bg-expense/10 border-expense/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              {isMatch ? (
                <CheckCircle size={18} weight="fill" className="text-income shrink-0" />
              ) : (
                <Scales size={18} weight="duotone" className={difference > 0 ? 'text-primary shrink-0' : 'text-expense shrink-0'} />
              )}
              <span className={isMatch ? 'text-income' : difference > 0 ? 'text-primary' : 'text-expense'}>
                {isMatch
                  ? 'Saldo Cocok & Sempurna (100% Klop)'
                  : difference > 0
                  ? `Ada Selisih Lebih (+${formatRupiah(difference)})`
                  : `Ada Selisih Kurang (${formatRupiah(difference)})`}
              </span>
            </div>

            <span className={`text-xs font-extrabold tabular-nums ${isMatch ? 'text-income' : difference > 0 ? 'text-primary' : 'text-expense'}`}>
              Selisih: {difference > 0 ? '+' : ''}{formatRupiah(difference)}
            </span>
          </div>

          <p className="text-[11px] text-text-muted leading-relaxed">
            {isMatch
              ? 'Saldo di aplikasi sama persis dengan saldo rekening riil Anda. Pencatatan keuangan Anda sangat rapi.'
              : difference > 0
              ? `Uang di rekening riil Anda LEBIH BANYAK sebesar ${formatRupiah(difference)} daripada catatan aplikasi. Kemungkinan ada pemasukan/transfer/bunga yang belum sempat Anda catat.`
              : `Uang di rekening riil Anda LEBIH SEDIKIT sebesar ${formatRupiah(Math.abs(difference))} daripada catatan aplikasi. Kemungkinan ada pengeluaran, biaya admin bank, atau belanja harian yang lupa Anda catat.`}
          </p>
        </div>

        {!isMatch && (
          <div className="p-3 bg-background border border-border rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoAdjust"
                checked={autoAdjust}
                onChange={(e) => setAutoAdjust(e.target.checked)}
                className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
              />
              <label htmlFor="autoAdjust" className="text-xs font-bold text-text cursor-pointer">
                Sesuaikan Otomatis (Auto-Adjust Saldo Aplikasi)
              </label>
            </div>
            <p className="text-[11px] text-text-muted pl-6">
              Sistem akan otomatis membuat 1 transaksi penyesuaian ({difference > 0 ? 'Pemasukan' : 'Pengeluaran'} {formatRupiah(Math.abs(difference))}) agar saldo aplikasi langsung klop dengan rekening bank riil.
            </p>
          </div>
        )}

        {/* Reconcile Date & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="reconcileDate" className="block text-xs font-semibold text-text-muted">
              Tanggal Rekonsiliasi
            </label>
            <input
              id="reconcileDate"
              type="date"
              required
              value={reconcileDate}
              onChange={(e) => setReconcileDate(e.target.value)}
              className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="reconcileNotes" className="block text-xs font-semibold text-text-muted">
              Keterangan Penyesuaian (Opsional)
            </label>
            <input
              id="reconcileNotes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Lupa catat biaya admin & transfer"
              className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
        </div>

        <Button
          type="submit"
          variant={isMatch ? 'outline' : 'primary'}
          size="lg"
          isLoading={isLoading}
          className="w-full mt-4 font-bold shadow-md"
        >
          {isMatch
            ? 'Konfirmasi Saldo Sudah Cocok'
            : autoAdjust
            ? 'Sesuaikan & Samakan Saldo Aplikasi'
            : 'Simpan Catatan Rekonsiliasi Saja'}
        </Button>
      </form>
    </Modal>
  );
}
