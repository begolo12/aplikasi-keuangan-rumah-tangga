'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AmountInput } from '../ui/AmountInput';
import { formatRupiah } from '@/lib/formatters';
import { MonthlySummary as MonthlySummaryType, Budget, Wallet } from '@/lib/types';
import { ApiError, apiFetch, endpoints } from '@/lib/apiFetch';
import {
  Calculator,
  ShieldCheck,
  ShieldWarning,
  WarningOctagon,
} from '@phosphor-icons/react';

interface DebtCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: MonthlySummaryType | null;
  budgets: Budget[];
  wallets: Wallet[];
  onSuccess: () => void;
}

export function DebtCalculatorModal({
  isOpen,
  onClose,
  summary,
  budgets,
  wallets,
  onSuccess,
}: DebtCalculatorModalProps) {
  const [lenderName, setLenderName] = useState('');
  const [principal, setPrincipal] = useState(10000000); // Pokok Pinjaman
  const [tenorMonths, setTenorMonths] = useState(12); // Tenor bulan
  const [interestRateYearly, setInterestRateYearly] = useState(6); // % bunga pertahun flat
  const [firstDueDate, setFirstDueDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [autoCreateRecurring, setAutoCreateRecurring] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Data Keuangan Riil Pengguna
  const monthlyIncome = summary?.total_income || 0;
  const monthlyExpense = summary?.total_expense || 0;
  const totalCash = summary?.total_balance || 0;
  const totalBudgetFromLimits = budgets.reduce((sum, b) => sum + (b.monthly_limit || 0), 0);
  const baselineMonthly = totalBudgetFromLimits > 0 ? totalBudgetFromLimits : monthlyExpense > 0 ? monthlyExpense : 1000000;
  const targetEmergencyFund = baselineMonthly * 4;

  // Dana darurat saat ini
  const savingsWallets = wallets.filter((w) => w.type === 'savings');
  const currentEmergencyFund = savingsWallets.length > 0
    ? Math.max(0, savingsWallets.reduce((s, w) => s + (w.balance || 0), 0))
    : Math.max(0, totalCash);
  const isEmergencyFundSafe = currentEmergencyFund >= targetEmergencyFund;

  // 2. Kalkulasi Simulasi Cicilan Hutang
  const validPrincipal = Math.max(0, principal);
  const validTenor = Math.max(1, tenorMonths);
  const totalInterest = (validPrincipal * (interestRateYearly / 100) * (validTenor / 12));
  const totalPayable = validPrincipal + totalInterest;
  const monthlyInstallment = Math.round(totalPayable / validTenor);

  // 3. Analisis KPI & Dampak Keuangan
  // a. DTI Ratio (Debt-to-Income)
  const dtiRatio = monthlyIncome > 0 ? Math.round((monthlyInstallment / monthlyIncome) * 100) : 0;
  
  // b. Estimasi Sisa Arus Kas
  const netCashFlowCurrent = monthlyIncome - monthlyExpense;
  const netCashFlowAfterDebt = netCashFlowCurrent - monthlyInstallment;

  // c. Dampak ke Target Dana Darurat (Kewajiban bertambah sehingga 4x Anggaran naik)
  const newBaselineMonthly = baselineMonthly + monthlyInstallment;
  const newTargetEmergencyFund = newBaselineMonthly * 4;

  // d. Skor & Status Keamanan Finansial (KPI)
  let status: 'safe' | 'warning' | 'danger' = 'safe';
  let statusTitle = 'Aman & Layak Diambil';
  let badgeColor = 'bg-primary/10 text-primary border-primary/20';
  const conclusions: string[] = [];

  if (monthlyIncome <= 0) {
    status = 'danger';
    statusTitle = 'Sangat Berisiko (Belum Ada Catatan Pemasukan)';
    badgeColor = 'bg-expense/10 text-expense border-expense/20';
    conclusions.push('Pemasukan bulanan Anda belum tercatat atau bernilai Rp 0. Sangat berisiko mengambil cicilan tanpa pemasukan pasti.');
  } else if (dtiRatio > 35 || netCashFlowAfterDebt < 0) {
    status = 'danger';
    statusTitle = 'Sangat Berisiko / Tidak Disarankan (Defisit)';
    badgeColor = 'bg-expense/10 text-expense border-expense/20';
    if (dtiRatio > 35) {
      conclusions.push(`Beban cicilan (${dtiRatio}% dari pemasukan) melebihi batas aman maksimal 30%.`);
    }
    if (netCashFlowAfterDebt < 0) {
      conclusions.push(`Arus kas bulanan akan mengalami defisit ${formatRupiah(Math.abs(netCashFlowAfterDebt))} setiap bulannya.`);
    }
  } else if (dtiRatio > 20 || !isEmergencyFundSafe) {
    status = 'warning';
    statusTitle = 'Perlu Waspada & Penghematan';
    badgeColor = 'bg-warning/10 text-warning border-warning/25';
    if (dtiRatio > 20) {
      conclusions.push(`Cicilan memakan ${dtiRatio}% pemasukan (zona menengah 20-35%).`);
    }
    if (!isEmergencyFundSafe) {
      conclusions.push(`Dana darurat Anda belum mencapai 4x anggaran. Jika timbul kebutuhan darurat, risiko gagal bayar meningkat.`);
    }
  } else {
    status = 'safe';
    statusTitle = 'Keuangan Aman (Rasio Sehat)';
    badgeColor = 'bg-primary/10 text-primary border-primary/20';
    conclusions.push(`Cicilan hanya ${dtiRatio}% dari pemasukan (sangat aman di bawah 20%).`);
    conclusions.push(`Arus kas bulanan tetap surplus ${formatRupiah(netCashFlowAfterDebt)}.`);
    conclusions.push('Cadangan dana darurat 4x anggaran sudah terpenuhi dengan baik.');
  }

  const handleSaveAsDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lenderName.trim()) {
      setError('Nama pihak pemberi pinjaman wajib diisi.');
      return;
    }
    if (validPrincipal <= 0) {
      setError('Nominal pinjaman harus lebih dari 0.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // 1. Catat ke tabel debts
      await apiFetch(endpoints.debts, {
        method: 'POST',
        json: {
          type: 'payable',
          person_name: lenderName.trim(),
          total_amount: totalPayable,
          due_date: firstDueDate || null,
          notes: `Pinjaman pokok ${formatRupiah(validPrincipal)}, tenor ${validTenor} bulan (Cicilan ${formatRupiah(monthlyInstallment)}/bln, bunga ${interestRateYearly}%/thn)`,
        },
      });

      // 2. Jika dicentang, buatkan jadwal pengeluaran rutin pasti
      if (autoCreateRecurring) {
        const defaultWallet = wallets.find((w) => w.is_default) || wallets[0];
        const [_, __, dayPart] = firstDueDate.split('-');
        const dueDay = dayPart ? parseInt(dayPart, 10) : 5;

        await apiFetch(endpoints.bills, {
          method: 'POST',
          json: {
            type: 'expense',
            title: `Cicilan: ${lenderName.trim()}`,
            amount: monthlyInstallment,
            due_day: Math.min(28, Math.max(1, dueDay)),
            wallet_id: defaultWallet ? defaultWallet.id : null,
            auto_record: true,
          },
        }).catch(() => {});
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menyimpan simulasi hutang.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Calculator size={22} className="text-primary" weight="duotone" />
          <span>Kalkulator & Insight Keamanan Hutang (KPI)</span>
        </div>
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSaveAsDebt} className="space-y-4">
        {error && (
          <div role="alert" className="p-3 bg-expense/10 border border-expense/20 rounded-2xl text-expense text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="calc-lender" className="block text-xs font-semibold text-text-muted">
              Pemberi Pinjaman / Lembaga
            </label>
            <input
              id="calc-lender"
              type="text"
              required
              value={lenderName}
              onChange={(e) => setLenderName(e.target.value)}
              placeholder="Contoh: Bank Mandiri (KTA), Cicilan Laptop"
              className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <AmountInput
            id="calc-principal"
            label="Pokok Pinjaman (Rp)"
            value={principal}
            onChange={setPrincipal}
          />

          <div className="space-y-1">
            <label htmlFor="calc-tenor" className="block text-xs font-semibold text-text-muted">
              Tenor Pinjaman (Bulan)
            </label>
            <input
              id="calc-tenor"
              type="number"
              min="1"
              max="360"
              required
              value={tenorMonths}
              onChange={(e) => setTenorMonths(parseInt(e.target.value, 10) || 1)}
              className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="calc-rate" className="block text-xs font-semibold text-text-muted">
              Suku Bunga / Margin (% per Tahun)
            </label>
            <input
              id="calc-rate"
              type="number"
              step="0.1"
              min="0"
              value={interestRateYearly}
              onChange={(e) => setInterestRateYearly(parseFloat(e.target.value) || 0)}
              className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Calculation Result Summary Strip */}
        <div className="p-4 bg-surface-2 border border-border rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted">Hasil Estimasi Cicilan Bulanan:</span>
            <span className="text-lg sm:text-xl font-extrabold text-expense tabular-nums">
              {formatRupiah(monthlyInstallment)} <span className="text-xs text-text-muted font-normal">/ bln</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-border/60 text-xs">
            <div>
              <span className="text-text-muted block text-[11px]">Total Bunga/Margin:</span>
              <span className="font-bold text-text tabular-nums">{formatRupiah(totalInterest)}</span>
            </div>
            <div>
              <span className="text-text-muted block text-[11px]">Total Pengembalian:</span>
              <span className="font-bold text-text tabular-nums">{formatRupiah(totalPayable)}</span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-text-muted block text-[11px]">Rasio DTI terhadap Gaji:</span>
              <span className={`font-extrabold tabular-nums ${dtiRatio > 35 ? 'text-expense' : dtiRatio > 20 ? 'text-warning' : 'text-primary'}`}>
                {dtiRatio}% {dtiRatio > 35 ? '(Tinggi)' : dtiRatio > 20 ? '(Sedang)' : '(Aman)'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI Financial Safety Insight Box */}
        <div
          className={`p-4 rounded-2xl border space-y-2.5 transition-all ${
            status === 'safe'
              ? 'bg-primary/5 border-primary/20'
              : status === 'warning'
              ? 'bg-warning/5 border-warning/25'
              : 'bg-expense/5 border-expense/20'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {status === 'safe' ? (
                <ShieldCheck size={20} weight="fill" className="text-primary shrink-0" />
              ) : status === 'warning' ? (
                <ShieldWarning size={20} weight="fill" className="text-warning shrink-0" />
              ) : (
                <WarningOctagon size={20} weight="fill" className="text-expense shrink-0" />
              )}
              <h4 className="text-xs sm:text-sm font-bold text-text">Analisis Keamanan Keuangan (KPI)</h4>
            </div>

            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
              {statusTitle}
            </span>
          </div>

          {/* Rangkuman Insight */}
          <div className="space-y-1.5 text-xs text-text-muted">
            {conclusions.map((text, idx) => (
              <div key={idx} className="flex items-start gap-1.5">
                <span className="text-text font-bold shrink-0">•</span>
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* Pengaruh ke Dana Darurat & Arus Kas */}
          <div className="p-3 bg-background rounded-xl border border-border/70 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-text-muted block">Sisa Arus Kas Bulanan:</span>
              <span className={`font-extrabold tabular-nums ${netCashFlowAfterDebt >= 0 ? 'text-income' : 'text-expense'}`}>
                {formatRupiah(netCashFlowAfterDebt)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-text-muted block">Target Baru Dana Darurat (4x):</span>
              <span className="font-extrabold text-text tabular-nums">{formatRupiah(newTargetEmergencyFund)}</span>
            </div>
          </div>
        </div>

        {/* Tanggal & Opsi Transaksi Rutin */}
        <div className="space-y-2 pt-1">
          <div className="space-y-1">
            <label htmlFor="calc-first-due" className="block text-xs font-semibold text-text-muted">
              Tanggal Jatuh Tempo Cicilan Pertama
            </label>
            <input
              id="calc-first-due"
              type="date"
              required
              value={firstDueDate}
              onChange={(e) => setFirstDueDate(e.target.value)}
              className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="autoRecurring"
              checked={autoCreateRecurring}
              onChange={(e) => setAutoCreateRecurring(e.target.checked)}
              className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
            />
            <label htmlFor="autoRecurring" className="text-xs font-semibold text-text cursor-pointer">
              Otomatis jadwalkan cicilan {formatRupiah(monthlyInstallment)}/bln ke daftar Pengeluaran Pasti Rutin
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="flex-1"
          >
            Tutup
          </Button>

          <Button
            type="submit"
            variant={status === 'danger' ? 'danger' : 'primary'}
            size="lg"
            isLoading={isSaving}
            className="flex-2 font-bold shadow-md"
          >
            Simpan Sebagai Hutang Aktif
          </Button>
        </div>
      </form>
    </Modal>
  );
}
