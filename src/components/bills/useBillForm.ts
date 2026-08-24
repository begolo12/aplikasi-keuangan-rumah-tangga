'use client';

import { useState, type FormEvent } from 'react';
import { Wallet, Category } from '@/lib/types';
import { ApiError, apiFetch, endpoints } from '@/lib/apiFetch';

interface UseBillFormOptions {
  wallets: Wallet[];
  categories: Category[];
  onSuccess: () => void;
}

export function useBillForm({ wallets, categories, onSuccess }: UseBillFormOptions) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState(0);
  const [dueDay, setDueDay] = useState(1);
  const [categoryId, setCategoryId] = useState('');
  const [walletId, setWalletId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openAddModal = () => {
    setTitle('');
    setAmount(0);
    setDueDay(5);
    setError(null);
    if (categories.length > 0) setCategoryId(categories[0].id);
    if (wallets.length > 0) setWalletId(wallets[0].id);
    setIsAddOpen(true);
  };

  const closeModal = () => setIsAddOpen(false);

  const handleAddSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError('Nominal tagihan harus lebih dari 0.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await apiFetch(endpoints.bills, {
        method: 'POST',
        json: {
          title,
          amount,
          due_day: dueDay,
          category_id: categoryId || null,
          wallet_id: walletId || null,
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
    isLoading,
    error,
    setError,
    openAddModal,
    closeModal,
    handleAddSubmit,
  };
}
