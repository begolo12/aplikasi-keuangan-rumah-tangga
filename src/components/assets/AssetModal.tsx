'use client';

import React, { useState } from 'react';
import { Asset, AssetCategory, DepreciationMethod } from '@/lib/types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatRupiah } from '@/lib/formatters';
import {
  Car,
  Laptop,
  HouseLine,
  Sparkle,
  Wrench,
  DotsThree,
  Calculator,
} from '@phosphor-icons/react';

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    category: AssetCategory;
    purchase_date: string;
    purchase_price: number;
    current_value?: number;
    depreciation_method: DepreciationMethod;
    useful_life_years: number;
    salvage_value: number;
    notes?: string | null;
  }) => Promise<void>;
  initialData?: Asset | null;
}

const CATEGORIES: { id: AssetCategory; label: string; icon: React.ElementType }[] = [
  { id: 'kendaraan', label: 'Kendaraan', icon: Car },
  { id: 'elektronik', label: 'Elektronik & Gadget', icon: Laptop },
  { id: 'properti', label: 'Properti & Bangunan', icon: HouseLine },
  { id: 'perhiasan_emas', label: 'Emas & Perhiasan', icon: Sparkle },
  { id: 'alat_usaha', label: 'Peralatan & Mesin Usaha', icon: Wrench },
  { id: 'lainnya', label: 'Lainnya', icon: DotsThree },
];

interface AssetFormProps {
  onClose: () => void;
  onSubmit: AssetModalProps['onSubmit'];
  initialData?: Asset | null;
}

