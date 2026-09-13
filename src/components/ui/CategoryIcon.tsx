import React from 'react';
import {
  ForkKnife,
  ShoppingCart,
  Lightning,
  WifiHigh,
  GasPump,
  GraduationCap,
  FirstAidKit,
  FilmStrip,
  CreditCard,
  DotsThree,
  Briefcase,
  Gift,
  Storefront,
  TrendUp,
  Wallet,
  Bank,
  DeviceMobile,
  Vault,
  Money,
  ArrowsLeftRight,
  Receipt,
  PiggyBank,
  House,
  Heart,
  Airplane,
  Car,
} from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const ICON_MAP: Record<string, React.ElementType> = {
  'fork-knife': ForkKnife,
  'shopping-cart': ShoppingCart,
  'lightning': Lightning,
  'wifi-high': WifiHigh,
  'gas-pump': GasPump,
  'graduation-cap': GraduationCap,
  'first-aid-kit': FirstAidKit,
  'film-strip': FilmStrip,
  'credit-card': CreditCard,
  'dots-three': DotsThree,
  'briefcase': Briefcase,
  'gift': Gift,
  'storefront': Storefront,
  'trend-up': TrendUp,
  'wallet': Wallet,
  'bank': Bank,
  'device-mobile': DeviceMobile,
  'vault': Vault,
  'money': Money,
  'arrows-left-right': ArrowsLeftRight,
  'receipt': Receipt,
  'piggy-bank': PiggyBank,
  'house': House,
  'heart': Heart,
  'airplane': Airplane,
  'car': Car,
};

/* Warna kategori dipetakan ke palet DESIGN.md ("Klasik Rumah"): maksimal 3 core
   (emerald/primary, terracotta/expense, hijau lumut/income) + transfer & warning sebagai
   semantik. Key lama dipertahankan agar data kategori yang sudah tersimpan di database
   tetap resolve tanpa migrasi. */
const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  emerald: { bg: 'bg-primary-subtle', text: 'text-primary' },
  teal: { bg: 'bg-primary-subtle', text: 'text-primary' },
  blue: { bg: 'bg-transfer-subtle', text: 'text-transfer' },
  indigo: { bg: 'bg-transfer-subtle', text: 'text-transfer' },
  purple: { bg: 'bg-transfer-subtle', text: 'text-transfer' },
  orange: { bg: 'bg-expense-subtle', text: 'text-expense' },
  amber: { bg: 'bg-warning-subtle', text: 'text-warning' },
  rose: { bg: 'bg-expense-subtle', text: 'text-expense' },
  red: { bg: 'bg-expense-subtle', text: 'text-expense' },
  green: { bg: 'bg-income-subtle', text: 'text-income' },
  gray: { bg: 'bg-surface-2', text: 'text-text-muted' },
};

interface CategoryIconProps {
  name?: string | null;
  color?: string | null;
  size?: number;
  className?: string;
  weight?: 'regular' | 'bold' | 'fill' | 'duotone';
}

export function CategoryIcon({
  name = 'dots-three',
  color = 'gray',
  size = 20,
  className,
  weight = 'duotone',
}: CategoryIconProps) {
  const IconComponent = (name && ICON_MAP[name]) || DotsThree;
  const colorScheme = (color && COLOR_MAP[color]) || COLOR_MAP.gray;

  return (
    <div
      className={twMerge(
        clsx(
          'flex items-center justify-center rounded-xl shrink-0 transition-colors',
          colorScheme.bg,
          colorScheme.text,
          className || 'w-10 h-10'
        )
      )}
    >
      <IconComponent size={size} weight={weight} />
    </div>
  );
}

export const AVAILABLE_ICONS = Object.keys(ICON_MAP);
export const AVAILABLE_COLORS = Object.keys(COLOR_MAP);
