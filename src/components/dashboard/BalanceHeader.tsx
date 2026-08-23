'use client';

import React, { useState } from 'react';
import { Eye, EyeSlash, ShieldCheck, Wallet } from '@phosphor-icons/react';
import { formatRupiah } from '@/lib/formatters';

interface BalanceHeaderProps {
  totalBalance: number;
  walletCount: number;
  onManageWallets?: () => void;
}

export function BalanceHeader({ totalBalance, walletCount, onManageWallets }: BalanceHeaderProps) {
  const [showBalance, setShowBalance] = useState(true);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-[#1A7B57] to-[#125A3F] p-6 md:p-8 text-white shadow-lg shadow-primary/15 transition-all">
      {/* Decorative background glow */}
      <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-white/80 text-xs font-semibold tracking-wide uppercase">
            <ShieldCheck size={16} weight="fill" className="text-emerald-200" />
            <span>Total Saldo Kas Rumah Tangga</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
              {showBalance ? formatRupiah(totalBalance) : '••••••••••••'}
            </h1>
            <button
              type="button"
              onClick={() => setShowBalance(!showBalance)}
              className="p-1.5 bg-white/15 hover:bg-white/25 rounded-xl transition-colors text-white active:scale-95"
              aria-label={showBalance ? 'Sembunyikan Saldo' : 'Tampilkan Saldo'}
            >
              {showBalance ? <EyeSlash size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <p className="text-xs text-white/80">
            Terbagi dalam <span className="font-bold text-white">{walletCount} Pos Kas & Rekening</span> aktif.
          </p>
        </div>

        {onManageWallets && (
          <button
            onClick={onManageWallets}
            className="self-start md:self-center px-4 py-2.5 bg-white/15 hover:bg-white/25 border border-white/20 rounded-2xl text-xs font-bold text-white flex items-center gap-2 backdrop-blur-sm active:scale-95 transition-all"
          >
            <Wallet size={18} weight="duotone" />
            <span>Kelola Pos Kas</span>
          </button>
        )}
      </div>
    </div>
  );
}
