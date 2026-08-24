'use client';

import { useState, type FormEvent } from 'react';
import { Wallet, WalletType } from '@/lib/types';
import { ApiError, apiFetch, endpoints } from '@/lib/apiFetch';

interface UseWalletFormOptions {
  onSuccess: () => void;
}

export function useWalletForm({ onSuccess }: UseWalletFormOptions) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<WalletType>('bank');
  const [balance, setBalance] = useState(0);
  const [icon, setIcon] = useState('bank');
  const [color, setColor] = useState('blue');
  const [isDefault, setIsDefault] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingWallet(null);
    setName('');
    setType('bank');
    setBalance(0);
    setIcon('bank');
    setColor('blue');
    setIsDefault(false);
    setError(null);
    setIsAddOpen(true);
  };

  const openEditModal = (wallet: Wallet) => {
    setEditingWallet(wallet);
    setName(wallet.name);
    setType(wallet.type);
    setBalance(wallet.balance);
    setIcon(wallet.icon);
    setColor(wallet.color);
    setIsDefault(wallet.is_default);
    setError(null);
    setIsAddOpen(true);
  };

  const closeModal = () => setIsAddOpen(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const payload = {
      name,
      type,
      balance,
      icon,
      color,
      is_default: isDefault,
    };

    try {
      if (editingWallet) {
        await apiFetch(endpoints.wallet(editingWallet.id), { method: 'PUT', json: payload });
      } else {
        await apiFetch(endpoints.wallets, { method: 'POST', json: payload });
      }
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
    editingWallet,
    name,
    setName,
    type,
    setType,
    balance,
    setBalance,
    icon,
    setIcon,
    color,
    setColor,
    isDefault,
    setIsDefault,
    isLoading,
    error,
    openAddModal,
    openEditModal,
    closeModal,
    handleSubmit,
  };
}
