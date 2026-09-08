# Plan: Fase 3 — Insight Pintar Otomatis

- Tanggal: 2026-09-01
- Status: done
- Induk: `docs/plans/2026-09-01-roadmap-improvement-aplikasi.md`

## Tujuan
Deteksi pola pengeluaran dan kewajiban yang bisa ditindaklanjuti, bukan sekadar alert overbudget: lonjakan kategori, dompet minus, saran bayar tagihan lebih awal, dan skor kesehatan keuangan sederhana.

## Ruang Lingkup
- [ ] API `GET /api/insights`: 
  - Lonjakan pengeluaran kategori (>30% vs rata-rata 3 bulan sebelumnya, minimal Rp50.000 supaya tidak berisik).
  - Dompet minus saat ini (overdraft).
  - Saran bayar tagihan jatuh tempo ≤7 hari lebih awal bila ada dompet dengan saldo cukup.
  - Skor kesehatan keuangan 0–100 (savings ratio, budget compliance, beban hutang) + status.
  - Respons berisi 2–3 insight teratas terurut prioritas + skor.
- [ ] Widget `InsightWidget.tsx` di dashboard ("Insight Hari Ini") yang menampilkan skor + insight teratas.
- [ ] Wiring widget di `page.tsx`.
- [ ] Tipe data di `types.ts` dan endpoint di `apiFetch.ts`.

## File yang Disentuh
- `src/app/api/insights/route.ts` (baru)
- `src/components/dashboard/InsightWidget.tsx` (baru)
- `src/app/page.tsx`
- `src/lib/types.ts`, `src/lib/apiFetch.ts`

## Kriteria Selesai (Definition of Done)
1. Widget insight tampil di dashboard tanpa error; tanpa data → widget tidak tampil.
2. `npm run lint` dan `npm run build` lulus 0 error.
3. `npm test` lulus tanpa regresi.
4. Query DB selalu filter by user id.
