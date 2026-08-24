'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Transaction, TransactionType } from '@/lib/types';
import { apiFetchMeta, endpoints } from '@/lib/apiFetch';
import { TransactionItem } from './TransactionItem';
import { EmptyState } from '../ui/EmptyState';
import { TransactionItemSkeleton } from '../ui/LoadingSkeleton';
import { MagnifyingGlass, Receipt, ArrowDown } from '@phosphor-icons/react';

const PAGE_SIZE = 30;

interface TransactionListProps {
  /** Mode legacy (dashboard): daftar sudah disiapkan dari bootstrap di parent. */
  transactions?: Transaction[];
  /** Mode server: bulan/tahun periode aktif; komponen mengambil data sendiri. */
  month?: number;
  year?: number;
  /** Kunci untuk memicu reload ulang data server-mode dari parent (mis. setelah tambah/edit/hapus). */
  refreshKey?: number;
  onDeleteTransaction: (id: string) => Promise<void>;
  onEditTransaction?: (transaction: Transaction) => void;
  onOpenAddModal: (type?: TransactionType) => void;
  isLoading?: boolean;
}

export function TransactionList({
  transactions,
  month,
  year,
  refreshKey = 0,
  onDeleteTransaction,
  onEditTransaction,
  onOpenAddModal,
  isLoading = false,
}: TransactionListProps) {
  const isServerMode = month !== undefined && year !== undefined;

  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [serverItems, setServerItems] = useState<Transaction[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const requestSeq = useRef(0);

  // Debounce pencarian 300ms agar tidak menembak API per ketukan.
  useEffect(() => {
    if (!isServerMode) return;
    const timer = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput, isServerMode]);

  // Reset daftar saat filter/periode/pencarian berubah.
  useEffect(() => {
    if (!isServerMode) return;
    const seq = ++requestSeq.current;
    let active = true;
    // Flag loading via microtask agar efek tidak memicu render berantai (lint set-state-in-effect).
    Promise.resolve().then(() => {
      if (active && seq === requestSeq.current) {
        setIsFetching(true);
        setFetchError(false);
      }
    });
    apiFetchMeta<Transaction[]>(
      endpoints.transactionsQuery({ month, year, type: filterType, search: searchQuery, limit: PAGE_SIZE, offset: 0 })
    )
      .then(({ data, total }) => {
        if (!active || seq !== requestSeq.current) return;
        setServerItems(data);
        setServerTotal(total ?? data.length);
      })
      .catch(() => {
        if (!active || seq !== requestSeq.current) return;
        setFetchError(true);
      })
      .finally(() => {
        if (active && seq === requestSeq.current) setIsFetching(false);
      });
    return () => {
      active = false;
    };
  }, [isServerMode, month, year, filterType, searchQuery, refreshKey, refreshNonce]);

  const handleLoadMore = async () => {
    if (!isServerMode || isFetching) return;
    const seq = ++requestSeq.current;
    setIsFetching(true);
    try {
      const { data } = await apiFetchMeta<Transaction[]>(
        endpoints.transactionsQuery({
          month,
          year,
          type: filterType,
          search: searchQuery,
          limit: PAGE_SIZE,
          offset: serverItems.length,
        })
      );
      if (seq !== requestSeq.current) return;
      // Dedup idempoten: jaga-jaga bila ada baris baru muncul di antara halaman.
      setServerItems((prev) => {
        const seen = new Set(prev.map((t) => t.id));
        return [...prev, ...data.filter((t) => !seen.has(t.id))];
      });
    } catch {
      // Biarkan tombol tetap bisa dicoba lagi.
    } finally {
      if (seq === requestSeq.current) setIsFetching(false);
    }
  };

  const displayItems = isServerMode ? serverItems : (transactions ?? []);
  const shownCount = displayItems.length;
  const totalCount = isServerMode ? Math.max(serverTotal, shownCount) : shownCount;
  const hasMore = isServerMode && !fetchError && shownCount < totalCount;

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-1">
        <div>
          <h3 className="text-sm md:text-base font-bold text-text">Riwayat Transaksi</h3>
          <p className="text-xs text-text-muted">
            {fetchError
              ? 'Gagal memuat transaksi.'
              : `Menampilkan ${shownCount} dari ${totalCount} transaksi periode ini.`}
          </p>
        </div>

        {/* Filter Type Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-surface border border-border rounded-2xl overflow-x-auto no-scrollbar shrink-0">
          {(['all', 'expense', 'income', 'transfer'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                filterType === type
                  ? 'bg-primary text-primary-fg shadow-xs'
                  : 'text-text-muted hover:text-text hover:bg-surface-2'
              }`}
            >
              {type === 'all'
                ? 'Semua'
                : type === 'expense'
                ? 'Pengeluaran'
                : type === 'income'
                ? 'Pemasukan'
                : 'Transfer'}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <MagnifyingGlass size={18} className="absolute left-3.5 text-text-muted select-none" />
        <input
          type="text"
          id="transaction-search-input"
          aria-label="Cari transaksi"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Cari transaksi berdasarkan catatan atau kategori..."
          className="w-full h-11 pl-10 pr-4 bg-surface border border-border rounded-2xl text-xs md:text-sm font-medium focus:bg-background focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-text-muted/40 transition-all"
        />
        {searchInput && (
          <button
            onClick={() => setSearchInput('')}
            aria-label="Reset pencarian"
            className="absolute right-3 text-xs text-text-muted hover:text-text font-bold px-2 py-1 bg-surface-2 rounded-lg"
          >
            Reset
          </button>
        )}
      </div>

      {/* Transactions List */}
      <div className="space-y-2.5">
        {isLoading || (isServerMode && isFetching && serverItems.length === 0) ? (
          <>
            <TransactionItemSkeleton />
            <TransactionItemSkeleton />
            <TransactionItemSkeleton />
          </>
        ) : fetchError && isServerMode ? (
          <EmptyState
            icon={<Receipt size={36} weight="duotone" />}
            title="Gagal Memuat"
            description="Terjadi kesalahan saat mengambil transaksi. Coba lagi."
            actionLabel="Muat Ulang"
            onAction={() => {
              // Ubah kunci dependensi agar efek fetch jalan ulang.
              setRefreshNonce((n) => n + 1);
            }}
          />
        ) : displayItems.length > 0 ? (
          <>
            {displayItems.map((trx) => (
              <TransactionItem
                key={trx.id}
                transaction={trx}
                onDelete={onDeleteTransaction}
                onEdit={onEditTransaction}
              />
            ))}
            {hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={isFetching}
                className="w-full min-h-[44px] mt-2 px-4 py-2.5 bg-surface hover:bg-surface-2 border border-border text-text text-xs font-bold rounded-2xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <ArrowDown size={14} weight="bold" className={isFetching ? 'animate-bounce' : ''} />
                {isFetching ? 'Memuat...' : 'Muat Lebih Banyak'}
              </button>
            )}
          </>
        ) : (
          <EmptyState
            icon={<Receipt size={36} weight="duotone" />}
            title="Belum Ada Transaksi"
            description={
              searchQuery || searchInput
                ? 'Tidak ada transaksi yang cocok dengan kata kunci pencarian Anda.'
                : 'Belum ada transaksi yang dicatat pada periode bulan ini.'
            }
            actionLabel="Catat Pengeluaran Pertama"
            onAction={() => onOpenAddModal('expense')}
          />
        )}
      </div>
    </div>
  );
}
