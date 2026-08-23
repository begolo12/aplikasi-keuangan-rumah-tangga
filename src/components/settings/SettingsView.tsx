'use client';

import React, { useState } from 'react';
import { User, AppSettings } from '@/lib/types';
import { Button } from '../ui/Button';
import {
  DownloadSimple,
  UploadSimple,
  SignOut,
  FloppyDisk,
  CheckCircle,
  Warning,
  User as UserIcon,
  UsersThree,
} from '@phosphor-icons/react';

interface SettingsViewProps {
  user: User;
  settings: AppSettings | null;
  onRefresh: () => void;
  onLogout: () => void;
}

export function SettingsView({ user, settings, onRefresh, onLogout }: SettingsViewProps) {
  const [familyName, setFamilyName] = useState(settings?.family_name || user.family_name || 'Keluarga Bahagia');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ family_name: familyName, currency: 'IDR' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal menyimpan pengaturan');

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportBackup = () => {
    window.open('/api/backup/export', '_blank');
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('PERINGATAN: Memulihkan backup akan menimpa data transaksi saat ini dengan data dari file backup. Lanjutkan?')) {
      e.target.value = '';
      return;
    }

    setIsRestoring(true);
    setRestoreMessage(null);

    try {
      const text = await file.text();
      const backupJson = JSON.parse(text);

      const res = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupJson),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal memulihkan backup');

      setRestoreMessage('Data berhasil dipulihkan!');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Format file JSON tidak valid');
    } finally {
      setIsRestoring(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-text">Pengaturan Akun & Data</h2>
        <p className="text-xs md:text-sm text-text-muted">
          Kelola profil keluarga, backup database, dan keamanan akun.
        </p>
      </div>

      {/* Card 1: Profil Pengguna & Keluarga */}
      <div className="p-5 md:p-6 bg-surface border border-border rounded-3xl space-y-4 shadow-xs">
        <h3 className="text-base font-bold text-text flex items-center gap-2">
          <UserIcon size={20} className="text-primary" weight="duotone" />
          <span>Profil Pengguna</span>
        </h3>

        <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
          {saveSuccess && (
            <div className="p-3 bg-income/10 border border-income/20 text-income rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle size={16} weight="fill" />
              <span>Pengaturan berhasil disimpan.</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-text-muted">Nama Pengguna</label>
            <input
              type="text"
              disabled
              value={user.name}
              className="w-full h-11 px-4 bg-surface-2 border border-border rounded-xl text-sm font-medium opacity-80 cursor-not-allowed"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-text-muted">Email Akun</label>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full h-11 px-4 bg-surface-2 border border-border rounded-xl text-sm font-medium opacity-80 cursor-not-allowed"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-text-muted">Nama Keluarga / Rumah Tangga</label>
            <div className="relative flex items-center">
              <UsersThree size={20} className="absolute left-3 text-text-muted" />
              <input
                type="text"
                required
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="Contoh: Keluarga Ganang"
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

      {/* Card 2: Backup & Restore JSON (Data Portability) */}
      <div className="p-5 md:p-6 bg-surface border border-border rounded-3xl space-y-4 shadow-xs">
        <h3 className="text-base font-bold text-text flex items-center gap-2">
          <DownloadSimple size={20} className="text-primary" weight="duotone" />
          <span>Cadangan & Pemulihan Data (Backup & Restore)</span>
        </h3>
        <p className="text-xs text-text-muted">
          Unduh seluruh data keuangan Anda ke file format JSON sebagai salinan cadangan offline, atau pulihkan data dari file yang pernah diunduh.
        </p>

        {restoreMessage && (
          <div className="p-3 bg-income/10 border border-income/20 text-income rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle size={16} weight="fill" />
            <span>{restoreMessage}</span>
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
            <span>{isRestoring ? 'Memulihkan...' : 'Pulihkan dari File JSON'}</span>
            <input
              type="file"
              accept=".json"
              disabled={isRestoring}
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Card 3: Keluar Akun */}
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
