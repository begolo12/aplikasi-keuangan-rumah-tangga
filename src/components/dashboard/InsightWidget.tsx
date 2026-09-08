'use client';

import React, { useState, useEffect, useRef } from 'react';
import { apiFetch, endpoints } from '@/lib/apiFetch';
import { InsightsData, InsightItem } from '@/lib/types';
import {
  Lightbulb,
  TrendUp,
  Warning,
  HandCoins,
  SpinnerGap,
  Heartbeat,
} from '@phosphor-icons/react';

const TYPE_META: Record<InsightItem['type'], { icon: React.ElementType; className: string }> = {
  spike: { icon: TrendUp, className: 'bg-expense/10 text-expense border-expense/20' },
  overdraft: { icon: Warning, className: 'bg-expense/10 text-expense border-expense/20' },
  bill_tip: { icon: HandCoins, className: 'bg-primary/10 text-primary border-primary/20' },
};

const CONDITION_LABEL: Record<InsightsData['health']['condition'], string> = {
  excellent: 'Sangat Sehat',
  good: 'Sehat',
  warning: 'Perlu Perhatian',
  critical: 'Kritis',
};

const CONDITION_COLOR: Record<InsightsData['health']['condition'], string> = {
  excellent: 'text-income',
  good: 'text-income',
  warning: 'text-warning',
  critical: 'text-expense',
};

export function InsightWidget() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    apiFetch<InsightsData>(endpoints.insights, { signal: controller.signal })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setIsLoading(false));
    return () => {
      controller.abort();
      abortRef.current = null;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 bg-surface border border-border rounded-2xl sm:rounded-3xl flex items-center justify-center gap-2">
        <SpinnerGap size={16} className="text-primary animate-spin" />
        <span className="text-xs font-semibold text-text-muted">Menyiapkan insight...</span>
      </div>
    );
  }

  // Tanpa data atau tanpa insight sama sekali: widget tidak ditampilkan.
  if (!data || data.insights.length === 0) return null;

  return (
    <div className="p-3.5 sm:p-4 md:p-5 bg-surface border border-border rounded-2xl sm:rounded-3xl space-y-3 shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="p-1.5 bg-primary/10 text-primary rounded-lg shrink-0">
            <Lightbulb size={16} weight="duotone" />
          </div>
          <h3 className="text-xs sm:text-sm font-bold text-text truncate">Insight Hari Ini</h3>
        </div>
        <div
          className={`flex items-center gap-1.5 shrink-0 ${CONDITION_COLOR[data.health.condition]}`}
          title="Skor kesehatan keuangan bulan ini"
        >
          <Heartbeat size={14} weight="bold" />
          <span className="text-xs font-extrabold tabular-nums">
            {data.health.score} · {CONDITION_LABEL[data.health.condition]}
          </span>
        </div>
      </div>

      <ul className="space-y-2">
        {data.insights.map((item, i) => {
          const meta = TYPE_META[item.type];
          const Icon = meta.icon;
          return (
            <li key={i} className="flex items-start gap-2.5 p-2.5 bg-surface-2/60 border border-border/40 rounded-xl">
              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${meta.className}`}>
                <Icon size={14} weight="bold" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-text">{item.title}</p>
                <p className="text-[11px] text-text-muted leading-relaxed">{item.description}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
