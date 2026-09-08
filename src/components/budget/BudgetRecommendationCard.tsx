'use client';

import React, { useState } from 'react';
import { Sparkle, TrendUp, Wallet } from '@phosphor-icons/react';
import { Button } from '../ui/Button';
import { apiFetch, endpoints } from '@/lib/apiFetch';

interface BudgetRecommendationCardProps {
  totalIncome: number;
  totalExpense: number;
  currentMonth: number;
  currentYear: number;
}

export function BudgetRecommendationCard({
  totalIncome,
  totalExpense,
  currentMonth,
  currentYear,
}: BudgetRecommendationCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendation, setRecommendation] = useState<{
    suggestion: string;
    recommended_limit?: number;
    potential_savings?: number;
  } | null>(null);

  const generateSuggestion = async () => {
    setIsGenerating(true);
    try {
      const result = await apiFetch(endpoints.budgets.ai.recommend, {
        method: 'POST',
        body: { historical_month: currentMonth, historical_year: currentYear },
      });

      if (result && result.success && result.data?.template) {
        // Generate text suggestion based on template
        const suggestions = generateTextSuggestion(result.data.template, totalIncome, totalExpense);
        setRecommendation(suggestions);
      }
    } catch (error) {
      console.error('Failed to generate recommendation:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenTemplateSelector = async () => {
    // Trigger modal opening through parent component
    window.dispatchEvent(new CustomEvent('open-budget-template-selector'));
  };

  const generateTextSuggestion = (
    template: any,
    income: number,
    expense: number
  ): {
    suggestion: string;
    recommended_limit?: number;
    potential_savings?: number;
  } => {
    const surplus = income - expense;
    const savingsRate = income > 0 ? (surplus / income) * 100 : 0;

    if (surplus < 0) {
      return {
        suggestion: `Pengeluaran Anda (${expense.toLocaleString('id-ID')}) melebihi pemasukan. Pertimbangkan untuk mengurangi kategori yang tidak penting atau mencari sumber pendapatan tambahan.`,
        recommended_limit: Math.max(0, income * 0.7),
      };
    }

    if (savingsRate < 10) {
      return {
        suggestion: `Tersisa ${surplus.toLocaleString('id-ID')} bulan ini. Upayakan minimal 20% dari pemasukan untuk tabungan/reinvestmen.`,
        recommended_limit: Math.round(income * 0.8),
        potential_savings: Math.round(income * 0.2),
      };
    }

    if (savingsRate >= 20) {
      return {
        suggestion: `Kinerja bagus! Dengan surplus ${surplus.toLocaleString('id-ID')} (${savingsRate.toFixed(1)}%), Anda bisa mengalihkan lebih banyak ke investasi atau target tabungan.`,
        potential_savings: Math.round(income * 0.3),
      };
    }

    return {
      suggestion: 'Anggaran Anda seimbang. Lanjutkan pola keuangan yang sehat!',
    };
  };

  const getGreeting = () => {
    if (totalIncome === 0) {
      return {
        title: 'Belum ada data pengeluaran',
        subtitle: 'Mulai catat transaksi untuk mendapat saran anggaran personal.',
        icon: <Wallet size={24} className="text-gray-500" />,
        actionRequired: true,
      };
    }

    const surplus = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (surplus / totalIncome) * 100 : 0;

    if (surplus < 0) {
      return {
        title: 'Waspada: Pengeluaran Melebihi Pemasukan',
        subtitle: `Anda defisit ${Math.abs(surplus).toLocaleString('id-ID')} bulan ini`,
        icon: <TrendUp size={24} className="text-red-500" />,
        urgency: 'high',
      };
    }

    if (savingsRate < 10) {
      return {
        title: 'Potensi Tabungan Bisa Lebih Baik',
        subtitle: `Hanya tersisa ${(surplus / (totalIncome || 1)) * 100}.toFixed(1)}% dari pemasukan`,
        icon: <Sparkle size={24} className="text-yellow-500" />,
        urgency: 'medium',
      };
    }

    return {
      title: 'Kinerja Keuangan Sehat',
      subtitle: `Surplus ${surplus.toLocaleString('id-ID')} (${savingsRate.toFixed(1)}%)`,
      icon: <Sparkle size={24} className="text-green-500" />,
      success: true,
    };
  };

  const greeting = getGreeting();

  return (
    <div
      className={`p-4 rounded-xl border ${
        greeting.urgency === 'high'
          ? 'bg-red-50 border-red-200'
          : greeting.success
          ? 'bg-green-50 border-green-200'
          : greeting.actionRequired || greeting.urgency === 'medium'
          ? 'bg-yellow-50 border-yellow-200'
          : 'bg-blue-50 border-blue-200'
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div>{greeting.icon}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{greeting.title}</h3>
          <p className="text-sm text-gray-600">{greeting.subtitle}</p>
        </div>
      </div>

      {!recommendation && !isGenerating && !greeting.actionRequired && (
        <Button onClick={generateSuggestion} variant="outline" size="sm" className="w-full">
          <Sparkle weight="fill" className="mr-1" />
          Dapat Saran Anggaran AI
        </Button>
      )}

      {recommendation && (
        <div className="space-y-3">
          <p className="text-sm text-gray-700 bg-white/60 p-3 rounded-lg">
            {recommendation.suggestion}
          </p>

          {recommendation.potential_savings && (
            <div className="text-xs text-gray-600">
              💡 Potensi tabungan ideal:{' '}
              <span className="font-medium text-green-700">
                {(recommendation.potential_savings || 0).toLocaleString('id-ID')}
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => window.dispatchEvent(new CustomEvent('open-budget-template-selector'))}
              size="sm"
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700"
            >
              Terapkan Template
            </Button>
            <Button onClick={generateSuggestion} variant="outline" size="sm">
              Ulangi
            </Button>
          </div>
        </div>
      )}

      {isGenerating && (
        <div className="flex items-center justify-center py-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-600 border-t-transparent mr-2" />
          <span className="text-sm text-gray-600">Menganalisis pola pengeluaran...</span>
        </div>
      )}
    </div>
  );
}

// Listen for custom event to open template selector from outside
window.addEventListener('open-budget-template-selector', () => {
  // This should trigger a state update in the parent Dashboard component
  // For now, we'll emit another event that can be caught by the main page
  window.dispatchEvent(new CustomEvent('budget-recommendation-clicked'));
});
