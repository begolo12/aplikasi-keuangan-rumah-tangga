'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { AmountInput } from '../ui/AmountInput';
import { Button } from '../ui/Button';
import { Wallet, Category, TransactionType } from '@/lib/types';
import { CategoryIcon } from '../ui/CategoryIcon';
import { enqueueOfflineMutation } from '@/lib/offlineQueue';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: TransactionType;
  wallets: Wallet[];
  categories: Category[];
  userId: string;
  onSuccess: () => void;
}

export function TransactionModal({
  isOpen,
  onClose,
  initialType = 'expense',
  wallets,
  categories,
  userId,
  onSuccess,
}: TransactionModalProps) {
  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState(0);
  const [adminFee, setAdminFee] = useState(0);
  const [walletId, setWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      setAmount(0);
      setAdminFee(0);
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setError(null);

      // Default wallet
      const defaultW = wallets.find((w) => w.is_default) || wallets[0];
      if (defaultW) setWalletId(defaultW.id);

      // Default destination wallet for transfer
      const otherW = wallets.find((w) => w.id !== defaultW?.id);
      if (otherW) setToWalletId(otherW.id);

      // Default category
      const defaultCat = categories.find((c) => c.type === initialType);
      if (defaultCat) setCategoryId(defaultCat.id);
    }
  }, [isOpen, initialType, wallets, categories]);

  // Update category options when type changes
  const filteredCategories = categories.filter((c) => c.type === (type === 'income' ? 'income' : 'expense'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (amount <= 0) {
      setError('Nominal transaksi harus lebih dari 0.');
      return;
    }

    if (!walletId) {
      setError('Silakan pilih dompet asal.');
      return;
    }

    if (type === 'transfer' && (!toWalletId || toWalletId === walletId)) {
      setError('Pilih dompet tujuan yang berbeda dari dompet asal.');
      return;
    }

    const payload = {
      type,
      amount,
      admin_fee: adminFee,
      category_id: type === 'transfer' ? null : categoryId || null,
      wallet_id: walletId,
      to_wallet_id: type === 'transfer' ? toWalletId : null,
      description: description || null,
      date,
    };

    setIsLoading(true);

    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        // Enqueue mutation for offline sync
        await enqueueOfflineMutation({
          userId,
          endpoint: '/api/transactions',
          method: 'POST',
          payload,
        });
        onSuccess();
        onClose();
        return;
      }

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan transaksi.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  const SUGGESTED_NOTES =
    type === 'expense'
      ? ['Belanja Pasar', 'Makan Siang', 'Bensin Motor', 'Listrik Token', 'Galon Air', 'Jajan Anak']
      : type === 'income'
      ? ['Gaji Bulanan', 'Bonus Proyek', 'Usaha Sampingan', 'Transfer Keluarga']
      : ['Tarik Tunai ATM', 'Top Up GoPay', 'Pindah Dana Tabungan'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span>Catat Transaksi</span>
        </div>
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 bg-expense/10 border border-expense/20 rounded-2xl text-expense text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Transaction Type Segmented Control */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-surface-2 rounded-2xl">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              type === 'expense' ? 'bg-expense text-white shadow-xs' : 'text-text-muted hover:text-text'
            }`}
          >
            Pengeluaran
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              type === 'income' ? 'bg-income text-white shadow-xs' : 'text-text-muted hover:text-text'
            }`}
          >
            Pemasukan
          </button>
          <button
            type="button"
            onClick={() => setType('transfer')}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              type === 'transfer' ? 'bg-transfer text-white shadow-xs' : 'text-text-muted hover:text-text'
            }`}
          >
            Transfer Kas
          </button>
        </div>

        {/* Amount Input with Live Format & Presets */}
        <AmountInput value={amount} onChange={setAmount} />

        {/* Extra fee for transfer */}
        {type === 'transfer' && (
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-text-muted">Biaya Admin Transfer (Opsional)</label>
            <input
              type="number"
              min="0"
              value={adminFee || ''}
              onChange={(e) => setAdminFee(e.target.value ? parseInt(e.target.value, 10) : 0)}
              placeholder="0 (Contoh: 1000)"
              className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
        )}

        {/* Wallet Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-text-muted">
              {type === 'transfer' ? 'Dari Dompet (Asal)' : 'Pos Dompet / Rekening'}
            </label>
            <select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              required
              className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} (Rp {new Intl.NumberFormat('id-ID').format(w.balance)})
                </option>
              ))}
            </select>
          </div>

          {type === 'transfer' ? (
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-text-muted">Ke Dompet (Tujuan)</label>
              <select
                value={toWalletId}
                onChange={(e) => setToWalletId(e.target.value)}
                required
                className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {wallets
                  .filter((w) => w.id !== walletId)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (Rp {new Intl.NumberFormat('id-ID').format(w.balance)})
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-text-muted">Kategori</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Date Selector */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-text-muted">Tanggal Transaksi</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setDate(new Date().toISOString().split('T')[0])}
              className="px-3 h-11 bg-surface-2 hover:bg-surface-3 rounded-xl text-xs font-bold text-text-muted transition-colors"
            >
              Hari Ini
            </button>
          </div>
        </div>

        {/* Description & Autocomplete suggestions */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-text-muted">Catatan (Opsional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contoh: Belanja mingguan pasar pagi"
            className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-text-muted/40"
          />

          {/* Quick Suggestions */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {SUGGESTED_NOTES.map((note) => (
              <button
                key={note}
                type="button"
                onClick={() => setDescription(note)}
                className="px-2 py-0.5 text-[11px] bg-background hover:bg-surface-2 border border-border rounded-lg text-text-muted hover:text-text transition-colors"
              >
                {note}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant={type === 'expense' ? 'danger' : type === 'income' ? 'income' : 'primary'}
          size="lg"
          isLoading={isLoading}
          className="w-full mt-4 text-base font-bold shadow-md"
        >
          Simpan {type === 'expense' ? 'Pengeluaran' : type === 'income' ? 'Pemasukan' : 'Transfer'}
        </Button>
      </form>
    </Modal>
  );
}
