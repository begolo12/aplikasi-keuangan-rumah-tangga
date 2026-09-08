'use client';

import { useState } from 'react';
import { BellSlash, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { Button } from '../ui/Button';

type PushState = 'idle' | 'unsupported' | 'busy' | 'subscribed' | 'error';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

/**
 * Mengaktifkan Web Push pengingat tagihan (bekerja walau aplikasi tertutup).
 * Tombol meminta izin notifikasi, membuat subscription push, lalu mengirimkannya
 * ke server. Di iOS hanya berfungsi pada PWA yang sudah di-install ke layar utama.
 */
export function PushEnabler() {
  const [state, setState] = useState<PushState>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const handleEnable = async () => {
    setMessage(null);

    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setState('unsupported');
      setMessage('Browser ini tidak mendukung push notification.');
      return;
    }

    setState('busy');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState('error');
        setMessage('Izin notifikasi tidak diberikan.');
        return;
      }

      const reg = await navigator.serviceWorker.ready;

      const keyRes = await fetch('/api/push/public-key');
      const keyJson = await keyRes.json();
      if (!keyRes.ok || !keyJson?.data?.publicKey) {
        setState('error');
        setMessage(keyJson?.error || 'Server belum siap menerima push.');
        return;
      }

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyJson.data.publicKey).buffer as ArrayBuffer,
        });
      }

      const json = sub.toJSON();
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setState('error');
        setMessage(err?.error || 'Gagal mendaftarkan push ke server.');
        return;
      }

      setState('subscribed');
      setMessage('Push aktif. Pengingat tagihan terkirim walau aplikasi tertutup.');
    } catch {
      setState('error');
      setMessage('Gagal mengaktifkan push. Coba lagi atau gunakan browser lain.');
    }
  };

  return (
    <div className="space-y-2 pt-1 border-t border-border">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-xs font-bold text-text">Push Notification (App Tertutup)</p>
          <p className="text-[11px] text-text-muted">
            Kirim pengingat tagihan walau aplikasi tidak dibuka. Di iOS hanya pada PWA ter-install.
          </p>
        </div>
        <Button
          variant="outline"
          size="md"
          leftIcon={
            state === 'subscribed'
              ? <CheckCircle size={18} weight="fill" className="text-income" />
              : state === 'error' || state === 'unsupported'
              ? <WarningCircle size={18} weight="fill" className="text-expense" />
              : <BellSlash size={18} weight="duotone" className="text-primary" />
          }
          onClick={handleEnable}
          disabled={state === 'busy' || state === 'subscribed' || state === 'unsupported'}
          isLoading={state === 'busy'}
        >
          {state === 'subscribed' ? 'Push Aktif' : state === 'busy' ? 'Mengaktifkan...' : 'Aktifkan Push'}
        </Button>
      </div>
      {message && (
        <p className={`text-[11px] font-semibold ${state === 'subscribed' ? 'text-income' : 'text-expense'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
