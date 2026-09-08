'use client';

import React, { useState } from 'react';
import { Debt, DebtType, Wallet, MonthlySummary as MonthlySummaryType, Budget } from '@/lib/types';
import { DebtItem } from './DebtItem';
import { DebtCalculatorModal } from './DebtCalculatorModal';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { AmountInput } from '../ui/AmountInput';
import { EmptyState } from '../ui/EmptyState';
import { formatRupiah } from '@/lib/formatters';
import { ApiError, apiFetch, endpoints } from '@/lib/apiFetch';
import {
  Plus,
  HandCoins,
  ArrowDownRight,
  ArrowUpRight,
  MagnifyingGlass,
  Calculator,
} from '@phosphor-icons/react';

interface DebtsViewProps {
  debts: Debt[];
  wallets: Wallet[];
  summary?: MonthlySummaryType | null;
  budgets?: Budget[];
  onRefresh: () => void;
}

export function DebtsView({
  debts,
  wallets,
  summary = null,
  budgets = [],
  onRefresh,
}: DebtsViewProps) {
  const [activeType, setActiveType] = useState<DebtType>('payable');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [listError, setListError] = useState<string | null>(null);

  // Calculator Modal State
  const [isCalcOpen, setIsCalcOpen] = useState(false);

  // Add Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addType, setAddType] = useState<DebtType>('payable');
  const [debtCategory, setDebtCategory] = useState<string>('hutang_pribadi');
  const [personName, setPersonName] = useState('');
  const [principalAmount, setPrincipalAmount] = useState(0);
  const [interestRate, setInterestRate] = useState(0); // % per tahun
  const [tenorMonths, setTenorMonths] = useState(12);
  const [isDetailLoan, setIsDetailLoan] = useState(false);
  const [startDate, setStartDate] = useState(() => getLocalDateString());
  const [createAsset, setCreateAsset] = useState(true);
  const [assetName, setAssetName] = useState('');
  const [assetPrice, setAssetPrice] = useState(0);
  const [initialPaidAmount, setInitialPaidAmount] = useState(0);
  const [autoCalculatePaid, setAutoCalculatePaid] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [autoSchedule, setAutoSchedule] = useState(false);
  const [scheduleWalletId, setScheduleWalletId] = useState('');
  const [budgetCategoryId, setBudgetCategoryId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Live calculation jika mode detail aktif
  const computedInterest = isDetailLoan && interestRate > 0 && tenorMonths > 0
    ? (principalAmount * (interestRate / 100) * (tenorMonths / 12))
    : 0;
  const computedTotal = isDetailLoan ? principalAmount + computedInterest : totalAmount;
  const computedMonthlyInstallment = isDetailLoan && tenorMonths > 0
    ? Math.round(computedTotal / tenorMonths)
    : 0;

  // Live calculation elapsed months dari tanggal mulai
  const now = new Date();
  const startObj = startDate ? new Date(startDate) : null;
  let elapsedMonths = 0;
  if (startObj && !isNaN(startObj.getTime())) {
    elapsedMonths = Math.max(0, (now.getFullYear() - startObj.getFullYear()) * 12 + (now.getMonth() - startObj.getMonth()));
  }
  const autoCalculatedPaid = isDetailLoan && computedMonthlyInstallment > 0 && elapsedMonths > 0
    ? Math.min(computedTotal, elapsedMonths * computedMonthlyInstallment)
    : 0;
  const effectiveInitialPaid = autoCalculatePaid ? autoCalculatedPaid : initialPaidAmount;
  const effectiveRemaining = Math.max(0, computedTotal - effectiveInitialPaid);

  // Pay / Settle Modal State
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [payWalletId, setPayWalletId] = useState('');
  const [payAmount, setPayAmount] = useState(0);
  const [payDate, setPayDate] = useState(() => getLocalDateString());
  const [payNotes, setPayNotes] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Filtered List
  const filteredDebts = debts.filter((d) => {
    if (d.type !== activeType) return false;
    if (statusFilter === 'unpaid' && d.status === 'paid') return false;
    if (statusFilter === 'paid' && d.status !== 'paid') return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchPerson = d.person_name.toLowerCase().includes(q);
      const matchNotes = d.notes?.toLowerCase().includes(q);
      if (!matchPerson && !matchNotes) return false;
    }
    return true;
  });

  // Calculate totals for active tab
  const tabDebts = debts.filter((d) => d.type === activeType);
  const totalPrincipal = tabDebts.reduce((sum, d) => sum + d.total_amount, 0);
  const totalRemaining = tabDebts.reduce((sum, d) => sum + d.remaining_amount, 0);
  const totalPaid = tabDebts.reduce((sum, d) => sum + d.paid_amount, 0);

  const openAddModal = (type: DebtType = activeType) => {
    setAddType(type);
    setDebtCategory(type === 'payable' ? 'kpr_rumah' : 'hutang_pribadi');
    setPersonName('');
    setPrincipalAmount(0);
    setInterestRate(0);
    setTenorMonths(120);
    setIsDetailLoan(type === 'payable');
    setStartDate(getLocalDateString());
    setCreateAsset(type === 'payable');
    setAssetName('');
    setAssetPrice(0);
    setInitialPaidAmount(0);
    setAutoCalculatePaid(true);
    setTotalAmount(0);
    setDueDate('');
    setNotes('');
    setAutoSchedule(false);
    setBudgetCategoryId('');
    const defaultW = wallets.find((w) => w.is_default) || wallets[0];
    if (defaultW) setScheduleWalletId(defaultW.id);
    setAddError(null);
    setIsAddOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim()) {
      setAddError('Nama pihak/lembaga wajib diisi.');
      return;
    }
    const finalTotal = isDetailLoan ? computedTotal : totalAmount;
    if (finalTotal <= 0) {
      setAddError('Nominal harus lebih dari 0.');
      return;
    }

    setIsAdding(true);
    setAddError(null);

    try {
      const res = (await apiFetch(endpoints.debts, {
        method: 'POST',
        json: {
          type: addType,
          category: debtCategory,
          person_name: personName.trim(),
          total_amount: finalTotal,
          principal_amount: isDetailLoan ? principalAmount : finalTotal,
          interest_rate: isDetailLoan ? interestRate : 0,
          interest_type: 'flat',
          tenor_months: isDetailLoan ? tenorMonths : null,
          monthly_installment: isDetailLoan ? computedMonthlyInstallment : null,
          start_date: isDetailLoan && startDate ? startDate : null,
          initial_paid_amount: isDetailLoan ? effectiveInitialPaid : 0,
          due_date: dueDate || null,
          notes: notes.trim() || null,
          auto_schedule_bill: addType === 'payable' && autoSchedule,
          budget_category_id: addType === 'payable' && autoSchedule && budgetCategoryId ? budgetCategoryId : null,
          schedule_due_day: startDate ? new Date(startDate).getDate() : 10,
          create_asset: addType === 'payable' && createAsset,
          asset_name: assetName.trim() || (debtCategory === 'kpr_rumah' ? `Rumah (${personName.trim()})` : personName.trim()),
          asset_price: assetPrice > 0 ? assetPrice : (isDetailLoan ? principalAmount : finalTotal),
        },
      })) as { data?: { bill_scheduled?: boolean; created_asset?: { id: string; name: string } | null } };

      if (addType === 'payable' && autoSchedule && res?.data?.bill_scheduled === false) {
        setListError('Jadwal cicilan otomatis gagal dibuat. Silakan buat manual di menu Tagihan Rutin.');
      } else {
        setListError(null);
      }

      onRefresh();
      setIsAddOpen(false);
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : 'Gagal menyimpan hutang/piutang.');
    } finally {
      setIsAdding(false);
    }
  };

  const openPayModal = (debt: Debt) => {
    setSelectedDebt(debt);
    const defaultW = wallets.find((w) => w.is_default) || wallets[0];
    if (defaultW) setPayWalletId(defaultW.id);
    setPayAmount(debt.remaining_amount);
    setPayDate(getLocalDateString());
    setPayNotes('');
    setPayError(null);
    setIsPayOpen(true);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;
    if (!payWalletId) {
      setPayError('Pilih dompet untuk transaksi.');
      return;
    }
    if (payAmount <= 0) {
      setPayError('Nominal pembayaran harus lebih dari 0.');
      return;
    }
    if (payAmount > selectedDebt.remaining_amount) {
      setPayError(`Nominal melebihi sisa kewajiban (${formatRupiah(selectedDebt.remaining_amount)}).`);
      return;
    }

    setIsPaying(true);
    setPayError(null);

    try {
      await apiFetch(endpoints.payDebt(selectedDebt.id), {
        method: 'POST',
        json: {
          wallet_id: payWalletId,
          amount: payAmount,
          payment_date: payDate,
          notes: payNotes.trim() || null,
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
    try {
      await apiFetch(endpoints.debt(id), { method: 'DELETE' });
      setListError(null);
      onRefresh();
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : 'Gagal menghapus data.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-text">Hutang & Piutang</h2>
          <p className="text-xs sm:text-sm text-text-muted">
            Pantau kewajiban hutang keluarga, hak tagih piutang, dan simulasi kelayakan hutang (KPI).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
          <Button
            variant="outline"
            size="md"
            leftIcon={<Calculator size={18} weight="bold" className="text-primary" />}
            onClick={() => setIsCalcOpen(true)}
          >
            Kalkulator & Insight Hutang
          </Button>

          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus size={18} weight="bold" />}
            onClick={() => openAddModal(activeType)}
            className="shadow-xs"
          >
            Catat {activeType === 'payable' ? 'Hutang' : 'Piutang'} Baru
          </Button>
        </div>
      </div>

      {/* Segmented Tab: Hutang (Payable) vs Piutang (Receivable) */}
      <div className="grid grid-cols-2 p-1 bg-surface border border-border rounded-2xl max-w-md shadow-xs">
        <button
          type="button"
          onClick={() => setActiveType('payable')}
          className={`py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeType === 'payable'
              ? 'bg-expense text-white shadow-xs'
              : 'text-text-muted hover:text-text'
          }`}
        >
          <ArrowDownRight size={18} weight="bold" />
          <span>Hutang Saya (Kewajiban)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveType('receivable')}
          className={`py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeType === 'receivable'
              ? 'bg-primary text-white shadow-xs'
              : 'text-text-muted hover:text-text'
          }`}
        >
          <ArrowUpRight size={18} weight="bold" />
          <span>Piutang Saya (Hak Tagih)</span>
        </button>
      </div>

      {/* Summary Strip (Compact 3-column responsive) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="p-2.5 sm:p-4 bg-surface border border-border rounded-2xl shadow-xs space-y-0.5 sm:space-y-1 min-w-0">
          <p className="text-[10px] sm:text-xs text-text-muted font-semibold truncate">
            {activeType === 'payable' ? 'Sisa Hutang' : 'Sisa Piutang'}
          </p>
          <p className={`text-sm sm:text-lg md:text-xl font-extrabold whitespace-nowrap tabular-nums truncate ${activeType === 'payable' ? 'text-expense' : 'text-primary'}`}>
            {formatRupiah(totalRemaining)}
          </p>
        </div>

        <div className="p-2.5 sm:p-4 bg-surface border border-border rounded-2xl shadow-xs space-y-0.5 sm:space-y-1 min-w-0">
          <p className="text-[10px] sm:text-xs text-text-muted font-semibold truncate">
            {activeType === 'payable' ? 'Terbayar' : 'Diterima'}
          </p>
          <p className="text-sm sm:text-lg md:text-xl font-extrabold text-income whitespace-nowrap tabular-nums truncate">
            {formatRupiah(totalPaid)}
          </p>
        </div>

        <div className="p-2.5 sm:p-4 bg-surface border border-border rounded-2xl shadow-xs space-y-0.5 sm:space-y-1 min-w-0">
          <p className="text-[10px] sm:text-xs text-text-muted font-semibold truncate">Pokok Awal</p>
          <p className="text-sm sm:text-lg md:text-xl font-extrabold text-text whitespace-nowrap tabular-nums truncate">
            {formatRupiah(totalPrincipal)}
          </p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder={`Cari nama pihak atau catatan ${activeType === 'payable' ? 'hutang' : 'piutang'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-surface border border-border rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-text-muted/50"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`min-h-[36px] px-3 text-xs font-bold rounded-xl transition-colors shrink-0 ${
              statusFilter === 'all'
                ? 'bg-text text-background'
                : 'bg-surface border border-border text-text-muted hover:text-text'
            }`}
          >
            Semua ({tabDebts.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('unpaid')}
            className={`min-h-[36px] px-3 text-xs font-bold rounded-xl transition-colors shrink-0 ${
              statusFilter === 'unpaid'
                ? 'bg-text text-background'
                : 'bg-surface border border-border text-text-muted hover:text-text'
            }`}
          >
            Belum Lunas ({tabDebts.filter((d) => d.status !== 'paid').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('paid')}
            className={`min-h-[36px] px-3 text-xs font-bold rounded-xl transition-colors shrink-0 ${
              statusFilter === 'paid'
                ? 'bg-text text-background'
                : 'bg-surface border border-border text-text-muted hover:text-text'
            }`}
          >
            Lunas ({tabDebts.filter((d) => d.status === 'paid').length})
          </button>
        </div>
      </div>

      {listError && (
        <div role="alert" className="p-3.5 bg-expense/10 border border-expense/20 rounded-2xl text-expense text-xs font-semibold">
          {listError}
        </div>
      )}

      {/* Debts List */}
      {filteredDebts.length === 0 ? (
        <EmptyState
          icon={<HandCoins size={36} />}
          title={`Belum ada data ${activeType === 'payable' ? 'hutang' : 'piutang'}`}
          description={`Catat ${activeType === 'payable' ? 'pinjaman atau kewajiban hutang' : 'piutang yang dipinjam orang lain'} agar tercatat rapi.`}
          actionLabel={`+ Catat ${activeType === 'payable' ? 'Hutang' : 'Piutang'}`}
          onAction={() => openAddModal(activeType)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredDebts.map((debt) => (
            <DebtItem
              key={debt.id}
              debt={debt}
              onPay={openPayModal}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modal: Tambah Hutang / Piutang */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <span>Catat {addType === 'payable' ? 'Hutang' : 'Piutang'} Baru</span>
          </div>
        }
        maxWidth="md"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {addError && (
            <div role="alert" className="p-3.5 bg-expense/10 border border-expense/20 rounded-2xl text-expense text-xs font-semibold">
              {addError}
            </div>
          )}

          {/* Type Segmented */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-2 rounded-2xl">
            <button
              type="button"
              onClick={() => setAddType('payable')}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                addType === 'payable' ? 'bg-expense text-white shadow-xs' : 'text-text-muted hover:text-text'
              }`}
            >
              Hutang Saya (Kewajiban)
            </button>
            <button
              type="button"
              onClick={() => setAddType('receivable')}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                addType === 'receivable' ? 'bg-primary text-white shadow-xs' : 'text-text-muted hover:text-text'
              }`}
            >
              Piutang Saya (Hak Tagih)
            </button>
          </div>

          {/* Mode Switcher: Simpel vs Rinci (KPR/Bunga/Tenor) untuk Hutang */}
          {addType === 'payable' && (
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-text-muted">Kategori / Jenis Pinjaman</label>
                <select
                  value={debtCategory}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setDebtCategory(cat);
                    if (cat === 'kpr_rumah' || cat === 'kredit_kendaraan' || cat === 'pinjaman_bank') {
                      setIsDetailLoan(true);
                    }
                  }}
                  className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="hutang_pribadi">Hutang Pribadi (Teman / Kerabat)</option>
                  <option value="kpr_rumah">KPR / Cicilan Rumah & Properti</option>
                  <option value="kredit_kendaraan">Kredit Motor / Mobil</option>
                  <option value="pinjaman_bank">Pinjaman Bank / KTA / Koperasi</option>
                  <option value="lainnya">Pinjaman Lainnya</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isDetailLoan"
                  checked={isDetailLoan}
                  onChange={(e) => setIsDetailLoan(e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
                />
                <label htmlFor="isDetailLoan" className="text-xs font-bold text-text cursor-pointer">
                  Input Rinci (Pokok Pinjaman, Suku Bunga & Tenor Bulan)
                </label>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="debt-person-name" className="block text-xs font-semibold text-text-muted">
              {addType === 'payable' ? 'Pemberi Pinjaman / Nama Bank / Lembaga' : 'Peminjam / Nama Orang / Lembaga'}
            </label>
            <input
              id="debt-person-name"
              type="text"
              required
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder={
                debtCategory === 'kpr_rumah'
                  ? 'Contoh: KPR Bank BTN / BCA'
                  : debtCategory === 'kredit_kendaraan'
                  ? 'Contoh: Leasing Adira / BCA Finance'
                  : addType === 'payable'
                  ? 'Contoh: Bank Mandiri, Pak Budi, Mertua'
                  : 'Contoh: Teman Kantor (Andi), Saudara'
              }
              className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          {isDetailLoan ? (
            <div className="space-y-3 p-3.5 bg-surface-2 rounded-2xl border border-border">
              <AmountInput
                id="principalAmount"
                label="Pokok Pinjaman Awal (Rp)"
                value={principalAmount}
                onChange={setPrincipalAmount}
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="tenorInput" className="block text-xs font-semibold text-text-muted">Tenor (Bulan)</label>
                  <input
                    id="tenorInput"
                    type="number"
                    min="1"
                    max="360"
                    required={isDetailLoan}
                    value={tenorMonths}
                    onChange={(e) => setTenorMonths(parseInt(e.target.value, 10) || 1)}
                    placeholder="Contoh: 120 (10 thn)"
                    className="w-full h-11 px-3.5 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="rateInput" className="block text-xs font-semibold text-text-muted">Suku Bunga (% / Thn)</label>
                  <input
                    id="rateInput"
                    type="number"
                    step="0.1"
                    min="0"
                    value={interestRate}
                    onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                    placeholder="Contoh: 7.5"
                    className="w-full h-11 px-3.5 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="debt-start-date" className="block text-xs font-semibold text-text-muted">
                  Tanggal Mulai Cicilan / Akad {debtCategory === 'kpr_rumah' ? 'KPR' : 'Pinjaman'}
                </label>
                <input
                  id="debt-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* Live Calculation Preview Strip */}
              {principalAmount > 0 && (
                <div className="p-3 bg-surface rounded-xl border border-primary/20 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Estimasi Cicilan per Bulan:</span>
                    <span className="font-extrabold text-expense text-sm tabular-nums">
                      {formatRupiah(computedMonthlyInstallment)} / bln
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/50 text-text-muted">
                    <span>Total Bunga ({interestRate}%): <span className="font-semibold text-text tabular-nums">+{formatRupiah(computedInterest)}</span></span>
                    <span>Total Pelunasan: <span className="font-extrabold text-text tabular-nums">{formatRupiah(computedTotal)}</span></span>
                  </div>
                </div>
              )}

              {/* Deteksi Otomatis Cicilan Berjalan di Masa Lalu */}
              {elapsedMonths > 0 && (
                <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-primary">
                    <span>Cicilan Berjalan ({elapsedMonths} Bulan Berjalan)</span>
                    <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-extrabold">
                      Otomatis Terbayar
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    Pinjaman dimulai sejak {startDate}. Sistem otomatis mengakumulasi cicilan yang telah berlalu sehingga sisa hutang langsung berkurang dan tidak ditandai menunggak.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-primary/15 text-[11px]">
                    <div>
                      <span className="text-text-muted block">Sudah Terbayar ({elapsedMonths} bln):</span>
                      <span className="font-extrabold text-income tabular-nums">{formatRupiah(autoCalculatedPaid)}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block">Sisa Hutang Riil:</span>
                      <span className="font-extrabold text-expense tabular-nums">{formatRupiah(effectiveRemaining)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Opsi Daftarkan sebagai Aset Fisik (Rumah / Kendaraan) */}
              {addType === 'payable' && (debtCategory === 'kpr_rumah' || debtCategory === 'kredit_kendaraan') && (
                <div className="p-3.5 bg-surface rounded-2xl border border-border/80 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="createAsset"
                      checked={createAsset}
                      onChange={(e) => setCreateAsset(e.target.checked)}
                      className="w-4 h-4 mt-0.5 text-primary rounded border-border focus:ring-primary"
                    />
                    <div className="space-y-0.5 flex-1">
                      <label htmlFor="createAsset" className="text-xs font-bold text-text cursor-pointer block">
                        Daftarkan sebagai Aset {debtCategory === 'kpr_rumah' ? 'Properti (Rumah)' : 'Kendaraan'} di Inventaris Aset
                      </label>
                      <p className="text-[11px] text-text-muted leading-relaxed">
                        Nilai aset properti ({formatRupiah(principalAmount || computedTotal)}) otomatis masuk ke neraca. Cicilan yang sudah terbayar ({formatRupiah(effectiveInitialPaid)}) akan otomatis menambah <strong>Kekayaan Bersih (Net Worth)</strong> Anda.
                      </p>
                    </div>
                  </div>

                  {createAsset && (
                    <div className="pl-6.5 space-y-2 pt-1 border-t border-border/50">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-text-muted">Nama Aset di Inventaris</label>
                        <input
                          type="text"
                          value={assetName}
                          onChange={(e) => setAssetName(e.target.value)}
                          placeholder={debtCategory === 'kpr_rumah' ? 'Contoh: Rumah Tinggal KPR' : 'Contoh: Mobil Keluarga'}
                          className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Opsi Jadwalkan Cicilan Otomatis */}
              <div className="space-y-2 pt-1 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoSchedule"
                    checked={autoSchedule}
                    onChange={(e) => setAutoSchedule(e.target.checked)}
                    className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
                  />
                  <label htmlFor="autoSchedule" className="text-xs font-semibold text-text cursor-pointer">
                    Otomatis jadwalkan cicilan {formatRupiah(computedMonthlyInstallment)}/bln ke daftar Pengeluaran Pasti
                  </label>
                </div>

                {autoSchedule && (
                  <div className="pl-6 space-y-2">
                    <select
                      value={scheduleWalletId}
                      onChange={(e) => setScheduleWalletId(e.target.value)}
                      className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      {wallets.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} (Saldo: {formatRupiah(w.balance)})
                        </option>
                      ))}
                    </select>
                    <div className="space-y-1">
                      <label htmlFor="debt-budget-category" className="block text-[11px] font-semibold text-text-muted">
                        Masukkan cicilan ke anggaran (opsional)
                      </label>
                      <select
                        id="debt-budget-category"
                        value={budgetCategoryId}
                        onChange={(e) => setBudgetCategoryId(e.target.value)}
                        className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                      >
                        <option value="">Tanpa anggaran khusus</option>
                        {budgets.map((b) => (
                          <option key={b.category_id} value={b.category_id}>
                            {b.category_name || 'Anggaran'} ({formatRupiah(b.effective_limit ?? b.monthly_limit)}/bln)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <AmountInput value={totalAmount} onChange={setTotalAmount} />
          )}

          {!isDetailLoan && (
            <div className="space-y-1">
              <label htmlFor="debt-due-date" className="block text-xs font-semibold text-text-muted">
                Tanggal Jatuh Tempo (Opsional)
              </label>
              <input
                id="debt-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="debt-notes" className="block text-xs font-semibold text-text-muted">Catatan / Keterangan (Opsional)</label>
            <input
              id="debt-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: KPR tenor 10 tahun, bunga floating setelah tahun ke-3"
              className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <Button
            type="submit"
            variant={addType === 'payable' ? 'danger' : 'primary'}
            size="lg"
            isLoading={isAdding}
            className="w-full mt-4 font-bold shadow-md"
          >
            Simpan {addType === 'payable' ? 'Hutang' : 'Piutang'}
          </Button>
        </form>
      </Modal>

      {/* Modal: Bayar Cicilan / Terima Pelunasan */}
      {selectedDebt && (
        <Modal
          isOpen={isPayOpen}
          onClose={() => setIsPayOpen(false)}
          title={
            <div className="flex items-center gap-2">
              <span>{selectedDebt.type === 'payable' ? 'Bayar Cicilan Hutang' : 'Terima Pembayaran Piutang'}</span>
            </div>
          }
          maxWidth="md"
        >
          <form onSubmit={handlePaySubmit} className="space-y-4">
            {payError && (
              <div role="alert" className="p-3.5 bg-expense/10 border border-expense/20 rounded-2xl text-expense text-xs font-semibold">
                {payError}
              </div>
            )}

            {/* Debt Target Info Card */}
            <div className="p-3.5 bg-surface-2 border border-border rounded-2xl space-y-1">
              <p className="text-xs font-bold text-text">{selectedDebt.person_name}</p>
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>Sisa Kewajiban:</span>
                <span className="font-extrabold text-text">{formatRupiah(selectedDebt.remaining_amount)}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="pay-wallet-id" className="block text-xs font-semibold text-text-muted">
                {selectedDebt.type === 'payable' ? 'Bayar Dari Dompet / Rekening' : 'Terima Ke Dompet / Rekening'}
              </label>
              <select
                id="pay-wallet-id"
                value={payWalletId}
                onChange={(e) => setPayWalletId(e.target.value)}
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

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-text-muted">Nominal Pembayaran</label>
                <button
                  type="button"
                  onClick={() => setPayAmount(selectedDebt.remaining_amount)}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Bayar Lunas ({formatRupiah(selectedDebt.remaining_amount)})
                </button>
              </div>
              <AmountInput value={payAmount} onChange={setPayAmount} />
            </div>

            <div className="space-y-1">
              <label htmlFor="pay-date" className="block text-xs font-semibold text-text-muted">Tanggal Transaksi</label>
              <input
                id="pay-date"
                type="date"
                required
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="pay-notes" className="block text-xs font-semibold text-text-muted">Catatan Pembayaran (Opsional)</label>
              <input
                id="pay-notes"
                type="text"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Contoh: Cicilan ke-2 transfer BCA"
                className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <Button
              type="submit"
              variant={selectedDebt.type === 'payable' ? 'danger' : 'primary'}
              size="lg"
              isLoading={isPaying}
              className="w-full mt-4 font-bold shadow-md"
            >
              Proses {selectedDebt.type === 'payable' ? 'Pembayaran Hutang' : 'Penerimaan Piutang'}
            </Button>
          </form>
        </Modal>
      )}

      {/* Debt Calculator Modal */}
      <DebtCalculatorModal
        isOpen={isCalcOpen}
        onClose={() => setIsCalcOpen(false)}
        summary={summary}
        budgets={budgets}
        wallets={wallets}
        onSuccess={onRefresh}
      />
    </div>
  );
}
