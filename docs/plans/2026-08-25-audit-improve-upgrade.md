# Plan: Audit & Upgrade Lanjutan KasKeluarga

- Tanggal: 2026-08-25
- Status: running

## Tujuan
Menutup seluruh gap fungsional & ketahanan aplikasi agar layak dipakai harian produksi: riwayat berpaginasi server-side, evaluasi dengan tren pembanding, konsistensi token warna, pengujian E2E edit transaksi, perlindungan aksi ganda, transparansi antrean offline gagal, dan global error boundary.

## Ruang Lingkup
- [ ] Riwayat Transaksi server-side + paginasi ("Muat lebih banyak", debounce search)
- [ ] Evaluasi: delta vs bulan sebelumnya; hapus prop wallets tak terpakai
- [ ] Token warna: ganti hardcoded purple/emerald/rose/blue/amber di ReportsView & EvaluationView
- [ ] E2E test PUT transaksi (ubah jumlah/dompet + strict-zero ditolak)
- [ ] Guard double-delete pada BillItem & DebtItem
- [ ] Peringatan dead-letter antrean offline di OfflineBanner
- [ ] Global error boundary: src/app/error.tsx + src/app/not-found.tsx

## File yang Disentuh
```
src/app/api/transactions/route.ts
src/app/page.tsx
src/app/error.tsx                                  [BARU]
src/app/not-found.tsx                              [BARU]
src/components/transactions/TransactionList.tsx
src/components/evaluation/EvaluationView.tsx
src/components/reports/ReportsView.tsx
src/components/bills/BillItem.tsx
src/components/debts/DebtItem.tsx
src/components/pwa/OfflineBanner.tsx
src/lib/apiFetch.ts
scripts/e2e-full-suite.ts
changelog.md
```

## Kriteria Selesai (Definition of Done)
- Tab Transaksi memuat data dari server dengan filter + "Muat lebih banyak" berfungsi.
- Kartu Evaluasi menampilkan delta vs bulan sebelumnya.
- Tidak ada kelas warna hardcoded di dua view tersebut.
- E2E PUT transaksi lulus termasuk kasus strict-zero ditolak.
- Tombol hapus bill/hutang tidak bisa dipicu ganda.
- Banner peringatan muncul saat ada antrean offline yang dibuang.
- Error runtime me-render fallback error.tsx; URL tak dikenal menampilkan not-found.
- `npm test`, `npm run lint`, `npm run build` lulus tanpa error baru.
