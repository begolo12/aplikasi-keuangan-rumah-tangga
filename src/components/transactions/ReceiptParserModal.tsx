'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Category, Wallet, ParsedReceiptResult } from '@/lib/types';
import { apiFetch, endpoints } from '@/lib/apiFetch';
import { formatRupiah } from '@/lib/formatters';
import {
  Sparkle,
  ArrowRight,
  Storefront,
  CalendarBlank,
  Tag,
  Wallet as WalletIcon,
  CheckCircle,
  WarningCircle,
  ClipboardText,
} from '@phosphor-icons/react';


interface ReceiptParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  wallets: Wallet[];
  onApply: (parsed: ParsedReceiptResult) => void;
}

export function ReceiptParserModal({
  isOpen,
  onClose,
  categories,
  wallets,
  onApply,
}: ReceiptParserModalProps) {
  const [receiptText, setReceiptText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedReceiptResult | null>(null);

  const handleParse = async () => {
    if (!receiptText.trim()) {
      setError('Masukkan teks struk, nota, atau SMS transaksi.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch<ParsedReceiptResult>(endpoints.aiParseReceipt, {
        method: 'POST',
        json: {
          text: receiptText,
          categories: categories.map((c) => ({ id: c.id, name: c.name, type: c.type })),
          wallets: wallets.map((w) => ({ id: w.id, name: w.name, type: w.type })),
        },
      });

      setParsedResult(response);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menganalisis struk.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyToTransaction = () => {
    if (!parsedResult) return;
    onApply(parsedResult);
    onClose();
    // Reset state setelah apply
    setReceiptText('');
    setParsedResult(null);
    setError(null);
  };

  const handlePasteClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) setReceiptText(text);
      }
    } catch {
      // Abaikan jika browser memblokir clipboard
    }
  };

  const matchedCat = categories.find((c) => c.id === parsedResult?.suggested_category_id);
  const matchedWallet = wallets.find((w) => w.id === parsedResult?.suggested_wallet_id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Smart Scan Struk & Nota AI"
    >
      <div className="space-y-4">
        <p className="text-xs text-text-muted -mt-2">
          Ekstrak nominal, tanggal, toko, dan kategori belanja secara otomatis.
        </p>

        {/* Input Area */}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-text-muted">
              Teks Struk / SMS Banking / Mutasi
            </label>
            <button
              type="button"
              onClick={handlePasteClipboard}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-hover active:scale-95 transition-all"
            >
              <ClipboardText size={14} weight="bold" />
              Tempel Salinan
            </button>
          </div>
          <textarea
            rows={4}
            value={receiptText}
            onChange={(e) => setReceiptText(e.target.value)}
            placeholder="Contoh:&#10;INDOMARET POINT&#10;1x SUSU UHT ULTRA 1000ML 19.500&#10;1x ROTI TAWAR 16.000&#10;TOTAL: Rp 35.500&#10;Tgl: 28-08-2026 / BCA QRIS"
            className="w-full text-xs font-mono p-3 rounded-xl bg-surface-2 border border-border focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-text-muted/60"
          />
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-expense/10 border border-expense/20 flex items-start gap-2 text-xs text-expense font-semibold">
            <WarningCircle size={16} weight="bold" className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Parse Button */}
        {!parsedResult && (
          <Button
            type="button"
            variant="primary"
            className="w-full justify-center"
            onClick={handleParse}
            disabled={isLoading || !receiptText.trim()}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Menganalisis Struk...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkle size={16} weight="bold" />
                Ekstrak dengan DeepSeek AI
              </span>
            )}
          </Button>
        )}

        {/* Hasil Ekstraksi Pratinjau */}
        {parsedResult && (
          <div className="p-3.5 rounded-2xl bg-surface-2 border border-primary/20 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-border/70 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <CheckCircle size={16} weight="fill" />
                Hasil Ekstraksi Transaksi
              </div>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {parsedResult.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] text-text-muted font-medium">Nominal Terdeteksi</span>
                <p className="font-bold text-text text-sm sm:text-base font-display-num">
                  {formatRupiah(parsedResult.amount)}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-text-muted font-medium">Tanggal</span>
                <p className="font-semibold text-text flex items-center gap-1">
                  <CalendarBlank size={13} className="text-text-muted" />
                  {parsedResult.date}
                </p>
              </div>

              <div className="space-y-0.5 col-span-2">
                <span className="text-[10px] text-text-muted font-medium">Keterangan / Merchant</span>
                <p className="font-semibold text-text flex items-center gap-1">
                  <Storefront size={13} className="text-text-muted" />
                  {parsedResult.description}
                </p>
              </div>

              {matchedCat && (
                <div className="space-y-0.5">
                  <span className="text-[10px] text-text-muted font-medium">Kategori Usulan</span>
                  <p className="font-semibold text-text flex items-center gap-1 truncate">
                    <Tag size={13} className="text-text-muted shrink-0" />
                    <span className="truncate">{matchedCat.name}</span>
                  </p>
                </div>
              )}

              {matchedWallet && (
                <div className="space-y-0.5">
                  <span className="text-[10px] text-text-muted font-medium">Dompet Sumber</span>
                  <p className="font-semibold text-text flex items-center gap-1 truncate">
                    <WalletIcon size={13} className="text-text-muted shrink-0" />
                    <span className="truncate">{matchedWallet.name}</span>
                  </p>
                </div>
              )}
            </div>

            {/* List item belanja jika ada */}
            {parsedResult.items && parsedResult.items.length > 0 && (
              <div className="pt-2 border-t border-border/50 space-y-1">
                <span className="text-[10px] font-bold text-text-muted uppercase">Rincian Item</span>
                <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                  {parsedResult.items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] text-text-muted">
                      <span className="truncate">{it.name} {it.qty && it.qty > 1 ? `(${it.qty}x)` : ''}</span>
                      <span className="font-semibold text-text shrink-0">{formatRupiah(it.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-1 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-1/3 justify-center"
                onClick={() => setParsedResult(null)}
              >
                Scan Ulang
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="w-2/3 justify-center"
                onClick={handleApplyToTransaction}
              >
                Terapkan ke Form
                <ArrowRight size={14} weight="bold" />
              </Button>
            </div>
          </div>
        )}

        <div className="pt-1 flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Batal
          </Button>
        </div>
      </div>
    </Modal>
  );
}
