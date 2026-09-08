# Plan: Fase 6 — Simulasi Skenario ("What-If")

- Tanggal: 2026-09-01
- Status: done
- Induk: `docs/plans/2026-09-01-roadmap-improvement-aplikasi.md`

## Tujuan
Memungkinkan user mencoba skenario penghematan (matikan langganan, kurangi kategori belanja) dan melihat proyeksi tabungan 6-12 bulan tanpa mengubah data nyata.

## Keputusan Desain
- Murni kalkulasi client-side dari data yang sudah ada (tagihan rutin + kategori); tidak ada endpoint/DB baru.
- Ditempatkan di EvaluationView sebagai kartu "Simulasi What-If".
- User menambahkan skenario: (a) matikan tagihan rutin terpilih, (b) kurangi kategori expense sebesar RpN. Daftar skenario bisa beberapa item.
- Output: total hemat per bulan, proyeksi 6 dan 12 bulan, serta dampak ke savings rate bulan berjalan.

## Ruang Lingkup
- [ ] Komponen `ScenarioSimulator.tsx` (input skenario + kalkulasi + tampilan proyeksi).
- [ ] Pasang di `EvaluationView`.
- [ ] Props: bills (tagihan rutin aktif) dan budgets/categories via data yang sudah tersedia.

## File yang Disentuh
- `src/components/evaluation/ScenarioSimulator.tsx` (baru)
- `src/components/evaluation/EvaluationView.tsx`
- `src/app/page.tsx` (kirim props bills bila perlu)

## Kriteria Selesai (Definition of Done)
1. Simulasi bisa dijalankan end-to-end tanpa error; hasil "RpN hemat/bulan → RpM/tahun" tampil.
2. `npm run lint` & `npm run build` lulus; `npm test` tanpa regresi.
