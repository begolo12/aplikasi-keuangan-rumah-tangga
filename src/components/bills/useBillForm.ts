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
  const [autoRecord, setAutoRecord] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openAddModal = (initialType: RecurringType = 'expense') => {
    setType(initialType);
    setTitle('');
    setAmount(0);
    setDueDay(5);
    setAutoRecord(false);
    setError(null);
    const matchingCategories = categories.filter((c) => c.type === initialType);
    if (matchingCategories.length > 0) {
      setCategoryId(matchingCategories[0].id);
    } else if (categories.length > 0) {
      setCategoryId(categories[0].id);
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
          category_id: categoryId || null,
          wallet_id: walletId || null,
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
