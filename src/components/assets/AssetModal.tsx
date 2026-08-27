'use client';

import React, { useState } from 'react';
import { Asset, AssetCategory, DepreciationMethod, Wallet } from '@/lib/types';
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
    wallet_id?: string | null;
    record_purchase_transaction?: boolean;
    schedule_tax_amount?: number | null;
    schedule_tax_due_day?: number | null;
    schedule_maintenance_amount?: number | null;
    schedule_maintenance_due_day?: number | null;
  }) => Promise<void>;
  initialData?: Asset | null;
  wallets?: Wallet[];
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
  wallets?: Wallet[];
}

function AssetForm({ onClose, onSubmit, initialData, wallets = [] }: AssetFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [category, setCategory] = useState<AssetCategory>(initialData?.category || 'kendaraan');
  const [purchaseDate, setPurchaseDate] = useState(
    initialData?.purchase_date ? initialData.purchase_date.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [purchasePrice, setPurchasePrice] = useState(
    initialData?.purchase_price !== undefined ? String(initialData.purchase_price) : ''
  );
  const [currentValue, setCurrentValue] = useState(
    initialData?.current_value !== undefined ? String(initialData.current_value) : ''
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

  // Integrasi otomatis kas & jadwal rutin
  const defaultW = wallets.find((w) => w.is_default) || wallets[0];
  const [walletId, setWalletId] = useState(defaultW?.id || '');
  const [recordPurchase, setRecordPurchase] = useState(!initialData); // default true untuk aset baru
  const [scheduleTax, setScheduleTax] = useState(false);
  const [taxAmount, setTaxAmount] = useState(category === 'kendaraan' ? 500000 : 300000);
  const [scheduleMaintenance, setScheduleMaintenance] = useState(false);
  const [maintenanceAmount, setMaintenanceAmount] = useState(250000);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live simulation calculation
  const priceNum = parseFloat(purchasePrice) || 0;
  const marketNum = parseFloat(currentValue) > 0 ? parseFloat(currentValue) : priceNum;
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

  // Analisis Plus (+) / Minus (-)
  const marketDiffPurchase = marketNum - priceNum;
  const marketDiffBook = marketNum - simBookValue;
  const isGain = marketDiffPurchase >= 0;

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
        current_value: marketNum,
        depreciation_method: depreciationMethod,
        useful_life_years: depreciationMethod === 'none' ? 1 : yearsNum,
        salvage_value: depreciationMethod === 'none' ? 0 : salvageNum,
        notes: notes.trim() || null,
        wallet_id: walletId || null,
        record_purchase_transaction: !initialData && recordPurchase,
        schedule_tax_amount: !initialData && scheduleTax ? taxAmount : null,
        schedule_tax_due_day: 15,
        schedule_maintenance_amount: !initialData && scheduleMaintenance ? maintenanceAmount : null,
        schedule_maintenance_due_day: 20,
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
            onChange={(e) => {
              setPurchasePrice(e.target.value);
              if (!currentValue) setCurrentValue(e.target.value);
            }}
            placeholder="0"
            className="w-full h-11 px-3.5 bg-background border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Input: Taksiran Harga Pasaran Sekarang */}
      <div className="space-y-1 p-3 bg-surface-2 rounded-2xl border border-primary/20">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-text">
            Taksiran Harga Pasaran Saat Ini (Rp)
          </label>
          <span className="text-[10px] font-semibold text-primary">Untuk Cek Plus / Minus</span>
        </div>
        <input
          type="number"
          min="0"
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          placeholder={purchasePrice || "Contoh: 18000000"}
          className="w-full h-11 px-3.5 bg-background border border-border rounded-xl text-sm font-extrabold text-primary focus:ring-2 focus:ring-primary focus:outline-none"
        />
        <p className="text-[10px] text-text-muted">
          Perkiraan harga jual/pasar barang saat ini di marketplace atau pasaran umum.
        </p>
      </div>

      {/* Metode Penyusutan */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-text-muted">Metode Penyusutan (Depresiasi)</label>
        <select
          value={depreciationMethod}
          onChange={(e) => setDepreciationMethod(e.target.value as DepreciationMethod)}
          className="w-full h-11 px-3.5 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
        >
          <option value="straight_line">Garis Lurus (Straight-Line): nilai susut merata setiap bulan</option>
          <option value="declining_balance">Saldo Menurun Ganda (Declining Balance): susut lebih cepat di awal</option>
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

      {/* Live Calculation & Plus/Minus Preview Card */}
      {priceNum > 0 && (
        <div className="p-3.5 bg-surface-2 border border-border rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-text font-bold text-xs">
              <Calculator size={16} weight="duotone" className="text-primary" />
              <span>Perbandingan Nilai & Evaluasi Plus / Minus:</span>
            </div>

            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                isGain
                  ? 'bg-income/10 text-income border-income/20'
                  : 'bg-expense/10 text-expense border-expense/20'
              }`}
            >
              {isGain
                ? `Plus (+${formatRupiah(marketDiffPurchase)})`
                : `Minus (${formatRupiah(marketDiffPurchase)})`}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 bg-surface rounded-xl border border-border/70">
              <span className="text-text-muted text-[10px] block">Harga Beli Awal:</span>
              <span className="font-bold text-text whitespace-nowrap tabular-nums">
                {formatRupiah(priceNum)}
              </span>
            </div>

            <div className="p-2 bg-surface rounded-xl border border-border/70">
              <span className="text-text-muted text-[10px] block">Nilai Buku Susut:</span>
              <span className="font-bold text-text whitespace-nowrap tabular-nums">
                {formatRupiah(simBookValue)}
              </span>
            </div>

            <div className={`p-2 rounded-xl border ${isGain ? 'bg-income/5 border-income/20' : 'bg-expense/5 border-expense/20'}`}>
              <span className="text-text-muted text-[10px] block">Taksiran Pasar:</span>
              <span className={`font-extrabold whitespace-nowrap tabular-nums ${isGain ? 'text-income' : 'text-expense'}`}>
                {formatRupiah(marketNum)}
              </span>
            </div>
          </div>

          <p className="text-[10px] text-text-muted">
            {isGain
              ? `Taksiran pasar saat ini bernilai lebih tinggi Rp ${new Intl.NumberFormat('id-ID').format(marketDiffPurchase)} (+${Math.round((marketDiffPurchase / priceNum) * 100)}%) dibandingkan harga beli awal.`
              : `Aset ini terdepresiasi sebesar Rp ${new Intl.NumberFormat('id-ID').format(Math.abs(marketDiffPurchase))} (${Math.round((Math.abs(marketDiffPurchase) / priceNum) * 100)}%) dari harga perolehan awal.`}
          </p>
        </div>
      )}

      {/* Integrasi Pembelian Kas & Jadwal Rutin (Hanya untuk Aset Baru) */}
      {!initialData && wallets.length > 0 && (
        <div className="p-3.5 bg-surface-2 rounded-2xl border border-border space-y-3">
          <span className="text-xs font-bold text-text block">
            Otomatisasi Kas & Jadwal Pengeluaran Rutin
          </span>

          {/* Opsi 1: Catat transaksi kas */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recordPurchase"
                checked={recordPurchase}
                onChange={(e) => setRecordPurchase(e.target.checked)}
                className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
              />
              <label htmlFor="recordPurchase" className="text-xs font-semibold text-text cursor-pointer">
                Catat pengeluaran kas pembelian ({formatRupiah(priceNum)}) dari dompet
              </label>
            </div>

            {recordPurchase && (
              <div className="pl-6">
                <select
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (Saldo: {formatRupiah(w.balance)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Opsi 2: Jadwal Pajak Rutin */}
          <div className="space-y-1.5 pt-1 border-t border-border/50">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="scheduleTax"
                checked={scheduleTax}
                onChange={(e) => setScheduleTax(e.target.checked)}
                className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
              />
              <label htmlFor="scheduleTax" className="text-xs font-semibold text-text cursor-pointer">
                Jadwalkan Pajak Rutin (Pajak STNK / PBB)
              </label>
            </div>

            {scheduleTax && (
              <div className="pl-6">
                <input
                  type="number"
                  min="0"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                  placeholder="Estimasi pajak (Rp)"
                  className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs font-bold text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Opsi 3: Jadwal Servis Rutin */}
          <div className="space-y-1.5 pt-1 border-t border-border/50">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="scheduleMaintenance"
                checked={scheduleMaintenance}
                onChange={(e) => setScheduleMaintenance(e.target.checked)}
                className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
              />
              <label htmlFor="scheduleMaintenance" className="text-xs font-semibold text-text cursor-pointer">
                Jadwalkan Servis / Perawatan Rutin
              </label>
            </div>

            {scheduleMaintenance && (
              <div className="pl-6">
                <input
                  type="number"
                  min="0"
                  value={maintenanceAmount}
                  onChange={(e) => setMaintenanceAmount(parseFloat(e.target.value) || 0)}
                  placeholder="Estimasi biaya servis (Rp)"
                  className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs font-bold text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            )}
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

export function AssetModal({ isOpen, onClose, onSubmit, initialData, wallets = [] }: AssetModalProps) {
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
          wallets={wallets}
        />
      )}
    </Modal>
  );
}
