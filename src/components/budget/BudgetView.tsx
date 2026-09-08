'use client';

import React, { useState } from 'react';
import { Budget, Category, Wallet, RecurringBill, Debt, BudgetTemplate } from '@/lib/types';
import { BudgetProgressBar } from './BudgetProgressBar';
import { FinancialSafetyPlanCard, calculateFinancialSafetyPlan } from './FinancialSafetyPlanCard';
import { ExpenseProjectionCard } from './ExpenseProjectionCard';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmModal } from '../ui/ConfirmModal';
import { AmountInput } from '../ui/AmountInput';
import { EmptyState } from '../ui/EmptyState';
import { Plus, Vault, Warning, Sparkle } from '@phosphor-icons/react';
import { BudgetTemplateSelectorModal } from './BudgetTemplateSelectorModal';
import { formatRupiah } from '@/lib/formatters';
import { ApiError, apiFetch, endpoints } from '@/lib/apiFetch';

interface BudgetViewProps {
  budgets: Budget[];
  categories: Category[];
  wallets?: Wallet[];
  totalExpense?: number;
  currentMonth: number;
  currentYear: number;
  bills?: RecurringBill[];
  debts?: Debt[];
  onRefresh: () => void;
  onNavigateToWallets?: () => void;
}

export function BudgetView({
  budgets,
  categories,
  wallets = [],
  totalExpense = 0,
  currentMonth,
  currentYear,
  bills = [],
  debts = [],
  onRefresh,
  onNavigateToWallets,
}: BudgetViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [limit, setLimit] = useState(0);
  const [rolloverOn, setRolloverOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const plan = calculateFinancialSafetyPlan(budgets, wallets, totalExpense, bills, debts);
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const openAddModal = () => {
    setEditingBudget(null);
    setLimit(0);
    setRolloverOn(false);
    setError(null);
    if (expenseCategories.length > 0) {
      const unused = expenseCategories.find((c) => !budgets.some((b) => b.category_id === c.id));
      if (!unused) {
        setError('Semua kategori belanja sudah memiliki anggaran bulan ini.');
        setCategoryId('');
      } else {
        setCategoryId(unused.id);
      }
    } else {
      setCategoryId('');
    }
    setIsModalOpen(true);
  };

  const openEditModal = (budget: Budget) => {
    setEditingBudget(budget);
    setCategoryId(budget.category_id);
    setLimit(budget.monthly_limit);
    setRolloverOn(Boolean(budget.rollover_enabled));
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenTemplateSelector = () => {
    setIsModalOpen(false);
    setIsTemplateModalOpen(true);
  };

  const handleApplyTemplate = async (templateId: string) => {
    try {
      await apiFetch(endpoints.applyBudgetTemplate, {
        method: 'POST',
        json: { template_id: templateId, month: currentMonth, year: currentYear },
      });
      
      onRefresh();
      setIsTemplateModalOpen(false);
    } catch (error) {
      console.error('Failed to apply template:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (limit <= 0) {
      setError('Batas anggaran harus lebih dari 0.');
      return;
    }
    if (!editingBudget && !categoryId) {
      setError('Semua kategori sudah dianggarkan. Tidak ada kategori tersisa.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (editingBudget) {
        await apiFetch(endpoints.budget(editingBudget.id), { method: 'PUT', json: { monthly_limit: limit, rollover_enabled: rolloverOn } });
      } else {
        await apiFetch(endpoints.budgets, {
          method: 'POST',
          json: {
            category_id: categoryId,
            monthly_limit: limit,
            month: currentMonth,
            year: currentYear,
            rollover_enabled: rolloverOn,
          },
        });
      }

      onRefresh();
      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Terjadi kesalahan jaringan.');
    } finally {
      setIsLoading(false);
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId) return;
    try {
      await apiFetch(endpoints.budget(confirmDeleteId), { method: 'DELETE' });
      setListError(null);
      onRefresh();
      setConfirmDeleteId(null);
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : 'Gagal menghapus anggaran.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Resume Rencana Keuangan: Cadangan 4 Bulan + Cadangan Risiko 10% — otomatis termasuk tagihan rutin & cicilan */}
      <FinancialSafetyPlanCard
        budgets={budgets}
        wallets={wallets}
        totalExpense={totalExpense}
        bills={bills}
        debts={debts}
        onNavigateToWallets={onNavigateToWallets}
      />

      {/* Proyeksi Pengeluaran Bulanan: Rencana vs Realisasi vs Sisa Estimasi — otomatis termasuk tagihan rutin & cicilan */}
      <ExpenseProjectionCard
        budgets={budgets}
        totalExpense={totalExpense}
        currentMonth={currentMonth}
        currentYear={currentYear}
        bills={bills}
        debts={debts}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-text">Anggaran Belanja Bulanan</h2>
          <p className="text-xs md:text-sm text-text-muted">
            Kendalikan batas pengeluaran per kategori agar tidak defisit dan tetap dalam batas aman cadangan.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={handleOpenTemplateSelector}
            className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 text-purple-900 hover:from-purple-100 hover:to-indigo-100"
          >
            <Sparkle size={18} />
            Gunakan Template
          </Button>
          <Button
            variant={plan.can_expand_expense ? 'primary' : 'outline'}
            size="md"
            leftIcon={<Plus size={18} weight="bold" />}
            onClick={openAddModal}
          >
            Tetapkan Anggaran {plan.can_expand_expense ? '' : '(Perlu Cadangan)'}
          </Button>
        </div>
      </div>

      {/* Delete Error */}
      {listError && (
        <div role="alert" className="rounded-xl border border-expense/30 bg-expense/10 px-4 py-3 text-sm font-semibold text-expense">
          {listError}
        </div>
      )}
      {/* Delete Error */}
      {/* Budgets List */}
      {budgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((budget) => (
            <BudgetProgressBar
              key={budget.id}
              budget={budget}
              onEdit={openEditModal}
              onDelete={(id) => setConfirmDeleteId(id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Vault size={40} weight="duotone" />}
          title="Belum Ada Anggaran Ditetapkan"
          description="Buat batas limit belanja untuk pos penting seperti Belanja Pasar, Makanan, atau Transportasi."
          actionLabel="Tetapkan Anggaran Sekarang"
          onAction={openAddModal}
        />
      )}

      {/* Set/Edit Budget Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBudget ? 'Ubah Batas Anggaran' : 'Tetapkan Anggaran Kategori'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-expense/10 border border-expense/20 rounded-2xl text-expense text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Warning Guard if Financial Safety Plan not met */}
          {!plan.can_expand_expense && (
            <div className="p-3.5 bg-expense/10 border border-expense/20 rounded-2xl text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-expense">
                <Warning size={16} weight="fill" className="shrink-0" />
                <span>Peringatan Aturan KPI Keuangan</span>
              </div>
              <p className="text-text-muted leading-relaxed text-[11px]">
                Cadangan dana Anda saat ini ({formatRupiah(plan.current_cash)}) belum mencapai syarat minimal {formatRupiah(plan.total_min_required)} (Cadangan 4 Bulan + Risiko 10%). Menambah anggaran pengeluaran baru akan memperlebar defisit cadangan Anda sebesar {formatRupiah(plan.gap_needed)}.
              </p>
            </div>
          )}

          {!editingBudget && (
            <div className="space-y-1">
              <label htmlFor="budgetCategory" className="block text-xs font-semibold text-text-muted">Pilih Kategori Belanja</label>
              {expenseCategories.filter((c) => !budgets.some((b) => b.category_id === c.id)).length === 0 ? (
                <div className="p-3 bg-surface-2 border border-border rounded-xl text-xs text-text-muted font-semibold">
                  Semua kategori sudah dianggarkan, tidak ada kategori tersisa untuk bulan ini.
                </div>
              ) : (
                <select
                  id="budgetCategory"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  {expenseCategories
                    .filter((c) => !budgets.some((b) => b.category_id === c.id))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              )}
            </div>
          )}

          <AmountInput
            id="budgetLimit"
            label="Batas Maksimal Pengeluaran Sebulan (Rp)"
            value={limit}
            onChange={setLimit}
          />

          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              id="budgetRollover"
              checked={rolloverOn}
              onChange={(e) => setRolloverOn(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-primary rounded border-border focus:ring-primary"
            />
            <label htmlFor="budgetRollover" className="text-xs font-semibold text-text cursor-pointer leading-relaxed">
              Bawa sisa anggaran bulan lalu
              <span className="block text-[11px] font-normal text-text-muted">
                Sisa bulan lalu ditambahkan ke limit bulan ini. Bulan lalu overbudget? Selisihnya dipotong.
              </span>
            </label>
          </div>

          <Button
            type="submit"
            variant={plan.can_expand_expense ? 'primary' : 'danger'}
            size="lg"
            isLoading={isLoading}
            className="w-full mt-4 font-bold shadow-md"
          >
            {editingBudget ? 'Simpan Perubahan Anggaran' : 'Tetapkan Anggaran Kategori'}
          </Button>
        </form>
      </Modal>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={Boolean(confirmDeleteId)}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Batas Anggaran"
        message="Apakah Anda yakin ingin menghapus batas anggaran belanja untuk kategori ini?"
      />

      {/* Template Selector Modal */}
      <BudgetTemplateSelectorModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={handleApplyTemplate}
        categories={categories}
      />
    </div>
  );
}
