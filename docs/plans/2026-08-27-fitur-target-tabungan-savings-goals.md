# Plan: Fitur Target Tabungan (Savings Goals)

- Tanggal: 2026-08-27
- Status: done

## Tujuan
Keluarga bisa menetapkan target tabungan (misal Dana Darurat, DP Rumah, Liburan) dengan nominal target dan deadline opsional. App menampilkan progres per goal, hitung berapa harus nabung per bulan bila ada deadline, serta proyeksi bulan tercapai dari rata-rata tabungan historis.

Keputusan brainstorm bersama user:
- Desain: tabel `savings_goals` (Opsi 2), pola mengikuti modul hutang (`paid_amount`, endpoint `/pay`).
- Deadline: opsional per goal.
- Kontribusi = transaksi nyata (bukan catatan virtual) agar kas riil selalu cocok.

## Ruang Lingkup
- [x] Tabel `savings_goals`: id, user_id, name, target_amount, saved_amount, target_date (nullable), wallet_id (opsional, dompet penampung), notes, is_active, created_at, updated_at. Migrasi via `scripts/run-db-migrations.ts` + init di `/api/init`.
- [x] `src/lib/types.ts`: interface `SavingsGoal`.
- [x] `src/lib/validations.ts`: `savingsGoalSchema` + query schema.
- [x] API: `GET/POST /api/goals`, `PUT/DELETE /api/goals/[id]`, `POST /api/goals/[id]/contribute` (buat transaksi nyata ke dompet & tambah `saved_amount` atomik, filter by user id).
- [x] Proyeksi bulan tercapai dari rata-rata surplus 3 bulan terakhir (data sudah ada di `/api/reports/monthly`).
- [x] UI: view Goals baru (`GoalsView` + kartu progres memakai ulang pola `BudgetProgressBar`), aksi alokasi modal, entri nav sidebar/bottom.
- [x] Bootstrap dashboard: sertakan ringkasan goals di `/api/dashboard/bootstrap`.
- [x] Tes: tambah skenario di `scripts/audit-self-test.ts` dan `scripts/e2e-full-suite.ts`.
- [x] Verifikasi `npm test` dan `npm run build` lulus 100%.
- [x] Update `changelog.md` dan status plan ke `done`.

## File yang Disentuh
- `scripts/run-db-migrations.ts`
- `src/app/api/init/route.ts`
- `src/lib/types.ts`
- `src/lib/validations.ts`
- `src/app/api/goals/route.ts` (baru)
- `src/app/api/goals/[id]/route.ts` (baru)
- `src/app/api/goals/[id]/contribute/route.ts` (baru)
- `src/app/api/dashboard/bootstrap/route.ts`
- `src/components/goals/` (baru: GoalsView, GoalItem, GoalContributeModal)
- `src/components/layout/SidebarNav.tsx`, `BottomNav.tsx`
- `src/lib/apiFetch.ts`, `src/lib/offlineQueue.ts` (jika perlu)
- `scripts/audit-self-test.ts`, `scripts/e2e-full-suite.ts`
- `changelog.md`

## Kriteria Selesai (Definition of Done)
1. Goal dapat dibuat/diedit/dihapus dengan target dan deadline opsional.
2. Alokasi dana membuat transaksi nyata dan menambah progres goal secara atomik.
3. Kartu goal menampilkan progres %, sisa nominal, rekomendasi nabung per bulan (jika ada deadline).
4. `npm test` dan `npm run build` lulus 100%.
