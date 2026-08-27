'use client';

import React from 'react';
import {
  Scales,
  ShieldCheck,
  ShieldWarning,
  Coins,
  Vault,
  Package,
  Receipt,
  HandCoins,
  Sparkle,
  CheckCircle,
  WarningCircle,
  FileCsv,
} from '@phosphor-icons/react';
import { formatRupiah, INDONESIAN_MONTHS } from '@/lib/formatters';
import { Wallet, Debt, Asset, MonthlySummary as MonthlySummaryType } from '@/lib/types';

interface BalanceSheetReportProps {
  summary: MonthlySummaryType | null;
  wallets: Wallet[];
  debts: Debt[];
  assets: Asset[];
  selectedMonth: number;
  selectedYear: number;
  onExportCsv?: () => void;
}

export function BalanceSheetReport({
  summary,
  wallets,
  debts,
  assets,
  selectedMonth,
  selectedYear,
  onExportCsv,
}: BalanceSheetReportProps) {
  // 1. Aset Lancar / Kas Likuid
  const cashLiquid = wallets.reduce((sum, w) => sum + Math.max(0, w.balance || 0), 0);
  
  // 2. Piutang (Receivables)
  const receivablesTotal = debts
    .filter((d) => d.type === 'receivable' && d.status !== 'paid')
    .reduce((sum, d) => sum + (d.remaining_amount || 0), 0);

  // 3. Aset Tetap / Harta (Fixed Assets - Active only)
  const activeAssets = assets.filter((a) => !a.is_sold);
  const fixedAssetsTotal = activeAssets.reduce(
    (sum, a) => sum + (a.current_value > 0 ? a.current_value : (a.book_value ?? a.purchase_price ?? 0)),
    0
  );

  // TOTAL ASET
  const totalAssets = cashLiquid + receivablesTotal + fixedAssetsTotal;

  // 4. Liabilitas / Kewajiban
  // a. Tagihan pending bulan ini
  const pendingBillsAmount = summary?.total_bills_pending_amount || 0;
  // b. Hutang pokok aktif (Payables)
  const payablesTotal = debts
    .filter((d) => d.type === 'payable' && d.status !== 'paid')
    .reduce((sum, d) => sum + (d.remaining_amount || 0), 0);

  // TOTAL LIABILITAS
  const totalLiabilities = pendingBillsAmount + payablesTotal;

  // 5. EKUITAS / KEKAYAAN BERSIH (NET WORTH)
  const netWorth = totalAssets - totalLiabilities;
  const isHealthy = netWorth >= 0 && totalAssets > totalLiabilities * 2;
  const solvencyRatio = totalLiabilities > 0 ? Math.round((totalAssets / totalLiabilities) * 10) / 10 : totalAssets > 0 ? 100 : 1;

  // Status Kondisi Keuangan untuk Mobile
  let conditionStatus = 'Kondisi Keuangan Baik (Sehat)';
  let conditionColor = 'bg-primary/10 text-primary border-primary/20';
  let conditionDesc = 'Total harta kekayaan Anda jauh melebihi seluruh kewajiban hutang.';

  if (totalLiabilities > totalAssets) {
    conditionStatus = 'Kondisi Keuangan Kritis (Jelek / Defisit)';
    conditionColor = 'bg-expense/10 text-expense border-expense/20 animate-pulse';
    conditionDesc = 'Total hutang Anda melebihi seluruh aset yang dimiliki. Segera lakukan restrukturisasi hutang.';
  } else if (totalLiabilities > 0 && solvencyRatio < 2) {
    conditionStatus = 'Kondisi Keuangan Perlu Waspada';
    conditionColor = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    conditionDesc = 'Beban hutang cukup tinggi dibandingkan aset likuid yang dimiliki.';
  }

  return (
    <div className="space-y-4">
      {/* Hero Card: Kesimpulan Cepat Kondisi Keuangan (Sangat mudah dibaca di HP) */}
      <div className="p-4 sm:p-5 bg-surface border border-border rounded-3xl space-y-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl shrink-0 ${isHealthy ? 'bg-primary/10 text-primary' : 'bg-expense/10 text-expense'}`}>
              <Scales size={20} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm md:text-base font-extrabold text-text">
                  Neraca Keuangan Keluarga ({INDONESIAN_MONTHS[selectedMonth - 1]} {selectedYear})
                </h3>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${conditionColor}`}>
                  {conditionStatus}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-text-muted">
                Laporan Posisi Keuangan: Total Harta Aset vs Kewajiban Hutang & Kekayaan Bersih.
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
              <span>Ekspor Neraca</span>
            </button>
          )}
        </div>

        {/* 3 Metrik Inti Neraca (Glanceable di Mobile) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* Total Harta Aset */}
          <div className="p-2.5 sm:p-3.5 bg-surface-2 rounded-2xl border border-border/60 space-y-0.5 sm:space-y-1 text-center sm:text-left">
            <span className="text-[10px] sm:text-xs text-text-muted font-semibold block">Total Harta (Aset)</span>
            <p className="text-xs sm:text-sm md:text-lg font-extrabold text-text tabular-nums whitespace-nowrap">
              {formatRupiah(totalAssets)}
            </p>
            <span className="text-[9px] sm:text-[10px] text-text-muted hidden sm:block">Kas + Piutang + Barang</span>
          </div>

          {/* Total Hutang Kewajiban */}
          <div className="p-2.5 sm:p-3.5 bg-surface-2 rounded-2xl border border-border/60 space-y-0.5 sm:space-y-1 text-center sm:text-left">
            <span className="text-[10px] sm:text-xs text-text-muted font-semibold block">Total Hutang</span>
            <p className="text-xs sm:text-sm md:text-lg font-extrabold text-expense tabular-nums whitespace-nowrap">
              {formatRupiah(totalLiabilities)}
            </p>
            <span className="text-[9px] sm:text-[10px] text-text-muted hidden sm:block">Tagihan & Pinjaman</span>
          </div>

          {/* Kekayaan Bersih (Net Worth) */}
          <div className={`p-2.5 sm:p-3.5 rounded-2xl border space-y-0.5 sm:space-y-1 text-center sm:text-left ${
            netWorth >= 0 ? 'bg-primary/10 border-primary/20' : 'bg-expense/10 border-expense/20'
          }`}>
            <span className="text-[10px] sm:text-xs font-bold text-text-muted block">Kekayaan Bersih</span>
            <p className={`text-xs sm:text-sm md:text-lg font-extrabold tabular-nums whitespace-nowrap ${
              netWorth >= 0 ? 'text-primary' : 'text-expense'
            }`}>
              {formatRupiah(netWorth)}
            </p>
            <span className="text-[9px] sm:text-[10px] font-semibold text-text-muted hidden sm:block">
              {solvencyRatio >= 100 ? 'Bebas Hutang' : `Solvabilitas ${solvencyRatio}x`}
            </span>
          </div>
        </div>

        {/* Ringkasan Kesimpulan Cepat */}
        <div className="p-3 bg-surface-2 rounded-2xl border border-border/50 text-xs flex items-start gap-2">
          {isHealthy ? (
            <CheckCircle size={17} weight="fill" className="text-primary shrink-0 mt-0.5" />
          ) : (
            <WarningCircle size={17} weight="fill" className="text-expense shrink-0 mt-0.5" />
          )}
          <p className="text-[11px] text-text-muted leading-relaxed">
            <span className="font-bold text-text">{conditionStatus}:</span> {conditionDesc}
          </p>
        </div>
      </div>

      {/* Desktop Full Data: Format Neraca Berpasangan (Two-Column Balanced Sheet) */}
      <div className="hidden md:grid md:grid-cols-2 gap-4">
        {/* Kolom Kiri: HARTA & ASET */}
        <div className="p-4 sm:p-5 bg-surface border border-border rounded-3xl space-y-3 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-1.5 font-bold text-text text-sm">
              <Coins size={17} className="text-primary" weight="duotone" />
              <span>DAFTAR HARTA & KEKAYAAN (ASET)</span>
            </div>
            <span className="text-xs font-extrabold text-text tabular-nums">{formatRupiah(totalAssets)}</span>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Aset Lancar */}
            <div className="space-y-1">
              <span className="font-bold text-text-muted uppercase text-[10px] tracking-wider block">
                1. Uang Kas & Tabungan (Likuid)
              </span>
              <div className="pl-2 space-y-1 divide-y divide-border/40">
                {wallets.map((w) => (
                  <div key={w.id} className="flex items-center justify-between pt-1">
                    <span className="text-text-muted">{w.name} ({w.type})</span>
                    <span className={`font-semibold tabular-nums ${w.balance < 0 ? 'text-expense' : 'text-text'}`}>
                      {formatRupiah(w.balance)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1 font-bold">
                  <span>Subtotal Uang Kas:</span>
                  <span className="tabular-nums text-text">{formatRupiah(cashLiquid)}</span>
                </div>
              </div>
            </div>

            {/* Piutang */}
            <div className="space-y-1 pt-1 border-t border-border/50">
              <span className="font-bold text-text-muted uppercase text-[10px] tracking-wider block">
                2. Uang yang Dipinjam Orang Lain (Piutang)
              </span>
              <div className="pl-2 flex items-center justify-between">
                <span className="text-text-muted">Total Hak Tagih ({debts.filter(d => d.type === 'receivable' && d.status !== 'paid').length} Pihak)</span>
                <span className="font-bold text-text tabular-nums">{formatRupiah(receivablesTotal)}</span>
              </div>
            </div>

            {/* Aset Tetap */}
            <div className="space-y-1 pt-1 border-t border-border/50">
              <span className="font-bold text-text-muted uppercase text-[10px] tracking-wider block">
                3. Barang Berharga & Properti (Aset Tetap)
              </span>
              <div className="pl-2 space-y-1 divide-y divide-border/40">
                {activeAssets.length === 0 ? (
                  <span className="text-text-muted text-[11px] block pt-1">Belum ada barang berharga terdaftar</span>
                ) : (
                  activeAssets.map((a) => (
                    <div key={a.id} className="flex items-center justify-between pt-1">
                      <span className="text-text-muted truncate max-w-[200px]">{a.name}</span>
                      <span className="font-semibold text-text tabular-nums">
                        {formatRupiah(a.current_value > 0 ? a.current_value : (a.book_value ?? a.purchase_price))}
                      </span>
                    </div>
                  ))
                )}
                <div className="flex items-center justify-between pt-1 font-bold">
                  <span>Subtotal Barang Berharga:</span>
                  <span className="tabular-nums text-text">{formatRupiah(fixedAssetsTotal)}</span>
                </div>
              </div>
            </div>

            {/* Total Harta */}
            <div className="flex items-center justify-between p-2.5 bg-surface-2 rounded-xl font-extrabold text-sm border border-border">
              <span className="text-text">TOTAL SELURUH HARTA KEKAYAAN</span>
              <span className="text-primary tabular-nums">{formatRupiah(totalAssets)}</span>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: KEWAJIBAN & EKUITAS */}
        <div className="p-4 sm:p-5 bg-surface border border-border rounded-3xl space-y-3 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-1.5 font-bold text-text text-sm">
              <HandCoins size={17} className="text-expense" weight="duotone" />
              <span>KEWAJIBAN HUTANG & KEKAYAAN BERSIH</span>
            </div>
            <span className="text-xs font-extrabold text-text tabular-nums">{formatRupiah(totalLiabilities + netWorth)}</span>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Kewajiban Lancar */}
            <div className="space-y-1">
              <span className="font-bold text-text-muted uppercase text-[10px] tracking-wider block">
                1. Tagihan Rutin yang Belum Dibayar
              </span>
              <div className="pl-2 flex items-center justify-between">
                <span className="text-text-muted">Sisa Tagihan Bulan Ini</span>
                <span className="font-semibold text-expense tabular-nums">{formatRupiah(pendingBillsAmount)}</span>
              </div>
            </div>

            {/* Kewajiban Jangka Panjang */}
            <div className="space-y-1 pt-1 border-t border-border/50">
              <span className="font-bold text-text-muted uppercase text-[10px] tracking-wider block">
                2. Hutang Pinjaman yang Sedang Berjalan
              </span>
              <div className="pl-2 space-y-1 divide-y divide-border/40">
                {debts.filter((d) => d.type === 'payable' && d.status !== 'paid').length === 0 ? (
                  <span className="text-text-muted text-[11px] block pt-1">Bebas dari kewajiban hutang</span>
                ) : (
                  debts
                    .filter((d) => d.type === 'payable' && d.status !== 'paid')
                    .map((d) => (
                      <div key={d.id} className="flex items-center justify-between pt-1">
                        <span className="text-text-muted truncate max-w-[200px]">{d.person_name}</span>
                        <span className="font-semibold text-expense tabular-nums">
                          {formatRupiah(d.remaining_amount)}
                        </span>
                      </div>
                    ))
                )}
                <div className="flex items-center justify-between pt-1 font-bold">
                  <span>Subtotal Seluruh Hutang:</span>
                  <span className="tabular-nums text-expense">{formatRupiah(totalLiabilities)}</span>
                </div>
              </div>
            </div>

            {/* Ekuitas / Kekayaan Bersih */}
            <div className="space-y-1 pt-1 border-t border-border/50">
              <span className="font-bold text-text-muted uppercase text-[10px] tracking-wider block">
                3. Kekayaan Bersih Murni Keluarga
              </span>
              <div className="pl-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Harta Bersih (Bebas Hutang)</span>
                  <span className={`font-extrabold tabular-nums ${netWorth >= 0 ? 'text-primary' : 'text-expense'}`}>
                    {formatRupiah(netWorth)}
                  </span>
                </div>
              </div>
            </div>

            {/* Total Pasiva */}
            <div className="flex items-center justify-between p-2.5 bg-surface-2 rounded-xl font-extrabold text-sm border border-border">
              <span className="text-text">TOTAL HUTANG + KEKAYAAN BERSIH</span>
              <span className="text-primary tabular-nums">{formatRupiah(totalLiabilities + netWorth)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
