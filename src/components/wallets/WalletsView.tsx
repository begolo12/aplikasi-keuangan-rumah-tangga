'use client';

import React, { useState } from 'react';
import { Wallet, WalletType } from '@/lib/types';
import { formatRupiah } from '@/lib/formatters';
import { CategoryIcon, AVAILABLE_COLORS } from '../ui/CategoryIcon';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { AmountInput } from '../ui/AmountInput';
import { ReconcileModal } from './ReconcileModal';
import { useWalletForm } from './useWalletForm';
import { ApiError, apiFetch, endpoints } from '@/lib/apiFetch';
import {
  Plus,
  Trash,
  PencilSimple,
  ArrowsLeftRight,
  Wallet as WalletIcon,
  ArrowsClockwise,
  CheckCircle,
  Scales,
} from '@phosphor-icons/react';

const COLOR_NAMES: Record<string, string> = {
  emerald: 'Hijau Emerald',
  teal: 'Teal',
  blue: 'Biru',
  indigo: 'Indigo',
  purple: 'Ungu',
  orange: 'Oranye',
  amber: 'Amber Kuning',
  rose: 'Merah Muda',
  red: 'Merah',
  gray: 'Abu-abu',
};

interface WalletsViewProps {
  wallets: Wallet[];
  onRefresh: () => void;
  onOpenTransfer: () => void;
  onAddWallet?: () => void;
}

export function WalletsView({ wallets, onRefresh, onOpenTransfer, onAddWallet }: WalletsViewProps) {
  const [listError, setListError] = useState<string | null>(null);
  const [selectedReconcileWallet, setSelectedReconcileWallet] = useState<Wallet | null>(null);
  const [isReconcileOpen, setIsReconcileOpen] = useState(false);

  const {
    isAddOpen,
    editingWallet,
    name,
    setName,
    type,
    setType,
    balance,
    setBalance,
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
  } = useWalletForm({ onSuccess: onRefresh });

  const handleFirstWallet = onAddWallet ?? openAddModal;

  const handleOpenReconcile = (w: Wallet) => {
    setSelectedReconcileWallet(w);
    setIsReconcileOpen(true);
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await apiFetch(endpoints.wallet(id), { method: 'DELETE' });
      setListError(null);
      setConfirmDeleteId(null);
      onRefresh();
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : 'Gagal menghapus dompet.');
    } finally {
      setIsDeleting(false);
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

      {/* Empty State */}
      {wallets.length === 0 && (
        <div className="p-10 bg-surface border border-dashed border-border rounded-3xl flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
            <WalletIcon size={32} weight="duotone" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text">Belum Ada Pos Kas</h3>
            <p className="text-xs md:text-sm text-text-muted mt-1">
              Catat saldo awal dompet tunai, rekening bank, atau e-wallet Anda di sini.
            </p>
          </div>
          <Button variant="primary" size="md" leftIcon={<Plus size={18} weight="bold" />} onClick={handleFirstWallet}>
            Tambah Dompet Pertama
          </Button>
        </div>
      )}

      {/* Delete Error */}
      {listError && (
        <div role="alert" className="rounded-xl border border-expense/30 bg-expense/10 px-4 py-3 text-sm font-semibold text-expense">
          {listError}
        </div>
      )}
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

              {confirmDeleteId === wallet.id ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => handleDelete(wallet.id)}
                    className="min-h-[36px] px-3 py-1.5 bg-expense text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity shadow-2xs"
                  >
                    {isDeleting ? '...' : 'Hapus'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="min-h-[36px] px-3 py-1.5 bg-surface-2 hover:bg-surface-3 text-text text-xs font-semibold rounded-xl border border-border transition-colors"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(wallet)}
                    aria-label={`Ubah pos ${wallet.name}`}
                    title="Ubah Pos"
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-2 rounded-xl transition-colors"
                  >
                    <PencilSimple size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(wallet.id)}
                    aria-label={`Hapus pos ${wallet.name}`}
                    title="Hapus Pos"
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center text-text-muted hover:text-expense hover:bg-expense/10 rounded-xl transition-colors"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-border/60 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[11px] text-text-muted block">Saldo Tercatat</span>
                <span className={`text-base sm:text-lg font-extrabold ${wallet.balance < 0 ? 'text-expense' : 'text-text'}`}>
                  {formatRupiah(wallet.balance)}
                </span>
                {wallet.balance < 0 && (
                  <span className="block text-[10px] font-bold text-expense">
                    (Minus / Overdraft)
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleOpenReconcile(wallet)}
                className="px-2.5 py-1.5 bg-surface-2 hover:bg-surface-3 border border-border/70 rounded-xl text-xs font-bold text-text-muted hover:text-primary flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
                title="Cek & Samakan Saldo Rekening Riil"
              >
                <ArrowsClockwise size={14} weight="bold" className="text-primary" />
                <span>Rekonsiliasi</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Reconcile Modal */}
      <ReconcileModal
        isOpen={isReconcileOpen}
        onClose={() => setIsReconcileOpen(false)}
        wallet={selectedReconcileWallet}
        onSuccess={onRefresh}
      />

      {/* Add / Edit Wallet Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={closeModal}
        title={editingWallet ? 'Ubah Pos Dompet' : 'Tambah Pos Kas Baru'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-expense/10 border border-expense/20 rounded-2xl text-expense text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="walletName" className="block text-xs font-semibold text-text-muted">Nama Pos Dompet / Rekening</label>
            <input
              type="text"
              id="walletName"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Bank BCA, Dompet Tunai, OVO"
              className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="walletType" className="block text-xs font-semibold text-text-muted">Tipe Pos</label>
            <select
              id="walletType"
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
            <AmountInput id="walletBalance" label="Saldo Awal (Rp)" value={balance} onChange={setBalance} />
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
                  aria-label={`Warna ${COLOR_NAMES[c] ?? c}`}
                  aria-pressed={color === c}
                  className={`min-w-[44px] min-h-[44px] p-2 flex items-center justify-center rounded-full transition-transform ${
                    color === c ? 'scale-110' : ''
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-full border-2 block ${
                      color === c ? 'border-text shadow-sm' : 'border-transparent'
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
                </button>
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
