/**
 * Satu tempat untuk menghitung uang tunai dari daftar dompet.
 *
 * Dulu setiap komponen menulis `Math.max(0, w.balance)` sendiri-sendiri sehingga
 * dompet minus hilang di sebagian layar tapi tetap muncul di layar lain. Dua fungsi
 * di bawah membedakan dua maksud yang berbeda — jangan campur keduanya:
 *
 * - `totalLiquidCash`: dompet minus dianggap nol. Dipakai untuk "kas yang benar-benar
 *   bisa dipakai hari ini", karena minus di satu dompet tidak bisa menutup dompet lain.
 * - `totalNetCash`: apa adanya, termasuk minus. Dipakai untuk neraca/kekayaan bersih,
 *   karena minus itu utang yang tetap harus dibayar.
 */

export interface WalletLike {
  balance: number | string | null | undefined;
}

function toNumber(value: number | string | null | undefined): number {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

/** Kas siap pakai: dompet minus dihitung nol. */
export function totalLiquidCash(wallets: WalletLike[] | null | undefined): number {
  if (!wallets?.length) return 0;
  return wallets.reduce((sum, w) => sum + Math.max(0, toNumber(w.balance)), 0);
}

/** Posisi kas bersih: dompet minus tetap dikurangi. */
export function totalNetCash(wallets: WalletLike[] | null | undefined): number {
  if (!wallets?.length) return 0;
  return wallets.reduce((sum, w) => sum + toNumber(w.balance), 0);
}
