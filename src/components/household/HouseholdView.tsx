'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UsersThree,
  Plus,
  Copy,
  Check,
  SignOut,
  Crown,
  Pulse,
  SpinnerGap,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { apiFetch, endpoints, ApiError } from '@/lib/apiFetch';
import { HouseholdState, HouseholdMemberReport } from '@/lib/types';
import { formatRupiah, INDONESIAN_MONTHS } from '@/lib/formatters';
import { ConfirmModal } from '../ui/ConfirmModal';

interface HouseholdViewProps {
  onRefreshParent?: () => void;
}

export function HouseholdView({ onRefreshParent }: HouseholdViewProps) {
  const [state, setState] = useState<HouseholdState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form state
  const [createName, setCreateName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Laporan per-anggota
  const [reportMonth, setReportMonth] = useState(() => new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(() => new Date().getFullYear());
  const [memberReport, setMemberReport] = useState<HouseholdMemberReport[]>([]);

  const loadState = useCallback(async () => {
    try {
      const data = await apiFetch<HouseholdState>(endpoints.households);
      setState(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat data keluarga.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadReport = useCallback(async (month: number, year: number) => {
    try {
      const data = await apiFetch<{ members: HouseholdMemberReport[] }>(endpoints.householdReport(month, year));
      setMemberReport(data.members || []);
    } catch {
      setMemberReport([]);
    }
  }, []);

  useEffect(() => {
    let active = true;
    apiFetch<HouseholdState>(endpoints.households)
      .then((data) => {
        if (active) setState(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : 'Gagal memuat data keluarga.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!state?.household) return;
    let active = true;
    apiFetch<{ members: HouseholdMemberReport[] }>(endpoints.householdReport(reportMonth, reportYear))
      .then((data) => {
        if (active) setMemberReport(data.members || []);
      })
      .catch(() => {
        if (active) setMemberReport([]);
      });
    return () => {
      active = false;
    };
  }, [state?.household, reportMonth, reportYear]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setIsSubmitting(true);
    try {
      await apiFetch(endpoints.households, { method: 'POST', json: { name: createName } });
      setCreateName('');
      setIsLoading(true);
      await loadState();
      onRefreshParent?.();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Gagal membuat keluarga.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setIsSubmitting(true);
    try {
      await apiFetch(endpoints.householdsJoin, { method: 'POST', json: { invite_code: joinCode } });
      setJoinCode('');
      setIsLoading(true);
      await loadState();
      onRefreshParent?.();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Gagal bergabung.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [removeMemberTarget, setRemoveMemberTarget] = useState<{ id: string; name: string } | null>(null);

  const handleLeaveConfirm = async () => {
    setIsLeaveConfirmOpen(false);
    setActionError(null);
    try {
      await apiFetch(endpoints.households, { method: 'DELETE' });
      setIsLoading(true);
      await loadState();
      onRefreshParent?.();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Gagal keluar dari keluarga.');
    }
  };

  const handleRemoveMemberConfirm = async () => {
    if (!removeMemberTarget) return;
    const { id } = removeMemberTarget;
    setRemoveMemberTarget(null);
    setActionError(null);
    try {
      await apiFetch(endpoints.householdMember(id), { method: 'DELETE' });
      setIsLoading(true);
      await loadState();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Gagal mengeluarkan anggota.');
    }
  };

  const handleCopyCode = async () => {
    const code = state?.household?.invite_code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard bisa diblokir browser; biarkan tombol tetap berfungsi manual.
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <SpinnerGap size={28} className="text-primary animate-spin" />
        <p className="text-xs font-semibold text-text-muted">Memuat data keluarga...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3">
        <p className="text-sm font-semibold text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => {
            setIsLoading(true);
            loadState();
          }}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  // ---- Belum tergabung: form buat / gabung ----
  if (!state?.household) {
    return (
      <div className="space-y-4 max-w-md mx-auto">
        <div className="text-center space-y-1.5 pt-2">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto border border-primary/20">
            <UsersThree size={26} weight="duotone" />
          </div>
          <h2 className="text-lg font-extrabold text-text">Kas Keluarga Bersama</h2>
          <p className="text-xs text-text-muted leading-relaxed">
            Gabungkan anggota keluarga dalam satu household untuk berbagi dompet bersama dan mencatat
            transaksi dengan nama pencatat.
          </p>
        </div>

        {actionError && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {actionError}
          </div>
        )}

        <form onSubmit={handleCreate} className="bg-surface border border-border rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <Plus size={16} weight="bold" className="text-primary" /> Buat Keluarga Baru
          </h3>
          <input
            type="text"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="Nama keluarga (mis. Keluarga Ganang)"
            maxLength={100}
            required
            minLength={2}
            className="w-full min-h-[44px] px-3.5 rounded-xl bg-surface-2 border border-border text-sm font-semibold text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="submit"
            disabled={isSubmitting || createName.trim().length < 2}
            className="w-full min-h-[44px] rounded-xl bg-primary text-primary-fg text-sm font-bold hover:opacity-90 active:opacity-80 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
          >
            {isSubmitting ? <SpinnerGap size={16} className="animate-spin" /> : <Plus size={16} weight="bold" />}
            Buat & Jadikan Saya Pemilik
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">atau</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={handleJoin} className="bg-surface border border-border rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <Users size={16} weight="bold" className="text-primary" /> Gabung dengan Kode Undangan
          </h3>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Contoh: K7X2M9PA"
            maxLength={8}
            required
            className="w-full min-h-[44px] px-3.5 rounded-xl bg-surface-2 border border-border text-sm font-bold text-text tracking-[0.25em] uppercase text-center placeholder:tracking-normal placeholder:font-semibold placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="submit"
            disabled={isSubmitting || joinCode.trim().length < 6}
            className="w-full min-h-[44px] rounded-xl bg-primary text-primary-fg text-sm font-bold hover:opacity-90 active:opacity-80 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
          >
            {isSubmitting ? <SpinnerGap size={16} className="animate-spin" /> : <Users size={16} weight="bold" />}
            Gabung ke Keluarga
          </button>
        </form>
      </div>
    );
  }

  // ---- Sudah tergabung ----
  const isOwner = state.role === 'owner';

  return (
    <div className="space-y-4">
      {actionError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {actionError}
        </div>
      )}

      {/* Header Keluarga */}
      <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-text flex items-center gap-2">
              <UsersThree size={20} weight="duotone" className="text-primary shrink-0" />
              <span className="truncate">{state.household.name}</span>
            </h2>
            <p className="text-[11px] text-text-muted font-medium mt-0.5">
              Anda {isOwner ? 'pemilik keluarga ini' : 'anggota keluarga ini'} · {state.members.length} anggota
            </p>
          </div>
          {state.new_activity_count > 0 && (
            <span className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-income/10 border border-income/20 text-income text-[10px] font-bold">
              <Pulse size={12} weight="bold" />
              {state.new_activity_count} catatan baru 7 hari
            </span>
          )}
        </div>

        {/* Kode undangan (owner saja) */}
        {isOwner && state.household.invite_code && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-2 border border-border/60">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Kode Undangan</p>
              <p className="text-lg font-extrabold text-text tracking-[0.3em]">{state.household.invite_code}</p>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="min-h-[40px] px-3.5 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold flex items-center gap-1.5 hover:bg-primary/20 active:scale-95 transition-all shrink-0"
            >
              {copied ? <Check size={14} weight="bold" /> : <Copy size={14} weight="bold" />}
              {copied ? 'Tersalin' : 'Salin'}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsLeaveConfirmOpen(true)}
          className="min-h-[40px] px-3.5 rounded-xl text-expense border border-expense/20 bg-expense/5 text-xs font-bold flex items-center gap-1.5 hover:bg-expense/10 active:scale-95 transition-all"
        >
          <SignOut size={14} weight="bold" />
          {isOwner ? 'Bubarkan Keluarga' : 'Keluar dari Keluarga'}
        </button>
      </div>

      {/* Daftar Anggota */}
      <div className="bg-surface border border-border rounded-2xl p-4 space-y-2.5">
        <h3 className="text-sm font-bold text-text">Anggota Keluarga</h3>
        <ul className="space-y-1.5">
          {state.members.map((m) => (
            <li
              key={m.user_id}
              className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-surface-2/60 border border-border/40"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-primary text-primary-fg flex items-center justify-center font-bold text-xs shrink-0">
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-text truncate flex items-center gap-1.5">
                    {m.name}
                    {m.role === 'owner' && <Crown size={12} weight="fill" className="text-warning shrink-0" />}
                  </p>
                  <p className="text-[10px] text-text-muted truncate">{m.email}</p>
                </div>
              </div>
              {isOwner && m.role === 'member' && (
                <button
                  type="button"
                  onClick={() => setRemoveMemberTarget({ id: m.user_id, name: m.name })}
                  className="min-h-[36px] px-2.5 rounded-lg text-expense text-[10px] font-bold hover:bg-expense/10 transition-colors shrink-0"
                >
                  Keluarkan
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Laporan per-anggota */}
      <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-text">Belanja per Anggota (Dompet Bersama)</h3>
          <button
            type="button"
            onClick={() => loadReport(reportMonth, reportYear)}
            aria-label="Muat ulang laporan"
            className="p-2 text-text-muted hover:text-primary rounded-lg hover:bg-surface-2 transition-colors"
          >
            <ArrowsClockwise size={15} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={reportMonth}
            onChange={(e) => setReportMonth(Number(e.target.value))}
            aria-label="Bulan laporan"
            className="min-h-[40px] px-3 rounded-xl bg-surface-2 border border-border text-xs font-bold text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {INDONESIAN_MONTHS.map((name, i) => (
              <option key={name} value={i + 1}>{name}</option>
            ))}
          </select>
          <select
            value={reportYear}
            onChange={(e) => setReportYear(Number(e.target.value))}
            aria-label="Tahun laporan"
            className="min-h-[40px] px-3 rounded-xl bg-surface-2 border border-border text-xs font-bold text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 4 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {memberReport.length === 0 ? (
          <p className="text-xs text-text-muted">Belum ada data untuk periode ini.</p>
        ) : (
          <ul className="space-y-1.5">
            {memberReport.map((r) => (
              <li
                key={r.user_id}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-surface-2/60 border border-border/40"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-text truncate">{r.name}</p>
                  <p className="text-[10px] text-text-muted">
                    {r.transaction_count} transaksi · pemasukan {formatRupiah(r.income)}
                    {(r.transfer_in > 0 || r.transfer_out > 0) && (
                      <> · setoran bersama {formatRupiah(r.transfer_in)} · penarikan {formatRupiah(r.transfer_out)}</>
                    )}
                  </p>
                </div>
                <p className="text-xs font-extrabold text-expense shrink-0">{formatRupiah(r.expense)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Leave / Dissolve Confirm Modal */}
      <ConfirmModal
        isOpen={isLeaveConfirmOpen}
        onClose={() => setIsLeaveConfirmOpen(false)}
        onConfirm={handleLeaveConfirm}
        title={isOwner ? 'Bubarkan Keluarga' : 'Keluar dari Keluarga'}
        message={
          isOwner
            ? 'Bubarkan keluarga ini? Semua anggota akan terpisah dan dompet bersama menjadi pribadi kembali.'
            : 'Keluar dari keluarga ini? Anda tidak lagi dapat melihat dompet bersama.'
        }
        confirmLabel={isOwner ? 'Ya, Bubarkan' : 'Ya, Keluar'}
      />

      {/* Remove Member Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(removeMemberTarget)}
        onClose={() => setRemoveMemberTarget(null)}
        onConfirm={handleRemoveMemberConfirm}
        title="Keluarkan Anggota"
        message={`Apakah Anda yakin ingin mengeluarkan ${removeMemberTarget?.name || 'anggota'} dari keluarga?`}
        confirmLabel="Ya, Keluarkan"
      />
    </div>
  );
}
