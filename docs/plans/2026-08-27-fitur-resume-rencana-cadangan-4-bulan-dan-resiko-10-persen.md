# Plan: Resume Rencana Keuangan dengan Cadangan Biaya 4 Bulan dan Cadangan Risiko 10%

- Tanggal: 2026-08-27
- Status: done

## Tujuan
Menambahkan modul dan aturan KPI "Resume Rencana Keuangan":
1. Menghitung Cadangan Biaya 4 Bulan ($4 \times \text{Anggaran}$) dan Cadangan Risiko 10% ($10\% \times \text{Cadangan 4 Bulan} = 0.4 \times \text{Anggaran}$).
2. Menetapkan Total Syarat Minimum Dana Keamanan ($4.4 \times \text{Anggaran Bulanan}$).
3. Menerapkan aturan KPI: Pengguna harus memiliki minimal uang sebesar syarat keamanan tersebut sebelum diperbolehkan / direkomendasikan menambah pos anggaran pengeluaran lainnya.
4. Menampilkan kartu visual "Resume Rencana Keuangan & Syarat Minimum Cadangan" secara komprehensif pada menu Anggaran (`BudgetView`), Evaluasi (`EvaluationView`), dan proteksi/peringatan pada modal penetapan anggaran.

## Ruang Lingkup
- [x] Buat helper / tipe data untuk perhitungan `FinancialSafetyPlan` (Baseline Anggaran, Cadangan 4 Bulan, Cadangan Risiko 10%, Total Syarat Minimum, Dana Terkumpul, Sisa Kurang, Status Kelayakan Tambah Pengeluaran).
- [x] Buat komponen visual `FinancialSafetyPlanCard.tsx` yang menampilkan resume rencana cadangan 4 bulan + risiko 10% dan kelayakan menambah pos pengeluaran.
- [x] Hubungkan `FinancialSafetyPlanCard` ke `BudgetView.tsx`, `EvaluationView.tsx`, dan sertakan visual guard pada modal tambah/ubah batas anggaran.
- [x] Pastikan seluruh test audit (`npm test`) dan build (`npm run build`) berhasil 100%.
- [x] Catat perubahan ke `changelog.md` dan update status plan ke `done`.

## File yang Disentuh
- `src/lib/types.ts`
- `src/components/budget/FinancialSafetyPlanCard.tsx`
- `src/components/budget/BudgetView.tsx`
- `src/components/budget/EmergencyFundCard.tsx`
- `src/components/evaluation/EvaluationView.tsx`
- `scripts/audit-self-test.ts`
- `changelog.md`
- `docs/plans/2026-08-27-fitur-resume-rencana-cadangan-4-bulan-dan-resiko-10-persen.md`

## Kriteria Selesai (Definition of Done)
1. Perhitungan Cadangan 4 Bulan + Cadangan Risiko 10% (Total 4.4x Anggaran) terhitung akurat secara real-time.
2. Resume rencana keuangan tampil jelas menginformasikan nominal minimum yang wajib dimiliki sebelum menambah pengeluaran baru.
3. Form penetapan anggaran memberikan peringatan jika uang belum mencapai ambang batas 4.4x anggaran.
4. `npm test` dan `npm run build` lulus tanpa error.
