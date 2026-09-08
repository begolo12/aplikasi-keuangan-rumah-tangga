'use client';

import React, { useMemo, useState } from 'react';
import { Transaction, FinancialEvent } from '@/lib/types';
import { formatRupiah, formatCompactRupiah, INDONESIAN_MONTHS } from '@/lib/formatters';
import { CategoryIcon } from '../ui/CategoryIcon';
import {
  CaretLeft,
  CaretRight,
  CalendarBlank,
  TrendUp,
  TrendDown,
  Minus,
  ArrowsLeftRight,
  PencilSimple,
} from '@phosphor-icons/react';

interface CalendarViewProps {
  transactions: Transaction[];
  financialEvents?: FinancialEvent[];
  currentMonth: number;
  currentYear: number;
  onPeriodChange: (month: number, year: number) => void;
  onEditTransaction?: (t: Transaction) => void;
  onDeleteTransaction?: (id: string) => Promise<void>;
  onOpenAddModal?: (type?: 'expense' | 'income' | 'transfer') => void;
  onOpenEventModal?: (event?: FinancialEvent) => void;
  onEditEvent?: (event: FinancialEvent) => void;
}

type DailyAgg = {
  income: number;
  expense: number; // sudah termasuk admin_fee
  net: number; // income - expense
  count: number;
  hasEvents: boolean;
};

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const EVENT_COLORS: Record<FinancialEvent['type'], string> = {
  bonus: '#10b181',
  insurance_renewal: '#f59e0b',
  tax_deadline: '#ef4444',
  investment_contribution: '#3b82f6',
};

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function firstWeekdayMon0(month: number, year: number): number {
  // 0=Senin .. 6=Minggu
  const js = new Date(year, month - 1, 1).getDay(); // 0=Min
  return js === 0 ? 6 : js - 1;
}

