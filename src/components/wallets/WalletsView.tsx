'use client';

import React, { useState } from 'react';
import { Wallet, WalletType } from '@/lib/types';
import { formatRupiah } from '@/lib/formatters';
import { CategoryIcon, AVAILABLE_ICONS, AVAILABLE_COLORS } from '../ui/CategoryIcon';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { AmountInput } from '../ui/AmountInput';
import { Plus, Trash, PencilSimple, ArrowsLeftRight, CheckCircle } from '@phosphor-icons/react';

interface WalletsViewProps {
  wallets: Wallet[];
  onRefresh: () => void;
  onOpenTransfer: () => void;
}

export function WalletsView({ wallets, onRefresh, onOpenTransfer }: WalletsViewProps) {
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

  const handleSubmit = async (e: React.FormEvent) => {
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
        const res = await fetch(`/api/wallets/${editingWallet.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Gagal mengubah dompet');
      } else {
        const res = await fetch('/api/wallets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Gagal membuat dompet');
      }

      onRefresh();
      setIsAddOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pos dompet ini?')) return;
    try {
      const res = await fetch(`/api/wallets/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Gagal menghapus dompet.');
        return;
      }
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const totalBalance = wallets.reduce((acc, w) => acc + (w.balance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-text">Pos Kas & Rekening Digital</h2>
          <p className="text-xs md:text-sm text-text-muted">
            Kelola uang tunai di dompet, rekening bank, tabungan, dan saldo e-wallet.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            leftIcon={<ArrowsLeftRight size={18} weight="bold" className="text-transfer" />}
            onClick={onOpenTransfer}
          >
            Transfer Kas
          </Button>

          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus size={18} weight="bold" />}
            onClick={openAddModal}
          >
            Tambah Pos Kas
          </Button>
        </div>
      </div>

      {/* Total Balance Card */}
      <div className="p-5 bg-surface border border-border rounded-3xl flex items-center justify-between shadow-xs">
        <div>
          <p className="text-xs font-semibold text-text-muted">Total Saldo di Semua Pos</p>
          <p className="text-xl md:text-3xl font-extrabold text-primary mt-1">
            {formatRupiah(totalBalance)}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-text-muted">{wallets.length} Pos Aktif</span>
        </div>
      </div>

      {/* Wallets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {wallets.map((wallet) => (
          <div
            key={wallet.id}
            className="p-5 bg-surface border border-border rounded-3xl flex flex-col justify-between space-y-4 shadow-xs hover:border-primary/40 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <CategoryIcon name={wallet.icon} color={wallet.color} size={22} className="w-12 h-12" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-text">{wallet.name}</h4>
                    {wallet.is_default && (
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                        Utama
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">
                    {wallet.type}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(wallet)}
                  title="Ubah Pos"
                  className="p-1.5 text-text-muted hover:text-text hover:bg-surface-2 rounded-lg transition-colors"
                >
                  <PencilSimple size={16} />
                </button>
                <button
                  onClick={() => handleDelete(wallet.id)}
                  title="Hapus Pos"
                  className="p-1.5 text-text-muted hover:text-expense hover:bg-expense/10 rounded-lg transition-colors"
                >
                  <Trash size={16} />
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-border/60 flex items-center justify-between">
              <span className="text-xs text-text-muted">Saldo Saat Ini</span>
              <span className="text-lg font-extrabold text-text">{formatRupiah(wallet.balance)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Wallet Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={editingWallet ? 'Ubah Pos Dompet' : 'Tambah Pos Kas Baru'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-expense/10 border border-expense/20 rounded-2xl text-expense text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-text-muted">Nama Pos Dompet / Rekening</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Bank BCA, Dompet Tunai, OVO"
              className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-text-muted">Tipe Pos</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as WalletType)}
              className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="cash">Uang Tunai (Cash)</option>
              <option value="bank">Rekening Bank</option>
              <option value="ewallet">E-Wallet (GoPay, OVO, Dana)</option>
              <option value="savings">Tabungan / Dana Darurat</option>
            </select>
          </div>

          {!editingWallet && (
            <AmountInput label="Saldo Awal (Rp)" value={balance} onChange={setBalance} />
          )}

          {/* Color & Icon Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-text-muted">Pilih Warna</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    color === c ? 'scale-110 border-text shadow-sm' : 'border-transparent'
                  }`}
                  style={{
                    backgroundColor:
                      c === 'emerald'
                        ? '#20986C'
                        : c === 'blue'
                        ? '#1E6BE5'
                        : c === 'teal'
                        ? '#0D9488'
                        : c === 'amber'
                        ? '#E98B0B'
                        : c === 'purple'
                        ? '#9333EA'
                        : c === 'rose'
                        ? '#E11D48'
                        : '#64748B',
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <label htmlFor="isDefault" className="text-xs font-medium text-text cursor-pointer">
              Jadikan sebagai pos dompet utama (default)
            </label>
          </div>

          <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full mt-4 font-bold">
            {editingWallet ? 'Simpan Perubahan' : 'Tambah Pos Kas'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
