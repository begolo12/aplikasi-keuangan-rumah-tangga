'use client';

import React, { useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { AmountInput } from '../ui/AmountInput';
import { Button } from '../ui/Button';
import { Wallet, Category, Transaction, TransactionType, AssetCategory, ParsedReceiptResult } from '@/lib/types';
import { enqueueOfflineMutation } from '@/lib/offlineQueue';
import { apiFetch } from '@/lib/apiFetch';
import { formatRupiah } from '@/lib/formatters';
import { WifiSlash, PencilSimple, Plus, Package, Sparkle } from '@phosphor-icons/react';
import { ReceiptParserModal } from './ReceiptParserModal';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: TransactionType;
  editingTransaction?: Transaction | null;
  wallets: Wallet[];
  categories: Category[];
  userId: string;
  onSuccess: () => void;
  initialReceipt?: ParsedReceiptResult | null;
}

interface TransactionFormProps {
  initialType: TransactionType;
  editingTransaction?: Transaction | null;
  wallets: Wallet[];
  categories: Category[];
  userId: string;
  onSuccess: () => void;
  onClose: () => void;
  onOpenReceiptParser?: () => void;
  appliedReceipt?: ParsedReceiptResult | null;
}

function TransactionForm({
  initialType,
  editingTransaction,
  wallets,
  categories,
  userId,
  onSuccess,
  onClose,
  onOpenReceiptParser,
  appliedReceipt,
}: TransactionFormProps) {
  const isEditing = Boolean(editingTransaction);

  const defaultW = wallets.find((w) => w.is_default) || wallets[0];
  const defaultWalletId = editingTransaction?.wallet_id || defaultW?.id || '';
  const defaultToWallet = wallets.find((w) => w.id !== defaultWalletId);
  const defaultCat = categories.find(
    (c) => c.type === ((editingTransaction?.type || initialType) === 'income' ? 'income' : 'expense')
  );

  const [type, setType] = useState<TransactionType>(
    editingTransaction?.type || appliedReceipt?.type || initialType
  );
  const [amount, setAmount] = useState(
    editingTransaction?.amount || appliedReceipt?.amount || 0
  );
  const [adminFee, setAdminFee] = useState(editingTransaction?.admin_fee || 0);
  const [walletId, setWalletId] = useState(
    appliedReceipt?.suggested_wallet_id || defaultWalletId
  );
  const [toWalletId, setToWalletId] = useState(editingTransaction?.to_wallet_id || defaultToWallet?.id || '');
  const [categoryId, setCategoryId] = useState(
    appliedReceipt?.suggested_category_id || editingTransaction?.category_id || defaultCat?.id || ''
  );
  const [description, setDescription] = useState(
    appliedReceipt?.description || editingTransaction?.description || ''
  );
  const [createAsset, setCreateAsset] = useState(false);
  const [assetName, setAssetName] = useState('');
  const [assetCategory, setAssetCategory] = useState<AssetCategory>('kendaraan');
  const [date, setDate] = useState(
    () => appliedReceipt?.date || editingTransaction?.date || new Date().toISOString().split('T')[0]
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offlineNotice, setOfflineNotice] = useState(false);

  // Guard double-submit sinkron: state isLoading re-render-nya async, ref tidak.
  const submittingRef = useRef(false);

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
    if (submittingRef.current) return;
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
      // Anti-replay revisi basi saat PUT antrean offline direplay setelah data berubah
      ...(isEditing && editingTransaction?.updated_at ? { expected_updated_at: editingTransaction.updated_at } : {}),
    };

    setIsLoading(true);
    submittingRef.current = true;

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

      await apiFetch(endpoint, { method, json: payload });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
    } finally {
      submittingRef.current = false;
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

      {/* 1. Transaction Type Segmented Control & AI Scan button */}
      <div className="flex items-center gap-2">
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-surface-2 rounded-2xl flex-1">
          <button
            type="button"
            onClick={() => handleTypeChange('expense')}
            className={`min-h-[44px] py-2 text-xs font-bold rounded-xl transition-all ${
              type === 'expense' ? 'bg-expense text-white shadow-xs' : 'text-text-muted hover:text-text'
            }`}
          >
            Pengeluaran
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('income')}
            className={`min-h-[44px] py-2 text-xs font-bold rounded-xl transition-all ${
              type === 'income' ? 'bg-income text-white shadow-xs' : 'text-text-muted hover:text-text'
            }`}
          >
            Pemasukan
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('transfer')}
            className={`min-h-[44px] py-2 text-xs font-bold rounded-xl transition-all ${
              type === 'transfer' ? 'bg-transfer text-white shadow-xs' : 'text-text-muted hover:text-text'
            }`}
          >
            Transfer
          </button>
        </div>

        {!isEditing && onOpenReceiptParser && (
          <button
            type="button"
            onClick={onOpenReceiptParser}
            title="Scan Struk / Nota dengan AI"
            className="min-h-[44px] px-3 rounded-2xl bg-primary/10 hover:bg-primary/15 border border-primary/25 text-primary text-xs font-bold flex items-center gap-1.5 shrink-0 active:scale-95 transition-all shadow-2xs"
          >
            <Sparkle size={16} weight="fill" />
            <span className="hidden sm:inline">Scan Struk</span>
          </button>
        )}
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
              className="px-3 min-h-[44px] text-[11px] bg-background hover:bg-surface-2 border border-border rounded-lg text-text-muted hover:text-text transition-colors"
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
  initialReceipt = null,
}: TransactionModalProps) {
  const isEditing = Boolean(editingTransaction);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [appliedReceipt, setAppliedReceipt] = useState<ParsedReceiptResult | null>(initialReceipt);

  const handleApplyReceipt = (parsed: ParsedReceiptResult) => {
    setAppliedReceipt(parsed);
  };

  const handleClose = () => {
    setAppliedReceipt(null);
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
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
            key={`${editingTransaction?.id || 'new'}-${appliedReceipt ? 'receipt-' + appliedReceipt.amount : 'clean'}`}
            initialType={initialType}
            editingTransaction={editingTransaction}
            wallets={wallets}
            categories={categories}
            userId={userId}
            onSuccess={onSuccess}
            onClose={handleClose}
            onOpenReceiptParser={() => setIsReceiptModalOpen(true)}
            appliedReceipt={appliedReceipt}
          />
        )}
      </Modal>

      <ReceiptParserModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        categories={categories}
        wallets={wallets}
        onApply={handleApplyReceipt}
      />
    </>
  );
}

