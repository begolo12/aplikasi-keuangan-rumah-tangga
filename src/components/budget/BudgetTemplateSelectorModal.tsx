'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { X, Sparkle, CheckCircle } from '@phosphor-icons/react';
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

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const [userTemplates, aiResult]: [BudgetTemplate[], any] = await Promise.all([
        apiFetch<{ data: BudgetTemplate[] }>(endpoints.budgets.templates.list),
        fetchAIRecommendation(),
      ]);

      setTemplates(userTemplates.data || []);

      if (aiResult.success && aiResult.data?.template) {
        setAiSuggestion(aiResult.data.template);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAIRecommendation = async () => {
    try {
      return await apiFetch(endpoints.budgets.ai.recommend);
    } catch {
      return null;
    }
  };

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

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderAllocationBar = (allocations: Array<{ category_id: string; percentage: number }>) => {
    const totalIncome = 5000000; // Assumed income for visualization
    return (
      <div className="space-y-2">
        {allocations.slice(0, 3).map((alloc, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: getCategoryColor(alloc.category_id) }}
            />
            <span className="text-xs text-gray-600 flex-1 truncate">
              {getCategoryName(alloc.category_id)}
            </span>
            <span className="text-xs font-medium text-gray-700">{alloc.percentage}%</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Pilih Template Anggaran">
      <div className="space-y-4">
        {/* AI Recommendation Card */}
        {aiSuggestion && !hasSelected && (
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkle className="text-purple-600" size={20} />
                <h3 className="font-bold text-purple-900">Rekomendasi AI</h3>
              </div>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                Personalized
              </span>
            </div>

            <div className="mb-3">
              <h4 className="font-semibold text-gray-900 mb-1">{aiSuggestion.name}</h4>
              <p className="text-sm text-gray-600">{aiSuggestion.description}</p>
            </div>

            <div className="mb-3">
              {renderAllocationBar(aiSuggestion.allocations)}
            </div>

            <Button
              onClick={() => handleSelectTemplate(aiSuggestion)}
              disabled={isSelecting}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
            >
              {isSelecting ? 'Memuat...' : 'Gunakan Rekomendasi Ini'}
            </Button>
          </div>
        )}

        {/* User Custom Templates */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Template Anda</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Memuat template...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Belum ada template kustom</div>
            ) : (
              templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  disabled={isSelecting}
                  className={`w-full text-left p-3 border rounded-xl transition-all ${
                    hasSelected
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:border-purple-300 hover:shadow-sm bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{template.name}</h4>
                    {template.is_default && (
                      <CheckCircle className="text-green-600" size={16} />
                    )}
                  </div>
                  {template.description && (
                    <p className="text-xs text-gray-600 mb-2">{template.description}</p>
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
