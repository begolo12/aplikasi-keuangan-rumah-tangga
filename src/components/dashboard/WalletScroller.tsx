'use client';

import React from 'react';
import { Wallet as WalletType } from '@/lib/types';
import { formatRupiah } from '@/lib/formatters';
import { CategoryIcon } from '../ui/CategoryIcon';
import { Plus, ArrowsLeftRight } from '@phosphor-icons/react';

interface WalletScrollerProps {
  wallets: WalletType[];
  onAddWallet: () => void;
  onTransfer: () => void;
}

export function WalletScroller({ wallets, onAddWallet, onTransfer }: WalletScrollerProps) {
  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-center justify-between px-0.5">
        <h3 className="text-xs sm:text-sm md:text-base font-bold text-text">Pos Kas & Rekening</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onTransfer}
            className="text-[11px] sm:text-xs font-bold text-transfer hover:underline flex items-center gap-1"
          >
            <ArrowsLeftRight size={13} weight="bold" />
            <span>Transfer</span>
          </button>
          <span className="text-text-muted text-xs">•</span>
          <button
            onClick={onAddWallet}
            className="text-[11px] sm:text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <Plus size={13} weight="bold" />
            <span>Tambah</span>
          </button>
        </div>
      </div>

      {/* Responsive: Horizontal swipe snap on mobile, Grid on desktop */}
      <div className="flex md:grid md:grid-cols-4 gap-2.5 sm:gap-3.5 overflow-x-auto pb-1.5 md:pb-0 scroll-smooth snap-x snap-mandatory no-scrollbar">
        {wallets.map((wallet) => (
          <div
            key={wallet.id}
            className="snap-start shrink-0 w-[190px] md:w-auto p-3 sm:p-3.5 bg-surface border border-border rounded-xl sm:rounded-2xl flex flex-col justify-between hover:border-primary/40 transition-all shadow-2xs"
          >
            <div className="flex items-center justify-between mb-2">
              <CategoryIcon name={wallet.icon} color={wallet.color} size={17} className="w-8 h-8" />
              {wallet.is_default && (
                <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full border border-primary/20">
                  Utama
                </span>
              )}
            </div>

            <div>
              <p className="text-[11px] text-text-muted font-medium truncate">{wallet.name}</p>
              <p className={`text-sm sm:text-base font-extrabold mt-0.5 whitespace-nowrap tabular-nums ${wallet.balance < 0 ? 'text-expense' : 'text-text'}`}>
                {formatRupiah(wallet.balance)}
              </p>
              <div className="flex items-center justify-between gap-1 text-[9px] text-text-muted mt-1 pt-1 border-t border-border/40">
                <span className="truncate">
                  {wallet.reconciled_at
                    ? `Rekom: ${new Date(wallet.reconciled_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`
                    : 'Belum direkom'}
                </span>
                {wallet.balance < 0 && (
                  <span className="font-bold text-expense shrink-0">Minus</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
