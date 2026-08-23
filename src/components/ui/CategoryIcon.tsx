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

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400' },
  teal: { bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-600 dark:text-teal-400' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-600 dark:text-blue-400' },
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-600 dark:text-indigo-400' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-600 dark:text-purple-400' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-600 dark:text-orange-400' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-600 dark:text-rose-400' },
  red: { bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-600 dark:text-red-400' },
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
