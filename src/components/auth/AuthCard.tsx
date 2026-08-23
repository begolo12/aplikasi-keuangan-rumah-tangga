import React from 'react';
import { Wallet } from '@phosphor-icons/react';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md bg-surface border border-border rounded-3xl p-8 shadow-lg">
        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 bg-primary text-primary-fg rounded-2xl flex items-center justify-center shadow-md mb-4">
            <Wallet size={32} weight="duotone" />
          </div>
          <h1 className="text-2xl font-bold text-text">{title}</h1>
          <p className="text-sm text-text-muted mt-1">{subtitle}</p>
        </div>

        {children}
      </div>
    </div>
  );
}
