# Plan: Tanpa Fallback Default (Kartu Proyeksi & Safety Plan Tampil 0)

- Tanggal: 2026-09-01
- Status: done

## Tujuan
Setelah reset total, halaman Anggaran menampilkan angka (Cadangan Rp 4.400.000, Proyeksi Rp 1.500.000) dari fallback default hardcoded — terasa seperti data palsu. Revisi kedua usai feedback: hapus fallback sama sekali; bila belum ada anggaran & pengeluaran, tampilkan Rp 0 apa adanya dengan status netral.

## Ruang Lingkup
- [x] Hapus fallback default 1.000.000 (safety plan) & 1.500.000 (proyeksi): `monthly_budget`/`planned_budget` = anggaran riil, atau 0 bila kosong.
- [x] Flag `is_default_budget` tetap ada untuk mode tampil netral; teks status diubah ("Semua angka di atas 0 karena belum ada anggaran...").
- [x] Badge proyeksi "Belum Ada Anggaran" + banner penjelasan; progress bar dijaga dari pembagian nol.
- [x] Tipe `FinancialSafetyPlan` & `ExpenseProjection` diperluas dengan `is_default_budget`.

## File yang Disentuh
- `src/components/budget/FinancialSafetyPlanCard.tsx`
- `src/components/budget/ExpenseProjectionCard.tsx`
- `src/lib/types.ts`

## Kriteria Selesai
1. Setelah reset, kedua kartu menampilkan Rp 0 apa adanya + status netral, tanpa angka fiktif.
2. Unit test lulus (test memakai anggaran eksplisit, tidak menyentuh fallback).
3. `npm run lint`, `npm run build`, `npm test` lulus.
