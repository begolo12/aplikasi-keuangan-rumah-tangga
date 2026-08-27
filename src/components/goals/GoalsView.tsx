'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { AmountInput } from '../ui/AmountInput';
import { Button } from '../ui/Button';
import { Wallet, SavingsGoal } from '@/lib/types';
import { apiFetch, endpoints, ApiError } from '@/lib/apiFetch';
import { formatRupiah, formatDate } from '@/lib/formatters';
import {
  Target,
  Plus,
  Coins,
  PencilSimple,
  Trash,
  ArrowsLeftRight,
  WarningCircle,
  CaretRight,
} from '@phosphor-icons/react';

interface GoalsViewProps {
  userId: string;
  wallets: Wallet[];
}

export function GoalsView({ wallets }: GoalsViewProps) {
  const [goals, setGoals] = useState<SavingsGoal[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  // Add / Edit modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState(0);
  const [targetDate, setTargetDate] = useState('');
  const [destWalletId, setDestWalletId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Contribute modal state
  const [contribGoal, setContribGoal] = useState<SavingsGoal | null>(null);
  const [contribAmount, setContribAmount] = useState(0);
  const [srcWalletId, setSrcWalletId] = useState('');
  const [isContributing, setIsContributing] = useState(false);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<SavingsGoal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchGoals = React.useCallback(async () => {
    setListError(null);
    try {
      const data = await apiFetch<{ goals: SavingsGoal[] }>(endpoints.goals);
      setGoals(data.goals || []);
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : 'Gagal memuat target tabungan.');
      setGoals([]);
    }
  }, []);

  React.useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const openAddForm = () => {
    setEditingGoal(null);
    setGoalName('');
    setTargetAmount(0);
    setTargetDate('');
    setDestWalletId('');
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (g: SavingsGoal) => {
    setEditingGoal(g);
    setGoalName(g.name);
    setTargetAmount(g.target_amount);
    setTargetDate(g.target_date || '');
    setDestWalletId(g.wallet_id || '');
    setFormError(null);
    setIsFormOpen(true);
  };

  const openContribute = (g: SavingsGoal) => {
    if (!g.wallet_id) {
      setActionError('Atur dompet penampung target ini dulu lewat tombol Ubah.');
      return;
    }
    setActionError(null);
    setContribGoal(g);
    setContribAmount(0);
    const def = wallets.find((w) => w.is_default && w.id !== g.wallet_id) || wallets.find((w) => w.id !== g.wallet_id);
    setSrcWalletId(def?.id || '');
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName.trim()) {
      setFormError('Nama target wajib diisi.');
      return;
    }
    if (targetAmount <= 0) {
      setFormError('Nominal target harus lebih dari 0.');
      return;
    }
    setIsSaving(true);
    setFormError(null);
    try {
      await apiFetch(editingGoal ? endpoints.goal(editingGoal.id) : endpoints.goals, {
        method: editingGoal ? 'PUT' : 'POST',
        json: {
          name: goalName.trim(),
          target_amount: targetAmount,
          target_date: targetDate || null,
          wallet_id: destWalletId || null,
        },
      });
      setIsFormOpen(false);
      await fetchGoals();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Gagal menyimpan target.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribGoal) return;
    if (!srcWalletId || srcWalletId === contribGoal.wallet_id) {
      setActionError('Pilih dompet sumber yang berbeda dari penampung target.');
      return;
    }
    setIsContributing(true);
    try {
      await apiFetch(endpoints.contributeGoal(contribGoal.id), {
        method: 'POST',
        json: { amount: contribAmount, wallet_id: srcWalletId },
      });
      setContribGoal(null);
      await fetchGoals();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Gagal mengalokasikan dana.');
    } finally {
      setIsContributing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiFetch(endpoints.goal(deleteTarget.id), { method: 'DELETE' });
      setDeleteTarget(null);
      await fetchGoals();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Gagal menghapus target.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (goals === null) {
    return (
      <div className="space-y-3 max-w-4xl">
        {[0, 1, 2].map((i) => (
          <div key={i} className="p-4 bg-surface border border-border rounded-3xl animate-pulse h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-xl font-bold text-text flex items-center gap-2">
            <Target size={22} className="text-primary" weight="duotone" />
            <span>Target Tabungan</span>
          </h2>
          <p className="text-xs text-text-muted">
            Rencanakan uang yang perlu dikumpulkan: Dana Darurat, DP rumah, atau kebutuhan keluarga.
          </p>
        </div>
        <Button variant="primary" size="md" leftIcon={<Plus size={16} weight="bold" />} onClick={openAddForm}>
          Buat Target
        </Button>
      </div>

      {actionError && (
        <div role="alert" className="p-3 bg-expense/10 border border-expense/20 rounded-2xl text-expense text-xs font-semibold flex items-center gap-2">
          <WarningCircle size={16} weight="fill" />
          {actionError}
        </div>
      )}

      {listError && (
        <div className="rounded-2xl border border-expense/20 bg-expense/5 p-5 text-sm text-expense font-semibold">{listError}</div>
      )}

      {goals.length === 0 && !listError && (
        <div className="p-8 text-center border border-dashed border-border rounded-3xl space-y-2">
          <Coins size={30} weight="duotone" className="mx-auto text-text-muted" />
          <p className="text-sm font-bold text-text">Belum ada target tabungan</p>
          <p className="text-xs text-text-muted">Buat satu tujuan tabungan supaya menyisihkan uang terasa punya arah.</p>
          <Button variant="outline" size="sm" onClick={openAddForm} className="mt-1">
            Buat Target Pertama
          </Button>
        </div>
      )}

      {/* Goal Cards */}
      <div className="space-y-3">
        {goals.map((g) => {
          const pct = Math.min(100, Math.round(g.percentage || 0));
          const isReached = g.remaining_amount <= 0;
          const monthsNeeded = g.months_left_to_target ?? null;
          const monthlyProgress = g.monthly_progress ?? 0;

          let projectionText = '';
          if (isReached) {
            projectionText = 'Tercapai! Pertahankan.';
          } else if (monthsNeeded && monthsNeeded >= 1) {
            const etaDate = new Date();
            etaDate.setMonth(etaDate.getMonth() + Math.ceil(monthsNeeded));
            projectionText = `Estimasi tercapai sekitar ${formatDate(etaDate.toISOString().split('T')[0], 'long')} (${Math.ceil(monthsNeeded)} bulan lagi).`;
          } else if (g.target_date) {
            projectionText = `Kurang ${formatRupiah(g.remaining_amount)} lagi sampai ${g.target_date}.`;
          } else {
            projectionText = `Sisa ${formatRupiah(g.remaining_amount)} untuk mencapai target.`;
          }

          return (
            <div key={g.id} className="p-4 bg-surface border border-border rounded-3xl space-y-3 shadow-2xs">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <h3 className="text-sm font-bold text-text truncate">{g.name}</h3>
                  <p className="text-[11px] text-text-muted truncate">
                    Penampung: {g.wallet_name || 'belum diatur'}
                    {g.target_date ? ` • Target ${formatDate(g.target_date, 'short')}` : ''}
                  </p>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-1 rounded-lg shrink-0 ${isReached ? 'bg-income/10 text-income' : 'bg-primary-subtle text-primary'}`}>
                  {pct}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-surface-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${isReached ? 'bg-income' : 'bg-primary'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="block text-text-muted">Terkumpul</span>
                  <span className="font-display-num text-sm md:text-base text-primary tabular-nums whitespace-nowrap">
                    {formatRupiah(g.saved_amount)}
                  </span>
                </div>
                <div>
                  <span className="block text-text-muted">Dari Target</span>
                  <span className="font-bold text-text tabular-nums whitespace-nowrap">{formatRupiah(g.target_amount)}</span>
                </div>
                <div>
                  <span className="block text-text-muted">Nabung/bln (90 hari)</span>
                  <span className="font-bold text-text tabular-nums whitespace-nowrap">{formatRupiah(monthlyProgress)}</span>
                </div>
              </div>

              <p className="text-[11px] text-text-muted leading-snug">{projectionText}</p>

              <div className="flex items-center gap-2 pt-1">
                {!isReached && (
                  <button
                    type="button"
                    onClick={() => openContribute(g)}
                    className="min-h-[44px] flex-1 sm:flex-none px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all shadow-2xs"
                  >
                    <ArrowsLeftRight size={15} weight="bold" />
                    <span>Alokasikan Dana</span>
                    <CaretRight size={13} weight="bold" className="hidden sm:block opacity-60" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openEditForm(g)}
                  aria-label="Ubah Target"
                  title="Ubah target"
                  className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-text-muted hover:text-primary flex items-center justify-center transition-colors"
                >
                  <PencilSimple size={15} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(g)}
                  aria-label="Hapus Target"
                  title="Hapus target"
                  className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-surface-2 hover:bg-expense/10 border border-border text-text-muted hover:text-expense flex items-center justify-center transition-colors"
                >
                  <Trash size={15} weight="bold" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Goal Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingGoal ? 'Ubah Target Tabungan' : 'Buat Target Tabungan'} maxWidth="sm">
        <form onSubmit={handleSaveGoal} className="space-y-4">
          {formError && (
            <div role="alert" className="p-3 bg-expense/10 border border-expense/20 rounded-2xl text-expense text-xs font-semibold">
              {formError}
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="goal-name" className="block text-xs font-semibold text-text-muted">Nama Target</label>
            <input
              id="goal-name"
              type="text"
              required
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              placeholder="Contoh: Dana Darurat Keluarga, DP Rumah"
              className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <AmountInput value={targetAmount} onChange={setTargetAmount} label="Nominal Target (Rp)" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="goal-date" className="block text-xs font-semibold text-text-muted">Tenggat (Opsional)</label>
              <input
                id="goal-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="goal-wallet" className="block text-xs font-semibold text-text-muted">Dompet Penampung</label>
              <select
                id="goal-wallet"
                value={destWalletId}
                onChange={(e) => setDestWalletId(e.target.value)}
                required={!editingGoal}
                disabled={Boolean(editingGoal)}
                title={editingGoal ? 'Penampung tidak diubah agar riwayat alokasi tetap valid' : undefined}
                className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-60"
              >
                <option value="">Pilih Dompet...</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          <Button type="submit" variant="primary" size="lg" isLoading={isSaving} className="w-full">
            {editingGoal ? 'Simpan Perubahan' : 'Simpan Target'}
          </Button>
        </form>
      </Modal>

      {/* Contribute Modal */}
      <Modal
        isOpen={Boolean(contribGoal)}
        onClose={() => setContribGoal(null)}
        title={<span>Alokasi: {contribGoal?.name}</span>}
        maxWidth="sm"
      >
        <form onSubmit={handleContribute} className="space-y-4">
          {contribGoal && (
            <div className="p-3 bg-surface-2 rounded-2xl text-[11px] text-text-muted space-y-0.5">
              <p>Tercakup saat ini: <strong className="text-text">{formatRupiah(contribGoal.saved_amount)}</strong> dari {formatRupiah(contribGoal.target_amount)}</p>
              <p>Dana berpindah nyata dari kas terpilih ke dompet “{contribGoal.wallet_name}”.</p>
            </div>
          )}

          <AmountInput value={contribAmount} onChange={setContribAmount} label="Nominal Alokasi (Rp)" error={undefined} />

          <div className="space-y-1">
            <label htmlFor="goal-src" className="block text-xs font-semibold text-text-muted">Dompet Sumber Dana</label>
            <select
              id="goal-src"
              value={srcWalletId}
              onChange={(e) => setSrcWalletId(e.target.value)}
              required
              className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            >
              {(contribGoal ? wallets.filter((w) => w.id !== contribGoal.wallet_id) : wallets).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({formatRupiah(w.balance)})
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" variant="primary" size="lg" isLoading={isContributing} className="w-full" disabled={contribAmount <= 0}>
            Transfer & Catat Progres
          </Button>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Hapus Target?" maxWidth="sm">
        <div className="space-y-4">
          <p className="text-xs text-text-muted leading-relaxed">
            Menghapus “{deleteTarget?.name}” juga menghapus catatan progresnya. Dana yang sudah dipindahkan
            ke dompet penampung tidak ikut hilang; transaksi kas tetap tersimpan.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="danger" size="md" isLoading={isDeleting} onClick={handleDelete} className="flex-1">
              Ya, Hapus
            </Button>
            <Button variant="outline" size="md" onClick={() => setDeleteTarget(null)}>
              Batal
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
