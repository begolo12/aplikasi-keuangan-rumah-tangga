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
    color: '#10b181', // emerald-500 (income color)
    textColor: '#ffffff',
    icon: TrendUp,
    category: 'income'
  },
  {
    slug: 'insurance_renewal',
    label: 'Perpanjangan Polis Asuransi',
    description: 'Tanggal jatuh tempo perpanjangan asuransi',
    color: '#f59e0b', // amber-500 (warning color)
    textColor: '#ffffff',
    icon: FileText,
    category: 'warning'
  },
  {
    slug: 'tax_deadline',
    label: 'Batas Waktu Pembayaran Pajak',
    description: 'Jatuh tempo pembayaran pajak tahunan/bulanan',
    color: '#ef4444', // red-500 (expense color)
    textColor: '#ffffff',
    icon: WarningCircle,
    category: 'expense'
  },
  {
    slug: 'investment_contribution',
    label: 'Kontribusi Investasi',
    description: 'Kontribusi investasi rutin bulanan/tahunan',
    color: '#3b82f6', // blue-500 (primary color)
    textColor: '#ffffff',
    icon: ChartPieSlice,
    category: 'primary'
  }
];

export const EVENT_TYPE_COLORS: Record<FinancialEventType, string> = {
  bonus: '#10b181',
  insurance_renewal: '#f59e0b',
  tax_deadline: '#ef4444',
  investment_contribution: '#3b82f6'
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
