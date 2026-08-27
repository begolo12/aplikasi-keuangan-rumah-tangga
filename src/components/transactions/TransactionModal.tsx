'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { AmountInput } from '../ui/AmountInput';
import { Button } from '../ui/Button';
import { Wallet, Category, Transaction, TransactionType, AssetCategory } from '@/lib/types';
import { enqueueOfflineMutation } from '@/lib/offlineQueue';
import { formatRupiah } from '@/lib/formatters';
import { WifiSlash, PencilSimple, Plus, Package } from '@phosphor-icons/react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: TransactionType;
  editingTransaction?: Transaction | null;
  wallets: Wallet[];
  categories: Category[];
  userId: string;
  onSuccess: () => void;
}

interface TransactionFormProps {
  initialType: TransactionType;
  editingTransaction?: Transaction | null;
  wallets: Wallet[];
  categories: Category[];
  userId: string;
  onSuccess: () => void;
  onClose: () => void;
}

function TransactionForm({
  initialType,
  editingTransaction,
  wallets,
  categories,
  userId,
  onSuccess,
  onClose,
}: TransactionFormProps) {
  const isEditing = Boolean(editingTransaction);

  const defaultW = wallets.find((w) => w.is_default) || wallets[0];
  const defaultWalletId = editingTransaction?.wallet_id || defaultW?.id || '';
  const defaultToWallet = wallets.find((w) => w.id !== defaultWalletId);
  const defaultCat = categories.find(
    (c) => c.type === ((editingTransaction?.type || initialType) === 'income' ? 'income' : 'expense')
  );

  const [type, setType] = useState<TransactionType>(editingTransaction?.type || initialType);
  const [amount, setAmount] = useState(editingTransaction?.amount || 0);
  const [adminFee, setAdminFee] = useState(editingTransaction?.admin_fee || 0);
  const [walletId, setWalletId] = useState(defaultWalletId);
  const [toWalletId, setToWalletId] = useState(editingTransaction?.to_wallet_id || defaultToWallet?.id || '');
  const [categoryId, setCategoryId] = useState(
    editingTransaction?.category_id || defaultCat?.id || ''
  );
  const [description, setDescription] = useState(editingTransaction?.description || '');
  const [createAsset, setCreateAsset] = useState(false);
  const [assetName, setAssetName] = useState('');
  const [assetCategory, setAssetCategory] = useState<AssetCategory>('kendaraan');
  const [date, setDate] = useState(
    () => editingTransaction?.date || new Date().toISOString().split('T')[0]
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offlineNotice, setOfflineNotice] = useState(false);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'transfer') {
      const other = wallets.find((w) => w.id !== walletId);
      if (other) setToWalletId(other.id);
    } else {
      const matchingCat = categories.find((c) => c.type === (newType === 'income' ? 'income' : 'expense'));
      setCategoryId(matchingCat?.id || '');
    }
  };

  const handleWalletChange = (newWalletId: string) => {
    setWalletId(newWalletId);
    if (type === 'transfer' && toWalletId === newWalletId) {
      const other = wallets.find((w) => w.id !== newWalletId);
      if (other) setToWalletId(other.id);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === (type === 'income' ? 'income' : 'expense'));
  const selectedSourceWallet = wallets.find((w) => w.id === walletId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (amount <= 0) {
      setError('Nominal transaksi harus lebih dari 0.');
      return;
    }

    if (!walletId) {
      setError('Silakan pilih dompet asal.');
      return;
    }

    if (type === 'transfer' && (!toWalletId || toWalletId === walletId)) {
      setError('Pilih dompet tujuan yang berbeda dari dompet asal.');
      return;
    }

    const payload = {
      type,
      amount,
      admin_fee: adminFee,
      category_id: type === 'transfer' ? null : categoryId || null,
      wallet_id: walletId,
      to_wallet_id: type === 'transfer' ? toWalletId : null,
      create_asset: type === 'expense' && createAsset,
      asset_name: type === 'expense' && createAsset ? (assetName.trim() || description.trim() || 'Aset Baru') : null,
      asset_category: type === 'expense' && createAsset ? assetCategory : null,
      description: description.trim() || null,
      date,
    };

    setIsLoading(true);

    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await enqueueOfflineMutation({
          userId,
          endpoint: isEditing && editingTransaction ? `/api/transactions/${editingTransaction.id}` : '/api/transactions',
          method: isEditing ? 'PUT' : 'POST',
          payload,
        });

        setOfflineNotice(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
        return;
      }

      const endpoint = isEditing && editingTransaction ? `/api/transactions/${editingTransaction.id}` : '/api/transactions';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan transaksi.');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  const SUGGESTED_NOTES =
    type === 'expense'
      ? ['Belanja Pasar', 'Makan Siang', 'Bensin Motor', 'Listrik Token', 'Galon Air', 'Jajan Anak']
      : type === 'income'
      ? ['Gaji Bulanan', 'Bonus Proyek', 'Usaha Sampingan', 'Transfer Keluarga']
      : ['Tarik Tunai ATM', 'Top Up GoPay', 'Pindah Dana Tabungan'];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {offlineNotice && (
        <div role="status" className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
          <WifiSlash size={18} className="shrink-0" />
          <span>Offline: Transaksi disimpan di perangkat & akan disinkronkan saat terhubung kembali.</span>
        </div>
      )}

      {error && (
        <div role="alert" className="p-3.5 bg-expense/10 border border-expense/20 rounded-2xl text-expense text-xs font-semibold">
          {error}
        </div>
      )}

      {/* 1. Transaction Type Segmented Control */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-surface-2 rounded-2xl">
        <button
          type="button"
          onClick={() => handleTypeChange('expense')}
          className={`py-2 text-xs font-bold rounded-xl transition-all ${
            type === 'expense' ? 'bg-expense text-white shadow-xs' : 'text-text-muted hover:text-text'
          }`}
        >
          Pengeluaran
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('income')}
          className={`py-2 text-xs font-bold rounded-xl transition-all ${
            type === 'income' ? 'bg-income text-white shadow-xs' : 'text-text-muted hover:text-text'
          }`}
        >
          Pemasukan
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('transfer')}
          className={`py-2 text-xs font-bold rounded-xl transition-all ${
            type === 'transfer' ? 'bg-transfer text-white shadow-xs' : 'text-text-muted hover:text-text'
          }`}
        >
          Transfer
        </button>
      </div>

      {/* 2. Context Section: Category & Wallet Selection first */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {type !== 'transfer' && (
          <div className="space-y-1">
            <label htmlFor="tx-category" className="block text-xs font-semibold text-text-muted">
              Kategori Transaksi
            </label>
            <select
              id="tx-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            >
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="tx-source-wallet" className="block text-xs font-semibold text-text-muted">
            {type === 'transfer' ? 'Dari Dompet (Asal)' : 'Pos Dompet / Rekening'}
          </label>
          <select
            id="tx-source-wallet"
            value={walletId}
            onChange={(e) => handleWalletChange(e.target.value)}
            required
            className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
          >
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({formatRupiah(w.balance)})
              </option>
            ))}
          </select>
        </div>

        {type === 'transfer' && (
          <div className="space-y-1">
            <label htmlFor="tx-dest-wallet" className="block text-xs font-semibold text-text-muted">
              Ke Dompet (Tujuan)
            </label>
            <select
              id="tx-dest-wallet"
              value={toWalletId}
              onChange={(e) => setToWalletId(e.target.value)}
              required
              className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            >
              {wallets
                .filter((w) => w.id !== walletId)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({formatRupiah(w.balance)})
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* Wallet Balance Hint */}
      {selectedSourceWallet && (
        <div className="text-[11px] text-text-muted flex items-center justify-between px-1">
          <span>Saldo ({selectedSourceWallet.name}):</span>
          <span className={`font-bold tabular-nums ${selectedSourceWallet.balance < 0 ? 'text-expense' : 'text-text'}`}>
            {formatRupiah(selectedSourceWallet.balance)}
            {selectedSourceWallet.balance < 0 && ' (Minus)'}
          </span>
        </div>
      )}

      {/* 3. Amount Input with live formatting & presets */}
      <AmountInput value={amount} onChange={setAmount} />

      {/* Extra fee for transfer */}
      {type === 'transfer' && (
        <div className="space-y-1">
          <label htmlFor="tx-admin-fee" className="block text-xs font-semibold text-text-muted">
            Biaya Admin Transfer (Opsional)
          </label>
          <input
            id="tx-admin-fee"
            type="number"
            min="0"
            value={adminFee || ''}
            onChange={(e) => setAdminFee(e.target.value ? parseInt(e.target.value, 10) : 0)}
            placeholder="0 (Contoh: 2500)"
            className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>
      )}

      {/* 4. Date Selector */}
      <div className="space-y-1">
        <label htmlFor="tx-date" className="block text-xs font-semibold text-text-muted">
          Tanggal Transaksi
        </label>
        <div className="flex items-center gap-2">
          <input
            id="tx-date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setDate(new Date().toISOString().split('T')[0])}
            className="px-3 h-11 bg-surface-2 hover:bg-surface-3 rounded-xl text-xs font-bold text-text-muted transition-colors"
          >
            Hari Ini
          </button>
        </div>
      </div>

      {/* 5. Description & Autocomplete suggestions */}
      <div className="space-y-1.5">
        <label htmlFor="tx-desc" className="block text-xs font-semibold text-text-muted">
          Catatan (Opsional)
        </label>
        <input
          id="tx-desc"
          type="text"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            if (!assetName) setAssetName(e.target.value);
          }}
          placeholder="Contoh: Belanja mingguan pasar pagi"
          className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-text-muted/40"
        />

        {/* Quick Suggestions */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {SUGGESTED_NOTES.map((note) => (
            <button
              key={note}
              type="button"
              onClick={() => {
                setDescription(note);
                if (!assetName) setAssetName(note);
              }}
              className="px-2 py-0.5 text-[11px] bg-background hover:bg-surface-2 border border-border rounded-lg text-text-muted hover:text-text transition-colors"
            >
              {note}
            </button>
          ))}
        </div>
      </div>

      {/* Opsi Otomatisasi: Catat sebagai Aset Baru (Hanya saat Pengeluaran Baru) */}
      {type === 'expense' && !isEditing && (
        <div className="p-3 bg-surface-2 rounded-2xl border border-primary/20 space-y-2.5">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="txCreateAsset"
              checked={createAsset}
              onChange={(e) => setCreateAsset(e.target.checked)}
              className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
            />
            <label htmlFor="txCreateAsset" className="text-xs font-bold text-text flex items-center gap-1 cursor-pointer">
              <Package size={15} weight="fill" className="text-primary" />
              <span>Catat transaksi ini ke Daftar Aset & Depresiasi</span>
            </label>
          </div>

          {createAsset && (
            <div className="space-y-2 pt-1 pl-6">
              <div>
                <label className="block text-[10px] font-semibold text-text-muted">Nama Aset</label>
                <input
                  type="text"
                  required={createAsset}
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="Contoh: Honda Vario 160, MacBook Air"
                  className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-text-muted">Kategori Aset</label>
                <select
                  value={assetCategory}
                  onChange={(e) => setAssetCategory(e.target.value as AssetCategory)}
                  className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="kendaraan">Kendaraan</option>
                  <option value="elektronik">Elektronik & Gadget</option>
                  <option value="properti">Properti & Bangunan</option>
                  <option value="perhiasan_emas">Emas & Perhiasan</option>
                  <option value="alat_usaha">Peralatan Usaha</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        variant={type === 'expense' ? 'danger' : type === 'income' ? 'income' : 'primary'}
        size="lg"
        isLoading={isLoading}
        className="w-full mt-4 text-base font-bold shadow-md"
      >
        {isEditing
          ? 'Simpan Perubahan Transaksi'
          : `Simpan ${type === 'expense' ? 'Pengeluaran' : type === 'income' ? 'Pemasukan' : 'Transfer'}`}
      </Button>
    </form>
  );
}

export function TransactionModal({
  isOpen,
  onClose,
  initialType = 'expense',
  editingTransaction = null,
  wallets,
  categories,
  userId,
  onSuccess,
}: TransactionModalProps) {
  const isEditing = Boolean(editingTransaction);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <PencilSimple size={20} className="text-primary" weight="bold" />
              <span>Edit Transaksi</span>
            </>
          ) : (
            <>
              <Plus size={20} className="text-primary" weight="bold" />
              <span>Catat Transaksi</span>
            </>
          )}
        </div>
      }
      maxWidth="md"
    >
      {isOpen && (
        <TransactionForm
          key={editingTransaction?.id || 'new'}
          initialType={initialType}
          editingTransaction={editingTransaction}
          wallets={wallets}
          categories={categories}
          userId={userId}
          onSuccess={onSuccess}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}