export function CalendarView({
  transactions,
  financialEvents,
  currentMonth,
  currentYear,
  onPeriodChange,
  onEditTransaction,
  onDeleteTransaction: _onDeleteTransaction,
  onOpenAddModal,
  onOpenEventModal,
  onEditEvent,
}: CalendarViewProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [prevPeriod, setPrevPeriod] = useState({ month: currentMonth, year: currentYear });
  if (prevPeriod.month !== currentMonth || prevPeriod.year !== currentYear) {
    setPrevPeriod({ month: currentMonth, year: currentYear });
    setSelectedDay(null);
  }

  const dailyMap = useMemo(() => {
    const map = new Map<number, DailyAgg>();
    
    // Build event lookup by date
    const eventsByDate = new Map<number, FinancialEvent[]>();
    if (financialEvents && financialEvents.length > 0) {
      for (const event of financialEvents) {
        if (!event.date) continue;
        // Check if event is in current month
        const d = new Date(event.date);
        if (isNaN(d.getTime())) continue;
        if (d.getMonth() + 1 !== currentMonth || d.getFullYear() !== currentYear) continue;
        
        const day = d.getDate();
        if (!eventsByDate.has(day)) {
          eventsByDate.set(day, []);
        }
        eventsByDate.get(day)?.push(event);
      }
    }
    
    for (const t of transactions) {
      if (!t.date) continue;
      const d = new Date(t.date);
      if (isNaN(d.getTime())) continue;
      // hanya transaksi pada bulan yang sedang dibuka — bootstrap sudah filter, tapi jaga jaga
      if (d.getMonth() + 1 !== currentMonth || d.getFullYear() !== currentYear) continue;
      const day = d.getDate();
      const prev = map.get(day) || { income: 0, expense: 0, net: 0, count: 0, hasEvents: false };
      if (t.type === 'income') {
        prev.income += Number(t.amount) || 0;
      } else if (t.type === 'expense') {
        prev.expense += (Number(t.amount) || 0) + (Number(t.admin_fee) || 0);
      } else {
        // transfer tidak dihitung ke net harian (bukan pemasukan/pengeluaran)
        // tetap hitung count bila ingin indikator, tapi tidak ubah net
        prev.count += 1;
        map.set(day, { ...prev, net: prev.income - prev.expense });
        continue;
      }
      prev.count += 1;
      prev.net = prev.income - prev.expense;
      map.set(day, prev);
    }
    
    // Mark days with events and update counts
    for (const [day, events] of eventsByDate.entries()) {
      const existing = map.get(day) || { income: 0, expense: 0, net: 0, count: 0, hasEvents: false };
      map.set(day, { ...existing, hasEvents: true, count: existing.count + events.length });
    }
    
    return map;
  }, [transactions, financialEvents, currentMonth, currentYear]);

  const monthlyTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const v of dailyMap.values()) {
      income += v.income;
      expense += v.expense;
    }
    return { income, expense, net: income - expense };
  }, [dailyMap]);

  const totalDays = daysInMonth(currentMonth, currentYear);
  const offset = firstWeekdayMon0(currentMonth, currentYear);
  const today = new Date();
  const isCurrentMonth = today.getMonth() + 1 === currentMonth && today.getFullYear() === currentYear;
  const todayDay = today.getDate();

  const handlePrev = () => {
    if (currentMonth === 1) onPeriodChange(12, currentYear - 1);
    else onPeriodChange(currentMonth - 1, currentYear);
  };
  const handleNext = () => {
    if (currentMonth === 12) onPeriodChange(1, currentYear + 1);
    else onPeriodChange(currentMonth + 1, currentYear);
  };

  // transaksi untuk hari terpilih
  const selectedTransactions = useMemo(() => {
    if (selectedDay == null) return [];
    const pad = (n: number) => String(n).padStart(2, '0');
    const iso = `${currentYear}-${pad(currentMonth)}-${pad(selectedDay)}`;
    return transactions.filter((t) => t.date === iso);
  }, [selectedDay, transactions, currentMonth, currentYear]);

  const selectedAgg = selectedDay != null ? dailyMap.get(selectedDay) : null;
  const eventsByDateRef = useMemo(() => {
    const map = new Map<number, FinancialEvent[]>();
    if (financialEvents && financialEvents.length > 0) {
      for (const event of financialEvents) {
        if (!event.date) continue;
        const d = new Date(event.date);
        if (isNaN(d.getTime())) continue;
        if (d.getMonth() + 1 !== currentMonth || d.getFullYear() !== currentYear) continue;
        
        const day = d.getDate();
        if (!map.has(day)) {
          map.set(day, []);
        }
        map.get(day)?.push(event);
      }
    }
    return map;
  }, [financialEvents, currentMonth, currentYear]);
  
  const selectedDayEvents = selectedDay != null ? (eventsByDateRef.get(selectedDay) || []) : [];
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header kalender + navigasi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <CalendarBlank size={20} weight="duotone" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-text leading-tight">Kalender Arus Kas</h2>
            <p className="text-[11px] sm:text-xs text-text-muted">Setiap tanggal menampilkan <span className="font-bold text-text">pemasukan − pengeluaran</span> hari itu.</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-surface border border-border rounded-2xl px-2 py-1.5 shadow-2xs self-start sm:self-auto">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Bulan sebelumnya"
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-2 text-text-muted hover:text-text transition-colors"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <span className="text-sm font-extrabold text-text min-w-[124px] text-center select-none tabular-nums">
            {INDONESIAN_MONTHS[currentMonth - 1]} {currentYear}
          </span>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Bulan berikutnya"
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-2 text-text-muted hover:text-text transition-colors"
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>
      </div>

      {/* Ringkasan bulan */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="p-3 sm:p-4 rounded-2xl bg-income/10 border border-income/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-income">Masuk</p>
          <p className="text-xs sm:text-sm font-extrabold text-income tabular-nums truncate">{formatCompactRupiah(monthlyTotals.income)}</p>
          <p className="hidden sm:block text-[11px] text-text-muted tabular-nums truncate">{formatRupiah(monthlyTotals.income)}</p>
        </div>
        <div className="p-3 sm:p-4 rounded-2xl bg-expense/10 border border-expense/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-expense">Keluar</p>
          <p className="text-xs sm:text-sm font-extrabold text-expense tabular-nums truncate">{formatCompactRupiah(monthlyTotals.expense)}</p>
          <p className="hidden sm:block text-[11px] text-text-muted tabular-nums truncate">{formatRupiah(monthlyTotals.expense)}</p>
        </div>
        <div className={`p-3 sm:p-4 rounded-2xl border ${monthlyTotals.net > 0 ? 'bg-income/10 border-income/20' : monthlyTotals.net < 0 ? 'bg-expense/10 border-expense/20' : 'bg-surface border-border'}`}>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${monthlyTotals.net > 0 ? 'text-income' : monthlyTotals.net < 0 ? 'text-expense' : 'text-text-muted'}`}>Bersih</p>
          <p className={`text-xs sm:text-sm font-extrabold tabular-nums truncate flex items-center gap-1 ${monthlyTotals.net > 0 ? 'text-income' : monthlyTotals.net < 0 ? 'text-expense' : 'text-text'}`}>
            {monthlyTotals.net > 0 ? <TrendUp size={14} weight="bold" /> : monthlyTotals.net < 0 ? <TrendDown size={14} weight="bold" /> : <Minus size={14} weight="bold" />}
            <span>{monthlyTotals.net === 0 ? 'Rp 0' : `${monthlyTotals.net > 0 ? '+' : ''}${formatCompactRupiah(monthlyTotals.net)}`}</span>
          </p>
          <p className="hidden sm:block text-[11px] text-text-muted tabular-nums truncate">{formatRupiah(monthlyTotals.net)}</p>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-3 text-[11px] font-semibold text-text-muted px-1">
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-income" /> Surplus</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-expense" /> Defisit</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-border" /> Nihil</span>
      </div>

      {/* Grid kalender */}
      <div className="bg-surface border border-border rounded-3xl overflow-hidden shadow-2xs">
        {/* Nama hari */}
        <div className="grid grid-cols-7 bg-surface-2/60 border-b border-border">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-2 text-center text-[10px] sm:text-xs font-extrabold tracking-widest uppercase text-text-muted">
              {w}
            </div>
          ))}
        </div>

        {/* Sel tanggal */}
        <div className="grid grid-cols-7">
          {Array.from({ length: offset }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[68px] sm:min-h-[84px] bg-surface-2/20 border-r border-b border-border/50" />
          ))}
          {Array.from({ length: totalDays }).map((_, idx) => {
            const day = idx + 1;
            const agg = dailyMap.get(day);
            const net = agg?.net ?? 0;
            const hasData = agg != null && (agg.count > 0 || agg.hasEvents);
            const isToday = isCurrentMonth && day === todayDay;
            const isSelected = selectedDay === day;
            const isPositive = net > 0;
            const isNegative = net < 0;
            const hasEvents = agg?.hasEvents ?? false;
            const dayEvents = eventsByDateRef.get(day) || [];

            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`relative min-h-[68px] sm:min-h-[84px] p-1.5 sm:p-2 flex flex-col items-start justify-between text-left border-r border-b border-border/50 transition-colors
                  ${isSelected ? 'bg-primary/10 ring-2 ring-primary ring-inset z-10' : 'bg-surface hover:bg-surface-2/40'}
                  ${isToday ? 'ring-1 ring-primary/40' : ''}
                `}
              >
                <span className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-xs font-extrabold shrink-0 ${isToday ? 'bg-primary text-white shadow-sm' : isSelected ? 'bg-primary text-white' : 'text-text'}`}>
                  {day}
                </span>
                <span className="w-full mt-1">
                  {hasData ? (
                    <span className={`inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-extrabold tabular-nums leading-none px-1.5 py-1 rounded-lg max-w-full truncate ${isPositive ? 'bg-income/15 text-income border border-income/20' : isNegative ? 'bg-expense/15 text-expense border border-expense/20' : 'bg-surface-2 text-text-muted border border-border'}`}>
                      {isPositive ? <TrendUp size={12} weight="bold" className="shrink-0 hidden sm:block" /> : isNegative ? <TrendDown size={12} weight="bold" className="shrink-0 hidden sm:block" /> : null}
                      <span className="truncate">{net === 0 ? '0' : `${net > 0 ? '+' : ''}${formatCompactRupiah(net)}`}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-text-muted/60">-</span>
                  )}
                </span>
                {/* Event indicators */}
                {hasEvents && selectedDay === day && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                    {dayEvents.map((event, idx) => (
                      <div 
                        key={idx} 
                        className="w-2 h-2 rounded-full cursor-pointer hover:scale-125 transition-transform" 
                        style={{ backgroundColor: EVENT_COLORS[event.type] }}
                        title={`Edit: ${event.title}`}
                      />
                    ))}
                  </div>
                )}
                {!hasEvents && agg?.count === 1 && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full" title={`${agg.count} transaksi`} />
                )}
              </button>
            );
          })}
          {/* fill sisa baris agar border rapi */}
          {(() => {
            const filled = offset + totalDays;
            const remainder = (7 - (filled % 7)) % 7;
            return Array.from({ length: remainder }).map((_, i) => (
              <div key={`tail-${i}`} className="min-h-[68px] sm:min-h-[84px] bg-surface-2/20 border-r border-b border-border/50" />
            ));
          })()}
        </div>
      </div>

      {/* Detail hari terpilih */}
      {selectedDay != null && (
        <div className="bg-surface border border-border rounded-3xl p-4 sm:p-5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold text-text">
              {selectedDay} {INDONESIAN_MONTHS[currentMonth - 1]} {currentYear}
              {selectedAgg && (
                <span className={`ml-2 text-xs font-bold ${selectedAgg.net > 0 ? 'text-income' : selectedAgg.net < 0 ? 'text-expense' : 'text-text-muted'}`}>
                  ({selectedAgg.net > 0 ? '+' : ''}{formatRupiah(selectedAgg.net)})
                </span>
              )}
            </h3>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-xs font-bold text-text-muted hover:text-text px-2 py-1 rounded-lg hover:bg-surface-2"
            >
              Tutup
            </button>
          </div>

          {selectedAgg && (
            <div className="flex items-center gap-2 text-[11px] font-semibold">
              <span className="px-2 py-1 rounded-full bg-income/10 border border-income/20 text-income">Masuk {formatCompactRupiah(selectedAgg.income)}</span>
              <span className="px-2 py-1 rounded-full bg-expense/10 border border-expense/20 text-expense">Keluar {formatCompactRupiah(selectedAgg.expense)}</span>
              <span className="hidden sm:inline text-text-muted">• {selectedAgg.count} transaksi & acara</span>
            </div>
          )}

          {selectedTransactions.length === 0 && selectedDayEvents.length === 0 ? (
            <div className="py-6 text-center space-y-2 border border-dashed border-border rounded-2xl bg-surface-2/30">
              <p className="text-sm font-bold text-text">Tidak ada transaksi hari ini</p>
              <p className="text-xs text-text-muted">Catat pemasukan atau pengeluaran untuk tanggal ini.</p>
              {onOpenAddModal && (
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onOpenAddModal('expense')}
                    className="min-h-[40px] px-4 rounded-xl bg-expense text-white text-xs font-bold hover:opacity-90"
                  >
                    + Pengeluaran
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAddModal('income')}
                    className="min-h-[40px] px-4 rounded-xl bg-income text-white text-xs font-bold hover:opacity-90"
                  >
                    + Pemasukan
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {/* Transaksi */}
              {selectedTransactions.length > 0 && (
                <>
                  <h4 className="text-xs font-bold text-text">Transaksi</h4>
                  {selectedTransactions.map((t) => {
                    const isIncome = t.type === 'income';
                    const isExpense = t.type === 'expense';
                    const isTransfer = t.type === 'transfer';
                    return (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-3 bg-surface-2/40 border border-border rounded-2xl gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {isTransfer ? (
                            <div className="w-9 h-9 rounded-xl bg-transfer/10 text-transfer flex items-center justify-center shrink-0 border border-transfer/20">
                              <ArrowsLeftRight size={16} weight="bold" />
                            </div>
                          ) : (
                            <CategoryIcon
                              name={t.category_icon || (isIncome ? 'wallet' : 'dots-three')}
                              color={t.category_color || (isIncome ? 'emerald' : 'gray')}
                              size={16}
                              className="w-9 h-9 shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-text truncate">
                              {isTransfer ? `${t.wallet_name} → ${t.to_wallet_name}` : t.description || t.category_name || 'Transaksi Kas'}
                            </p>
                            <p className="text-[11px] text-text-muted truncate">
                              {t.wallet_name}
                              {t.admin_fee > 0 ? ` • Adm ${formatRupiah(t.admin_fee)}` : ''}
                              {t.edited_at ? <span className="inline-flex items-center gap-0.5 ml-1"><PencilSimple size={10} weight="fill" className="text-warning" /> direvisi</span> : null}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs font-extrabold tabular-nums whitespace-nowrap ${isIncome ? 'text-income' : isExpense ? 'text-expense' : 'text-transfer'}`}>
                            {isIncome ? '+' : isExpense ? '-' : ''}{formatRupiah(t.amount)}
                          </span>
                          {onEditTransaction && (
                            <button
                              type="button"
                              onClick={() => onEditTransaction(t)}
                              className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg"
                              aria-label="Edit"
                            >
                              <PencilSimple size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              
              {/* Financial events for selected day */}
              {selectedDayEvents.length > 0 && (
                <>
                  <h4 className="text-xs font-bold text-text">Acara Keuangan</h4>
                  {selectedDayEvents.map((event) => {
                    const typeColors: Record<string, string> = {
                      bonus: 'bg-[#10b181]',
                      insurance_renewal: 'bg-[#f59e0b]',
                      tax_deadline: 'bg-[#ef4444]',
                      investment_contribution: 'bg-[#3b82f6]',
                    };
                    const typeLabels: Record<string, string> = {
                      bonus: 'Bonus',
                      insurance_renewal: 'Perpanjangan Asuransi',
                      tax_deadline: 'Batas Waktu Pajak',
                      investment_contribution: 'Kontribusi Investasi',
                    };
                    
                    return (
                      <div
                        key={event.id}
                        className="flex items-center gap-2 p-3 bg-surface-2/40 border border-border rounded-2xl cursor-pointer hover:bg-surface-2/60 transition-colors"
                        onClick={() => onEditEvent?.(event)}
                      >
                        <div className={`w-2 h-2 rounded-full ${typeColors[event.type]}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-text truncate">{event.title}</p>
                          <p className="text-[11px] text-text-muted">{typeLabels[event.type]}</p>
                        </div>
                        {event.amount != null && (
                          <span className="text-sm font-extrabold text-text tabular-nums whitespace-nowrap">
                            {formatRupiah(event.amount)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {!selectedDay && (
        <p className="text-center text-xs text-text-muted px-2">Ketuk tanggal pada kalender untuk melihat rincian transaksi hari itu.</p>
      )}
    </div>
  );
}
