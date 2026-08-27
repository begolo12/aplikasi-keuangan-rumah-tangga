'use client';

import React, { useState } from 'react';
import { RecurringBill, Wallet, Category } from '@/lib/types';
import { BillItem } from './BillItem';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { AmountInput } from '../ui/AmountInput';
import { EmptyState } from '../ui/EmptyState';
import { Plus, Receipt, Lightning, ArrowDownLeft, Sparkle } from '@phosphor-icons/react';
import { formatRupiah, INDONESIAN_MONTHS } from '@/lib/formatters';
import { useBillForm } from './useBillForm';
import { ApiError, apiFetch, endpoints } from '@/lib/apiFetch';

interface BillsViewProps {
  bills: RecurringBill[];
  wallets: Wallet[];
  categories: Category[];
  currentMonth?: number;
  currentYear?: number;
  onRefresh: () => void;
}

export function BillsView({
  bills,
  wallets,
  categories,
  currentMonth = new Date().getMonth() + 1,
  currentYear = new Date().getFullYear(),
  onRefresh,
}: BillsViewProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<RecurringBill | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [isAutoProcessing, setIsAutoProcessing] = useState(false);
  const [autoProcessResult, setAutoProcessResult] = useState<string | null>(null);

  // Form states for Pay / Record Bill
  const [payWalletId, setPayWalletId] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const {
    isAddOpen,
    type,
    setType,
    title,
    setTitle,
    amount,
    setAmount,
    dueDay,
    setDueDay,
    categoryId,
    setCategoryId,
    walletId,
    setWalletId,
    autoRecord,
    setAutoRecord,
    isLoading,
    error,
    openAddModal,
    closeModal,
    handleAddSubmit,
  } = useBillForm({ wallets, categories, onSuccess: onRefresh });

  const filteredBills = bills.filter((b) => {
    if (activeFilter === 'expense' && b.type !== 'expense') return false;
    if (activeFilter === 'income' && b.type !== 'income') return false;
    return true;
  });

  const expenseBills = bills.filter((b) => b.type === 'expense');
  const incomeBills = bills.filter((b) => b.type === 'income');

  const totalExpenseScheduled = expenseBills.reduce((s, b) => s + b.amount, 0);
  const totalIncomeScheduled = incomeBills.reduce((s, b) => s + b.amount, 0);
  const pendingCount = bills.filter((b) => !b.is_paid).length;

  const handlePayClick = (bill: RecurringBill) => {
    setSelectedBill(bill);
    const targetW = wallets.find((w) => w.id === bill.wallet_id) || wallets.find((w) => w.is_default) || wallets[0];
    if (targetW) setPayWalletId(targetW.id);
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
      setPayError(err instanceof ApiError ? err.message : 'Gagal memproses transaksi rutin.');
    } finally {
      setIsPaying(false);
    }
  };

  const handleAutoProcessAll = async () => {
    if (!confirm(`Proses & catat otomatis semua transaksi rutin yang belum tercatat untuk ${INDONESIAN_MONTHS[currentMonth - 1]} ${currentYear}?`)) {
      return;
    }

    setIsAutoProcessing(true);
    setAutoProcessResult(null);
    setListError(null);

    try {
      const res = await apiFetch<{ message: string; processed_count: number }>(
        endpoints.autoProcessBills(currentMonth, currentYear),
        { method: 'POST' }
      );
      setAutoProcessResult(res.message || 'Transaksi rutin berhasil diproses.');
      onRefresh();
      setTimeout(() => setAutoProcessResult(null), 5000);
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : 'Gagal memproses transaksi otomatis.');
    } finally {
      setIsAutoProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus transaksi rutin ini?')) return;
    try {
      await apiFetch(endpoints.bill(id), { method: 'DELETE' });
      setListError(null);
      onRefresh();
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : 'Gagal menghapus transaksi rutin.');
    }
  };

  const filteredCategories = categories.filter((c) => c.type === type);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-text">Transaksi Rutin & Pasti</h2>
          <p className="text-xs sm:text-sm text-text-muted">
            Otomatisasi pencatatan pemasukan pasti (gaji, bonus) dan pengeluaran pasti (listrik, internet, cicilan hutang).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {pendingCount > 0 && (
            <Button
              variant="outline"
              size="md"
              leftIcon={<Lightning size={18} weight="fill" className="text-warning" />}
              onClick={handleAutoProcessAll}
              isLoading={isAutoProcessing}
            >
              Catat Otomatis ({pendingCount})
            </Button>
          )}

          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus size={18} weight="bold" />}
            onClick={() => openAddModal('expense')}
          >
            Tambah Transaksi Rutin
          </Button>
        </div>
      </div>

      {/* Auto Process Alert */}
      {autoProcessResult && (
        <div role="status" className="p-3.5 bg-primary/10 border border-primary/20 rounded-2xl text-primary text-xs font-bold flex items-center gap-2">
          <Sparkle size={18} weight="fill" />
          <span>{autoProcessResult}</span>
        </div>
      )}

      {/* Delete / List Error */}
      {listError && (
        <div role="alert" className="rounded-xl border border-expense/30 bg-expense/10 px-4 py-3 text-sm font-semibold text-expense">
          {listError}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        <div className="p-3 sm:p-4 bg-surface border border-border rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-text-muted text-xs font-semibold">
            <ArrowDownLeft size={16} className="text-income shrink-0" weight="bold" />
            <span className="truncate">Pemasukan Pasti Rutin</span>
          </div>
          <p className="text-sm sm:text-lg font-extrabold text-income whitespace-nowrap tabular-nums">
            {formatRupiah(totalIncomeScheduled)}
          </p>
          <span className="text-[10px] text-text-muted block">{incomeBills.length} jadwal pemasukan (gaji/dll)</span>
        </div>

        <div className="p-3 sm:p-4 bg-surface border border-border rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-text-muted text-xs font-semibold">
            <Receipt size={16} className="text-expense shrink-0" weight="duotone" />
            <span className="truncate">Pengeluaran Pasti Rutin</span>
          </div>
          <p className="text-sm sm:text-lg font-extrabold text-expense whitespace-nowrap tabular-nums">
            {formatRupiah(totalExpenseScheduled)}
          </p>
          <span className="text-[10px] text-text-muted block">{expenseBills.length} tagihan/cicilan pasti</span>
        </div>

        <div className="col-span-2 lg:col-span-1 p-3 sm:p-4 bg-primary/10 border border-primary/20 rounded-2xl shadow-xs space-y-1 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-primary text-xs font-bold">
            <Lightning size={16} weight="fill" className="shrink-0" />
            <span className="truncate">Status Periode Ini</span>
          </div>
          <p className="text-sm sm:text-base font-extrabold text-primary">
            {pendingCount === 0 ? 'Semua Sudah Tercatat' : `${pendingCount} Belum Tercatat`}
          </p>
          <span className="text-[10px] text-text-muted block">
            Periode {INDONESIAN_MONTHS[currentMonth - 1]} {currentYear}
          </span>
        </div>
      </div>

      {/* Segmented Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`min-h-[36px] px-3.5 text-xs font-bold rounded-xl transition-colors shrink-0 ${
            activeFilter === 'all'
              ? 'bg-text text-background'
              : 'bg-surface border border-border text-text-muted hover:text-text'
          }`}
        >
          Semua ({bills.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('expense')}
          className={`min-h-[36px] px-3.5 text-xs font-bold rounded-xl transition-colors shrink-0 ${
            activeFilter === 'expense'
              ? 'bg-expense text-white'
              : 'bg-surface border border-border text-text-muted hover:text-text'
          }`}
        >
          Pengeluaran Pasti ({expenseBills.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('income')}
          className={`min-h-[36px] px-3.5 text-xs font-bold rounded-xl transition-colors shrink-0 ${
            activeFilter === 'income'
              ? 'bg-income text-white'
              : 'bg-surface border border-border text-text-muted hover:text-text'
          }`}
        >
          Pemasukan Pasti ({incomeBills.length})
        </button>
      </div>

      {/* Bills List */}
      {filteredBills.length > 0 ? (
        <div className="space-y-3">
          {filteredBills.map((bill) => (
            <BillItem key={bill.id} bill={bill} onPay={handlePayClick} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Receipt size={40} weight="duotone" />}
          title="Belum Ada Transaksi Rutin Terdaftar"
          description="Daftarkan pemasukan pasti seperti Gaji & Bonus, atau pengeluaran pasti seperti Listrik PLN, Wi-Fi, dan Cicilan Hutang."
          actionLabel="Tambah Transaksi Rutin"
          onAction={() => openAddModal('expense')}
        />
      )}

      {/* Add Bill Modal */}
      <Modal isOpen={isAddOpen} onClose={closeModal} title="Tambah Transaksi Rutin / Pasti">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-expense/10 border border-expense/20 rounded-2xl text-expense text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Type Segmented */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-2 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                const expCats = categories.filter((c) => c.type === 'expense');
                if (expCats.length > 0) setCategoryId(expCats[0].id);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                type === 'expense' ? 'bg-expense text-white shadow-xs' : 'text-text-muted hover:text-text'
              }`}
            >
              Pengeluaran Pasti (Listrik/Cicilan)
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                const incCats = categories.filter((c) => c.type === 'income');
                if (incCats.length > 0) setCategoryId(incCats[0].id);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                type === 'income' ? 'bg-income text-white shadow-xs' : 'text-text-muted hover:text-text'
              }`}
            >
              Pemasukan Pasti (Gaji/Bonus)
            </button>
          </div>

          <div className="space-y-1">
            <label htmlFor="billTitle" className="block text-xs font-semibold text-text-muted">
              {type === 'income' ? 'Nama Pemasukan Rutin' : 'Nama Pengeluaran Rutin / Tagihan'}
            </label>
            <input
              type="text"
              id="billTitle"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'income' ? 'Contoh: Gaji Bulanan Kantor, Bonus Rutin' : 'Contoh: Listrik PLN, Wi-Fi Indihome, Cicilan KPR'}
              className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <AmountInput id="billAmount" label="Nominal Pasti (Rp)" value={amount} onChange={setAmount} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="billDueDay" className="block text-xs font-semibold text-text-muted">Tanggal Eksekusi / Jatuh Tempo (1-31)</label>
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
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="billWallet" className="block text-xs font-semibold text-text-muted">
              {type === 'income' ? 'Masuk ke Rekening / Dompet Default' : 'Debet dari Rekening / Dompet Default'}
            </label>
            <select
              id="billWallet"
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} (Saldo: {formatRupiah(w.balance)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="billAutoRecord"
              checked={autoRecord}
              onChange={(e) => setAutoRecord(e.target.checked)}
              className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
            />
            <label htmlFor="billAutoRecord" className="text-xs font-semibold text-text cursor-pointer">
              Tandai sebagai transaksi otomatis (Auto-Record)
            </label>
          </div>

          <Button
            type="submit"
            variant={type === 'income' ? 'primary' : 'danger'}
            size="lg"
            isLoading={isLoading}
            className="w-full mt-4 font-bold"
          >
            Simpan {type === 'income' ? 'Pemasukan Pasti' : 'Pengeluaran Pasti'}
          </Button>
        </form>
      </Modal>

      {/* Pay / Record Bill Modal */}
      <Modal
        isOpen={isPayOpen}
        onClose={() => setIsPayOpen(false)}
        title={selectedBill?.type === 'income' ? `Catat Pemasukan: ${selectedBill?.title}` : `Pelunasan: ${selectedBill?.title}`}
      >
        <form onSubmit={handlePaySubmit} className="space-y-4">
          {payError && (
            <div className="p-3 bg-expense/10 border border-expense/20 rounded-2xl text-expense text-xs font-semibold">
              {payError}
            </div>
          )}

          <div className="p-4 bg-surface-2 rounded-2xl space-y-1">
            <p className="text-xs text-text-muted">
              {selectedBill?.type === 'income' ? 'Nominal yang akan dimasukkan ke kas' : 'Nominal yang akan dibayarkan'}
            </p>
            <p className={`text-xl font-extrabold ${selectedBill?.type === 'income' ? 'text-income' : 'text-text'}`}>
              {selectedBill ? formatRupiah(selectedBill.amount) : 'Rp 0'}
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="payWallet" className="block text-xs font-semibold text-text-muted">
              {selectedBill?.type === 'income' ? 'Terima ke Dompet / Rekening' : 'Bayar Menggunakan Dompet / Rekening'}
            </label>
            <select
              id="payWallet"
              value={payWalletId}
              onChange={(e) => setPayWalletId(e.target.value)}
              required
              className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} (Saldo: {formatRupiah(w.balance)})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="payDate" className="block text-xs font-semibold text-text-muted">Tanggal Transaksi</label>
            <input
              type="date"
              id="payDate"
              required
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <Button
            type="submit"
            variant={selectedBill?.type === 'income' ? 'primary' : 'danger'}
            size="lg"
            isLoading={isPaying}
            className="w-full mt-4 font-bold"
          >
            {selectedBill?.type === 'income' ? 'Konfirmasi Catat Pemasukan Kas' : 'Konfirmasi Bayar & Catat Pengeluaran'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

