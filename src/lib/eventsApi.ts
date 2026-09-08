import { FinancialEvent } from './types';
import { apiFetch, endpoints } from './apiFetch';

export async function getFinancialEvents(_userId?: string): Promise<FinancialEvent[]> {
  const res = await apiFetch<{ success: boolean; data: FinancialEvent[] }>(endpoints.financialEvents, {
    method: 'GET',
  });
  return res.data || (Array.isArray(res) ? res : []);
}

export async function createFinancialEvent(_userId: string, data: Partial<FinancialEvent>): Promise<FinancialEvent> {
  const res = await apiFetch<{ success: boolean; data: FinancialEvent }>(endpoints.financialEvents, {
    method: 'POST',
    json: data,
  });
  return res.data || (res as unknown as FinancialEvent);
}

export async function updateFinancialEvent(id: string, data: Partial<FinancialEvent>): Promise<FinancialEvent> {
  const res = await apiFetch<{ success: boolean; data: FinancialEvent }>(endpoints.financialEvent(id), {
    method: 'PUT',
    json: data,
  });
  return res.data || (res as unknown as FinancialEvent);
}

export async function deleteFinancialEvent(id: string): Promise<void> {
  await apiFetch(endpoints.financialEvent(id), {
    method: 'DELETE',
  });
}

/**
 * Get upcoming financial events due today or tomorrow (next 24 hours)
 */
export async function getUpcomingEvents(userId?: string): Promise<FinancialEvent[]> {
  const allEvents = await getFinancialEvents(userId || 'current');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return allEvents.filter((event) => {
    if (!event.is_active) return false;
    const eventDate = new Date(event.date);
    const eventStartOfDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    return eventStartOfDay.getTime() === today.getTime() || eventStartOfDay.getTime() === tomorrow.getTime();
  });
}
