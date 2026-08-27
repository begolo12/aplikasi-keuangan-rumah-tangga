'use client';

import React from 'react';
import {
  TrendUp,
  TrendDown,
  CheckCircle,
  WarningCircle,
  FileCsv,

} from '@phosphor-icons/react';
import { formatRupiah, INDONESIAN_MONTHS } from '@/lib/formatters';
import { MonthlySummary as MonthlySummaryType, Asset } from '@/lib/types';

interface IncomeStatementReportProps {
  summary: MonthlySummaryType | null;
  assets: Asset[];
  selectedMonth: number;
  selectedYear: number;
  onExportCsv?: () => void;
}

export function IncomeStatementReport({
  summary,
  assets,
  selectedMonth,
  selectedYear,
  onExportCsv,
}: IncomeStatementReportProps) {
  if (!summary) return null;

  const totalIncome = summary.total_income || 0;
  const totalOperatingExpense = summary.total_expense || 0;

  // Estimasi Penyusutan Nilai Barang Bulan Ini
  const activeAssets = assets.filter((a) => !a.is_sold);
  const totalMonthlyDepreciation = activeAssets.reduce((sum, a) => sum + (a.monthly_depreciation || 0), 0);

  // Total Belanja & Susut Nilai Barang
  const totalComprehensiveExpense = totalOperatingExpense + totalMonthlyDepreciation;

  // Sisa Uang Bersih Keluarga
  const comprehensiveNetSurplus = totalIncome - totalComprehensiveExpense;
  const isSurplus = comprehensiveNetSurplus >= 0;

  return (
    <div className="space-y-4">
      {/* Hero Header Card */}
      <div
        className={`p-4 sm:p-5 rounded-3xl border transition-all shadow-xs ${
          isSurplus
            ? 'bg-income/5 border-income/25'
            : 'bg-expense/5 border-expense/25'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-xl shrink-0 ${
                isSurplus ? 'bg-income text-white' : 'bg-expense text-white'
              }`}
            >
              <TrendUp size={20} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm md:text-base font-extrabold text-text">
                  Perbandingan Pemasukan & Belanja ({INDONESIAN_MONTHS[selectedMonth - 1]} {selectedYear})
                </h3>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                    isSurplus
                      ? 'bg-income/10 text-income border-income/30'
                      : 'bg-expense/10 text-expense border-expense/30 animate-pulse'
                  }`}
                >
                  {isSurplus ? 'Uang Masih Sisa (+)' : 'Pengeluaran Berlebih (-)'}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-text-muted">
                Ringkasan uang masuk dikurangi belanja kebutuhan hidup & estimasi penurunan nilai barang.
              </p>
            </div>
          </div>

          {onExportCsv && (
            <button
              type="button"
              onClick={onExportCsv}
              className="self-start sm:self-center text-xs font-bold text-primary hover:underline flex items-center gap-1 min-h-[32px]"
            >
              <FileCsv size={15} weight="bold" />
              <span>Ekspor Data</span>
            </button>
          )}
        </div>

        {/* 3 Metric Grid (Mobile-friendly) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 py-3">
          <div className="p-2.5 sm:p-3.5 bg-surface rounded-2xl border border-border/60 space-y-0.5 sm:space-y-1 text-center sm:text-left">
            <span className="text-[10px] sm:text-xs text-text-muted font-semibold block">Total Uang Masuk</span>
            <p className="font-display-num text-base md:text-lg text-income tabular-nums whitespace-nowrap">
              +{formatRupiah(totalIncome)}
            </p>
            <span className="text-[9px] sm:text-[10px] text-text-muted hidden sm:block">Gaji & Tambahan</span>
          </div>

          <div className="p-2.5 sm:p-3.5 bg-surface rounded-2xl border border-border/60 space-y-0.5 sm:space-y-1 text-center sm:text-left">
            <span className="text-[10px] sm:text-xs text-text-muted font-semibold block">Total Belanja Hidup</span>
            <p className="font-display-num text-base md:text-lg text-expense tabular-nums whitespace-nowrap">
              -{formatRupiah(totalOperatingExpense)}
            </p>
            <span className="text-[9px] sm:text-[10px] text-text-muted hidden sm:block">Kebutuhan & Tagihan</span>
          </div>

          <div className="p-2.5 sm:p-3.5 bg-surface rounded-2xl border border-border/60 space-y-0.5 sm:space-y-1 text-center sm:text-left">
            <span className="text-[10px] sm:text-xs text-text-muted font-semibold block">Penurunan Nilai Barang</span>
            <p className="font-display-num text-base md:text-lg text-transfer tabular-nums whitespace-nowrap">
              -{formatRupiah(totalMonthlyDepreciation)}
            </p>
            <span className="text-[9px] sm:text-[10px] text-text-muted hidden sm:block">Susut Nilai Aset</span>
          </div>
        </div>

        {/* Insight Ringkas */}
        <div className="p-3 bg-surface-2 rounded-2xl border border-border/50 text-xs flex items-start gap-2">
          {isSurplus ? (
            <CheckCircle size={17} weight="fill" className="text-income shrink-0 mt-0.5" />
          ) : (
            <WarningCircle size={17} weight="fill" className="text-expense shrink-0 mt-0.5" />
          )}
          <p className="text-[11px] text-text-muted leading-relaxed">
            {isSurplus
              ? `Setelah dipakai belanja kebutuhan hidup dan memperhitungkan penurunan nilai barang (${formatRupiah(totalMonthlyDepreciation)}), uang keluarga Anda masih sisa bersih sebesar ${formatRupiah(comprehensiveNetSurplus)}.`
              : `Total belanja dan penurunan nilai barang bulan ini lebih besar daripada uang masuk sebesar ${formatRupiah(Math.abs(comprehensiveNetSurplus))}.`}
          </p>
        </div>
      </div>

      {/* Desktop Detailed Statement */}
      <div className="p-4 sm:p-5 bg-surface border border-border rounded-3xl space-y-3 shadow-2xs">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h4 className="text-xs sm:text-sm font-bold text-text">
            Rincian Pemasukan & Belanja Rumah Tangga
          </h4>
          <span className="text-[11px] text-text-muted font-medium">Bulan {INDONESIAN_MONTHS[selectedMonth - 1]} {selectedYear}</span>
        </div>

        <div className="space-y-2 text-xs divide-y divide-border/40">
          {/* 1. Pendapatan */}
          <div className="pt-2 space-y-1">
            <span className="font-bold text-text-muted uppercase text-[10px] tracking-wider block">
              1. SEMUA UANG MASUK (PEMASUKAN)
            </span>
            <div className="flex items-center justify-between py-1 px-2">
              <span>Gaji Pokok, Tunjangan, Usaha & Penghasilan Tambahan</span>
              <span className="font-bold text-income tabular-nums">+{formatRupiah(totalIncome)}</span>
            </div>
            <div className="flex items-center justify-between py-1 px-2 font-bold bg-surface-2/60 rounded-xl">
              <span>Total Uang Masuk:</span>
              <span className="text-income tabular-nums">+{formatRupiah(totalIncome)}</span>
            </div>
          </div>

          {/* 2. Pengeluaran Hidup */}
          <div className="pt-2 space-y-1">
            <span className="font-bold text-text-muted uppercase text-[10px] tracking-wider block">
              2. BELANJA KEBUTUHAN HIDUP & TAGIHAN
            </span>
            <div className="flex items-center justify-between py-1 px-2">
              <span>Belanja Dapur, Kebutuhan Rumah, Tagihan Listrik & Lainnya</span>
              <span className="font-bold text-expense tabular-nums">-{formatRupiah(totalOperatingExpense)}</span>
            </div>
            <div className="flex items-center justify-between py-1 px-2 font-bold bg-surface-2/60 rounded-xl">
              <span>Sisa Kas Bulanan:</span>
              <span className={`tabular-nums ${summary.net_cash_flow >= 0 ? 'text-income' : 'text-expense'}`}>
                {summary.net_cash_flow >= 0 ? '+' : ''}{formatRupiah(summary.net_cash_flow)}
              </span>
            </div>
          </div>

          {/* 3. Beban Penyusutan Barang */}
          <div className="pt-2 space-y-1">
            <span className="font-bold text-text-muted uppercase text-[10px] tracking-wider block">
              3. ESTIMASI PENYUSUTAN NILAI BARANG / ASET
            </span>
            <div className="flex items-center justify-between py-1 px-2">
              <span>Penurunan Nilai {activeAssets.length} Barang Berharga / Kendaraan</span>
              <span className="font-bold text-transfer tabular-nums">-{formatRupiah(totalMonthlyDepreciation)}</span>
            </div>
          </div>

          {/* 4. Sisa Uang Bersih Akhir */}
          <div className="pt-3">
            <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-2xl font-extrabold text-sm">
              <span className="text-primary">TOTAL SISA UANG BERSIH KELUARGA BULAN INI</span>
              <span className={`tabular-nums ${isSurplus ? 'text-primary' : 'text-expense'}`}>
                {isSurplus ? '+' : ''}{formatRupiah(comprehensiveNetSurplus)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


