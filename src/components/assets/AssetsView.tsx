'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Asset, AssetCategory, DepreciationMethod } from '@/lib/types';
import { apiFetch, endpoints } from '@/lib/apiFetch';
import { formatRupiah, formatDate } from '@/lib/formatters';
import { Button } from '../ui/Button';
import { AssetModal } from './AssetModal';
import { DashboardSkeleton } from '../ui/LoadingSkeleton';
import {
  Package,
  Car,
  Laptop,
  HouseLine,
  Sparkle,
  Wrench,
  DotsThree,
  Plus,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  TrendDown,
  Coins,
  ShieldCheck,
  CalendarCheck,
} from '@phosphor-icons/react';

interface AssetsViewProps {
  onRefreshParent?: () => void;
}

interface AssetsApiResponse {
  assets: Asset[];
  summary: {
    total_assets_count: number;
    total_purchase_value: number;
    total_book_value: number;
    total_accumulated_depreciation: number;
    total_monthly_depreciation: number;
  };
}

const CATEGORY_MAP: Record<AssetCategory, { label: string; icon: React.ElementType; color: string }> = {
  kendaraan: { label: 'Kendaraan', icon: Car, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  elektronik: { label: 'Elektronik', icon: Laptop, color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
  properti: { label: 'Properti', icon: HouseLine, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  perhiasan_emas: { label: 'Emas / Perhiasan', icon: Sparkle, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  alat_usaha: { label: 'Peralatan Usaha', icon: Wrench, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  lainnya: { label: 'Lainnya', icon: DotsThree, color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
};

const METHOD_MAP: Record<DepreciationMethod, { label: string; tag: string }> = {
  straight_line: { label: 'Garis Lurus', tag: 'bg-primary/10 text-primary border-primary/20' },
  declining_balance: { label: 'Saldo Menurun', tag: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  none: { label: 'Tanpa Penyusutan', tag: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
};

export function AssetsView({ onRefreshParent }: AssetsViewProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [summary, setSummary] = useState<AssetsApiResponse['summary']>({
    total_assets_count: 0,
    total_purchase_value: 0,
    total_book_value: 0,
    total_accumulated_depreciation: 0,
    total_monthly_depreciation: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchAssets = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let url = endpoints.assets;
        const params = new URLSearchParams();
        if (selectedCategory !== 'all') params.append('category', selectedCategory);
        if (searchQuery.trim()) params.append('search', searchQuery.trim());
        const qs = params.toString();
        if (qs) url += `?${qs}`;

        const data = await apiFetch<AssetsApiResponse>(url, { signal: controller.signal });
        setAssets(data.assets || []);
        if (data.summary) setSummary(data.summary);
      } catch (err) {
        if (!(err instanceof Error && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Gagal memuat data aset.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssets();

    return () => {
      controller.abort();
      abortRef.current = null;
    };
  }, [selectedCategory, searchQuery, reloadKey]);

  const handleCreateOrUpdate = async (data: {
    name: string;
    category: AssetCategory;
    purchase_date: string;
    purchase_price: number;
    current_value?: number;
    depreciation_method: DepreciationMethod;
    useful_life_years: number;
    salvage_value: number;
    notes?: string | null;
  }) => {
    if (editingAsset) {
      await apiFetch(endpoints.asset(editingAsset.id), {
        method: 'PUT',
        json: data,
      });
    } else {
      await apiFetch(endpoints.assets, {
        method: 'POST',
        json: data,
      });
    }
    setReloadKey((k) => k + 1);
    onRefreshParent?.();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan aset ini?')) return;
    setDeletingId(id);
    try {
      await apiFetch(endpoints.asset(id), { method: 'DELETE' });
      setReloadKey((k) => k + 1);
      onRefreshParent?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus aset');
    } finally {
      setDeletingId(null);
    }
  };

  const openAdd = () => {
    setEditingAsset(null);
    setIsModalOpen(true);
  };

  const openEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-3.5 sm:space-y-5">
      {/* Top Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h2 className="text-base sm:text-xl font-bold text-text">Manajemen Aset & Depresiasi</h2>
          <p className="text-[11px] sm:text-xs text-text-muted">
            Pantau nilai buku harta berharga, umur ekonomis, dan estimasi beban penyusutan.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus size={16} weight="bold" />}
          onClick={openAdd}
        >
          Catat Aset Baru
        </Button>
      </div>

      {/* 4 Compact Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {/* Card 1: Total Nilai Perolehan Awal */}
        <div className="p-2.5 sm:p-3 bg-surface border border-border rounded-2xl flex flex-col justify-between gap-1 shadow-2xs">
          <div className="flex items-center gap-1.5 text-text-muted text-[10px] sm:text-xs font-semibold">
            <Coins size={15} className="text-blue-500 shrink-0" weight="duotone" />
            <span className="truncate">Nilai Perolehan Awal</span>
          </div>
          <p className="text-xs sm:text-sm md:text-base font-extrabold text-text whitespace-nowrap tabular-nums tracking-tight">
            {formatRupiah(summary.total_purchase_value)}
          </p>
        </div>

        {/* Card 2: Total Nilai Buku Saat Ini */}
        <div className="p-2.5 sm:p-3 bg-primary/10 border border-primary/20 rounded-2xl flex flex-col justify-between gap-1 shadow-2xs">
          <div className="flex items-center gap-1.5 text-primary text-[10px] sm:text-xs font-bold">
            <ShieldCheck size={15} weight="fill" className="shrink-0" />
            <span className="truncate">Nilai Buku Sekarang</span>
          </div>
          <p className="text-xs sm:text-sm md:text-base font-extrabold text-primary whitespace-nowrap tabular-nums tracking-tight">
            {formatRupiah(summary.total_book_value)}
          </p>
        </div>

        {/* Card 3: Akumulasi Penyusutan */}
        <div className="p-2.5 sm:p-3 bg-surface border border-border rounded-2xl flex flex-col justify-between gap-1 shadow-2xs">
          <div className="flex items-center gap-1.5 text-text-muted text-[10px] sm:text-xs font-semibold">
            <TrendDown size={15} className="text-expense shrink-0" weight="bold" />
            <span className="truncate">Akumulasi Penyusutan</span>
          </div>
          <p className="text-xs sm:text-sm md:text-base font-extrabold text-expense whitespace-nowrap tabular-nums tracking-tight">
            -{formatRupiah(summary.total_accumulated_depreciation)}
          </p>
        </div>

        {/* Card 4: Beban Depresiasi Bulan Ini */}
        <div className="p-2.5 sm:p-3 bg-surface border border-border rounded-2xl flex flex-col justify-between gap-1 shadow-2xs">
          <div className="flex items-center gap-1.5 text-text-muted text-[10px] sm:text-xs font-semibold">
            <CalendarCheck size={15} className="text-purple-500 shrink-0" weight="duotone" />
            <span className="truncate">Beban Susut / Bulan</span>
          </div>
          <p className="text-xs sm:text-sm md:text-base font-extrabold text-purple-600 dark:text-purple-400 whitespace-nowrap tabular-nums tracking-tight">
            {formatRupiah(summary.total_monthly_depreciation)}
          </p>
        </div>
      </div>

      {/* Category Filter Pills & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-primary text-white shadow-2xs'
                : 'bg-surface border border-border text-text-muted hover:text-text'
            }`}
          >
            Semua ({summary.total_assets_count})
          </button>
          {(Object.keys(CATEGORY_MAP) as AssetCategory[]).map((catKey) => {
            const isSel = selectedCategory === catKey;
            const meta = CATEGORY_MAP[catKey];
            return (
              <button
                key={catKey}
                type="button"
                onClick={() => setSelectedCategory(catKey)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                  isSel
                    ? 'bg-primary text-white shadow-2xs font-bold'
                    : 'bg-surface border border-border text-text-muted hover:text-text'
                }`}
              >
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[200px]">
          <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari aset atau catatan..."
            className="w-full h-9 pl-9 pr-3 bg-surface border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-text-muted/50"
          />
        </div>
      </div>

      {/* Assets Card List */}
      {isLoading ? (
        <DashboardSkeleton />
      ) : error ? (
        <div className="p-4 bg-expense/10 border border-expense/20 rounded-2xl text-center space-y-2">
          <p className="text-xs font-semibold text-expense">{error}</p>
          <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
            Coba Lagi
          </Button>
        </div>
      ) : assets.length === 0 ? (
        <div className="p-8 bg-surface border border-border rounded-3xl text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Package size={28} weight="duotone" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text">Belum Ada Aset Terdaftar</h3>
            <p className="text-xs text-text-muted max-w-sm mx-auto mt-1">
              Catat kendaraan, gadget, properti, atau barang berharga untuk melacak nilai buku dan depresiasi otomatis.
            </p>
          </div>
          <Button variant="primary" size="sm" leftIcon={<Plus size={16} weight="bold" />} onClick={openAdd}>
            Tambah Aset Pertama
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
          {assets.map((asset) => {
            const catMeta = CATEGORY_MAP[asset.category] || CATEGORY_MAP.lainnya;
            const methodMeta = METHOD_MAP[asset.depreciation_method] || METHOD_MAP.straight_line;
            const CatIcon = catMeta.icon;

            const purchasePrice = asset.purchase_price || 0;
            const bookValue = asset.book_value !== undefined ? asset.book_value : purchasePrice;
            const accumDepr = asset.accumulated_depreciation || 0;
            const monthlyDepr = asset.monthly_depreciation || 0;

            const deprPercent = purchasePrice > 0
              ? Math.min(100, Math.round((accumDepr / purchasePrice) * 100))
              : 0;

            const ageMonths = asset.age_months || 0;
            const ageYears = Math.floor(ageMonths / 12);
            const remainingMonths = ageMonths % 12;
            const ageText = ageYears > 0
              ? `${ageYears} thn ${remainingMonths > 0 ? `${remainingMonths} bln` : ''}`
              : `${ageMonths} bln`;

            return (
              <div
                key={asset.id}
                className="p-3.5 sm:p-4 bg-surface border border-border rounded-2xl sm:rounded-3xl space-y-2.5 hover:border-primary/40 transition-all shadow-2xs"
              >
                {/* Top Row: Icon, Title, Category Badge & Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border ${catMeta.color}`}>
                      <CatIcon size={20} weight="bold" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-bold text-text truncate max-w-full">
                          {asset.name}
                        </h4>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${methodMeta.tag}`}>
                          {methodMeta.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        Dibeli {formatDate(asset.purchase_date, 'short')} • Umur: <span className="font-semibold text-text">{ageText}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(asset)}
                      title="Ubah Data Aset"
                      className="p-1.5 text-text-muted hover:text-text hover:bg-surface-2 rounded-lg transition-colors"
                    >
                      <PencilSimple size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(asset.id)}
                      disabled={deletingId === asset.id}
                      title="Hapus Aset"
                      className="p-1.5 text-text-muted hover:text-expense hover:bg-expense/10 rounded-lg transition-colors"
                    >
                      <Trash size={15} />
                    </button>
                  </div>
                </div>

                {/* Values & Progress */}
                <div className="p-2.5 bg-surface-2 rounded-xl space-y-2 border border-border/50">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-text-muted block">Harga Perolehan Awal:</span>
                      <span className="font-bold text-text whitespace-nowrap tabular-nums">
                        {formatRupiah(purchasePrice)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-text-muted block">Nilai Buku Sekarang:</span>
                      <span className="font-extrabold text-primary whitespace-nowrap tabular-nums">
                        {formatRupiah(bookValue)}
                      </span>
                    </div>
                  </div>

                  {asset.depreciation_method !== 'none' && (
                    <div className="space-y-1 pt-1 border-t border-border/40 text-[10px]">
                      <div className="flex items-center justify-between text-text-muted">
                        <span>Penyusutan: <span className="font-semibold text-expense">-{formatRupiah(accumDepr)}</span></span>
                        <span>{deprPercent}% Terdepresiasi</span>
                      </div>
                      <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
                        <div
                          className="h-full bg-expense rounded-full transition-all duration-500"
                          style={{ width: `${deprPercent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-text-muted pt-0.5">
                        <span>Beban per bulan:</span>
                        <span className="font-semibold text-purple-600 dark:text-purple-400 whitespace-nowrap tabular-nums">
                          {formatRupiah(monthlyDepr)} / bln
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {asset.notes && (
                  <p className="text-[10px] text-text-muted truncate px-0.5">
                    Catatan: {asset.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Asset Modal */}
      <AssetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateOrUpdate}
        initialData={editingAsset}
      />
    </div>
  );
}
