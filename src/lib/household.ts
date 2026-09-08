import { randomInt } from 'node:crypto';
import { query } from './db';

export interface HouseholdMembership {
  household_id: string;
  role: 'owner' | 'member';
}

/**
 * Ambil keanggotaan household user (maksimal satu household per user).
 */
export async function getMembership(userId: string): Promise<HouseholdMembership | null> {
  const rows = await query<{ household_id: string; role: 'owner' | 'member' }>(
    `SELECT household_id, role::text AS role FROM household_members WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}

/**
 * SQL predicate: wallet dapat diakses bila milik sendiri ATAU dompet bersama
 * household tempat user tergabung. Dipakai ulang di beberapa route.
 */
export function walletAccessCondition(userParamIndex: number): string {
  return `(user_id = $${userParamIndex} OR (is_shared = TRUE AND household_id IN (SELECT household_id FROM household_members WHERE user_id = $${userParamIndex})))`;
}

/**
 * Generate kode undangan unik 8 karakter (A-Z0-9 tanpa karakter ambigu).
 */
export function generateInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += alphabet[randomInt(alphabet.length)];
  }
  return code;
}
