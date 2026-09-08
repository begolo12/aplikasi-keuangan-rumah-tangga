// EXAMPLE USAGE: How to integrate EventModal into CalendarView or any parent component
// Copy this pattern into your parent component (e.g., CalendarView.tsx or Dashboard)

'use client';

import React, { useState } from 'react';
import { CalendarView } from '../calendar/CalendarView';
import { EventModal } from './events/EventModal';
import type { FinancialEvent } from '@/lib/types';

interface ParentComponentProps {
  userId: string;
}

export function ParentComponent({ userId }: ParentComponentProps) {
  const [events, setEvents] = useState<FinancialEvent[]>([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FinancialEvent | null>(null);

  // Handle adding new event
  const handleAddEvent = () => {
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  // Handle editing existing event
  const handleEditEvent = (event: FinancialEvent) => {
    setEditingEvent(event);
    setIsEventModalOpen(true);
  };

  // Handle event success (add/update/delete)
  const handleEventSuccess = () => {
    // Refresh events list here
    // fetch('/api/events')...
    setIsEventModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-text">Kalender Acara Keuangan</h2>
        <button
          onClick={handleAddEvent}
          className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-semibold hover:bg-primary-hover transition-all shadow-sm"
        >
          <Plus size={18} />
          Tambah Acara
        </button>
      </div>

      {/* Main Calendar with Events */}
      <CalendarView 
        transactions={[]} // your transactions
        currentMonth={new Date().getMonth() + 1}
        currentYear={new Date().getFullYear()}
        onPeriodChange={(month, year) => {/* handle month change */}}
        onEditTransaction={(t) => {/* handle edit transaction */}}
      />

      {/* Event Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        editingEvent={editingEvent}
        userId={userId}
        onSuccess={handleEventSuccess}
      />
    </div>
  );
}
