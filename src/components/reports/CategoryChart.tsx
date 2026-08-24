'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatRupiah } from '@/lib/formatters';

interface CategoryData {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

interface CategoryChartProps {
  data: CategoryData[];
  total: number;
}

const PALETTE = ['#20986C', '#1E6BE5', '#E98B0B', '#9333EA', '#D92B2B', '#0D9488', '#E11D48', '#64748B'];

export function CategoryChart({ data, total }: CategoryChartProps) {
  if (!data || data.length === 0 || total === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-text-muted text-xs font-semibold bg-surface/50 border border-dashed border-border rounded-2xl">
        Belum ada data pengeluaran untuk ditampilkan pada grafik.
      </div>
    );
  }

  const chartData = data.map((d, idx) => ({
    name: d.name,
    value: d.amount,
    percentage: d.percentage,
    color: PALETTE[idx % PALETTE.length],
  }));

  return (
    <div className="space-y-4">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: string | number | readonly (string | number)[] | undefined) => [
                formatRupiah(typeof value === 'number' || typeof value === 'string' ? value : 0),
                'Pengeluaran',
              ]}
              contentStyle={{
                backgroundColor: 'hsl(var(--color-surface))',
                borderColor: 'hsl(var(--color-border))',
                borderRadius: '1rem',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Category breakdown list */}
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {chartData.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between text-xs p-2 rounded-xl hover:bg-surface-2 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="font-semibold text-text truncate">{item.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-bold text-text">{formatRupiah(item.value)}</span>
              <span className="text-text-muted text-[11px] font-mono">({item.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
