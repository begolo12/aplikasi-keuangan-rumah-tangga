'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch, endpoints } from '@/lib/apiFetch';
import { RecurringBill, Category } from '@/lib/types';
import { formatRupiah, formatCompactRupiah, INDONESIAN_MONTHS } from '@/lib/formatters';
import { AmountInput } from '@/components/ui/AmountInput';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import {
  ArrowsClockwise,
  Plus,
  X,
  ChartLineUp,
  PiggyBank,
  SpinnerGap,
  Minus,
  TrendUp,
  CheckCircle,
  WarningCircle,
  XCircle,
  CalendarBlank,
} from '@phosphor-icons/react';

type SaveMode = 'kill_bill' | 'trim_category';

interface SaveScenarioItem {
  id: string;
  mode: SaveMode;
  label: string;
  monthlySaving: number;
}

type SpendMode = 'subscription' | 'cash_purchase' | 'installment';

interface SpendScenarioItem {
  id: string;
  mode: SpendMode;
  label: string;
  monthlyCost: number;
  oneTimeCost: number;
  tenorMonths?: number | null;
}

type Verdict = 'safe' | 'caution' | 'risk';

interface ScenarioSimulatorProps {
  monthlyIncome?: number;
  monthlyExpense?: number;
  totalCash?: number;
  safetyReserve?: number;
  currentMonth?: number;
  currentYear?: number;
}

