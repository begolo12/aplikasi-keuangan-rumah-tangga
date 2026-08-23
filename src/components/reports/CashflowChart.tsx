'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCompactRupiah, formatRupiah } from '@/lib/formatters';

interface DailyTrend {
  day: number;
  income: number;
  expense: number;
}

interface CashflowChartProps {
  data: DailyTrend[];
}

export function CashflowChart({ data }: CashflowChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-text-muted text-xs font-semibold bg-surface/50 border border-dashed border-border rounded-2xl">
        Belum ada tren transaksi harian pada periode ini.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: `Tgl ${d.day}`,
    Pemasukan: d.income,
    Pengeluaran: d.expense,
  }));

  return (
    <div className="h-72 w-full pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--color-text-muted))' }} />
          <YAxis
            tick={{ fontSize: 10, fill: 'hsl(var(--color-text-muted))' }}
            tickFormatter={(v) => formatCompactRupiah(v)}
          />
          <Tooltip
            formatter={(value: any, name: any) => [formatRupiah(value), name]}
            contentStyle={{
              backgroundColor: 'hsl(var(--color-surface))',
              borderColor: 'hsl(var(--color-border))',
              borderRadius: '1rem',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
          <Bar dataKey="Pemasukan" fill="#20986C" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Pengeluaran" fill="#D92B2B" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
