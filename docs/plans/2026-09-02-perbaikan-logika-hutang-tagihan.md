# Plan: Perbaikan Menyeluruh Logika Sinkronisasi Hutang & Tagihan Rutin

- Tanggal: 2026-09-02
- Status: done

## Tujuan
Memperbaiki seluruh siklus logika sinkronisasi antara hutang (debts) dan tagihan rutin (recurring bills): otomatisasi pembuatan tagihan cicilan, pencatatan log pembayaran di bulan-bulan lampau untuk KPR masa lalu, sinkronisasi penuh di auto-process, penanganan edit & hapus hutang, serta koreksi perhitungan safe-to-spend agar bebas dari double counting dan beban pokok multi-tahun.

## Ruang Lingkup
- [x] Otomatisasi pembuatan tagihan rutin pada POST /api/debts untuk setiap hutang dengan monthly_installment > 0.
- [x] Pembuatan log debt_payments dan ill_payments untuk bulan-bulan lampau (Jan..Agu) jika akad di masa lalu.
- [x] Pembaruan POST /api/bills/auto-process untuk menyinkronkan pembayaran ke tabel debts dan membuat entri debt_payments.
- [x] Pembaruan PUT /api/debts/[id] & DELETE /api/debts/[id] untuk menjaga konsistensi tagihan rutin terkait.
- [x] Pembaruan GET /api/bills untuk menyertakan kolom debt_id dan debt_person_name.
- [x] Koreksi perhitungan 	otal_payable_due & safe_to_spend di ootstrap dan eports/monthly (bebas double counting & beban multi-tahun).
- [x] Pembaruan badge tagihan cicilan di src/components/bills/BillItem.tsx.
- [x] Pengujian di scripts/audit-self-test.ts (142 passed).
- [x] Verifikasi 
pm run test:audit & 
pm run build.

## File yang Disentuh
- src/lib/types.ts
- src/app/api/debts/route.ts
- src/app/api/debts/[id]/route.ts
- src/app/api/bills/route.ts
- src/app/api/bills/auto-process/route.ts
- src/app/api/dashboard/bootstrap/route.ts
- src/app/api/reports/monthly/route.ts
- src/components/bills/BillItem.tsx
- scripts/audit-self-test.ts
- docs/plans/2026-09-02-perbaikan-logika-hutang-tagihan.md
- changelog.md

## Kriteria Selesai (Definition of Done)
- Setiap hutang dengan cicilan bulanan otomatis terhubung ke ecurring_bills.
- KPR masa lalu otomatis memiliki riwayat ill_payments lunas di bulan-bulan lampau, dan bulan berjalan siap diproses.
- uto-process tagihan otomatis memperbarui saldo debts dan membuat debt_payments.
- safe_to_spend tidak tertekan ganda atau tertekan pokok hutang jangka panjang.
- 
pm run test:audit dan 
pm run build berhasil 100%.
