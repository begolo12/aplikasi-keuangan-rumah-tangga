import React from 'react';
import { 
  TrendUp, 
  FileText, 
  WarningCircle, 
  ChartPieSlice 
} from '@phosphor-icons/react';

export type FinancialEventType = 'bonus' | 'insurance_renewal' | 'tax_deadline' | 'investment_contribution';

export interface EventTypeConfig {
  slug: FinancialEventType;
  label: string;
  description: string;
  color: string;
  textColor: string;
  icon: React.ElementType;
  category: 'income' | 'warning' | 'expense' | 'primary';
}

const eventTypes: EventTypeConfig[] = [
  {
    slug: 'bonus',
    label: 'Pemasukan Tambahan',
    description: 'Bonus, tunjangan, atau pemasukan ekstra lainnya',
    color: 'hsl(var(--color-income))',
    textColor: '#ffffff',
    icon: TrendUp,
    category: 'income'
  },
  {
    slug: 'insurance_renewal',
    label: 'Perpanjangan Polis Asuransi',
    description: 'Tanggal jatuh tempo perpanjangan asuransi',
    color: 'hsl(var(--color-warning))',
    textColor: '#ffffff',
    icon: FileText,
    category: 'warning'
  },
  {
    slug: 'tax_deadline',
    label: 'Batas Waktu Pembayaran Pajak',
    description: 'Jatuh tempo pembayaran pajak tahunan/bulanan',
    color: 'hsl(var(--color-expense))',
    textColor: '#ffffff',
    icon: WarningCircle,
    category: 'expense'
  },
  {
    slug: 'investment_contribution',
    label: 'Kontribusi Investasi',
    description: 'Kontribusi investasi rutin bulanan/tahunan',
    color: 'hsl(var(--color-transfer))',
    textColor: '#ffffff',
    icon: ChartPieSlice,
    category: 'primary'
  }
];

export const EVENT_TYPE_COLORS: Record<FinancialEventType, string> = {
  bonus: 'hsl(var(--color-income))',
  insurance_renewal: 'hsl(var(--color-warning))',
  tax_deadline: 'hsl(var(--color-expense))',
  investment_contribution: 'hsl(var(--color-transfer))'
};

export const EVENT_TYPE_ICONS: Record<FinancialEventType, React.ElementType> = {
  bonus: TrendUp,
  insurance_renewal: FileText,
  tax_deadline: WarningCircle,
  investment_contribution: ChartPieSlice
};

export const FINANCIAL_EVENT_TYPES: EventTypeConfig[] = eventTypes;

export function isFinancialEventType(value: string): value is FinancialEventType {
  return ['bonus', 'insurance_renewal', 'tax_deadline', 'investment_contribution'].includes(value);
}

export function getEventTypeConfig(slug: FinancialEventType): EventTypeConfig {
  const config = eventTypes.find(type => type.slug === slug);
  if (!config) {
    throw new Error(`Unknown event type: ${slug}`);
  }
  return config;
}

export function getEventTypeLabel(slug: FinancialEventType): string {
  return getEventTypeConfig(slug).label;
}

export function getEventTypeColor(slug: FinancialEventType): string {
  return EVENT_TYPE_COLORS[slug];
}

export function getEventTypeIcon(slug: FinancialEventType): React.ElementType {
  return EVENT_TYPE_ICONS[slug];
}

export function getEventTypeCategory(slug: FinancialEventType): 'income' | 'warning' | 'expense' | 'primary' {
  return getEventTypeConfig(slug).category;
}
