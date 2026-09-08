'use client';

import React from 'react';
import { Warning, ShieldCheck, TrendDown, Clock, Lightning } from '@phosphor-icons/react';
import { formatRupiah, formatDate } from '@/lib/formatters';
import { calculateCollapseForecast, CollapseLevel } from '@/lib/collapseForecast';

interface CollapseForecastCardProps {
  totalCash: number;
  monthlyBurn: number;
}

const LEVEL_META: Record<CollapseLevel, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  aman: { label: 'Aman', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', icon: ShieldCheck },
  waspada: { label: 'Waspada', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20', icon: Clock },
  kritis: { label: 'Kritis', color: 'text-expense', bg: 'bg-expense/10', border: 'border-expense/20', icon: Warning },
  colapse: { label: 'Colapse', color: 'text-expense', bg: 'bg-expense/15', border: 'border-expense/30', icon: Lightning },
};

export function CollapseForecastCard({ totalCash, monthlyBurn }: CollapseForecastCardProps) {
  const forecast = calculateCollapseForecast(totalCash, monthlyBurn);
  const meta = LEVEL_META[forecast.level];
  const Icon = meta.icon;

  const monthsDisplay = !Number.isFinite(forecast.monthsUntilCollapse)
    ? '∞'
    : forecast.monthsUntilCollapse < 1
      ? `${forecast.monthsUntilCollapse.toFixed(1)}`
      : `${forecast.monthsUntilCollapse.toFixed(1)}`;

  const progressPct = !Number.isFinite(forecast.monthsUntilCollapse)
    ? 100
    : Math.min(100, Math.max(0, Math.round((forecast.monthsUntilCollapse / 12) * 100)));

  let advice = '';
  if (forecast.level === 'aman') {
    advice = `Kas Anda bertahan ${monthsDisplay} bulan tanpa pemasukan. Aman. Pertahankan pengeluaran di bawah ${formatRupiah(forecast.burnRate)}/bulan dan tambah dana darurat.`;
  } else if (forecast.level === 'waspada') {
    advice = `Sisa ${monthsDisplay} bulan sebelum colapse. Waspada. Kurangi pengeluaran non-primer atau siapkan pemasukan cadangan.`;
  } else if (forecast.level === 'kritis') {
    advice = `Hanya ${monthsDisplay} bulan lagi sebelum kas habis. Kritis. Segera pangkas pengeluaran dan amankan pemasukan darurat.`;
  } else if (!Number.isFinite(forecast.monthsUntilCollapse)) {
    advice = 'Tidak ada burn rate, pengeluaran 0. Kas tidak akan colapse.';
  } else {
    advice = `Kas hampir habis dalam ${monthsDisplay} bulan (${forecast.daysUntilCollapse.toFixed(0)} hari). Colapse segera jika tidak ada pemasukan. Tindakan darurat diperlukan.`;
  }

  return (
    <div className={`p-4 sm:p-5 rounded-3xl border shadow-2xs space-y-3 ${meta.bg} ${meta.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${meta.bg} ${meta.color} border ${meta.border}`}>
            <Icon size={22} weight="duotone" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-text">Simulasi Colapse: Jika Pendapatan Mati Hari Ini</h3>
            <p className="text-[11px] text-text-muted">Forecasting ketahanan kas tanpa pemasukan sama sekali</p>
          </div>
        </div>
        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${meta.bg} ${meta.color} ${meta.border}`}>{meta.label}</span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3 bg-surface rounded-2xl border border-border/60 space-y-1">
          <span className="text-[10px] font-semibold text-text-muted block">Kas Saat Ini</span>
          <p className="text-sm font-extrabold text-text tabular-nums">{formatRupiah(totalCash)}</p>
          <span className="text-[10px] text-text-muted block">Total likuid</span>
        </div>
        <div className="p-3 bg-surface rounded-2xl border border-border/60 space-y-1">
          <span className="text-[10px] font-semibold text-text-muted block">Burn Rate / Bulan</span>
          <p className="text-sm font-extrabold text-expense tabular-nums">{formatRupiah(forecast.burnRate)}</p>
          <span className="text-[10px] text-text-muted block">Pengeluaran + tagihan</span>
        </div>
        <div className={`p-3 rounded-2xl border space-y-1 ${forecast.level === 'aman' ? 'bg-primary/5 border-primary/20' : 'bg-surface border-border/60'}`}>
          <span className="text-[10px] font-bold text-text-muted block">Jangka Waktu Colapse</span>
          <p className={`text-sm font-extrabold tabular-nums ${meta.color}`}>
            {monthsDisplay} bulan {Number.isFinite(forecast.monthsUntilCollapse) && `(${forecast.daysUntilCollapse.toFixed(0)} hari)`}
          </p>
          <span className="text-[10px] text-text-muted block">
            {forecast.collapseDate ? `Perkiraan ${formatDate(forecast.collapseDate, 'long')}` : 'Tidak terbatas'}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="w-full h-2.5 bg-surface-2 rounded-full overflow-hidden border border-border/40">
          <div
            className={`h-full rounded-full transition-all duration-700 ${forecast.level === 'aman' ? 'bg-primary' : forecast.level === 'waspada' ? 'bg-warning' : 'bg-expense'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-text-muted">
          <span>0 bln (colapse)</span>
          <span>6 bln</span>
          <span>12 bln (aman)</span>
        </div>
      </div>

      <div className={`p-3 rounded-2xl border flex items-start gap-2.5 text-xs ${meta.bg} ${meta.border}`}>
        <TrendDown size={18} className={`${meta.color} shrink-0 mt-0.5`} weight="bold" />
        <div className="space-y-1 min-w-0">
          <p className="font-bold text-text text-xs">Apa yang harus dilakukan?</p>
          <p className="text-[11px] text-text-muted leading-relaxed">{advice}</p>
        </div>
      </div>
    </div>
  );
}
