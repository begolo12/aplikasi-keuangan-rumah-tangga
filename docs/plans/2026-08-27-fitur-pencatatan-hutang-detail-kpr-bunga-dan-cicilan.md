# Plan: Fitur Pencatatan Hutang Detail (KPR Rumah, Bunga, Tenor & Cicilan)

- Tanggal: 2026-08-27
- Status: done

## Tujuan
Memperluas pencatatan hutang menjadi detail dan komprehensif, khususnya untuk pinjaman besar seperti KPR Rumah, Kredit Kendaraan, atau Pinjaman Bank:
1. Menyimpan rincian Pokok Pinjaman, Suku Bunga/Margin per tahun, Tenor (Bulan), dan Estimasi Cicilan Bulanan.
2. Otomatis menghitung Total Bunga dan Total Pelunasan.
3. Opsi menjadwalkan cicilan bulanan ke Pengeluaran Pasti Rutin (`recurring_bills`).
4. Menampilkan rincian lengkap pada kartu hutang di `DebtsView.tsx` dan `DebtItem.tsx`.

## Ruang Lingkup
- [x] Tambahkan kolom `debt_category`, `principal_amount`, `interest_rate`, `interest_type`, `tenor_months`, dan `monthly_installment` pada tabel `debts` dan jalankan migrasi DB.
- [x] Perbarui `src/lib/types.ts` dan `src/lib/validations.ts` untuk `debtSchema`.
- [x] Perbarui API `src/app/api/debts/route.ts` dan `src/app/api/dashboard/bootstrap/route.ts`.
- [x] Perbarui form modal pencatatan hutang di `DebtsView.tsx` dengan kalkulator interaktif KPR/Bunga/Tenor.
- [x] Perbarui `DebtItem.tsx` agar menyajikan detail pokok, bunga, cicilan bulanan, dan progres pelunasan.
- [x] Verifikasi seluruh test suite (`npm test`) dan build (`npm run build`).
- [x] Catat ke `changelog.md` dan update status plan ke `done`.

## File yang Disentuh
- `src/lib/types.ts`
- `src/lib/validations.ts`
- `src/app/api/init/route.ts`
- `scripts/run-db-migrations.ts`
- `src/app/api/debts/route.ts`
- `src/app/api/dashboard/bootstrap/route.ts`
- `src/components/debts/DebtsView.tsx`
- `src/components/debts/DebtItem.tsx`
- `scripts/audit-self-test.ts`
- `scripts/e2e-full-suite.ts`
- `changelog.md`
- `docs/plans/2026-08-27-fitur-pencatatan-hutang-detail-kpr-bunga-dan-cicilan.md`

## Kriteria Selesai (Definition of Done)
1. Hutang KPR, kendaraan, dan pinjaman bank dapat dicatat dengan rincian pokok, bunga, tenor, dan cicilan bulanan.
2. Kartu hutang menampilkan rincian bunga dan cicilan per bulan secara transparan.
3. `npm test` dan `npm run build` lulus 100%.
