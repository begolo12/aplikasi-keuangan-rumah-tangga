'use client';

import React, { useState } from 'react';
import { RecurringBill, Wallet, Category, Debt } from '@/lib/types';
import { BillItem } from './BillItem';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmModal } from '../ui/ConfirmModal';
import { AmountInput } from '../ui/AmountInput';
import { EmptyState } from '../ui/EmptyState';
import { Plus, Receipt, Lightning, ArrowDownLeft, Sparkle } from '@phosphor-icons/react';
import { formatRupiah, INDONESIAN_MONTHS, getLocalDateString } from '@/lib/formatters';
import { useBillForm } from './useBillForm';
import { ApiError, apiFetch, endpoints } from '@/lib/apiFetch';
import { useToast } from '../ui/Toast';
import { StatCard, StatGrid } from '../ui/StatCard';
import { Alert } from '../ui/Alert';

interface BillsViewProps {
  bills: RecurringBill[];
  wallets: Wallet[];
  categories: Category[];
  debts?: Debt[];
  currentMonth?: number;
  currentYear?: number;
  onRefresh: () => void;
}

export function BillsView({
  bills,
  wallets,
  categories,
  debts = [],
  currentMonth = new Date().getMonth() + 1,
  currentYear = new Date().getFullYear(),
  onRefresh,
}: BillsViewProps) {
  const { notify } = useToast();
  const [activeFilter, setActiveFilter] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<RecurringBill | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [isAutoProcessing, setIsAutoProcessing] = useState(false);
  const [autoProcessResult, setAutoProcessResult] = useState<string | null>(null);

  // Form states for Pay / Record Bill
  const [payWalletId, setPayWalletId] = useState('');
  const [payDate, setPayDate] = useState(() => getLocalDateString());
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
    toWalletId,
    setToWalletId,
    debtId,
    setDebtId,
    autoRecord,
    setAutoRecord,
    isLoading,
    error,
    openAddModal,
    closeModal,
    handleAddSubmit,
  } = useBillForm({ wallets, categories, onSuccess: onRefresh });

  const filteredBills = bills.filter((b) => {
    if (activeFilter !== 'all' && b.type !== activeFilter) return false;
    return true;
  });

  const expenseBills = bills.filter((b) => b.type === 'expense');
  const incomeBills = bills.filter((b) => b.type === 'income');
  const transferBills = bills.filter((b) => b.type === 'transfer');

  const totalExpenseScheduled = expenseBills.reduce((s, b) => s + b.amount, 0);
  const totalIncomeScheduled = incomeBills.reduce((s, b) => s + b.amount, 0);
  const pendingCount = bills.filter((b) => !b.is_paid).length;

  const handlePayClick = (bill: RecurringBill) => {
    setSelectedBill(bill);
    const targetW = wallets.find((w) => w.id === bill.wallet_id) || wallets.find((w) => w.is_default) || wallets[0];
    if (targetW) setPayWalletId(targetW.id);
    setPayDate(getLocalDateString());
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
      notify('Transaksi rutin berhasil dicatat.', { tone: 'success' });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal memproses transaksi rutin.';
      setPayError(msg);
      notify(msg, { tone: 'error' });
    } finally {
      setIsPaying(false);
    }
  };

  const [isAutoProcessConfirmOpen, setIsAutoProcessConfirmOpen] = useState(false);

  const handleAutoProcessAll = async () => {
    setIsAutoProcessing(true);
    setAutoProcessResult(null);
    setListError(null);
    setIsAutoProcessConfirmOpen(false);

    try {
      const res = await apiFetch<{ message: string; processed_count: number }>(
        endpoints.autoProcessBills(currentMonth, currentYear),
        { method: 'POST' }
      );
      setAutoProcessResult(res.message || 'Transaksi rutin berhasil diproses.');
      notify(res.message || 'Transaksi rutin berhasil diproses.', { tone: 'success' });
      onRefresh();
      setTimeout(() => setAutoProcessResult(null), 5000);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal memproses transaksi otomatis.';
      setListError(msg);
      notify(msg, { tone: 'error' });
    } finally {
      setIsAutoProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(endpoints.bill(id), { method: 'DELETE' });
      setListError(null);
      onRefresh();
      notify('Transaksi rutin dihapus.', { tone: 'success' });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal menghapus transaksi rutin.';
      setListError(msg);
      notify(msg, { tone: 'error' });
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
              onClick={() => setIsAutoProcessConfirmOpen(true)}
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
        <Alert tone="primary" size="sm" icon={<Sparkle size={18} weight="fill" />}>
          {autoProcessResult}
        </Alert>
      )}

      {/* Delete / List Error */}
      {listError && (
        <Alert tone="error" size="sm">
          {listError}
        </Alert>
      )}

      {/* Summary Cards */}
      <StatGrid layout="2-3-lg">
        <StatCard
          tone="income"
          label="Pemasukan Pasti Rutin"
          icon={<ArrowDownLeft size={16} weight="bold" />}
          value={formatRupiah(totalIncomeScheduled)}
          hint={`${incomeBills.length} jadwal pemasukan (gaji/dll)`}
        />
        <StatCard
          tone="expense"
          label="Pengeluaran Pasti Rutin"
          icon={<Receipt size={16} weight="duotone" />}
          value={formatRupiah(totalExpenseScheduled)}
          hint={`${expenseBills.length} tagihan/cicilan pasti`}
        />
        <StatCard
          accent
          className="col-span-2 lg:col-span-1"
          label="Status Periode Ini"
          icon={<Lightning size={16} weight="fill" />}
          value={pendingCount === 0 ? 'Semua Sudah Tercatat' : `${pendingCount} Belum Tercatat`}
          hint={`Periode ${INDONESIAN_MONTHS[currentMonth - 1]} ${currentYear}`}
        />
      </StatGrid>

      {/* Segmented Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`min-h-[44px] px-3.5 text-xs font-bold rounded-xl transition-colors shrink-0 ${
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
          className={`min-h-[44px] px-3.5 text-xs font-bold rounded-xl transition-colors shrink-0 ${
            activeFilter === 'expense'
              ? 'bg-expense text-expense-fg'
              : 'bg-surface border border-border text-text-muted hover:text-text'
          }`}
        >
          Pengeluaran Pasti ({expenseBills.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('income')}
          className={`min-h-[44px] px-3.5 text-xs font-bold rounded-xl transition-colors shrink-0 ${
            activeFilter === 'income'
              ? 'bg-income text-income-fg'
              : 'bg-surface border border-border text-text-muted hover:text-text'
          }`}
        >
          Pemasukan Pasti ({incomeBills.length})
        </button>
        {transferBills.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveFilter('transfer')}
            className={`min-h-[44px] px-3.5 text-xs font-bold rounded-xl transition-colors shrink-0 ${
              activeFilter === 'transfer'
                ? 'bg-primary text-primary-fg'
                : 'bg-surface border border-border text-text-muted hover:text-text'
            }`}
          >
            Transfer Amplop ({transferBills.length})
          </button>
        )}
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
          <div className="grid grid-cols-3 gap-1 p-1 bg-surface-2 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                const expCats = categories.filter((c) => c.type === 'expense');
                if (expCats.length > 0) setCategoryId(expCats[0].id);
              }}
              className={`py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all ${
                type === 'expense' ? 'bg-expense text-expense-fg shadow-xs' : 'text-text-muted hover:text-text'
              }`}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                const incCats = categories.filter((c) => c.type === 'income');
                if (incCats.length > 0) setCategoryId(incCats[0].id);
              }}
              className={`py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all ${
                type === 'income' ? 'bg-income text-income-fg shadow-xs' : 'text-text-muted hover:text-text'
              }`}
            >
              Pemasukan
            </button>
            <button
              type="button"
              onClick={() => {
                setType('transfer');
                setCategoryId('');
                if (!toWalletId) {
                  const envelope = wallets.find((w) => w.type === 'envelope' || w.linked_goal_id);
                  if (envelope) setToWalletId(envelope.id);
                }
              }}
              className={`py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all ${
                type === 'transfer' ? 'bg-primary text-primary-fg shadow-xs' : 'text-text-muted hover:text-text'
              }`}
            >
              Transfer Amplop
            </button>
          </div>

          <div className="space-y-1">
            <label htmlFor="billTitle" className="block text-xs font-semibold text-text-muted">
              {type === 'income' ? 'Nama Pemasukan Rutin' : type === 'transfer' ? 'Nama Rencana Transfer' : 'Nama Pengeluaran Rutin / Tagihan'}
            </label>
            <input
              type="text"
              id="billTitle"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'income' ? 'Contoh: Gaji Bulanan Kantor, Bonus Rutin' : type === 'transfer' ? 'Contoh: Alokasi Tabungan Darurat, Amplop Liburan' : 'Contoh: Listrik PLN, Wi-Fi Indihome, Cicilan KPR'}
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

            {type !== 'transfer' && (
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
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="billWallet" className="block text-xs font-semibold text-text-muted">
              {type === 'income' ? 'Masuk ke Rekening / Dompet Default' : type === 'transfer' ? 'Dari Dompet / Rekening' : 'Debet dari Rekening / Dompet Default'}
            </label>
            <select
              id="billWallet"
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {type === 'transfer' && (
            <div className="space-y-1">
              <label htmlFor="billToWallet" className="block text-xs font-semibold text-text-muted">
                Ke Dompet Tujuan (Amplop / Target Tabungan)
              </label>
              <select
                id="billToWallet"
                value={toWalletId}
                onChange={(e) => setToWalletId(e.target.value)}
                required
                className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="">Pilih dompet tujuan...</option>
                {wallets.filter((w) => w.id !== walletId).map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-text-muted">
                Setiap bulan nominal dipindahkan otomatis dari dompet asal ke dompet ini (bukan pengeluaran).
              </p>
            </div>
          )}

          {type === 'expense' && debts.filter((d) => d.status !== 'paid').length > 0 && (
            <div className="space-y-1">
              <label htmlFor="billDebt" className="block text-xs font-semibold text-text-muted">
                Tautkan ke Hutang (opsional, cicilan ikut update sisa hutang)
              </label>
              <select
                id="billDebt"
                value={debtId}
                onChange={(e) => setDebtId(e.target.value)}
                className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="">Tanpa tautan hutang</option>
                {debts.filter((d) => d.status !== 'paid').map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.person_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="billAutoRecord"
              checked={autoRecord}
              onChange={(e) => setAutoRecord(e.target.checked)}
              className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
            />
            <label htmlFor="billAutoRecord" className="text-xs font-semibold text-text cursor-pointer py-3.5 -my-2">
              Tandai sebagai transaksi otomatis (Auto-Record)
            </label>
          </div>

          <Button
            type="submit"
            variant={type === 'income' ? 'primary' : type === 'transfer' ? 'primary' : 'danger'}
            size="lg"
            isLoading={isLoading}
            className="w-full mt-4 font-bold"
          >
            Simpan {type === 'income' ? 'Pemasukan Pasti' : type === 'transfer' ? 'Rencana Transfer' : 'Pengeluaran Pasti'}
          </Button>
        </form>
      </Modal>

      {/* Pay / Record Bill Modal */}
      <Modal
        isOpen={isPayOpen}
        onClose={() => setIsPayOpen(false)}
        title={
          selectedBill?.type === 'income'
            ? `Catat Pemasukan: ${selectedBill?.title}`
            : selectedBill?.type === 'transfer'
            ? `Jalankan Transfer: ${selectedBill?.title}`
            : `Pelunasan: ${selectedBill?.title}`
        }
      >
        <form onSubmit={handlePaySubmit} className="space-y-4">
          {payError && (
            <Alert tone="error" size="sm">
              {payError}
            </Alert>
          )}

          <div className="p-4 bg-surface-2 rounded-2xl space-y-1">
            <p className="text-xs text-text-muted">
              {selectedBill?.type === 'income'
                ? 'Nominal yang akan dimasukkan ke kas'
                : selectedBill?.type === 'transfer'
                ? 'Nominal yang akan dipindahkan'
                : 'Nominal yang akan dibayarkan'}
            </p>
            <p className={`text-xl font-extrabold ${selectedBill?.type === 'expense' ? 'text-text' : 'text-income'}`}>
              {selectedBill ? formatRupiah(selectedBill.amount) : 'Rp 0'}
            </p>
            {selectedBill?.type === 'transfer' && selectedBill.to_wallet_name && (
              <p className="text-[11px] text-text-muted">
                Tujuan: <span className="font-bold text-text">{selectedBill.to_wallet_name}</span>
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="payWallet" className="block text-xs font-semibold text-text-muted">
              {selectedBill?.type === 'income' ? 'Terima ke Dompet / Rekening' : selectedBill?.type === 'transfer' ? 'Dari Dompet / Rekening' : 'Bayar Menggunakan Dompet / Rekening'}
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
                  {w.name}
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
            variant={selectedBill?.type === 'expense' ? 'danger' : 'primary'}
            size="lg"
            isLoading={isPaying}
            className="w-full mt-4 font-bold"
          >
            {selectedBill?.type === 'income' ? 'Konfirmasi Catat Pemasukan Kas' : selectedBill?.type === 'transfer' ? 'Konfirmasi Transfer Dana' : 'Konfirmasi Bayar & Catat Pengeluaran'}
          </Button>
        </form>
      </Modal>

      {/* Confirm Auto Process Modal */}
      <ConfirmModal
        isOpen={isAutoProcessConfirmOpen}
        onClose={() => setIsAutoProcessConfirmOpen(false)}
        onConfirm={handleAutoProcessAll}
        title="Proses Otomatis Transaksi Rutin"
        message={`Proses dan catat otomatis semua transaksi rutin yang belum tercatat untuk ${INDONESIAN_MONTHS[currentMonth - 1]} ${currentYear}?`}
        confirmLabel="Ya, Proses Semua"
        variant="primary"
        isLoading={isAutoProcessing}
      />
    </div>
  );
}

