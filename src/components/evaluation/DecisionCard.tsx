'use client';

import React from 'react';
import { MonthlyDecision } from '@/lib/decisionSummary';
import { INDONESIAN_MONTHS } from '@/lib/formatters';
import { TrendUp, TrendDown, Equals, Compass, Warning, CheckCircle, Info } from '@phosphor-icons/react';

interface DecisionCardProps {
  month: number;
  year: number;
  decision: MonthlyDecision;
}

export function DecisionCard({ month, year, decision }: DecisionCardProps) {
  const tone = decision.statusTone;

  const flowIcon =
    tone === 'surplus' ? (
      <TrendUp size={15} weight="bold" className="text-income shrink-0" />
    ) : tone === 'defisit' ? (
      <TrendDown size={15} weight="bold" className="text-expense shrink-0" />
    ) : (
      <Equals size={15} weight="bold" className="text-text-muted shrink-0" />
    );

  const rows = [
    { icon: flowIcon, text: decision.cashLine },
    {
      icon: decision.budgetLine.includes('lewat batas') ? (
        <Warning size={15} weight="fill" className="text-warning shrink-0" />
      ) : (
        <CheckCircle size={15} weight="fill" className="text-primary shrink-0" />
      ),
      text: decision.budgetLine,
    },
    {
      icon: decision.fundLine.startsWith('Uang dingin tersedia') ? (
        <CheckCircle size={15} weight="fill" className="text-primary shrink-0" />
      ) : (
        <Info size={15} weight="duotone" className="text-text-muted shrink-0" />
      ),
      text: decision.fundLine,
    },
  ];

  return (
    <div className="p-4 sm:p-5 bg-surface border border-border rounded-3xl space-y-3 shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-text flex items-center gap-2">
          <Compass size={18} className="text-primary" weight="duotone" />
          <span>Putusan Bulan Ini</span>
        </h3>
        <span className="text-[10px] font-bold text-text-muted bg-surface-2 px-2 py-1 rounded-lg">
          {INDONESIAN_MONTHS[month - 1]} {year}
        </span>
      </div>

      <div className="space-y-1.5">
        {rows.map((row, idx) => (
          <div key={idx} className="flex items-start gap-2 text-xs text-text leading-snug">
            {row.icon}
            <span className="min-w-0">{row.text}</span>
          </div>
        ))}
      </div>

      {decision.actionHint && (
        <p className="pt-2 border-t border-border/50 text-[11px] font-semibold text-primary">
          {decision.actionHint}
        </p>
      )}
    </div>
  );
}
