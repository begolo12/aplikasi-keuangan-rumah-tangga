'use client';

import React, { useState, useEffect } from 'react';
import { MonthlySummary as MonthlySummaryType } from '@/lib/types';
import { CategoryChart } from './CategoryChart';
import { CashflowChart } from './CashflowChart';
import { Button } from '../ui/Button';
import { formatRupiah, INDONESIAN_MONTHS } from '@/lib/formatters';
import { FileCsv, ChartPieSlice, ChartBar } from '@phosphor-icons/react';

interface ReportsViewProps {
  summary: MonthlySummaryType;
  currentMonth: number;
  currentYear: number;
}

export function ReportsView({ summary, currentMonth, currentYear }: ReportsViewProps) {
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [categoryTotal, setCategoryTotal] = useState(0);
  const [dailyTrends, setDailyTrends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      try {
        const [catRes, monthRes] = await Promise.all([
          fetch(`/api/reports/category?month=${currentMonth}&year=${currentYear}&type=expense`),
          fetch(`/api/reports/monthly?month=${currentMonth}&year=${currentYear}`),
        ]);

        const catJson = await catRes.json();
        const monthJson = await monthRes.json();

        if (catJson.success) {
          setCategoryData(catJson.data.categories || []);
          setCategoryTotal(catJson.data.total || 0);
        }

        if (monthJson.success) {
          setDailyTrends(monthJson.data.daily_trends || []);
        }
      } catch (err) {
        console.error('Fetch reports error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [currentMonth, currentYear]);

  const handleExportCsv = () => {
    window.open(`/api/reports/export-csv?month=${currentMonth}&year=${currentYear}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-text">Laporan Keuangan & Analitik</h2>
          <p className="text-xs md:text-sm text-text-muted">
            Periode {INDONESIAN_MONTHS[currentMonth - 1]} {currentYear}
          </p>
        </div>

        <Button
          variant="outline"
          size="md"
          leftIcon={<FileCsv size={18} weight="bold" className="text-primary" />}
          onClick={handleExportCsv}
        >
          Ekspor CSV (Siap Excel)
        </Button>
      </div>

      {/* 2-Column Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Komposisi Pengeluaran Kategori */}
        <div className="p-5 md:p-6 bg-surface border border-border rounded-3xl space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 text-primary rounded-xl">
                <ChartPieSlice size={20} weight="duotone" />
              </div>
              <h3 className="text-sm md:text-base font-bold text-text">Komposisi Pengeluaran</h3>
            </div>
            <span className="text-xs font-bold text-expense">{formatRupiah(categoryTotal)}</span>
          </div>

          <CategoryChart data={categoryData} total={categoryTotal} />
        </div>

        {/* Card 2: Tren Arus Kas Harian */}
        <div className="p-5 md:p-6 bg-surface border border-border rounded-3xl space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <ChartBar size={20} weight="duotone" />
            </div>
            <h3 className="text-sm md:text-base font-bold text-text">Tren Arus Kas Harian</h3>
          </div>

          <CashflowChart data={dailyTrends} />
        </div>
      </div>
    </div>
  );
}
