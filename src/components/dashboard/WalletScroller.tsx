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
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm md:text-base font-bold text-text">Pos Kas & Rekening Digital</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onTransfer}
            className="text-xs font-bold text-transfer hover:underline flex items-center gap-1"
          >
            <ArrowsLeftRight size={14} weight="bold" />
            <span>Transfer</span>
          </button>
          <span className="text-text-muted">•</span>
          <button
            onClick={onAddWallet}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <Plus size={14} weight="bold" />
            <span>Tambah</span>
          </button>
        </div>
      </div>

      {/* Responsive: Horizontal swipe snap on mobile, Grid on desktop */}
      <div className="flex md:grid md:grid-cols-4 gap-3.5 overflow-x-auto pb-2 md:pb-0 scroll-smooth snap-x snap-mandatory no-scrollbar">
        {wallets.map((wallet) => (
          <div
            key={wallet.id}
            className="snap-start shrink-0 w-[240px] md:w-auto p-4 bg-surface border border-border rounded-2xl flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs"
          >
            <div className="flex items-center justify-between mb-3">
              <CategoryIcon name={wallet.icon} color={wallet.color} size={20} className="w-10 h-10" />
              {wallet.is_default && (
                <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                  Utama
                </span>
              )}
            </div>

            <div>
              <p className="text-xs text-text-muted font-medium truncate">{wallet.name}</p>
              <p className="text-base md:text-lg font-extrabold text-text mt-0.5">
                {formatRupiah(wallet.balance)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
