'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { AmountInput } from '../ui/AmountInput';
import { formatRupiah, getLocalDateString } from '@/lib/formatters';
import { MonthlySummary as MonthlySummaryType, Budget, Wallet } from '@/lib/types';
import { ApiError, apiFetch, endpoints } from '@/lib/apiFetch';
import { totalLiquidCash } from '@/lib/money';
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
  const [principal, setPrincipal] = useState(0); // Pokok pinjaman, diisi pengguna
  const [tenorMonths, setTenorMonths] = useState(0); // Tenor bulan, diisi pengguna
  const [interestRateYearly, setInterestRateYearly] = useState(0); // % bunga per tahun, diisi pengguna
  const [firstDueDate, setFirstDueDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return getLocalDateString(d);
  });
  const [autoCreateRecurring, setAutoCreateRecurring] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Data Keuangan Riil Pengguna
  const monthlyIncome = summary?.total_income || 0;
  const monthlyExpense = summary?.total_expense || 0;
  const totalBudgetFromLimits = budgets.reduce((sum, b) => sum + (b.monthly_limit || 0), 0);
  // Biaya hidup bulanan: anggaran dulu, lalu realisasi. Tanpa keduanya tidak ada dasar.
  const baselineMonthly = totalBudgetFromLimits > 0 ? totalBudgetFromLimits : monthlyExpense > 0 ? monthlyExpense : 0;
  // 4,4x = 4 bulan biaya hidup + 10% cadangan risiko, sama dengan KPI di halaman lain.
  const targetEmergencyFund = baselineMonthly * 4.4;

  // Dana darurat saat ini
  const savingsWallets = wallets.filter((w) => w.type === 'savings');
  const currentEmergencyFund = savingsWallets.length > 0
    ? totalLiquidCash(savingsWallets)
    : totalLiquidCash(wallets);
  // Tanpa dasar biaya hidup, target tidak bisa dinilai — jangan mengaku "aman".
  const isEmergencyFundAssessed = baselineMonthly > 0;
  const isEmergencyFundSafe = isEmergencyFundAssessed && currentEmergencyFund >= targetEmergencyFund;

  // 2. Kalkulasi Simulasi Cicilan Hutang
  const validPrincipal = Math.max(0, principal);
  const validTenor = Math.max(0, tenorMonths);
  // Simulasi belum bermakna sampai pokok dan tenor diisi.
  const hasSimulation = validPrincipal > 0 && validTenor > 0;
  const totalInterest = (validPrincipal * (interestRateYearly / 100) * (validTenor / 12));
  const totalPayable = validPrincipal + totalInterest;
  const monthlyInstallment = hasSimulation ? Math.round(totalPayable / validTenor) : 0;

  // 3. Analisis KPI & Dampak Keuangan
  // a. DTI Ratio (Debt-to-Income). null = pemasukan belum diketahui, rasio tidak bisa dihitung.
  const dtiRatio = monthlyIncome > 0 ? Math.round((monthlyInstallment / monthlyIncome) * 100) : null;
  
  // b. Estimasi Sisa Arus Kas
  const netCashFlowCurrent = monthlyIncome - monthlyExpense;
  const netCashFlowAfterDebt = netCashFlowCurrent - monthlyInstallment;

  // c. Dampak ke Target Dana Darurat (Kewajiban bertambah sehingga cadangan wajib naik)
  const newBaselineMonthly = baselineMonthly + monthlyInstallment;
  const newTargetEmergencyFund = newBaselineMonthly * 4.4;

  // d. Skor & Status Keamanan Finansial (KPI)
  let status: 'idle' | 'safe' | 'warning' | 'danger' = 'idle';
  let statusTitle = 'Isi Data Pinjaman untuk Dinilai';
  let badgeColor = 'bg-surface-2 text-text-muted border-border';
  const conclusions: string[] = [];

  if (!hasSimulation) {
    conclusions.push('Masukkan pokok pinjaman dan tenor terlebih dahulu. Penilaian keamanan akan muncul setelah itu.');
  } else if (monthlyIncome <= 0) {
    status = 'danger';
    statusTitle = 'Sangat Berisiko (Belum Ada Catatan Pemasukan)';
    badgeColor = 'bg-expense/10 text-expense border-expense/20';
    conclusions.push('Pemasukan bulanan Anda belum tercatat atau bernilai Rp 0. Sangat berisiko mengambil cicilan tanpa pemasukan pasti.');
  } else {
    const dti = dtiRatio ?? 0;
    const emergencyNote = !isEmergencyFundAssessed
      ? 'Cadangan dana darurat belum bisa dinilai karena anggaran dan realisasi biaya hidup masih kosong.'
      : isEmergencyFundSafe
      ? null
      : 'Dana darurat Anda belum mencapai 4,4x biaya hidup. Jika timbul kebutuhan darurat, risiko gagal bayar meningkat.';

    if (dti > 35 || netCashFlowAfterDebt < 0) {
      status = 'danger';
      statusTitle = 'Sangat Berisiko / Tidak Disarankan (Defisit)';
      badgeColor = 'bg-expense/10 text-expense border-expense/20';
      if (dti > 35) {
        conclusions.push(`Beban cicilan (${dti}% dari pemasukan) melebihi batas aman maksimal 35%.`);
      }
      if (netCashFlowAfterDebt < 0) {
        conclusions.push(`Arus kas bulanan akan mengalami defisit ${formatRupiah(Math.abs(netCashFlowAfterDebt))} setiap bulannya.`);
      }
      if (emergencyNote) conclusions.push(emergencyNote);
    } else if (dti > 20 || emergencyNote) {
      status = 'warning';
      statusTitle = 'Perlu Waspada & Penghematan';
      badgeColor = 'bg-warning/10 text-warning border-warning/25';
      if (dti > 20) {
        conclusions.push(`Cicilan memakan ${dti}% pemasukan (zona menengah 20-35%).`);
      }
      if (emergencyNote) conclusions.push(emergencyNote);
    } else {
      status = 'safe';
      statusTitle = 'Keuangan Aman (Rasio Sehat)';
      badgeColor = 'bg-primary/10 text-primary border-primary/20';
      conclusions.push(`Cicilan hanya ${dti}% dari pemasukan (sangat aman di bawah 20%).`);
      conclusions.push(`Arus kas bulanan tetap surplus ${formatRupiah(netCashFlowAfterDebt)}.`);
      conclusions.push('Cadangan dana darurat 4,4x biaya hidup sudah terpenuhi.');
    }
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
          <Alert tone="error" size="sm">
            {error}
          </Alert>
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
              <span className="text-text-muted block text-[11px]">Rasio Cicilan terhadap Gaji:</span>
              {dtiRatio === null ? (
                <span className="font-extrabold text-text-muted">n/a <span className="font-normal">(belum ada pemasukan)</span></span>
              ) : (
                <span className={`font-extrabold tabular-nums ${dtiRatio > 35 ? 'text-expense' : dtiRatio > 20 ? 'text-warning' : 'text-primary'}`}>
                  {dtiRatio}% {dtiRatio > 35 ? '(Tinggi)' : dtiRatio > 20 ? '(Sedang)' : '(Aman)'}
                </span>
              )}
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
              : status === 'danger'
              ? 'bg-expense/5 border-expense/20'
              : 'bg-surface-2 border-border'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {status === 'safe' ? (
                <ShieldCheck size={20} weight="fill" className="text-primary shrink-0" />
              ) : status === 'warning' ? (
                <ShieldWarning size={20} weight="fill" className="text-warning shrink-0" />
              ) : status === 'danger' ? (
                <WarningOctagon size={20} weight="fill" className="text-expense shrink-0" />
              ) : (
                <Calculator size={20} weight="duotone" className="text-text-muted shrink-0" />
              )}
              <h4 className="text-xs sm:text-sm font-bold text-text">Analisis Keamanan Keuangan (KPI)</h4>
            </div>

            <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
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
              <span className="text-[11px] text-text-muted block">Sisa Arus Kas Bulanan:</span>
              <span className={`font-extrabold tabular-nums ${netCashFlowAfterDebt >= 0 ? 'text-income' : 'text-expense'}`}>
                {formatRupiah(netCashFlowAfterDebt)}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-text-muted block">Target Baru Dana Darurat (4,4x):</span>
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
            <label htmlFor="autoRecurring" className="text-xs font-semibold text-text cursor-pointer py-3.5 -my-2">
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
            className="flex-2 font-bold shadow-xs"
          >
            Simpan Sebagai Hutang Aktif
          </Button>
        </div>
      </form>
    </Modal>
  );
}