function AssetForm({ onClose, onSubmit, initialData }: AssetFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [category, setCategory] = useState<AssetCategory>(initialData?.category || 'kendaraan');
  const [purchaseDate, setPurchaseDate] = useState(
    initialData?.purchase_date ? initialData.purchase_date.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [purchasePrice, setPurchasePrice] = useState(
    initialData?.purchase_price !== undefined ? String(initialData.purchase_price) : ''
  );
  const [depreciationMethod, setDepreciationMethod] = useState<DepreciationMethod>(
    initialData?.depreciation_method || 'straight_line'
  );
  const [usefulLifeYears, setUsefulLifeYears] = useState(
    initialData?.useful_life_years !== undefined ? String(initialData.useful_life_years) : '5'
  );
  const [salvageValue, setSalvageValue] = useState(
    initialData?.salvage_value !== undefined ? String(initialData.salvage_value) : '0'
  );
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live simulation calculation
  const priceNum = parseFloat(purchasePrice) || 0;
  const salvageNum = parseFloat(salvageValue) || 0;
  const yearsNum = Math.max(1, parseInt(usefulLifeYears) || 5);

  const pDate = new Date(purchaseDate);
  const now = new Date();
  let ageMonths = 0;
  if (!isNaN(pDate.getTime())) {
    ageMonths = (now.getFullYear() - pDate.getFullYear()) * 12 + (now.getMonth() - pDate.getMonth());
    if (ageMonths < 0) ageMonths = 0;
  }

  let simBookValue = priceNum;
  let simMonthlyDepr = 0;

  if (depreciationMethod === 'none') {
    simBookValue = priceNum;
    simMonthlyDepr = 0;
  } else if (depreciationMethod === 'declining_balance') {
    const rate = Math.min(1, 2 / yearsNum);
    const ageYears = ageMonths / 12;
    simBookValue = Math.max(salvageNum, Math.round(priceNum * Math.pow(Math.max(0, 1 - rate), ageYears)));
    simMonthlyDepr = Math.round((simBookValue * rate) / 12);
  } else {
    const base = Math.max(0, priceNum - salvageNum);
    simMonthlyDepr = Math.round(base / (yearsNum * 12));
    const simAccumDepr = Math.min(base, simMonthlyDepr * ageMonths);
    simBookValue = Math.max(salvageNum, priceNum - simAccumDepr);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Nama aset wajib diisi.');
      return;
    }
    if (priceNum <= 0) {
      setError('Harga perolehan harus lebih besar dari 0.');
      return;
    }
    if (salvageNum < 0) {
      setError('Nilai sisa/residu tidak boleh negatif.');
      return;
    }
    if (salvageNum >= priceNum && depreciationMethod !== 'none') {
      setError('Nilai residu tidak boleh melebihi atau sama dengan harga beli.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        category,
        purchase_date: purchaseDate,
        purchase_price: priceNum,
        depreciation_method: depreciationMethod,
        useful_life_years: depreciationMethod === 'none' ? 1 : yearsNum,
        salvage_value: depreciationMethod === 'none' ? 0 : salvageNum,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan data aset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-expense/10 border border-expense/20 rounded-xl text-expense text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Nama Aset */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-text-muted">Nama Aset / Barang</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Contoh: Honda Vario 160, MacBook Air M2, Tanah Kavling"
          className="w-full h-11 px-3.5 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-text-muted/50"
        />
      </div>

      {/* Kategori Aset */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-text-muted">Kategori Aset</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCategory(cat.id);
                  if (cat.id === 'properti' || cat.id === 'perhiasan_emas') {
                    setDepreciationMethod('none');
                  } else if (depreciationMethod === 'none') {
                    setDepreciationMethod('straight_line');
                  }
                }}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all text-left ${
                  isSelected
                    ? 'bg-primary/10 border-primary text-primary shadow-2xs font-bold'
                    : 'bg-surface-2 border-border text-text-muted hover:text-text hover:bg-surface'
                }`}
              >
                <Icon size={16} weight={isSelected ? 'fill' : 'regular'} className="shrink-0" />
                <span className="truncate">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Row: Tanggal Perolehan & Harga Beli */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-text-muted">Tanggal Perolehan (Beli)</label>
          <input
            type="date"
            required
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="w-full h-11 px-3.5 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-text-muted">Harga Perolehan Awal (Rp)</label>
          <input
            type="number"
            required
            min="1"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            placeholder="0"
            className="w-full h-11 px-3.5 bg-background border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Metode Penyusutan */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-text-muted">Metode Penyusutan (Depresiasi)</label>
        <select
          value={depreciationMethod}
          onChange={(e) => setDepreciationMethod(e.target.value as DepreciationMethod)}
          className="w-full h-11 px-3.5 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
        >
          <option value="straight_line">Garis Lurus (Straight-Line) — Nilai susut merata setiap bulan</option>
          <option value="declining_balance">Saldo Menurun Ganda (Declining Balance) — Susut lebih cepat di awal</option>
          <option value="none">Tanpa Penyusutan (Properti / Logam Mulia / Apresiatif)</option>
        </select>
      </div>

      {/* Umur Ekonomis & Nilai Sisa (Residu) */}
      {depreciationMethod !== 'none' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-surface-2 rounded-2xl border border-border">
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-text-muted">Umur Ekonomis (Tahun)</label>
            <input
              type="number"
              required
              min="1"
              max="50"
              value={usefulLifeYears}
              onChange={(e) => setUsefulLifeYears(e.target.value)}
              placeholder="5"
              className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-text-muted">Estimasi Nilai Residu/Sisa (Rp)</label>
            <input
              type="number"
              min="0"
              value={salvageValue}
              onChange={(e) => setSalvageValue(e.target.value)}
              placeholder="0"
              className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Live Calculation Preview Card */}
      {priceNum > 0 && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-2xl space-y-2">
          <div className="flex items-center gap-1.5 text-primary text-xs font-bold">
            <Calculator size={16} weight="duotone" />
            <span>Simulasi Nilai Buku Real-Time:</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-surface rounded-xl border border-border">
              <span className="text-text-muted text-[10px] block">Estimasi Nilai Sekarang:</span>
              <span className="font-extrabold text-primary whitespace-nowrap tabular-nums">
                {formatRupiah(simBookValue)}
              </span>
            </div>
            <div className="p-2 bg-surface rounded-xl border border-border">
              <span className="text-text-muted text-[10px] block">Beban Susut / Bulan:</span>
              <span className="font-extrabold text-expense whitespace-nowrap tabular-nums">
                {depreciationMethod === 'none' ? 'Rp 0' : formatRupiah(simMonthlyDepr)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Catatan */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-text-muted">Catatan / Lokasi / No. Seri (Opsional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Contoh: BPKB di lemari, No Seri: XYZ123"
          className="w-full p-3 bg-background border border-border rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-text-muted/50 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <Button type="button" variant="outline" size="md" onClick={onClose} disabled={isSubmitting}>
          Batal
        </Button>
        <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
          {initialData ? 'Simpan Perubahan' : 'Simpan Aset'}
        </Button>
      </div>
    </form>
  );
}

export function AssetModal({ isOpen, onClose, onSubmit, initialData }: AssetModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Ubah Data Aset' : 'Catat Aset Baru'}
    >
      {isOpen && (
        <AssetForm
          onClose={onClose}
          onSubmit={onSubmit}
          initialData={initialData}
        />
      )}
    </Modal>
  );
}
