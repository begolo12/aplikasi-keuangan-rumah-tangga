'use client';

import React, { useState } from 'react';
import { Transaction } from '@/lib/types';
import { formatRupiah, formatDate } from '@/lib/formatters';
import { CategoryIcon } from '../ui/CategoryIcon';
import { Trash, ArrowsLeftRight } from '@phosphor-icons/react';

interface TransactionItemProps {
  transaction: Transaction;
  onDelete: (id: string) => Promise<void>;
}

export function TransactionItem({ transaction, onDelete }: TransactionItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(transaction.id);
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const isExpense = transaction.type === 'expense';
  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';

  return (
    <div className="flex items-center justify-between p-3.5 md:p-4 bg-surface hover:bg-surface-2/60 border border-border rounded-2xl transition-all shadow-2xs group">
      <div className="flex items-center gap-3 min-w-0 pr-2">
        {/* Icon */}
        {isTransfer ? (
          <div className="w-10 h-10 rounded-xl bg-transfer/10 text-transfer flex items-center justify-center shrink-0 border border-transfer/20">
            <ArrowsLeftRight size={20} weight="bold" />
          </div>
        ) : (
          <CategoryIcon
            name={transaction.category_icon || (isIncome ? 'wallet' : 'dots-three')}
            color={transaction.category_color || (isIncome ? 'emerald' : 'gray')}
            size={20}
            className="w-10 h-10 shrink-0"
          />
        )}

        {/* Title & Metadata */}
        <div className="min-w-0">
          <p className="text-xs md:text-sm font-bold text-text truncate">
            {isTransfer
              ? `Transfer: ${transaction.wallet_name} → ${transaction.to_wallet_name}`
              : transaction.description || transaction.category_name || 'Transaksi Kas'}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-text-muted mt-0.5">
            <span>{formatDate(transaction.date, 'short')}</span>
            <span>•</span>
            <span className="truncate">{transaction.wallet_name}</span>
            {transaction.admin_fee > 0 && (
              <>
                <span>•</span>
                <span className="text-expense">Adm: {formatRupiah(transaction.admin_fee)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Amount & Delete Action */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        <span
          className={`text-sm md:text-base font-extrabold text-right ${
            isIncome ? 'text-income' : isExpense ? 'text-expense' : 'text-transfer'
          }`}
        >
          {isIncome ? '+' : isExpense ? '-' : ''}
          {formatRupiah(transaction.amount)}
        </span>

        {showConfirm ? (
          <div className="flex items-center gap-1">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-2 py-1 bg-expense text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
            >
              {isDeleting ? '...' : 'Hapus'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="px-2 py-1 bg-surface-3 text-text text-xs rounded-lg hover:bg-surface-2"
            >
              Batal
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            title="Hapus Transaksi"
            className="opacity-0 group-hover:opacity-100 p-1.5 text-text-muted hover:text-expense hover:bg-expense/10 rounded-lg transition-all"
          >
            <Trash size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
