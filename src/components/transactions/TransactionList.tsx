'use client';

import React, { useState } from 'react';
import { Transaction, TransactionType } from '@/lib/types';
import { TransactionItem } from './TransactionItem';
import { EmptyState } from '../ui/EmptyState';
import { MagnifyingGlass, Plus, Receipt } from '@phosphor-icons/react';

interface TransactionListProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => Promise<void>;
  onOpenAddModal: (type?: TransactionType) => void;
  isLoading?: boolean;
}

export function TransactionList({
  transactions,
  onDeleteTransaction,
  onOpenAddModal,
  isLoading = false,
}: TransactionListProps) {
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTransactions = transactions.filter((t) => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchCat = t.category_name?.toLowerCase().includes(q);
      const matchWallet = t.wallet_name?.toLowerCase().includes(q);
      if (!matchDesc && !matchCat && !matchWallet) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-1">
        <div>
          <h3 className="text-sm md:text-base font-bold text-text">Riwayat Transaksi</h3>
          <p className="text-xs text-text-muted">
            Menampilkan {filteredTransactions.length} dari {transactions.length} total transaksi periode ini.
          </p>
        </div>

        {/* Filter Type Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-surface border border-border rounded-2xl overflow-x-auto no-scrollbar shrink-0">
          {(['all', 'expense', 'income', 'transfer'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                filterType === type
                  ? 'bg-primary text-primary-fg shadow-xs'
                  : 'text-text-muted hover:text-text hover:bg-surface-2'
              }`}
            >
              {type === 'all'
                ? 'Semua'
                : type === 'expense'
                ? 'Pengeluaran'
                : type === 'income'
                ? 'Pemasukan'
                : 'Transfer'}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <MagnifyingGlass size={18} className="absolute left-3.5 text-text-muted select-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari transaksi berdasarkan catatan, kategori, atau dompet..."
          className="w-full h-11 pl-10 pr-4 bg-surface border border-border rounded-2xl text-xs md:text-sm font-medium focus:bg-background focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-text-muted/40 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 text-xs text-text-muted hover:text-text font-bold px-2 py-1 bg-surface-2 rounded-lg"
          >
            Reset
          </button>
        )}
      </div>

      {/* Transactions List */}
      <div className="space-y-2.5">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((trx) => (
            <TransactionItem key={trx.id} transaction={trx} onDelete={onDeleteTransaction} />
          ))
        ) : (
          <EmptyState
            icon={<Receipt size={36} weight="duotone" />}
            title="Belum Ada Transaksi"
            description={
              searchQuery
                ? 'Tidak ada transaksi yang cocok dengan kata kunci pencarian Anda.'
                : 'Belum ada transaksi yang dicatat pada periode bulan ini.'
            }
            actionLabel="Catat Pengeluaran Pertama"
            onAction={() => onOpenAddModal('expense')}
          />
        )}
      </div>
    </div>
  );
}
