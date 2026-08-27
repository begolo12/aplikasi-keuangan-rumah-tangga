'use client';

import React, { useState, useEffect } from 'react';
import { User, AppSettings } from '@/lib/types';
import { Button } from '../ui/Button';
import { apiFetch, endpoints, ApiError } from '@/lib/apiFetch';
import {
  DownloadSimple,
  UploadSimple,
  SignOut,
  FloppyDisk,
  CheckCircle,
  User as UserIcon,
  UsersThree,
  WarningCircle,
  Sun,
  Moon,
  Desktop,
  PaintBrushBroad,
} from '@phosphor-icons/react';

type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsViewProps {
  user: User;
  settings: AppSettings | null;
  onRefresh: () => void;
  onLogout: () => void;
}

export function SettingsView({ user, settings, onRefresh, onLogout }: SettingsViewProps) {
  const [userName, setUserName] = useState(user.name || '');
  const [familyName, setFamilyName] = useState(settings?.family_name || user.family_name || 'Keluarga Bahagia');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [themeMode, setThemeMode] = useState<ThemeMode>('system');

  useEffect(() => {
    let active = true;
    const syncTheme = () => {
      if (!active) return;
      try {
        const saved = localStorage.getItem('theme');
        if (saved === 'light' || saved === 'dark') {
          setThemeMode(saved);
        } else {
          setThemeMode('system');
        }
      } catch {
        setThemeMode('system');
      }
    };

    Promise.resolve().then(syncTheme);

    window.addEventListener('theme-changed', syncTheme);
    window.addEventListener('storage', syncTheme);

    return () => {
      active = false;
      window.removeEventListener('theme-changed', syncTheme);
      window.removeEventListener('storage', syncTheme);
    };
  }, []);

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
    try {
      if (mode === 'system') {
        localStorage.removeItem('theme');
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } else {
        localStorage.setItem('theme', mode);
        if (mode === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      window.dispatchEvent(new Event('theme-changed'));
    } catch {
      // Ignore localStorage errors in restricted environments
    }
  };

  useEffect(() => {
    if (themeMode !== 'system') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => {
      if (localStorage.getItem('theme')) return;
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [themeMode]);

  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      await apiFetch(endpoints.settings, {
        method: 'PUT',
        json: {
          name: userName.trim() || undefined,
          family_name: familyName.trim(),
          currency: 'IDR',
        },
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onRefresh();
    } catch (err: unknown) {
      setSaveError(err instanceof ApiError ? err.message : 'Gagal menyimpan pengaturan');
    } finally {
      setIsSaving(false);
    }
  };

  const [lastBackupAt, setLastBackupAt] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('kaskeluarga-last-backup');
  });
  // Usia cadangan dihitung di effect, bukan di render (purity).
  const [backupDaysSince, setBackupDaysSince] = useState<number | null>(null);
  useEffect(() => {
    setBackupDaysSince(
      lastBackupAt ? Math.floor((Date.now() - new Date(lastBackupAt).getTime()) / (1000 * 60 * 60 * 24)) : null
    );
  }, [lastBackupAt]);

  const handleExportBackup = () => {
    window.open(endpoints.backupExport, '_blank');
    const nowIso = new Date().toISOString();
    try {
      window.localStorage.setItem('kaskeluarga-last-backup', nowIso);
    } catch {
      // Private mode / storage penuh: pengingat saja yang tidak tersimpan
    }
    setLastBackupAt(nowIso);
    setBackupDaysSince(0);
  };

  const backupIsStale = backupDaysSince === null || backupDaysSince > 30;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingRestoreFile(file);
    setRestoreError(null);
    setRestoreMessage(null);
    e.target.value = '';
  };

  const executeRestore = async () => {
    if (!pendingRestoreFile) return;

    setIsRestoring(true);
    setRestoreError(null);
    setRestoreMessage(null);

    try {
      const text = await pendingRestoreFile.text();
      let backupJson: unknown;
      try {
        backupJson = JSON.parse(text);
      } catch {
        throw new Error('Format file JSON tidak valid.');
      }

      await apiFetch(endpoints.backupImport, {
        method: 'POST',
        json: backupJson,
      });

      setRestoreMessage('Data backup berhasil dipulihkan!');
      setPendingRestoreFile(null);
      onRefresh();
    } catch (err: unknown) {
      setRestoreError(err instanceof Error ? err.message : 'Gagal memulihkan backup.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-text">Pengaturan Akun & Data</h2>
        <p className="text-xs md:text-sm text-text-muted">
          Kelola profil pengguna, nama kas, dan cadangan data keuangan.
        </p>
      </div>

      {/* Card 1: Profil Pengguna & Kas */}
      <div className="p-5 md:p-6 bg-surface border border-border rounded-3xl space-y-4 shadow-xs">
        <h3 className="text-base font-bold text-text flex items-center gap-2">
          <UserIcon size={20} className="text-primary" weight="duotone" />
          <span>Profil Pengguna & Kas</span>
        </h3>

        <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
          {saveSuccess && (
            <div className="p-3 bg-income/10 border border-income/20 text-income rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle size={16} weight="fill" />
              <span>Profil berhasil disimpan.</span>
            </div>
          )}

          {saveError && (
            <div role="alert" className="p-3 bg-expense/10 border border-expense/20 text-expense rounded-xl text-xs font-semibold flex items-center gap-2">
              <WarningCircle size={16} weight="fill" />
              <span>{saveError}</span>
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="settings-user-name" className="block text-xs font-semibold text-text-muted">
              Nama Pengguna
            </label>
            <input
              id="settings-user-name"
              type="text"
              required
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-text-muted">Email Akun (Terdaftar)</label>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full h-11 px-4 bg-surface-2 border border-border rounded-xl text-sm font-medium opacity-80 cursor-not-allowed text-text-muted"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="settings-family-name" className="block text-xs font-semibold text-text-muted">
              Nama Kas / Buku Keuangan
            </label>
            <div className="relative flex items-center">
              <UsersThree size={20} className="absolute left-3 text-text-muted" />
              <input
                id="settings-family-name"
                type="text"
                required
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="Contoh: Kas Pribadi atau Keluarga Ganang"
                className="w-full h-11 pl-10 pr-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSaving}
            leftIcon={<FloppyDisk size={18} weight="bold" />}
          >
            Simpan Perubahan
          </Button>
        </form>
      </div>

      {/* Card 2: Tema & Tampilan */}
      <div className="p-5 md:p-6 bg-surface border border-border rounded-3xl space-y-4 shadow-xs">
        <h3 className="text-base font-bold text-text flex items-center gap-2">
          <PaintBrushBroad size={20} className="text-primary" weight="duotone" />
          <span>Tema & Tampilan</span>
        </h3>
        <p className="text-xs text-text-muted">
          Pilih tema tampilan yang nyaman untuk mata Anda saat menggunakan aplikasi.
        </p>

        <div className="grid grid-cols-3 gap-2.5 max-w-md">
          {[
            { id: 'light' as const, label: 'Terang', icon: Sun },
            { id: 'dark' as const, label: 'Gelap', icon: Moon },
            { id: 'system' as const, label: 'Sistem', icon: Desktop },
          ].map(({ id, label, icon: Icon }) => {
            const isActive = themeMode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleThemeChange(id)}
                className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border transition-all text-xs font-bold ${
                  isActive
                    ? 'bg-primary text-primary-fg border-primary shadow-xs'
                    : 'bg-background hover:bg-surface-2 border-border text-text'
                }`}
              >
                <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Card 3: Backup & Restore JSON (Data Portability) */}
      <div className="p-5 md:p-6 bg-surface border border-border rounded-3xl space-y-4 shadow-xs">
        <h3 className="text-base font-bold text-text flex items-center gap-2">
          <DownloadSimple size={20} className="text-primary" weight="duotone" />
          <span>Cadangan & Pemulihan Data (Backup & Restore)</span>
        </h3>
        <p className="text-xs text-text-muted">
          Unduh seluruh data transaksi dan saldo Anda ke file format JSON sebagai arsip offline, atau pulihkan data kapan saja.
        </p>

        {restoreMessage && (
          <div className="p-3 bg-income/10 border border-income/20 text-income rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle size={16} weight="fill" />
            <span>{restoreMessage}</span>
          </div>
        )}

        {restoreError && (
          <div role="alert" className="p-3 bg-expense/10 border border-expense/20 text-expense rounded-xl text-xs font-semibold flex items-center gap-2">
            <WarningCircle size={16} weight="fill" />
            <span>{restoreError}</span>
          </div>
        )}

        {pendingRestoreFile && (
          <div className="p-4 bg-warning/10 border border-warning/30 rounded-2xl space-y-2">
            <p className="text-xs font-bold text-warning">
              Konfirmasi Pemulihan Data ({pendingRestoreFile.name}):
            </p>
            <p className="text-[11px] text-text-muted">
              Memulihkan data akan menggantikan riwayat transaksi dan data dompet saat ini dengan isi file backup.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="primary"
                size="sm"
                isLoading={isRestoring}
                onClick={executeRestore}
              >
                Ya, Pulihkan Sekarang
              </Button>
              <button
                type="button"
                onClick={() => setPendingRestoreFile(null)}
                className="px-3 py-1.5 text-xs text-text-muted hover:text-text font-semibold bg-surface-2 rounded-xl"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            variant="outline"
            size="md"
            leftIcon={<DownloadSimple size={18} weight="bold" />}
            onClick={handleExportBackup}
          >
            Unduh Cadangan JSON
          </Button>

          <label className="inline-flex items-center justify-center h-11 px-4 text-sm font-semibold rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-text cursor-pointer transition-all active:scale-95 gap-2">
            <UploadSimple size={18} weight="bold" />
            <span>{isRestoring ? 'Memproses...' : 'Pilih File JSON untuk Pulihkan'}</span>
            <input
              type="file"
              accept=".json"
              disabled={isRestoring}
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>

        <p className={`text-[11px] font-semibold ${backupIsStale ? 'text-warning' : 'text-text-muted'}`}>
          {backupDaysSince === null
            ? 'Belum pernah membuat cadangan. Sebaiknya unduh cadangan minimal sebulan sekali.'
            : `Cadangan terakhir: ${backupDaysSince} hari lalu (${new Date(lastBackupAt!).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}).`}
        </p>
      </div>

      {/* Card 4: Keluar Akun */}
      <div className="p-5 md:p-6 bg-surface border border-border rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <h4 className="text-sm font-bold text-text">Keluar dari Sesi Aplikasi</h4>
          <p className="text-xs text-text-muted">
            Anda dapat masuk kembali kapan saja dengan email dan kata sandi Anda.
          </p>
        </div>

        <Button
          variant="danger"
          size="md"
          leftIcon={<SignOut size={18} weight="bold" />}
          onClick={onLogout}
        >
          Keluar dari Akun
        </Button>
      </div>
    </div>
  );
}
