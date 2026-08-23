import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'income';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';

    const variants = {
      primary: 'bg-primary text-primary-fg hover:bg-primary-hover shadow-sm',
      secondary: 'bg-surface-2 text-text hover:bg-surface-3',
      outline: 'border border-border bg-transparent text-text hover:bg-surface-2',
      ghost: 'bg-transparent text-text hover:bg-surface-2',
      danger: 'bg-expense text-white hover:opacity-90 shadow-sm',
      income: 'bg-income text-white hover:opacity-90 shadow-sm',
    };

    const sizes = {
      sm: 'h-9 px-3 text-xs rounded-xl min-h-[36px] gap-1.5',
      md: 'h-11 px-4 text-sm rounded-xl min-h-[44px] gap-2', // Mobile friendly min-h-44px
      lg: 'h-13 px-6 text-base rounded-2xl min-h-[52px] gap-2.5',
      icon: 'h-11 w-11 rounded-xl min-h-[44px] min-w-[44px] p-0',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
