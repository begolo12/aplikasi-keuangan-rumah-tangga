'use client';

import React, { useState, useEffect } from 'react';
import { WifiSlash, ArrowClockwise, CheckCircle } from '@phosphor-icons/react';
import { drainOfflineQueue, getOfflineMutations } from '@/lib/offlineQueue';

interface OfflineBannerProps {
  userId: string;
  onSynced?: () => void;
}

export function OfflineBanner({ userId, onSynced }: OfflineBannerProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const checkQueue = async () => {
    if (!userId) return;
    const items = await getOfflineMutations(userId);
    setPendingCount(items.length);
  };

  const handleSync = async () => {
    if (!isOnline || isSyncing || !userId) return;
    setIsSyncing(true);
    const { synced } = await drainOfflineQueue(userId, onSynced);
    setIsSyncing(false);
    await checkQueue();
    if (synced > 0) {
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);
    checkQueue();

    const handleOnline = () => {
      setIsOnline(true);
      handleSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      checkQueue();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [userId]);

  if (isOnline && pendingCount === 0 && !syncSuccess) {
    return null;
  }

  return (
    <div className="w-full bg-amber-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-sm z-40">
      <div className="flex items-center gap-2">
        {!isOnline ? (
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
