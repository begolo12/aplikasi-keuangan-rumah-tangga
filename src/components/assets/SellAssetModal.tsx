'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AmountInput } from '../ui/AmountInput';
import { formatRupiah } from '@/lib/formatters';
import { Asset, Wallet } from '@/lib/types';
import { ApiError, apiFetch, endpoints } from '@/lib/apiFetch';
import {
  CurrencyDollar,
  CheckCircle,
  WarningCircle,
  Coins,
  ShieldCheck,
  Lightning,
  Sparkle,
} from '@phosphor-icons/react';

interface SellAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  wallets: Wallet[];
  onSuccess: () => void;
}

export function SellAssetModal({
  isOpen,
  onClose,
  asset,
  wallets,
  onSuccess,
}: SellAssetModalProps) {
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [soldDate, setSoldDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [walletId, setWalletId] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (asset) {
      const defaultW = wallets.find((w) => w.is_default) || wallets[0];
      if (defaultW) setWalletId(defaultW.id);
      const suggestedPrice = asset.current_value > 0 ? asset.current_value : (asset.book_value ?? asset.purchase_price);
      setSellingPrice(suggestedPrice);
      setNotes('');
      setError(null);
    }
  }, [asset, wallets]);

  if (!asset) return null;

  const purchasePrice = asset.purchase_price || 0;
  const currentBookValue = asset.book_value ?? purchasePrice;
  const gainLossBook = sellingPrice - currentBookValue;
  const gainLossPurchase = sellingPrice - purchasePrice;
  const isGainBook = gainLossBook >= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sellingPrice <= 0) {
      setError('Harga jual aset harus lebih dari 0.');
      return;
    }
    if (!walletId) {
      setError('Pilih dompet/rekening penerima dana hasil penjualan.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await apiFetch(endpoints.sellAsset(asset.id), {
        method: 'POST',
        json: {
          selling_price: sellingPrice,
          sold_date: soldDate,
          wallet_id: walletId,
          notes: notes.trim() || null,
        },
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memproses penjualan aset.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <CurrencyDollar size={22} className="text-primary" weight="bold" />
          <span>Pelepasan / Penjualan Aset: {asset.name}</span>
        </div>
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="p-3.5 bg-expense/10 border border-expense/20 rounded-2xl text-expense text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Asset Benchmark Summary Card */}
        <div className="p-4 bg-surface-2 border border-border rounded-2xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-text-muted font-semibold">Harga Beli Awal:</span>
            <span className="font-bold text-text tabular-nums">{formatRupiah(purchasePrice)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted font-semibold">Nilai Buku Sisa Depresiasi:</span>
            <span className="font-extrabold text-primary tabular-nums">{formatRupiah(currentBookValue)}</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px] text-text-muted">
            <span>Akumulasi Depresiasi:</span>
            <span className="font-semibold text-expense">-{formatRupiah(asset.accumulated_depreciation || 0)}</span>
          </div>
        </div>

        {/* Input Selling Price */}
        <AmountInput
          id="sellingPrice"
          label="Harga Penjualan Aset yang Diterima (Rp)"
          value={sellingPrice}
          onChange={setSellingPrice}
        />

        {/* Live Gain / Loss Calculation Preview */}
        {sellingPrice > 0 && (
          <div
            className={`p-4 rounded-2xl border transition-all space-y-2 ${
              isGainBook
                ? 'bg-income/10 border-income/20'
                : 'bg-expense/10 border-expense/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                {isGainBook ? (
                  <CheckCircle size={18} weight="fill" className="text-income shrink-0" />
                ) : (
                  <WarningCircle size={18} weight="fill" className="text-expense shrink-0" />
                )}
                <span className={isGainBook ? 'text-income' : 'text-expense'}>
                  {isGainBook ? 'Hasil Penjualan Untung (+)' : 'Hasil Penjualan Menyusut (-)'}
                </span>
              </div>

              <span className={`text-xs font-extrabold tabular-nums ${isGainBook ? 'text-income' : 'text-expense'}`}>
                {isGainBook ? '+' : ''}{formatRupiah(gainLossBook)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40 text-[11px]">
              <div>
                <span className="text-text-muted block">vs Sisa Nilai Buku:</span>
                <span className={`font-bold tabular-nums ${isGainBook ? 'text-income' : 'text-expense'}`}>
                  {isGainBook ? `Untung +${formatRupiah(gainLossBook)}` : `Selisih Susut ${formatRupiah(gainLossBook)}`}
                </span>
              </div>
              <div>
                <span className="text-text-muted block">vs Harga Beli Awal:</span>
                <span className={`font-bold tabular-nums ${gainLossPurchase >= 0 ? 'text-income' : 'text-text-muted'}`}>
                  {gainLossPurchase >= 0 ? `+${formatRupiah(gainLossPurchase)}` : formatRupiah(gainLossPurchase)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Wallet & Date Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="sellWallet" className="block text-xs font-semibold text-text-muted">
              Terima Kas ke Rekening / Dompet
            </label>
            <select
              id="sellWallet"
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              required
              className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} (Saldo: {formatRupiah(w.balance)})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="soldDate" className="block text-xs font-semibold text-text-muted">
              Tanggal Penjualan
            </label>
            <input
              id="soldDate"
              type="date"
              required
              value={soldDate}
              onChange={(e) => setSoldDate(e.target.value)}
              className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label htmlFor="sellNotes" className="block text-xs font-semibold text-text-muted">
            Catatan Pembeli / Keterangan (Opsional)
          </label>
          <input
            id="sellNotes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Dijual ke Pak Rahmat, COD tunai"
            className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>

        {/* Automatic Actions Explanation Box */}
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-2xl text-[11px] text-text-muted space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-primary">
            <Lightning size={15} weight="fill" />
            <span>Otomatisasi Sistem Kas & Jadwal:</span>
          </div>
          <p className="leading-relaxed">
            • Uang penjualan <span className="font-bold text-text">{formatRupiah(sellingPrice)}</span> akan otomatis masuk ke dompet Anda.<br />
            • Aset ini akan dikeluarkan dari aset aktif.<br />
            • Seluruh jadwal tagihan pajak & servis rutin terkait aset ini otomatis dinonaktifkan.
          </p>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          className="w-full mt-4 font-bold shadow-md"
        >
          Konfirmasi Jual & Terima Kas {formatRupiah(sellingPrice)}
        </Button>
      </form>
    </Modal>
  );
}
