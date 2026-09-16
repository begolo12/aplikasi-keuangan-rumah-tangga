'use client';

import React, { useState } from 'react';
import { Subscription, Wallet, Category } from '@/lib/types';
import { SubscriptionItem } from './SubscriptionItem';
import { Plus, CalendarCheck, CheckCircle, XCircle, CircleDashed } from '@phosphor-icons/react';
import { formatRupiah } from '@/lib/formatters';
import { Modal } from '../ui/Modal';
import { AmountInput } from '../ui/AmountInput';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';
import { apiFetch, endpoints } from '@/lib/apiFetch';
import { ApiError } from '@/lib/apiFetch';
import { ConfirmModal } from '../ui/ConfirmModal';
import { useToast } from '../ui/Toast';
import { StatCard, StatGrid } from '../ui/StatCard';
import { Alert } from '../ui/Alert';

interface SubscriptionsViewProps {
  subscriptions: Subscription[];
  wallets: Wallet[];
  categories: Category[];
  monthlyTotal?: number;
  onRefresh?: () => void;
}

export function SubscriptionsView({
  subscriptions,
  wallets,
  categories,
  monthlyTotal = 0,
  onRefresh,
}: SubscriptionsViewProps) {
  const { notify } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [providerName, setProviderName] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [cycle, setCycle] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [nextChargeDate, setNextChargeDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(true);

  const activeSubs = subscriptions.filter((s) => s.is_active);
  const inactiveSubs = subscriptions.filter((s) => !s.is_active);

  const filteredCategories = categories.filter((c) => c.type === 'expense');
  const totalMonthly = activeSubs.reduce((sum, sub) => {
    if (sub.cycle === 'monthly') return sum + sub.amount;
    if (sub.cycle === 'yearly') return sum + sub.amount / 12;
    if (sub.cycle === 'weekly') return sum + sub.amount * 4.33;
    if (sub.cycle === 'daily') return sum + sub.amount * 30;
    return sum;
  }, 0);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiFetch(endpoints.subscriptions, {
        method: 'POST',
        json: {
          provider_name: providerName,
          amount: Number(amount),
          cycle,
          next_charge_date: nextChargeDate,
          category_id: categoryId || null,
          wallet_id: walletId || null,
          reminder_enabled: reminderEnabled,
        },
      });

      setIsAddOpen(false);
      setProviderName('');
      setAmount(0);
      setCycle('monthly');
      setNextChargeDate(new Date().toISOString().split('T')[0]);
      setCategoryId(null);
      setWalletId(null);
      setReminderEnabled(true);
      setLoading(false);
      onRefresh?.();
      notify('Langganan berhasil ditambahkan.', { tone: 'success' });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal menambahkan langganan.';
      setError(msg);
      notify(msg, { tone: 'error' });
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId) return;
    setIsDeleting(true);
    try {
      await apiFetch(endpoints.subscription(confirmDeleteId), { method: 'DELETE' });
      onRefresh?.();
      notify('Langganan dihapus.', { tone: 'success' });
      setConfirmDeleteId(null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal menghapus langganan.';
      setError(msg);
      notify(msg, { tone: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-text">Langganan & Berlangganan</h2>
          <p className="text-xs sm:text-sm text-text-muted">
            Lacak langganan digital (Netflix, Spotify, dll) dan tagihan bulanan berulang.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus size={18} weight="bold" />}
          onClick={() => setIsAddOpen(true)}
        >
          Tambah Langganan
        </Button>
      </div>

      {/* Summary Cards */}
      <StatGrid layout="1-2-3">
        <StatCard
          label="Beban Bulanan"
          icon={<CalendarCheck size={16} weight="bold" />}
          iconClassName="text-primary"
          value={formatRupiah(totalMonthly)}
          hint={`${activeSubs.length} aktif`}
        />
        <StatCard
          accent
          label="Persentase Anggaran"
          icon={<CircleDashed size={16} weight="fill" />}
          value={monthlyTotal > 0 ? `${Math.min(100, Math.round((totalMonthly / monthlyTotal) * 100))}%` : '-'}
          hint="dari anggaran bulanan"
        />
        <StatCard
          label="Status"
          tone={activeSubs.length > 0 ? 'income' : 'muted'}
          icon={activeSubs.length > 0 ? <CheckCircle size={16} weight="fill" /> : <XCircle size={16} weight="fill" />}
          iconClassName={activeSubs.length > 0 ? 'text-income' : 'text-text-muted'}
          value={activeSubs.length > 0 ? `${activeSubs.length} Aktif` : 'Tidak Ada'}
        />
      </StatGrid>

      {/* Error Display */}
      {error && (
        <Alert tone="error" size="sm">
          {error}
        </Alert>
      )}

      {/* Active Subscriptions */}
      {activeSubs.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-text">Aktif ({activeSubs.length})</h3>
          {activeSubs.map((sub) => (
            <SubscriptionItem
              key={sub.id}
              subscription={sub}
              onDelete={(id) => setConfirmDeleteId(id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CalendarCheck size={40} weight="duotone" />}
          title="Belum Ada Langganan Terdaftar"
          description="Tambahkan langganan seperti Netflix, Spotify, atau layanan lain yang berbayar."
        />
      )}

      {/* Inactive Subscriptions */}
      {inactiveSubs.length > 0 && (
        <div className="space-y-3 opacity-60">
          <h3 className="text-sm font-bold text-text-muted">Tidak Aktif ({inactiveSubs.length})</h3>
          {inactiveSubs.map((sub) => (
            <SubscriptionItem key={sub.id} subscription={sub} onDelete={(id) => setConfirmDeleteId(id)} />
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Tambah Langganan">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-text mb-1.5">Nama Layanan *</label>
            <input
              type="text"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-xl focus:border-primary outline-none transition-colors text-sm"
              placeholder="Contoh: Netflix Premium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text mb-1.5">Nominal per {cycle === 'yearly' ? 'tahun' : cycle === 'monthly' ? 'bulan' : cycle === 'weekly' ? 'minggu' : 'hari'} *</label>
            <AmountInput
              value={amount}
              onChange={(val) => setAmount(val)}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text mb-1.5">Siklus *</label>
            <select
              value={cycle}
              onChange={(e) => setCycle(e.target.value as typeof cycle)}
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-xl focus:border-primary outline-none transition-colors text-sm"
            >
              <option value="daily">Harian</option>
              <option value="weekly">Mingguan</option>
              <option value="monthly">Bulanan</option>
              <option value="yearly">Tahunan</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-text mb-1.5">Tagihan Berikutnya *</label>
            <input
              type="date"
              value={nextChargeDate}
              onChange={(e) => setNextChargeDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-xl focus:border-primary outline-none transition-colors text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text mb-1.5">Kategori</label>
            <select
              value={categoryId || ''}
              onChange={(e) => setCategoryId(e.target.value || null)}
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-xl focus:border-primary outline-none transition-colors text-sm"
            >
              <option value="">Pilih kategori</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-text mb-1.5">Dompet Pembayaran</label>
            <select
              value={walletId || ''}
              onChange={(e) => setWalletId(e.target.value || null)}
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-xl focus:border-primary outline-none transition-colors text-sm"
              defaultValue=""
            >
              <option value="">Pilih dompet</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="reminder"
              checked={reminderEnabled}
              onChange={(e) => setReminderEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <label htmlFor="reminder" className="text-xs font-medium text-text">
              Aktifkan pengingat H-7/H-1
            </label>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="md" onClick={() => setIsAddOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={loading}>
              Simpan
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Langganan"
        message="Langganan ini akan dihapus permanen dari daftar Anda. Riwayat transaksi yang sudah tercatat tidak terpengaruh."
        confirmLabel="Ya, Hapus"
        isLoading={isDeleting}
      />
    </div>
  );
}
