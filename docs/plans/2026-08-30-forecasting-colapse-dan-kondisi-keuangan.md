# Plan: Forecasting Colapse & Kondisi Keuangan Sangat Baik

- Tanggal: 2026-08-30
- Status: done

## Tujuan
Memenuhi objective guided: pencatatan sudah sangat baik (terverifikasi), tetapi forecasting colapse jika pendapatan tiba-tiba 0 belum ada sebagai fitur eksplisit yang memberi tahu jangka waktu colapse. Tujuan plan ini menambahkan simulasi colapse yang akurat dan memastikan laporan kondisi + saran aksi sudah sangat baik dan terintegrasi, sehingga kontrol penuh keuangan tercapai.

## Ruang Lingkup
- [x] **F1 — Helper `calculateCollapseForecast`**
  - File baru `src/lib/collapseForecast.ts` (pure, teruji): `export function calculateCollapseForecast(totalCash: number, monthlyBurn: number): { monthsUntilCollapse: number, daysUntilCollapse: number, collapseDate: string | null, level: 'aman' | 'waspada' | 'kritis' | 'colapse', burnRate: number }`
  - Rumus: `monthlyBurn = max(1, monthlyExpense atau budgets total)`, `months = totalCash / monthlyBurn` (jika totalCash <=0 → 0, jika monthlyBurn <=0 → Infinity), `days = months*30`, `collapseDate = today + days` (jika finite). Level: `>=6` aman, `3-6` waspada, `1-3` kritis, `<1` colapse.

- [x] **F2 — Komponen UI `CollapseForecastCard`**
  - File baru `src/components/evaluation/CollapseForecastCard.tsx`: kartu premium menampilkan "Jika pendapatan mati hari ini", `monthsUntilCollapse` (1 desimal), `collapseDate` format `long` via `formatDate`, badge level (aman/waspada/kritis/colapse) warna `primary`/`warning`/`expense`, burn rate, saran aksi spesifik, progress bar ketahanan.
  - Props: `totalCash`, `monthlyBurn`.

- [x] **F3 — Integrasi `EvaluationView`**
  - Import `CollapseForecastCard` dan `calculateCollapseForecast` di `src/components/evaluation/EvaluationView.tsx`, tampilkan di atas insights (setelah DecisionCard & Score, sebelum 4 rasio grid) dengan data `totalCash` + `expenseBenchmark`. Pastikan tidak break early-return hooks.

- [x] **F4 — Test & Audit**
  - Tambah test di `scripts/audit-self-test.ts` bagian `[10g] collapseForecast`: 9 assertion (colapse 5 bulan, 0.5 bulan, Infinity jika burn 0, totalCash negatif → 0, 12 bulan aman).
  - Verifikasi manual di browser: ubah pemasukan 0, lihat card colapse muncul dengan jangka waktu akurat.

## File yang Disentuh
- `src/lib/collapseForecast.ts` (baru)
- `src/components/evaluation/CollapseForecastCard.tsx` (baru)
- `src/components/evaluation/EvaluationView.tsx`
- `scripts/audit-self-test.ts`
- `changelog.md` (setelah selesai)

## Kriteria Selesai
- `npm run build` 0 error, `lint` 0, `test` 180 lulus (128 audit + 52 e2e) 100% tanpa regresi
- Forecasting colapse terverifikasi: `totalCash=10jt, monthlyBurn=2jt → 5 bulan`, `totalCash=1jt, burn=2jt → 0.5 bulan`, tampil tanggal colapse akurat di UI Evaluasi
- Laporan kondisi + saran aksi tetap tampil (DecisionCard + insights + ColdMoney + Collapse card) — kontrol penuh
- Tidak ada gap forecasting tersisa pada audit manual

## Risiko & Mitigasi
- `monthlyBurn` fallback 1jt jika budgets & expense 0 — cegah Infinity yang menyesatkan; tampilkan level `aman` jika burn 0 (tidak ada pengeluaran).
- Card tidak duplikasi `EmergencyFundMonths` — bedakan label: “Dana Darurat X bulan” vs “Colapse jika pendapatan 0: Y bulan”.
