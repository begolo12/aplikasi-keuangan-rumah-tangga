'use client';

import React, { useState } from 'react';
import { RecurringBill, Wallet, Category } from '@/lib/types';
import { BillItem } from './BillItem';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { AmountInput } from '../ui/AmountInput';
import { EmptyState } from '../ui/EmptyState';
import { Plus, Receipt } from '@phosphor-icons/react';
import { formatRupiah } from '@/lib/formatters';

interface BillsViewProps {
  bills: RecurringBill[];
  wallets: Wallet[];
  categories: Category[];
  onRefresh: () => void;
}

export function BillsView({ bills, wallets, categories, onRefresh }: BillsViewProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<RecurringBill | null>(null);

  // Form states for Add Bill
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState(0);
  const [dueDay, setDueDay] = useState(1);
  const [categoryId, setCategoryId] = useState('');
  const [walletId, setWalletId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states for Pay Bill
  const [payWalletId, setPayWalletId] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);

  const openAddModal = () => {
    setTitle('');
    setAmount(0);
    setDueDay(5);
    setError(null);
    if (categories.length > 0) setCategoryId(categories[0].id);
    if (wallets.length > 0) setWalletId(wallets[0].id);
    setIsAddOpen(true);
  };

  const handlePayClick = (bill: RecurringBill) => {
    setSelectedBill(bill);
    const defaultW = wallets.find((w) => w.is_default) || wallets[0];
    if (defaultW) setPayWalletId(defaultW.id);
    setPayDate(new Date().toISOString().split('T')[0]);
    setError(null);
    setIsPayOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError('Nominal tagihan harus lebih dari 0.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          amount,
          due_day: dueDay,
          category_id: categoryId || null,
          wallet_id: walletId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal menambahkan tagihan');

      onRefresh();
      setIsAddOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/bills/${selectedBill.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_id: payWalletId,
          paid_date: payDate,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal memproses pembayaran');

      onRefresh();
      setIsPayOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus tagihan rutin ini?')) return;
    try {
      const res = await fetch(`/api/bills/${id}`, { method: 'DELETE' });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-text">Tagihan Rutin Rumah Tangga</h2>
          <p className="text-xs md:text-sm text-text-muted">
            Pantau tagihan listrik, air, internet, dan iuran wajib agar tidak ada denda keterlambatan.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus size={18} weight="bold" />}
          onClick={openAddModal}
        >
          Tambah Tagihan Rutin
        </Button>
      </div>

      {/* Bills List */}
      {bills.length > 0 ? (
        <div className="space-y-3">
          {bills.map((bill) => (
            <BillItem key={bill.id} bill={bill} onPay={handlePayClick} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Receipt size={40} weight="duotone" />}
          title="Belum Ada Tagihan Rutin"
          description="Daftarkan tagihan rutin seperti Token Listrik PLN, Air PDAM, Wi-Fi Indihome, atau Iuran RT/RW."
          actionLabel="Tambah Tagihan Pertama"
          onAction={openAddModal}
        />
      )}

      {/* Add Bill Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Tambah Tagihan Rutin">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-expense/10 border border-expense/20 rounded-2xl text-expense text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-text-muted">Nama Tagihan</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Tagihan Listrik PLN & Air"
              className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <AmountInput label="Estimasi / Nominal Tagihan (Rp)" value={amount} onChange={setAmount} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-text-muted">Tanggal Jatuh Tempo (1-31)</label>
              <input
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
              <label className="block text-xs font-semibold text-text-muted">Kategori</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full mt-4 font-bold">
            Simpan Tagihan Rutin
          </Button>
        </form>
      </Modal>

      {/* Pay Bill Modal */}
      <Modal
        isOpen={isPayOpen}
        onClose={() => setIsPayOpen(false)}
        title={`Pelunasan: ${selectedBill?.title}`}
      >
        <form onSubmit={handlePaySubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-expense/10 border border-expense/20 rounded-2xl text-expense text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="p-4 bg-surface-2 rounded-2xl space-y-1">
            <p className="text-xs text-text-muted">Nominal yang akan dibayarkan</p>
            <p className="text-xl font-extrabold text-text">
              {selectedBill ? formatRupiah(selectedBill.amount) : 'Rp 0'}
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-text-muted">Bayar Menggunakan Dompet / Rekening</label>
            <select
              value={payWalletId}
              onChange={(e) => setPayWalletId(e.target.value)}
              required
              className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} (Sisa: {formatRupiah(w.balance)})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-text-muted">Tanggal Pembayaran</label>
            <input
              type="date"
              required
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full mt-4 font-bold">
            Konfirmasi Bayar & Catat Pengeluaran
          </Button>
        </form>
      </Modal>
    </div>
  );
}
