'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { TrendUp, CheckCircle } from '@phosphor-icons/react';
import { BudgetTemplate, Category } from '@/lib/types';
import { apiFetch, endpoints } from '@/lib/apiFetch';

interface BudgetTemplateSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string) => Promise<void>;
  categories: Category[];
}

export function BudgetTemplateSelectorModal({
  isOpen,
  onClose,
  onSelectTemplate,
  categories,
}: BudgetTemplateSelectorModalProps) {
  const [templates, setTemplates] = useState<BudgetTemplate[]>([]);
  const [suggestion, setSuggestion] = useState<BudgetTemplate | null>(null);
  const [suggestionReason, setSuggestionReason] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelecting, setIsSelecting] = useState(false);
  const [hasSelected, setHasSelected] = useState(false);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setIsLoading(true);
    }
  }

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const fetchSuggestion = async () => {
      try {
        return await apiFetch<{
          success: boolean;
          data: { template: BudgetTemplate | null; reason?: string };
        }>(endpoints.budgetAiRecommend);
      } catch {
        return null;
      }
    };

    Promise.all([
      apiFetch<{ success: boolean; data: BudgetTemplate[] }>(endpoints.budgetTemplates),
      fetchSuggestion(),
    ])
      .then(([userTemplatesRes, suggestionRes]: any) => {
        if (cancelled) return;
        setTemplates(userTemplatesRes?.data || []);
        if (suggestionRes?.success) {
          setSuggestion(suggestionRes.data?.template ?? null);
          setSuggestionReason(suggestionRes.data?.reason ?? null);
        }
      })
      .catch((error) => {
        console.error('Failed to load templates:', error);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleSelectTemplate = async (template: BudgetTemplate) => {
    setIsSelecting(true);
    try {
      await onSelectTemplate(template.id);
      setHasSelected(true);
      setTimeout(() => {
        onClose();
        setHasSelected(false);
        setIsSelecting(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to apply template:', error);
      setIsSelecting(false);
    }
  };

  /** Kategori tidak dikenal = template tidak bisa dipakai. Kembalikan null, bukan nama palsu. */
  const findCategory = (categoryId: string) => expenseCategories.find((c) => c.id === categoryId) ?? null;

  const renderAllocationBar = (allocations: Array<{ category_id: string; percentage: number }>) => {
    const known = allocations.filter((a) => findCategory(a.category_id) !== null);
    const unknownCount = allocations.length - known.length;

    return (
      <div className="space-y-2">
        {known.slice(0, 3).map((alloc) => {
          const cat = findCategory(alloc.category_id)!;
          return (
            <div key={alloc.category_id} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              <span className="text-xs text-text-muted flex-1 truncate">{cat.name}</span>
              <span className="text-xs font-medium text-text">{alloc.percentage}%</span>
            </div>
          );
        })}
        {unknownCount > 0 && (
          <p className="text-[11px] text-warning">
            {unknownCount} posisi tidak cocok dengan kategori Anda dan tidak akan diterapkan.
          </p>
        )}
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="lg" title="Pilih Template Anggaran">
      <div className="space-y-4">
        {/* Saran dari riwayat belanja (bukan AI) */}
        {suggestion && !hasSelected && (
          <div className="bg-primary-subtle border border-primary/25 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendUp className="text-primary" size={20} />
              <h3 className="font-bold text-text">Saran dari Riwayat Belanja</h3>
            </div>

            <div className="mb-3">
              <h4 className="font-semibold text-text mb-1">{suggestion.name}</h4>
              <p className="text-sm text-text-muted">{suggestion.description}</p>
            </div>

            <div className="mb-3">
              {renderAllocationBar(suggestion.allocations)}
            </div>

            <Button
              onClick={() => handleSelectTemplate(suggestion)}
              disabled={isSelecting || suggestion.id === ''}
              className="w-full"
            >
              {isSelecting ? 'Memuat...' : 'Gunakan Saran Ini'}
            </Button>
          </div>
        )}

        {!suggestion && !hasSelected && suggestionReason && (
          <div className="bg-surface-2 border border-border rounded-2xl p-4">
            <h3 className="font-bold text-text mb-1">Saran Anggaran Belum Tersedia</h3>
            <p className="text-sm text-text-muted">{suggestionReason}</p>
          </div>
        )}

        {/* User Custom Templates */}
        <div>
          <h3 className="font-semibold text-text mb-3">Template Anda</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8 text-text-muted">Memuat template...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-text-muted">Belum ada template kustom</div>
            ) : (
              templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  disabled={isSelecting}
                  className={`w-full text-left p-3 border rounded-2xl transition-all ${
                    hasSelected
                      ? 'opacity-50 cursor-not-allowed border-border'
                      : 'hover:border-primary/40 bg-surface border-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-text">{template.name}</h4>
                    {template.is_default && (
                      <CheckCircle className="text-income" size={16} />
                    )}
                  </div>
                  {template.description && (
                    <p className="text-xs text-text-muted mb-2">{template.description}</p>
                  )}
                  {renderAllocationBar(template.allocations)}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Close button only when not selecting */}
        {!isSelecting && (
          <Button onClick={onClose} variant="outline" className="w-full">
            Batal
          </Button>
        )}
      </div>
    </Modal>
  );
}
