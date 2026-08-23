import React from 'react';
import { XCircle } from '@phosphor-icons/react';

interface AmountInputProps {
  value: number;
  onChange: (val: number) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
}

export function AmountInput({ value, onChange, label = 'Nominal (Rp)', error, disabled }: AmountInputProps) {
  const formatDisplay = (num: number) => {
    if (!num || num === 0) return '';
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = raw ? parseInt(raw, 10) : 0;
    onChange(num);
  };

  const addPreset = (amountToAdd: number) => {
    onChange((value || 0) + amountToAdd);
  };

  const clear = () => onChange(0);

  const PRESETS = [
    { label: '+10rb', val: 10000 },
    { label: '+50rb', val: 50000 },
    { label: '+100rb', val: 100000 },
    { label: '+500rb', val: 500000 },
    { label: '+1jt', val: 1000000 },
  ];

  return (
    <div className="w-full space-y-2">
      {label && <label className="block text-xs font-semibold text-text-muted">{label}</label>}

      <div className="relative flex items-center">
        <span className="absolute left-4 text-base font-bold text-text-muted select-none">Rp</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          disabled={disabled}
          value={formatDisplay(value)}
          onChange={handleInputChange}
          placeholder="0"
          className={`w-full h-14 pl-12 pr-10 text-xl font-bold bg-surface border rounded-2xl focus:bg-background focus:ring-2 focus:ring-primary focus:outline-none transition-all placeholder:text-text-muted/40 ${
            error ? 'border-expense ring-1 ring-expense' : 'border-border'
          }`}
        />
        {value > 0 && !disabled && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-3 p-1 text-text-muted hover:text-text rounded-full"
          >
            <XCircle size={20} weight="fill" />
          </button>
        )}
      </div>

      {error && <p className="text-xs text-expense font-medium">{error}</p>}

      {/* Preset shortcut buttons */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {PRESETS.map((p) => (
          <button
            key={p.val}
            type="button"
            disabled={disabled}
            onClick={() => addPreset(p.val)}
            className="px-2.5 py-1 text-xs font-semibold bg-surface hover:bg-surface-2 border border-border/80 rounded-lg active:scale-95 transition-all text-text-muted hover:text-text disabled:opacity-50"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
