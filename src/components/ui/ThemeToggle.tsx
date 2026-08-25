'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from '@phosphor-icons/react';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    // Schedule state sync to avoid cascading re-renders during hydration
    const timer = setTimeout(() => {
      const isCurrentlyDark = document.documentElement.classList.contains('dark');
      setIsDark(isCurrentlyDark);
      setMounted(true);
    }, 0);

    const handleThemeChange = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    window.addEventListener('theme-changed', handleThemeChange);
    window.addEventListener('storage', handleThemeChange);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('theme-changed', handleThemeChange);
      window.removeEventListener('storage', handleThemeChange);
    };
  }, []);

  const toggleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
    const nextIsDark = !isDark;

    const applyThemeChange = () => {
      if (nextIsDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      setIsDark(nextIsDark);
      window.dispatchEvent(new Event('theme-changed'));
    };

    // Check if View Transitions API is supported and motion is not reduced
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (
      !prefersReducedMotion &&
      typeof document !== 'undefined' &&
      'startViewTransition' in document &&
      typeof (document as unknown as { startViewTransition: unknown }).startViewTransition === 'function'
    ) {
      const x = e.clientX || window.innerWidth / 2;
      const y = e.clientY || 0;
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      document.documentElement.style.setProperty('--vt-x', `${x}px`);
      document.documentElement.style.setProperty('--vt-y', `${y}px`);
      document.documentElement.style.setProperty('--vt-radius', `${endRadius}px`);

      (document as unknown as { startViewTransition: (cb: () => void) => unknown }).startViewTransition(() => {
        applyThemeChange();
      });
    } else {
      applyThemeChange();
    }
  };

  if (!mounted) {
    return (
      <div
        className={`w-14 h-8 rounded-full bg-surface-2 border border-border animate-pulse ${className}`}
        aria-hidden="true"
      />
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
      title={isDark ? 'Mode Gelap (Klik untuk mode terang)' : 'Mode Terang (Klik untuk mode gelap)'}
      onClick={toggleTheme}
      className={`group relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full p-1 border transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-95 ${
        isDark
          ? 'bg-surface-3/80 border-border hover:bg-surface-3 shadow-inner'
          : 'bg-surface-2 border-border hover:bg-surface-2/80 shadow-inner'
      } ${className}`}
    >
      {/* Background ambient icons */}
      <span className="absolute left-1.5 flex items-center justify-center text-amber-500/60 pointer-events-none transition-opacity duration-300">
        <Sun size={13} weight="bold" />
      </span>
      <span className="absolute right-1.5 flex items-center justify-center text-blue-400/60 pointer-events-none transition-opacity duration-300">
        <Moon size={13} weight="bold" />
      </span>

      {/* Animated Sliding Knob */}
      <span
        className={`relative z-10 flex h-6 w-6 transform items-center justify-center rounded-full shadow-md transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isDark
            ? 'translate-x-6 bg-surface-2 text-indigo-400 border border-border/80'
            : 'translate-x-0 bg-white text-amber-500 border border-black/5'
        }`}
      >
        <span
          className={`absolute transition-all duration-300 transform ${
            isDark
              ? 'rotate-90 scale-0 opacity-0'
              : 'rotate-0 scale-100 opacity-100'
          }`}
        >
          <Sun size={14} weight="fill" />
        </span>
        <span
          className={`absolute transition-all duration-300 transform ${
            isDark
              ? 'rotate-0 scale-100 opacity-100'
              : '-rotate-90 scale-0 opacity-0'
          }`}
        >
          <Moon size={14} weight="fill" />
        </span>
      </span>
    </button>
  );
}
