'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Sparkle, CheckCircle } from '@phosphor-icons/react';
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
  const [aiSuggestion, setAiSuggestion] = useState<BudgetTemplate | null>(null);
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

    const fetchAIRecommendation = async () => {
      try {
        return await apiFetch(endpoints.budgetAiRecommend);
      } catch {
        return null;
      }
    };

    Promise.all([
      apiFetch<{ success: boolean; data: BudgetTemplate[] }>(endpoints.budgetTemplates),
      fetchAIRecommendation(),
    ])
      .then(([userTemplatesRes, aiResult]: any) => {
        if (cancelled) return;
        setTemplates(userTemplatesRes?.data || []);
        if (aiResult?.success && aiResult?.data?.template) {
          setAiSuggestion(aiResult.data.template);
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

  const getCategoryName = (categoryId: string): string => {
    const cat = expenseCategories.find((c) => c.id === categoryId);
    return cat?.name || 'Unknown';
  };

  const getCategoryColor = (categoryId: string): string => {
    const cat = expenseCategories.find((c) => c.id === categoryId);
    return cat?.color || '#6B7280';
  };

  const renderAllocationBar = (allocations: Array<{ category_id: string; percentage: number }>) => {
    return (
      <div className="space-y-2">
        {allocations.slice(0, 3).map((alloc, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: getCategoryColor(alloc.category_id) }}
            />
            <span className="text-xs text-text-muted flex-1 truncate">
              {getCategoryName(alloc.category_id)}
            </span>
            <span className="text-xs font-medium text-text">{alloc.percentage}%</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="lg" title="Pilih Template Anggaran">
      <div className="space-y-4">
        {/* AI Recommendation Card */}
        {aiSuggestion && !hasSelected && (
          <div className="bg-primary-subtle border border-primary/25 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkle className="text-primary" size={20} />
                <h3 className="font-bold text-text">Rekomendasi AI</h3>
              </div>
              <span className="text-xs bg-primary/15 text-primary px-2 py-1 rounded-xl font-semibold">
                Personalized
              </span>
            </div>

            <div className="mb-3">
              <h4 className="font-semibold text-text mb-1">{aiSuggestion.name}</h4>
              <p className="text-sm text-text-muted">{aiSuggestion.description}</p>
            </div>

            <div className="mb-3">
              {renderAllocationBar(aiSuggestion.allocations)}
            </div>

            <Button
              onClick={() => handleSelectTemplate(aiSuggestion)}
              disabled={isSelecting}
              className="w-full"
            >
              {isSelecting ? 'Memuat...' : 'Gunakan Rekomendasi Ini'}
            </Button>
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
