'use client';

import React, { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { WifiSlash, ArrowClockwise, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { drainOfflineQueue, getOfflineMutations } from '@/lib/offlineQueue';

interface OfflineBannerProps {
  userId: string;
  onSynced?: () => void;
}

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnlineSnapshot() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function getOnlineServerSnapshot() {
  return true;
}

export function OfflineBanner({ userId, onSynced }: OfflineBannerProps) {
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [deadCount, setDeadCount] = useState(0);

  const checkQueue = useCallback(async () => {
    if (!userId) return;
    try {
      const items = await getOfflineMutations(userId);
      setPendingCount(items.length);
    } catch {
      // IndexedDB error caught safely
    }
  }, [userId]);

  const handleSync = useCallback(async () => {
    if (!isOnline || isSyncing || !userId) return;
    setIsSyncing(true);
    try {
      const { synced, dead } = await drainOfflineQueue(userId, onSynced);
      await checkQueue();
      if (dead > 0) setDeadCount((prev) => prev + dead);
      if (synced > 0) {
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 3000);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, userId, onSynced, checkQueue]);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    const run = async () => {
      try {
        const items = await getOfflineMutations(userId);
        if (active) setPendingCount(items.length);
      } catch {
        // safely ignored
      }

      if (isOnline) {
        try {
          const { synced, dead } = await drainOfflineQueue(userId, onSynced);
          if (active && dead > 0) setDeadCount((prev) => prev + dead);
          if (active && synced > 0) {
            setSyncSuccess(true);
            setTimeout(() => setSyncSuccess(false), 3000);
          }
        } catch {
          // safely ignored
        }
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [userId, isOnline, onSynced]);

  if (isOnline && pendingCount === 0 && !syncSuccess && deadCount === 0) {
    return null;
  }

  return (
    <div
      role="status"
      className={`w-full px-4 py-2 text-xs font-semibold flex flex-wrap items-center justify-between gap-2 shadow-sm z-40 ${
        deadCount > 0 ? 'bg-expense' : 'bg-amber-500'
      } text-white`}
    >
      <div className="flex items-center gap-2">
        {deadCount > 0 ? (
          <>
            <WarningCircle size={16} weight="fill" />
            <span>
              {deadCount} catatan offline gagal tersinkron setelah beberapa percobaan dan sudah dihapus dari antrean perangkat.
            </span>
            <button
              onClick={() => setDeadCount(0)}
              aria-label="Tutup peringatan"
              className="underline underline-offset-2 font-bold hover:opacity-80 shrink-0"
            >
              Tutup
            </button>
          </>
        ) : !isOnline ? (
          <>
            <WifiSlash size={16} weight="bold" />
            <span>Mode Offline — Transaksi disimpan di perangkat dan disinkronkan saat online.</span>
          </>
        ) : syncSuccess ? (
          <>
            <CheckCircle size={16} weight="fill" />
            <span>Semua transaksi offline berhasil disinkronkan ke server!</span>
          </>
        ) : (
          <>
            <ArrowClockwise size={16} className={isSyncing ? 'animate-spin' : ''} />
            <span>{pendingCount} transaksi belum tersinkronisasi.</span>
          </>
        )}
      </div>

      {isOnline && pendingCount > 0 && (
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg text-white font-bold transition-all text-xs"
        >
          {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
        </button>
      )}
    </div>
  );
}
