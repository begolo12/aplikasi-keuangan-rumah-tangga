# Plan: Fitur Reset Data (Mulai dari Nol)

- Tanggal: 2026-09-01
- Status: done

## Tujuan
User dapat mengosongkan seluruh data keuangan (mulai dari 0) tanpa menghapus akun, tanpa kehilangan struktur (dompet, kategori, definisi tagihan & target), dan tanpa meninggalkan data yatim.

## Keputusan Desain
- Endpoint `POST /api/settings/reset-data`, dalam SATU transaksi:
  - Hapus seluruh data keuangan: `goal_contributions`, `savings_goals`, `bill_payments`, `recurring_bills`, `transactions`, `budgets`, `debts`, `assets`, `merchant_category_map`.
  - Nol-kan dompet: `wallets.balance = 0`, `reconciled_at = NULL`, `last_reconciled_balance = NULL`.
  - Dipertahankan: akun/user, wallets, categories, household, settings.
  - Revisi (usai feedback user): definisi tagihan rutin & target tabungan ikut dihapus sebelumnya dipertahankan, sehingga tagihan masih tampil setelah reset. Kini keduanya ikut dihapus agar hasil reset benar-benar kosong.
- Wajib konfirmasi: body `{ confirmation: "RESET" }` divalidasi Zod (`z.literal`).
- UI di SettingsView: kartu "Reset Data" dengan peringatan backup dulu, lalu konfirmasi dua langkah (ketik RESET). Setelah sukses: refresh data.

## Ruang Lingkup
- [ ] API `src/app/api/settings/reset-data/route.ts` (baru).
- [ ] Skema Zod `resetDataSchema`.
- [ ] Endpoint di `apiFetch.ts`.
- [ ] Kartu Reset Data di `SettingsView.tsx` dengan konfirmasi ketik RESET.
- [ ] Isolasi: hanya data user session yang dihapus (semua query filter `user_id`).

## File yang Disentuh
- `src/app/api/settings/reset-data/route.ts` (baru)
- `src/lib/validations.ts`, `src/lib/apiFetch.ts`
- `src/components/settings/SettingsView.tsx`

## Kriteria Selesai
1. Reset mengosongkan saldo & riwayat, mempertahankan struktur, tanpa orphan records.
2. Tanpa konfirmasi "RESET" endpoint menolak (400).
3. `npm run lint`, `npm run build`, `npm test` lulus.
