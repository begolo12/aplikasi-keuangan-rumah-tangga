import { FinancialEvent } from './types';
import { apiFetch, endpoints } from './apiFetch';

export async function getFinancialEvents(userId: string): Promise<FinancialEvent[]> {
  return apiFetch<FinancialEvent[]>(endpoints.financialEvents, {
    method: 'GET',
    params: { user_id: userId },
  });
}

export async function createFinancialEvent(userId: string, data: Partial<FinancialEvent>): Promise<FinancialEvent> {
  return apiFetch<FinancialEvent>(endpoints.financialEvents, {
    method: 'POST',
    json: { ...data, user_id: userId },
  });
}

export async function updateFinancialEvent(id: string, data: Partial<FinancialEvent>): Promise<FinancialEvent> {
  return apiFetch<FinancialEvent>(`${endpoints.financialEvents}/${id}`, {
    method: 'PUT',
    json: data,
  });
}

export async function deleteFinancialEvent(id: string): Promise<void> {
  return apiFetch(endpoints.financialEvents, {
    method: 'DELETE',
    params: { id },
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
