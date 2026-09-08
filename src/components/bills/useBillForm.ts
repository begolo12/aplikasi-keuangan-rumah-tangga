'use client';

import { useState, type FormEvent } from 'react';
import { Wallet, Category, RecurringType } from '@/lib/types';
import { ApiError, apiFetch, endpoints } from '@/lib/apiFetch';

interface UseBillFormOptions {
  wallets: Wallet[];
  categories: Category[];
  onSuccess: () => void;
}

export function useBillForm({ wallets, categories, onSuccess }: UseBillFormOptions) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [type, setType] = useState<RecurringType>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState(0);
  const [dueDay, setDueDay] = useState(1);
  const [categoryId, setCategoryId] = useState('');
  const [walletId, setWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [autoRecord, setAutoRecord] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openAddModal = (initialType: RecurringType = 'expense') => {
    setType(initialType);
    setTitle('');
    setAmount(0);
    setDueDay(5);
    setAutoRecord(false);
    setToWalletId('');
    setError(null);
    if (initialType === 'transfer') {
      setCategoryId('');
    } else {
      const matchingCategories = categories.filter((c) => c.type === initialType);
      if (matchingCategories.length > 0) {
        setCategoryId(matchingCategories[0].id);
      } else if (categories.length > 0) {
        setCategoryId(categories[0].id);
      }
    }
    const defaultWallet = wallets.find((w) => w.is_default) || wallets[0];
    if (defaultWallet) setWalletId(defaultWallet.id);
    setIsAddOpen(true);
  };

  const closeModal = () => setIsAddOpen(false);

  const handleAddSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError('Nominal harus lebih dari 0.');
      return;
    }
    if (type === 'transfer') {
      if (!walletId || !toWalletId) {
        setError('Transfer rutin wajib memilih dompet asal dan dompet tujuan.');
        return;
      }
      if (walletId === toWalletId) {
        setError('Dompet tujuan tidak boleh sama dengan dompet asal.');
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    try {
      await apiFetch(endpoints.bills, {
        method: 'POST',
        json: {
          type,
          title: title.trim(),
          amount,
          due_day: dueDay,
          category_id: type === 'transfer' ? null : categoryId || null,
          wallet_id: walletId || null,
          to_wallet_id: type === 'transfer' ? toWalletId || null : null,
          auto_record: autoRecord,
        },
      });
      onSuccess();
      setIsAddOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Terjadi kesalahan jaringan.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isAddOpen,
    type,
    setType,
    title,
    setTitle,
    amount,
    setAmount,
    dueDay,
    setDueDay,
    categoryId,
    setCategoryId,
    walletId,
    setWalletId,
    toWalletId,
    setToWalletId,
    autoRecord,
    setAutoRecord,
    isLoading,
    error,
    setError,
    openAddModal,
    closeModal,
    handleAddSubmit,
  };
}
