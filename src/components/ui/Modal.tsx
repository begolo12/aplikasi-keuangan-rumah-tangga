import React, { useEffect } from 'react';
import { X } from '@phosphor-icons/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'md' }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'md:max-w-sm',
    md: 'md:max-w-md',
    lg: 'md:max-w-lg',
    xl: 'md:max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Adaptive Modal Content: Bottom Sheet on Mobile, Centered Card on Desktop */}
      <div
        className={`relative z-10 w-full ${maxWidthClasses[maxWidth]} max-h-[90vh] md:max-h-[85vh] bg-surface rounded-t-3xl md:rounded-3xl shadow-xl flex flex-col overflow-hidden border border-border transition-transform animate-slide-up md:animate-scale-in`}
      >
        {/* Mobile Drag Indicator Handle */}
        <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-12 h-1.5 bg-surface-3 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="text-base md:text-lg font-bold text-text">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text hover:bg-surface-2 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto overflow-x-hidden flex-1 overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
