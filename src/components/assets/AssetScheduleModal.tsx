'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AmountInput } from '../ui/AmountInput';
import { formatRupiah } from '@/lib/formatters';
import { Asset, Wallet } from '@/lib/types';
import { ApiError, apiFetch, endpoints } from '@/lib/apiFetch';
import {
  Wrench,
} from '@phosphor-icons/react';

interface AssetScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  wallets: Wallet[];
  onSuccess: () => void;
}

export function AssetScheduleModal({
  isOpen,
  onClose,
  asset,
  wallets,
  onSuccess,
}: AssetScheduleModalProps) {
  const [actionType, setActionType] = useState<'tax' | 'maintenance' | 'incidental'>('tax');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState(0);
  const [dueDay, setDueDay] = useState(15);
  const [walletId, setWalletId] = useState('');
  const [incidentDate, setIncidentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (asset) {
      const defaultW = wallets.find((w) => w.is_default) || wallets[0];
      if (defaultW) setWalletId(defaultW.id);
      setError(null);
      if (actionType === 'tax') {
        setTitle(`Pajak Rutin: ${asset.name}`);
        setAmount(asset.category === 'kendaraan' ? 500000 : 300000);
      } else if (actionType === 'maintenance') {
        setTitle(`Servis Rutin / Perawatan: ${asset.name}`);
        setAmount(250000);
      } else {
        setTitle(`Perbaikan Kerusakan: ${asset.name}`);
        setAmount(150000);
      }
    }
  }, [asset, actionType, wallets]);

  if (!asset) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError('Nominal biaya harus lebih dari 0.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (actionType === 'incidental') {
        // Catat langsung sebagai pengeluaran kas insidental
        if (!walletId) {
          setError('Silakan pilih dompet untuk pembayaran.');
          setIsLoading(false);
          return;
        }

        await apiFetch(endpoints.transactions, {
          method: 'POST',
          json: {
            type: 'expense',
            amount,
            wallet_id: walletId,
            asset_id: asset.id,
            description: `${title} (${notes.trim() || 'Biaya insidental'})`,
            date: incidentDate,
          },
        });
      } else {
        // Daftarkan sebagai pengeluaran pasti/rutin terjadwal
        await apiFetch(endpoints.bills, {
          method: 'POST',
          json: {
            type: 'expense',
            title,
            amount,
            due_day: dueDay,
            wallet_id: walletId || null,
            asset_id: asset.id,
            auto_record: true,
          },
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menyimpan jadwal / biaya aset.');
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
          <Wrench size={22} className="text-primary" weight="duotone" />
          <span>Jadwal Pajak, Servis & Biaya: {asset.name}</span>
        </div>
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="p-3 bg-expense/10 border border-expense/20 rounded-2xl text-expense text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Segmented Type Action */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-surface-2 rounded-2xl">
          <button
            type="button"
            onClick={() => setActionType('tax')}
            className={`py-2 text-[11px] font-bold rounded-xl transition-all ${
              actionType === 'tax' ? 'bg-primary text-white shadow-xs' : 'text-text-muted hover:text-text'
            }`}
          >
            Pajak Rutin
          </button>
          <button
            type="button"
            onClick={() => setActionType('maintenance')}
            className={`py-2 text-[11px] font-bold rounded-xl transition-all ${
              actionType === 'maintenance' ? 'bg-primary text-white shadow-xs' : 'text-text-muted hover:text-text'
            }`}
          >
            Servis Rutin
          </button>
          <button
            type="button"
            onClick={() => setActionType('incidental')}
            className={`py-2 text-[11px] font-bold rounded-xl transition-all ${
              actionType === 'incidental' ? 'bg-expense text-white shadow-xs' : 'text-text-muted hover:text-text'
            }`}
          >
            Biaya Insidental
          </button>
        </div>

        {/* Target Asset Info Card */}
        <div className="p-3 bg-surface-2 border border-border rounded-2xl flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-text-muted block">Aset Tertaut</span>
            <span className="font-bold text-text">{asset.name}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-text-muted block">Harga Perolehan</span>
            <span className="font-extrabold text-primary tabular-nums">{formatRupiah(asset.purchase_price)}</span>
          </div>
        </div>

        {/* Input Nama Jadwal / Biaya */}
        <div className="space-y-1">
          <label htmlFor="scheduleTitle" className="block text-xs font-semibold text-text-muted">
            {actionType === 'incidental' ? 'Deskripsi Kerusakan / Perbaikan' : 'Nama Jadwal Pengeluaran Rutin'}
          </label>
          <input
            id="scheduleTitle"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>

        <AmountInput id="scheduleAmount" label="Estimasi / Nominal Biaya (Rp)" value={amount} onChange={setAmount} />

        {actionType !== 'incidental' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="scheduleDueDay" className="block text-xs font-semibold text-text-muted">
                Tanggal Jadwal Bulanan (1-31)
              </label>
              <input
                id="scheduleDueDay"
                type="number"
                min="1"
                max="31"
                required
                value={dueDay}
                onChange={(e) => setDueDay(parseInt(e.target.value, 10))}
                className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="scheduleWallet" className="block text-xs font-semibold text-text-muted">
                Dompet Debet Pembayaran
              </label>
              <select
                id="scheduleWallet"
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({formatRupiah(w.balance)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="incidentDate" className="block text-xs font-semibold text-text-muted">
                Tanggal Pembayaran Kas
              </label>
              <input
                id="incidentDate"
                type="date"
                required
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="incidentWallet" className="block text-xs font-semibold text-text-muted">
                Bayar Menggunakan Dompet
              </label>
              <select
                id="incidentWallet"
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                required
                className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({formatRupiah(w.balance)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="scheduleNotes" className="block text-xs font-semibold text-text-muted">
            Catatan Tambahan (Opsional)
          </label>
          <input
            id="scheduleNotes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Ganti ban luar, bayar di Samsat"
            className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>

        <Button
          type="submit"
          variant={actionType === 'incidental' ? 'danger' : 'primary'}
          size="lg"
          isLoading={isLoading}
          className="w-full mt-4 font-bold shadow-md"
        >
          {actionType === 'incidental'
            ? 'Catat Pengeluaran Insidental Sekarang'
            : 'Jadwalkan ke Pengeluaran Pasti Rutin'}
        </Button>
      </form>
    </Modal>
  );
}
