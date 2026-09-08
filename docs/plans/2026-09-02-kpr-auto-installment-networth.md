# Plan: Otomatisasi Cicilan KPR Berjalan, Sisa Hutang, & Integrasi Net Worth

- Tanggal: 2026-09-02
- Status: done

## Tujuan
Mengotomatiskan perhitungan cicilan pinjaman/KPR yang sudah berjalan di masa lalu, menyesuaikan saldo pokok yang sudah terbayar (paid_amount), memperbarui jatuh tempo ke bulan berjalan/berikutnya, serta memberikan opsi pencatatan aset properti/kendaraan langsung agar ekuitas tercermin akurat pada Kekayaan Bersih (Net Worth).

## Ruang Lingkup
- [x] Menambahkan dukungan start_date, initial_paid_amount, create_asset, sset_name pada debtSchema di src/lib/validations.ts.
- [x] Memperbarui POST /api/debts untuk menghitung bulan berjalan, nominal terbayar awal, jatuh tempo berikutnya, dan pembuatan aset atomik.
- [x] Memperbarui PUT /api/debts/[id] agar mendukung pembaruan data terkait.
- [x] Memperbarui form KPR / Kredit di src/components/debts/DebtsView.tsx dengan kalkulator cicilan otomatis dan checkbox pembuatan aset properti.
- [x] Memperbarui src/components/debts/DebtItem.tsx untuk menampilkan progres tenor/bulan cicilan dan tanggal mulai.
- [x] Menambahkan pengujian di scripts/audit-self-test.ts.
- [x] Verifikasi 
pm run test:audit & 
pm run build.

## File yang Disentuh
- src/lib/validations.ts
- src/lib/types.ts
- src/app/api/debts/route.ts
- src/app/api/debts/[id]/route.ts
- src/app/api/dashboard/bootstrap/route.ts
- src/app/api/init/route.ts
- scripts/run-db-migrations.ts
- src/components/debts/DebtsView.tsx
- src/components/debts/DebtItem.tsx
- scripts/audit-self-test.ts
- docs/plans/2026-09-02-kpr-auto-installment-networth.md
- changelog.md

## Kriteria Selesai (Definition of Done)
- Input KPR tanggal 20 Januari 2026 pada bulan September 2026 otomatis mendeteksi 8 bulan berjalan, mencatat paid_amount = 8 x cicilan, sisa hutang berkurang, dan due_date diset ke 20 September 2026 (tidak berstatus menunggak).
- Opsi pembuatan aset properti otomatis menambahkan aset senilai pokok/harga properti sehingga Net Worth meningkat sesuai nilai ekuitas terbayar.
- 
pm run test:audit lulus (140 passed) dan 
pm run build berhasil tanpa error.
