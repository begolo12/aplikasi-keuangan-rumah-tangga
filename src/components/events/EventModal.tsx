'use client';

import React, { useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { FinancialEvent } from '@/lib/types';
import { apiFetch } from '@/lib/apiFetch';
import { enqueueOfflineMutation } from '@/lib/offlineQueue';
import { Plus, PencilSimple, Trash } from '@phosphor-icons/react';
import { formatRupiah, formatDate, getLocalDateString } from '@/lib/formatters';
import { WifiSlash } from '@phosphor-icons/react';

type EventTypeId = 'bonus' | 'insurance_renewal' | 'tax_deadline' | 'investment_contribution';

interface EventFormData {
  title: string;
  type: EventTypeId;
  date: string;
  amount: number | '';
  description: string;
  recurrence_rule: string;
  notification_days_before: number;
}

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingEvent?: FinancialEvent | null;
  userId: string;
  onSuccess: () => void;
}

export function EventModal({ isOpen, onClose, editingEvent, userId, onSuccess }: EventModalProps) {
  const isEditing = Boolean(editingEvent);
  const [formData, setFormData] = useState<EventFormData>(() => ({
    title: editingEvent?.title || '',
    type: (editingEvent?.type as EventTypeId) || 'bonus',
    date: editingEvent?.date || getLocalDateString(),
    amount: editingEvent?.amount ?? '',
    description: editingEvent?.description || '',
    recurrence_rule: editingEvent?.recurrence_rule || '',
    notification_days_before: editingEvent?.notification_days_before ?? 1,
  }));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offlineNotice, setOfflineNotice] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const submittingRef = useRef(false);

  const handleInputChange = (field: keyof EventFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setError('Judul acara wajib diisi.');
      return false;
    }
    if (!formData.date) {
      setError('Tanggal acara wajib dipilih.');
      return false;
    }
    if (formData.amount !== '' && (Number(formData.amount) < 0)) {
      setError('Nominal tidak boleh negatif.');
      return false;
    }
    if (!['bonus', 'insurance_renewal', 'tax_deadline', 'investment_contribution'].includes(formData.type)) {
      setError('Tipe acara tidak valid.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    
    if (!validateForm()) return;

    const payload = {
      title: formData.title.trim(),
      type: formData.type,
      date: formData.date,
      amount: formData.amount !== '' ? Number(formData.amount) : null,
      description: formData.description.trim() || null,
      recurrence_rule: formData.recurrence_rule.trim() || null,
      notification_days_before: formData.notification_days_before,
    };

    setIsLoading(true);
    submittingRef.current = true;

    try {
      const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
      
      if (!isOnline) {
        await enqueueOfflineMutation({
          userId,
          endpoint: isEditing ? `/api/events/${editingEvent!.id}` : '/api/events',
          method: isEditing ? 'PUT' : 'POST',
          payload,
        });
        setOfflineNotice(true);
        setTimeout(() => {
          onSuccess();
          onClose();
          setShowDeleteConfirm(false);
        }, 1500);
        return;
      }

      const endpoint = isEditing ? `/api/events/${editingEvent!.id}` : '/api/events';
      const method = isEditing ? 'PUT' : 'POST';

      await apiFetch(endpoint, { method, json: payload });
      onSuccess();
      onClose();
      setShowDeleteConfirm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
    } finally {
      submittingRef.current = false;
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (submittingRef.current || !editingEvent) return;
    
    setIsLoading(true);
    submittingRef.current = true;

    try {
      const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
      
      if (!isOnline) {
        await enqueueOfflineMutation({
          userId,
          endpoint: `/api/events/${editingEvent.id}`,
          method: 'DELETE',
          payload: {},
        });
        setOfflineNotice(true);
        setTimeout(() => {
          onSuccess();
          onClose();
          setShowDeleteConfirm(false);
        }, 1200);
        return;
      }

      await apiFetch(`/api/events/${editingEvent.id}`, { method: 'DELETE' });
      onSuccess();
      onClose();
      setShowDeleteConfirm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus acara.');
    } finally {
      submittingRef.current = false;
      setIsLoading(false);
    }
  };

  const eventTypes: Array<{ id: EventTypeId; label: string; color: string }> = [
    { id: 'bonus', label: 'Bonus & Tunjangan', color: '#10b181' },
    { id: 'insurance_renewal', label: 'Perpanjangan Asuransi', color: '#f59e0b' },
    { id: 'tax_deadline', label: 'Batas Waktu Pajak', color: '#ef4444' },
    { id: 'investment_contribution', label: 'Kontribusi Investasi', color: '#3b82f6' },
  ];

  const selectedTypeColor = eventTypes.find((t) => t.id === formData.type)?.color || '#3b82f6';

  const showDeleteDialog = !isEditing && showDeleteConfirm;
  const showEditDialog = isEditing && showDeleteConfirm;

  return (
    <>
      {/* Main Edit/Delete Modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <>
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: selectedTypeColor }}
              />
              <span className="text-lg font-bold text-text">{isEditing ? 'Edit Acara' : 'Tambah Acara Baru'}</span>
            </div>
          </>
        }
        maxWidth="md"
      >
        {offlineNotice && (
          <div role="status" className="p-3 bg-warning/10 border border-warning/30 rounded-xl text-warning text-xs font-semibold flex items-center gap-2 mb-4">
            <WifiSlash size={18} className="shrink-0" />
            <span>Offline: Acara disimpan di perangkat & akan disinkronkan saat terhubung kembali.</span>
          </div>
        )}

        {error && (
          <div role="alert" className="p-3.5 bg-expense/10 border border-expense/20 rounded-xl text-expense text-sm font-semibold mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-text-muted">Tipe Acara</label>
            <div className="grid grid-cols-2 gap-2">
              {eventTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleInputChange('type', type.id)}
                  className={`p-3 rounded-xl text-left text-xs font-semibold transition-all border-2 ${
                    formData.type === type.id
                      ? 'border-current shadow-md'
                      : 'border-border/50 hover:border-border'
                  }`}
                  style={{
                    backgroundColor: formData.type === type.id ? `${selectedTypeColor}15` : 'transparent',
                    borderColor: formData.type === type.id ? selectedTypeColor : undefined,
                    color: formData.type === type.id ? selectedTypeColor : undefined,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: selectedTypeColor }}
                    />
                    <span>{type.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Title Input */}
          <div className="space-y-1.5">
            <label htmlFor="event-title" className="block text-xs font-semibold text-text-muted">
              Judul Acara <span className="text-expense">*</span>
            </label>
            <input
              id="event-title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Contoh: Bonus Tahunan, Pajak Penghasilan Maret"
              className="w-full h-11 px-3.5 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-text-muted"
            />
          </div>

          {/* Date Picker */}
          <div className="space-y-1.5">
            <label htmlFor="event-date" className="block text-xs font-semibold text-text-muted">
              Tanggal <span className="text-expense">*</span>
            </label>
            <input
              id="event-date"
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              min={getLocalDateString()}
              className="w-full h-11 px-3.5 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <label htmlFor="event-amount" className="block text-xs font-semibold text-text-muted">
              Nominal (Opsional)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-sm font-semibold">Rp</span>
              <input
                id="event-amount"
                type="number"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                min="0"
                step="100000"
                className="w-full h-11 pl-12 pr-3.5 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-text-muted"
              />
            </div>
            <p className="text-xs text-text-muted">Kosongkan jika acara tanpa nominal keuangan</p>
          </div>

          {/* Description Textarea */}
          <div className="space-y-1.5">
            <label htmlFor="event-description" className="block text-xs font-semibold text-text-muted">
              Deskripsi (Opsional)
            </label>
            <textarea
              id="event-description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Catatan tambahan tentang acara ini..."
              rows={3}
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-text-muted resize-none"
            />
          </div>

          {/* Recurrence Rule Input */}
          <div className="space-y-1.5">
            <label htmlFor="event-recurrence" className="block text-xs font-semibold text-text-muted">
              Aturan Berulang (Opsional)
            </label>
            <input
              id="event-recurrence"
              type="text"
              value={formData.recurrence_rule}
              onChange={(e) => handleInputChange('recurrence_rule', e.target.value)}
              placeholder="FREQ=MONTHLY;INTERVAL=1 atau FREQ=YEARLY"
              className="w-full h-11 px-3.5 bg-background border border-border rounded-xl text-sm font-mono text-text-muted focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-text-muted"
            />
            <p className="text-xs text-text-muted">Format ICS RRULE, contoh: <code className="bg-surface-2 px-1.5 py-0.5 rounded text-text">FREQ=MONTHLY;INTERVAL=1</code></p>
          </div>

          {/* Notification Days Before */}
          <div className="space-y-2">
            <label htmlFor="event-notification" className="block text-xs font-semibold text-text-muted">
              Pengingat <span className="text-primary">({formData.notification_days_before} hari sebelum acara)</span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 3, 7, 14].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => handleInputChange('notification_days_before', days)}
                  className={`h-11 rounded-xl text-xs font-bold transition-all border-2 ${
                    formData.notification_days_before === days
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/50 hover:border-border text-text-muted'
                  }`}
                >
                  {days === 0 ? 'H-0' : `H-${days}`}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-muted">Pilih jumlah hari pengingat sebelum tanggal acara</p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            {isEditing ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                leftIcon={<Trash size={16} />}
                disabled={isLoading}
              >
                Hapus Acara
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={onClose}
                disabled={isLoading}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
                leftIcon={isEditing ? <PencilSimple size={16} /> : <Plus size={16} />}
              >
                {isEditing ? 'Simpan Perubahan' : 'Tambah Acara'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {(showDeleteDialog || showEditDialog) && (
        <Modal
          isOpen={true}
          onClose={() => setShowDeleteConfirm(false)}
          title={isEditing ? 'Hapus Acara' : 'Batal Tambah Acara'}
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-expense/10 text-expense shrink-0">
                <Trash size={24} weight="fill" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text mb-1">
                  {isEditing ? 'Yakin hapus acara ini?' : 'Yakin batal menambah acara?'}
                </p>
                <p className="text-sm text-text-muted leading-relaxed">
                  {isEditing
                    ? 'Aksi ini tidak dapat dibatalkan. Semua data acara akan hilang permanen.'
                    : 'Data acara yang belum disimpan akan hilang.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isLoading}
              >
                Batal
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                isLoading={isLoading}
              >
                {isEditing ? 'Ya, Hapus' : 'Ya, Batal'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
