# Plan: Fase 2 — Laporan Tahunan & Tren

- Tanggal: 2026-09-01
- Status: done
- Induk: `docs/plans/2026-09-01-roadmap-improvement-aplikasi.md`

## Tujuan
Melengkapi laporan bulanan yang sudah ada dengan perspektif tahunan: tren arus kas 12 bulan, perbandingan YoY per kategori, top kategori pengeluaran tahunan, dan tabungan bersih per tahun.

## Ruang Lingkup
- [ ] API `GET /api/reports/yearly?year=`: data 12 bulan (income vs expense), YoY per kategori (tahun ini vs tahun lalu, delta %), top 5 kategori pengeluaran tahunan, ringkasan tabungan bersih (income − expense).
- [ ] UI `YearlyReport.tsx`: grafik garis 12 bulan, tabel YoY per kategori, top 5 kategori, ringkasan tabungan.
- [ ] Selector "Tahunan" di `ReportsView` yang sudah ada.
- [ ] Validasi query dengan Zod (periodQuerySchema).

## File yang Disentuh
- `src/app/api/reports/yearly/route.ts` (baru)
- `src/components/reports/YearlyReport.tsx` (baru)
- `src/components/reports/ReportsView.tsx`
- `src/lib/apiFetch.ts` (endpoint yearly)
- `src/lib/types.ts` (tipe hasil laporan tahunan)

## Kriteria Selesai (Definition of Done)
1. Laporan tahunan tampil end-to-end tanpa error di dev server.
2. `npm run lint` dan `npm run build` lulus 0 error.
3. `npm test` lulus tanpa regresi.
4. Query DB selalu filter by user id (isolation tetap terjaga).
5. Input divalidasi dengan Zod.
