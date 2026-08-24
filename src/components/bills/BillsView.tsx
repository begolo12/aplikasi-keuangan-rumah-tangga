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
import { useBillForm } from './useBillForm';
import { ApiError, apiFetch, endpoints } from '@/lib/apiFetch';

interface BillsViewProps {
  bills: RecurringBill[];
  wallets: Wallet[];
  categories: Category[];
  onRefresh: () => void;
}

export function BillsView({ bills, wallets, categories, onRefresh }: BillsViewProps) {
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<RecurringBill | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  // Form states for Pay Bill
  const [payWalletId, setPayWalletId] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const {
    isAddOpen,
    title,
    setTitle,
    amount,
    setAmount,
    dueDay,
    setDueDay,
    categoryId,
    setCategoryId,
    isLoading,
    error,
    openAddModal,
    closeModal,
    handleAddSubmit,
  } = useBillForm({ wallets, categories, onSuccess: onRefresh });

  const handlePayClick = (bill: RecurringBill) => {
    setSelectedBill(bill);
    const defaultW = wallets.find((w) => w.is_default) || wallets[0];
    if (defaultW) setPayWalletId(defaultW.id);
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayError(null);
    setIsPayOpen(true);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill) return;

    setIsPaying(true);
    setPayError(null);

    try {
      await apiFetch(endpoints.payBill(selectedBill.id), {
        method: 'POST',
        json: {
          wallet_id: payWalletId,
          paid_date: payDate,
        },
      });
      onRefresh();
      setIsPayOpen(false);
    } catch (err) {
      setPayError(err instanceof ApiError ? err.message : 'Gagal memproses pembayaran.');
    } finally {
      setIsPaying(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus tagihan rutin ini?')) return;
    try {
      await apiFetch(endpoints.bill(id), { method: 'DELETE' });
      setListError(null);
      onRefresh();
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : 'Gagal menghapus tagihan.');
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

      {/* Delete Error */}
      {listError && (
        <div role="alert" className="rounded-xl border border-expense/30 bg-expense/10 px-4 py-3 text-sm font-semibold text-expense">
          {listError}
        </div>
      )}

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
      <Modal isOpen={isAddOpen} onClose={closeModal} title="Tambah Tagihan Rutin">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-expense/10 border border-expense/20 rounded-2xl text-expense text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="billTitle" className="block text-xs font-semibold text-text-muted">Nama Tagihan</label>
            <input
              type="text"
              id="billTitle"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Tagihan Listrik PLN & Air"
              className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <AmountInput id="billAmount" label="Estimasi / Nominal Tagihan (Rp)" value={amount} onChange={setAmount} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="billDueDay" className="block text-xs font-semibold text-text-muted">Tanggal Jatuh Tempo (1-31)</label>
              <input
                type="number"
                id="billDueDay"
                min="1"
                max="31"
                required
                value={dueDay}
                onChange={(e) => setDueDay(parseInt(e.target.value, 10))}
                className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="billCategory" className="block text-xs font-semibold text-text-muted">Kategori</label>
              <select
                id="billCategory"
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
          {payError && (
            <div className="p-3 bg-expense/10 border border-expense/20 rounded-2xl text-expense text-xs font-semibold">
              {payError}
            </div>
          )}

          <div className="p-4 bg-surface-2 rounded-2xl space-y-1">
            <p className="text-xs text-text-muted">Nominal yang akan dibayarkan</p>
            <p className="text-xl font-extrabold text-text">
              {selectedBill ? formatRupiah(selectedBill.amount) : 'Rp 0'}
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="payWallet" className="block text-xs font-semibold text-text-muted">Bayar Menggunakan Dompet / Rekening</label>
            <select
              id="payWallet"
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
            <label htmlFor="payDate" className="block text-xs font-semibold text-text-muted">Tanggal Pembayaran</label>
            <input
              type="date"
              id="payDate"
              required
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <Button type="submit" variant="primary" size="lg" isLoading={isPaying} className="w-full mt-4 font-bold">
            Konfirmasi Bayar & Catat Pengeluaran
          </Button>
        </form>
      </Modal>
    </div>
  );
}