export function ScenarioSimulator({
  monthlyIncome = 0,
  monthlyExpense = 0,
  totalCash = 0,
  safetyReserve = 0,
  currentMonth,
  currentYear,
}: ScenarioSimulatorProps) {
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [group, setGroup] = useState<'save' | 'spend'>('save');
  const [saveMode, setSaveMode] = useState<SaveMode>('kill_bill');
  const [spendMode, setSpendMode] = useState<SpendMode>('subscription');
  const [selectedBillId, setSelectedBillId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [trimAmount, setTrimAmount] = useState(0);
  const [spendName, setSpendName] = useState('');
  const [subscriptionAmount, setSubscriptionAmount] = useState(0);
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [installmentDp, setInstallmentDp] = useState(0);
  const [installmentMonthly, setInstallmentMonthly] = useState(0);
  const [installmentTenor, setInstallmentTenor] = useState(12);
  const [saveScenarios, setSaveScenarios] = useState<SaveScenarioItem[]>([]);
  const [spendScenarios, setSpendScenarios] = useState<SpendScenarioItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      apiFetch<{ bills: RecurringBill[] }>(endpoints.bills).catch(() => ({ bills: [] as RecurringBill[] })),
      apiFetch<{ categories: Category[] }>(endpoints.categories).catch(() => ({ categories: [] as Category[] })),
    ]).then(([bRes, cRes]) => {
      if (!isMounted) return;
      const activeExpenseBills = (bRes.bills || []).filter((b) => b.is_active && (b.type ?? 'expense') === 'expense');
      setBills(activeExpenseBills);
      setCategories((cRes.categories || []).filter((c) => c.type === 'expense'));
      setIsLoadingData(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedBill = bills.find((b) => b.id === selectedBillId);
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  const canAddSave =
    (saveMode === 'kill_bill' && Boolean(selectedBill)) ||
    (saveMode === 'trim_category' && Boolean(selectedCategory) && trimAmount > 0);

  const canAddSpend =
    (spendMode === 'subscription' && subscriptionAmount > 0) ||
    (spendMode === 'cash_purchase' && purchasePrice > 0) ||
    (spendMode === 'installment' && installmentMonthly > 0 && installmentTenor > 0);

  const addSaveScenario = () => {
    if (!canAddSave) return;
    const item: SaveScenarioItem | null =
      saveMode === 'kill_bill' && selectedBill
        ? {
            id: `bill-${selectedBill.id}`,
            mode: saveMode,
            label: `Matikan tagihan "${selectedBill.title}"`,
            monthlySaving: selectedBill.amount,
          }
        : selectedCategory
        ? {
            id: `cat-${selectedCategory.id}`,
            mode: saveMode,
            label: `Kurangi kategori "${selectedCategory.name}" sebesar ${formatRupiah(trimAmount)}`,
            monthlySaving: trimAmount,
          }
        : null;
    if (!item) return;
    setSaveScenarios((prev) => [...prev.filter((s) => s.id !== item.id), item]);
    setSelectedBillId('');
    setSelectedCategoryId('');
    setTrimAmount(0);
  };

  const addSpendScenario = () => {
    if (!canAddSpend) return;
    const name = spendName.trim() || 'Beban Baru';
    const item: SpendScenarioItem =
      spendMode === 'subscription'
        ? { id: `sub-${Date.now()}`, mode: spendMode, label: `Langganan: ${name}`, monthlyCost: subscriptionAmount, oneTimeCost: 0, tenorMonths: null }
        : spendMode === 'cash_purchase'
        ? { id: `cash-${Date.now()}`, mode: spendMode, label: `Beli tunai: ${name}`, monthlyCost: 0, oneTimeCost: purchasePrice, tenorMonths: null }
        : {
            id: `inst-${Date.now()}`,
            mode: spendMode,
            label: `Cicilan: ${name} (${installmentTenor} bln)`,
            monthlyCost: installmentMonthly,
            oneTimeCost: installmentDp,
            tenorMonths: installmentTenor,
          };
    setSpendScenarios((prev) => [...prev, item]);
    setSpendName('');
    setSubscriptionAmount(0);
    setPurchasePrice(0);
    setInstallmentDp(0);
    setInstallmentMonthly(0);
    setInstallmentTenor(12);
  };

  const result = useMemo(() => {
    const totalReduction = saveScenarios.reduce((acc, s) => acc + s.monthlySaving, 0);
    const newMonthlyCost = spendScenarios.reduce((acc, s) => acc + s.monthlyCost, 0);
    const oneTimeCost = spendScenarios.reduce((acc, s) => acc + s.oneTimeCost, 0);
    const cashflowBefore = monthlyIncome - monthlyExpense;
    const cashflowAfter = cashflowBefore - newMonthlyCost + totalReduction;
    const cashAfter = totalCash - oneTimeCost;
    const reasons: string[] = [];
    let verdict: Verdict = 'safe';
    if (oneTimeCost > 0 && cashAfter < 0) {
      verdict = 'risk';
      reasons.push(`Kas tidak cukup untuk pembelian sekali bayar (kurang ${formatRupiah(Math.abs(cashAfter))}).`);
    }
    if (cashflowAfter < 0) {
      verdict = 'risk';
      reasons.push('Arus kas bulanan menjadi minus dengan beban baru ini.');
    }
    if (verdict !== 'risk') {
      if (safetyReserve > 0 && cashAfter < safetyReserve) {
        verdict = 'caution';
        reasons.push(`Sisa kas di bawah cadangan wajib 4.4x anggaran (${formatRupiah(safetyReserve)}).`);
      }
      if (cashflowBefore > 0 && cashflowAfter < cashflowBefore * 0.2) {
        verdict = 'caution';
        reasons.push('Sisa ruang arus kas bulanan menjadi sangat tipis (di bawah 20% pemasukan).');
      }
    }
    if (reasons.length === 0) {
      reasons.push('Arus kas tetap sehat dan kas setelah pembelian masih di atas cadangan wajib.');
    }
    const netMonthly = cashflowAfter - cashflowBefore;
    return {
      totalReduction,
      newMonthlyCost,
      oneTimeCost,
      cashflowBefore,
      cashflowAfter,
      cashAfter,
      verdict,
      reasons,
      netMonthly,
    };
  }, [saveScenarios, spendScenarios, monthlyIncome, monthlyExpense, totalCash, safetyReserve]);

  const hasAnyScenario = saveScenarios.length > 0 || spendScenarios.length > 0;
  const VERDICT_META = {
    safe: { label: 'Kondisi Keuangan Tetap Aman', icon: CheckCircle, className: 'bg-income/10 border-income/20 text-income' },
    caution: { label: 'Waspada: Pikirkan Dulu', icon: WarningCircle, className: 'bg-warning/10 border-warning/20 text-warning' },
    risk: { label: 'Berisiko: Tidak Disarankan', icon: XCircle, className: 'bg-expense/10 border-expense/20 text-expense' },
  } as const;

  // Proyeksi 12 bulan ke depan — kumulatif kas dengan vs tanpa skenario
  const projection12 = useMemo(() => {
    if (!hasAnyScenario) return null;
    const cashflowBefore = monthlyIncome - monthlyExpense;
    const totalReduction = saveScenarios.reduce((acc, s) => acc + s.monthlySaving, 0);
    const oneTimeCost = spendScenarios.reduce((acc, s) => acc + s.oneTimeCost, 0);
    const now = new Date();
    const baseMonth = currentMonth ?? now.getMonth() + 1;
    const baseYear = currentYear ?? now.getFullYear();
    const rows: {
      idx: number;
      label: string;
      month: number;
      year: number;
      cashBaseline: number;
      cashScenario: number;
      delta: number;
      cashflowScenario: number;
      status: 'safe' | 'below_reserve' | 'negative';
    }[] = [];
    let cashScenario = totalCash - oneTimeCost;
    let cashBaseline = totalCash;
    for (let i = 1; i <= 12; i++) {
      let m = baseMonth + i;
      let y = baseYear;
      while (m > 12) {
        m -= 12;
        y += 1;
      }
      const activeMonthlyCost = spendScenarios.reduce((sum, s) => {
        if (s.mode === 'subscription') return sum + s.monthlyCost;
        if (s.mode === 'cash_purchase') return sum;
        if (s.mode === 'installment') {
          const tenor = s.tenorMonths ?? 12;
          return i <= tenor ? sum + s.monthlyCost : sum;
        }
        return sum;
      }, 0);
      const cashflowScenario = cashflowBefore - activeMonthlyCost + totalReduction;
      cashScenario += cashflowScenario;
      cashBaseline += cashflowBefore;
      const status: 'safe' | 'below_reserve' | 'negative' =
        cashScenario < 0 ? 'negative' : safetyReserve > 0 && cashScenario < safetyReserve ? 'below_reserve' : 'safe';
      rows.push({
        idx: i,
        label: `${INDONESIAN_MONTHS[m - 1].slice(0, 3)} ${y}`,
        month: m,
        year: y,
        cashBaseline,
        cashScenario,
        delta: cashScenario - cashBaseline,
        cashflowScenario,
        status,
      });
    }
    const firstBelowReserve = rows.find((r) => r.status === 'below_reserve' || r.status === 'negative') ?? null;
    const firstNegative = rows.find((r) => r.status === 'negative') ?? null;
    const chartData = rows.map((r) => ({
      name: r.label,
      Baseline: r.cashBaseline,
      'Dengan Skenario': r.cashScenario,
    }));
    return { rows, chartData, firstBelowReserve, firstNegative, cashflowBefore };
  }, [hasAnyScenario, monthlyIncome, monthlyExpense, totalCash, safetyReserve, saveScenarios, spendScenarios, currentMonth, currentYear]);

  return (
    <div className="p-4 md:p-5 bg-surface border border-border rounded-2xl sm:rounded-3xl space-y-4 shadow-2xs">
      <div className="flex items-center gap-1.5">
        <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
          <ArrowsClockwise size={17} weight="duotone" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-text">Simulasi What-If</h3>
          <p className="text-[11px] text-text-muted">Coba skenario hemat atau tambah beban tanpa mengubah data asli.</p>
        </div>
      </div>

      {isLoadingData ? (
        <div className="flex items-center justify-center gap-2 py-6">
          <SpinnerGap size={16} className="text-primary animate-spin" />
          <span className="text-xs font-semibold text-text-muted">Memuat tagihan & kategori...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-2 rounded-2xl border border-border">
            <button
              type="button"
              onClick={() => setGroup('save')}
              className={`min-h-[38px] text-xs font-bold rounded-xl transition-all ${group === 'save' ? 'bg-income text-white shadow-xs' : 'text-text-muted hover:text-text'}`}
            >
              Skenario Hemat
            </button>
            <button
              type="button"
              onClick={() => setGroup('spend')}
              className={`min-h-[38px] text-xs font-bold rounded-xl transition-all ${group === 'spend' ? 'bg-expense text-white shadow-xs' : 'text-text-muted hover:text-text'}`}
            >
              Tambah Beban Baru
            </button>
          </div>

          {group === 'save' ? (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-2 rounded-2xl border border-border">
                <button
                  type="button"
                  onClick={() => setSaveMode('kill_bill')}
                  className={`min-h-[38px] text-xs font-bold rounded-xl transition-all ${saveMode === 'kill_bill' ? 'bg-primary text-white shadow-xs' : 'text-text-muted hover:text-text'}`}
                >
                  Matikan Langganan
                </button>
                <button
                  type="button"
                  onClick={() => setSaveMode('trim_category')}
                  className={`min-h-[38px] text-xs font-bold rounded-xl transition-all ${saveMode === 'trim_category' ? 'bg-primary text-white shadow-xs' : 'text-text-muted hover:text-text'}`}
                >
                  Kurangi Kategori
                </button>
              </div>

              {saveMode === 'kill_bill' ? (
                bills.length > 0 ? (
                  <select
                    value={selectedBillId}
                    onChange={(e) => setSelectedBillId(e.target.value)}
                    aria-label="Pilih tagihan rutin untuk dimatikan"
                    className="w-full min-h-[44px] px-3 rounded-xl bg-surface-2 border border-border text-xs font-bold text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Pilih tagihan rutin...</option>
                    {bills.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} ({formatRupiah(b.amount)}/bln)
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-text-muted">Belum ada tagihan rutin aktif untuk disimulasikan.</p>
                )
              ) : (
                <div className="space-y-2">
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    aria-label="Pilih kategori untuk dikurangi"
                    className="w-full min-h-[44px] px-3 rounded-xl bg-surface-2 border border-border text-xs font-bold text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Pilih kategori pengeluaran...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <AmountInput id="trimAmount" label="Nominal pengurangan per bulan (Rp)" value={trimAmount} onChange={setTrimAmount} />
                </div>
              )}

              <button
                type="button"
                onClick={addSaveScenario}
                disabled={!canAddSave}
                className="min-h-[40px] w-full rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-primary/20 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none transition-all"
              >
                <Plus size={14} weight="bold" /> Tambahkan ke Simulasi
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-surface-2 rounded-2xl border border-border">
                {([
                  { id: 'subscription' as SpendMode, label: 'Langganan' },
                  { id: 'cash_purchase' as SpendMode, label: 'Beli Tunai' },
                  { id: 'installment' as SpendMode, label: 'Cicilan' },
                ]).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSpendMode(m.id)}
                    className={`min-h-[38px] text-xs font-bold rounded-xl transition-all ${spendMode === m.id ? 'bg-primary text-white shadow-xs' : 'text-text-muted hover:text-text'}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={spendName}
                onChange={(e) => setSpendName(e.target.value)}
                placeholder="Nama (mis. Motor NMax, Netflix)"
                maxLength={60}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-surface-2 border border-border text-sm font-semibold text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />

              {spendMode === 'subscription' && (
                <AmountInput id="subAmount" label="Biaya per bulan (Rp)" value={subscriptionAmount} onChange={setSubscriptionAmount} />
              )}
              {spendMode === 'cash_purchase' && (
                <AmountInput id="purchasePrice" label="Harga beli tunai (Rp)" value={purchasePrice} onChange={setPurchasePrice} />
              )}
              {spendMode === 'installment' && (
                <div className="space-y-2">
                  <AmountInput id="instDp" label="Uang muka / DP (Rp)" value={installmentDp} onChange={setInstallmentDp} />
                  <AmountInput id="instMonthly" label="Angsuran per bulan (Rp)" value={installmentMonthly} onChange={setInstallmentMonthly} />
                  <div className="space-y-1">
                    <label htmlFor="instTenor" className="block text-xs font-semibold text-text-muted">
                      Tenor cicilan (bulan)
                    </label>
                    <input
                      type="number"
                      id="instTenor"
                      min={1}
                      max={120}
                      value={installmentTenor}
                      onChange={(e) => setInstallmentTenor(Math.max(1, Math.min(120, Number(e.target.value) || 1)))}
                      className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={addSpendScenario}
                disabled={!canAddSpend}
                className="min-h-[40px] w-full rounded-xl bg-expense/10 text-expense border border-expense/20 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-expense/20 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none transition-all"
              >
                <Plus size={14} weight="bold" /> Tambahkan ke Simulasi
              </button>
            </div>
          )}

          {hasAnyScenario && (
            <ul className="space-y-1.5">
              {saveScenarios.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-income/5 border border-income/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <Minus size={13} weight="bold" className="text-income shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text truncate">{s.label}</p>
                      <p className="text-[10px] text-text-muted">Hemat {formatRupiah(s.monthlySaving)}/bulan</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSaveScenarios((prev) => prev.filter((x) => x.id !== s.id))}
                    aria-label="Hapus skenario"
                    className="p-1.5 text-text-muted hover:text-expense hover:bg-expense/10 rounded-lg transition-colors shrink-0"
                  >
                    <X size={14} weight="bold" />
                  </button>
                </li>
              ))}
              {spendScenarios.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-expense/5 border border-expense/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <TrendUp size={13} weight="bold" className="text-expense shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text truncate">{s.label}</p>
                      <p className="text-[10px] text-text-muted">
                        {s.monthlyCost > 0 && `+${formatRupiah(s.monthlyCost)}/bulan`}
                        {s.monthlyCost > 0 && s.oneTimeCost > 0 && ' · '}
                        {s.oneTimeCost > 0 && `${formatRupiah(s.oneTimeCost)} sekali bayar`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSpendScenarios((prev) => prev.filter((x) => x.id !== s.id))}
                    aria-label="Hapus skenario"
                    className="p-1.5 text-text-muted hover:text-expense hover:bg-expense/10 rounded-lg transition-colors shrink-0"
                  >
                    <X size={14} weight="bold" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {hasAnyScenario && (
            <div className="space-y-2.5 pt-1 border-t border-border/60">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-surface-2 rounded-2xl border border-border/40 space-y-1">
                  <p className="text-[10px] font-semibold text-text-muted flex items-center gap-1">
                    <ChartLineUp size={12} className="text-primary" /> Arus Kas Bulanan
                  </p>
                  <p className="text-xs font-bold text-text tabular-nums">
                    {formatRupiah(result.cashflowBefore)} →{' '}
                    <span className={result.cashflowAfter < 0 ? 'text-expense' : 'text-income'}>{formatRupiah(result.cashflowAfter)}</span>
                  </p>
                  <p className={`text-[10px] font-bold tabular-nums ${result.netMonthly >= 0 ? 'text-income' : 'text-expense'}`}>
                    {result.netMonthly >= 0 ? '+' : ''}
                    {formatRupiah(result.netMonthly)} /bulan
                  </p>
                </div>
                <div className="p-3 bg-surface-2 rounded-2xl border border-border/40 space-y-1">
                  <p className="text-[10px] font-semibold text-text-muted flex items-center gap-1">
                    <PiggyBank size={12} className="text-primary" /> Kas Setelah Pembelian
                  </p>
                  <p className="text-xs font-bold text-text tabular-nums">
                    {formatRupiah(totalCash)} →{' '}
                    <span className={result.cashAfter < 0 ? 'text-expense' : 'text-income'}>{formatRupiah(result.cashAfter)}</span>
                  </p>
                  {result.oneTimeCost > 0 && (
                    <p className="text-[10px] font-bold text-expense tabular-nums">-{formatRupiah(result.oneTimeCost)} sekali bayar</p>
                  )}
                </div>
              </div>

              {(() => {
                const meta = VERDICT_META[result.verdict];
                const Icon = meta.icon;
                return (
                  <div className={`p-3.5 rounded-2xl border space-y-1.5 ${meta.className}`}>
                    <p className="text-xs font-extrabold flex items-center gap-1.5">
                      <Icon size={16} weight="fill" />
                      {meta.label}
                    </p>
                    <ul className="space-y-0.5">
                      {result.reasons.map((r, i) => (
                        <li key={i} className="text-[11px] leading-relaxed text-text-muted">
                          • {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              {result.netMonthly !== 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {[6, 12].map((months) => (
                    <div key={months} className="p-2.5 bg-surface-2 rounded-xl border border-border/40 text-center">
                      <p className="text-[10px] font-semibold text-text-muted">Dampak {months} Bulan</p>
                      <p className={`text-xs font-extrabold tabular-nums ${result.netMonthly >= 0 ? 'text-income' : 'text-expense'}`}>
                        {result.netMonthly >= 0 ? '+' : ''}
                        {formatRupiah(result.netMonthly * months)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {projection12 && (
                <div className="space-y-3 p-3 bg-surface-2 rounded-2xl border border-border/40">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-extrabold text-text flex items-center gap-1.5">
                      <CalendarBlank size={14} className="text-primary" weight="duotone" /> Proyeksi 12 Bulan ke Depan
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      Kas awal {formatCompactRupiah(totalCash)} → {formatCompactRupiah(result.cashAfter)}
                    </span>
                  </div>

                  {projection12.firstNegative ? (
                    <p className="text-[11px] font-bold text-expense bg-expense/10 border border-expense/20 rounded-xl px-2.5 py-1.5">
                      Kas diproyeksi minus pada {projection12.firstNegative.label} (bulan ke-{projection12.firstNegative.idx}) — {formatRupiah(projection12.firstNegative.cashScenario)}.
                    </p>
                  ) : projection12.firstBelowReserve ? (
                    <p className="text-[11px] font-bold text-warning bg-warning/10 border border-warning/20 rounded-xl px-2.5 py-1.5">
                      Di bawah cadangan wajib {formatRupiah(safetyReserve)} mulai {projection12.firstBelowReserve.label} (bulan ke-{projection12.firstBelowReserve.idx}).
                    </p>
                  ) : (
                    <p className="text-[11px] font-bold text-income bg-income/10 border border-income/20 rounded-xl px-2.5 py-1.5">
                      Aman: kas tetap di atas cadangan wajib selama 12 bulan ke depan.
                    </p>
                  )}

                  <div className="h-[190px] w-full bg-surface rounded-xl border border-border/40 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={projection12.chartData} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--color-text-muted))' }} interval={1} />
                        <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--color-text-muted))' }} tickFormatter={(v: number) => formatCompactRupiah(v)} width={55} />
                        <Tooltip
                          formatter={(value: number, name: string) => [formatRupiah(value), name]}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--color-surface))',
                            borderColor: 'hsl(var(--color-border))',
                            borderRadius: '0.75rem',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} />
                        {safetyReserve > 0 && (
                          <ReferenceLine y={safetyReserve} stroke="hsl(var(--color-warning))" strokeDasharray="4 4" label={{ value: 'Cadangan 4.4x', fontSize: 9, fill: 'hsl(var(--color-warning))', position: 'insideTopRight' }} />
                        )}
                        <Line type="monotone" dataKey="Baseline" stroke="hsl(var(--color-text-muted))" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                        <Line type="monotone" dataKey="Dengan Skenario" stroke="hsl(var(--color-primary))" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-x-auto -mx-1">
                    <table className="w-full text-[11px] min-w-[520px]">
                      <thead>
                        <tr className="text-text-muted border-b border-border">
                          <th className="text-left py-1.5 px-2 font-bold">Bulan</th>
                          <th className="text-right py-1.5 px-2 font-bold">Kas Tanpa Skenario</th>
                          <th className="text-right py-1.5 px-2 font-bold">Kas Dengan Skenario</th>
                          <th className="text-right py-1.5 px-2 font-bold">Selisih</th>
                          <th className="text-center py-1.5 px-2 font-bold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {projection12.rows.map((r) => (
                          <tr key={r.idx} className={r.status === 'negative' ? 'bg-expense/5' : r.status === 'below_reserve' ? 'bg-warning/5' : ''}>
                            <td className="py-1.5 px-2 font-bold text-text whitespace-nowrap">
                              <span className="text-text-muted font-semibold mr-1">+{r.idx}</span>
                              {r.label}
                            </td>
                            <td className="py-1.5 px-2 text-right font-semibold text-text-muted tabular-nums">{formatRupiah(r.cashBaseline)}</td>
                            <td className={`py-1.5 px-2 text-right font-extrabold tabular-nums ${r.status === 'negative' ? 'text-expense' : r.status === 'below_reserve' ? 'text-warning' : 'text-text'}`}>{formatRupiah(r.cashScenario)}</td>
                            <td className={`py-1.5 px-2 text-right font-bold tabular-nums ${r.delta >= 0 ? 'text-income' : 'text-expense'}`}>{r.delta >= 0 ? '+' : ''}{formatCompactRupiah(r.delta)}</td>
                            <td className="py-1.5 px-2 text-center">
                              {r.status === 'negative' ? (
                                <span className="px-1.5 py-0.5 rounded-full bg-expense/10 text-expense border border-expense/20 text-[10px] font-bold">Minus</span>
                              ) : r.status === 'below_reserve' ? (
                                <span className="px-1.5 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20 text-[10px] font-bold">Di bawah cadangan</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded-full bg-income/10 text-income border border-income/20 text-[10px] font-bold">Aman</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] leading-relaxed text-text-muted">
                    Asumsi: pemasukan {formatRupiah(monthlyIncome)}/bln dan pengeluaran {formatRupiah(monthlyExpense)}/bln konstan selama 12 bulan. Cicilan hanya membebani selama tenor (setelah lunas, arus kas kembali membaik). Sekali bayar (DP/tunai) hanya potong kas di awal.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
