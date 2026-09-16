# Plan: Audit Alur dan Automasi Keuangan

- Tanggal: 2026-09-16
- Status: done

## Tujuan
Pastikan semua alur bisnis tersambung otomatis: hutang input muncul cicilan tiap bulan, tagihan auto-record jalan, langganan tidak mandek, kalender sinkron, backup utuh.

## Ruang Lingkup
- [ ] F1: Nonaktifkan tagihan cicilan otomatis saat hutang lunas (manual pay + auto-process)
- [ ] F2: Langganan auto-debit + majukan next_charge_date (cron subscriptions)
- [ ] F3: Form tagihan bisa taut ke hutang (debt_id di UI + API bills)
- [ ] F4: Cron push sertakan hutang jatuh tempo tanpa tagihan
- [ ] F5: Kalender sinkron tagihan rutin + hutang + langganan (read-only agenda)
- [ ] F6: Backup export/import utuh (budgets_templates, rollover_enabled, subscriptions relasi)
- [ ] Verifikasi: lint + build + test:audit

## Tidak dikerjakan (catat eksplisit)
- Depresiasi aset tetap kalkulasi on-the-fly (jurnal beban berkala butuh keputusan akuntansi, di luar scope)
- Rekomendasi anggaran AI tetap heuristik lokal (bukan LLM eksternal)
- Rollover anggaran tetap query-time (bukan baris cron baru)

## File yang Disentuh
- src/app/api/debts/[id]/pay/route.ts
- src/lib/billAutoProcess.ts
- src/app/api/subscriptions/cron/route.ts (+ skema bila perlu kolom auto_debit)
- src/app/api/bills/route.ts + src/components/bills/useBillForm.ts (+ form UI)
- src/app/api/push/cron/route.ts
- src/components/calendar/CalendarView.tsx + src/app/api/events/export/route.ts
- src/app/api/backup/export/route.ts + src/app/api/backup/import/route.ts
- docs/plans/2026-09-16-audit-alur-dan-automasi.md, changelog.md

## Kriteria Selesai (Definition of Done)
- Hutang lunas menonaktifkan bill cicilan terkait, tidak ada potongan bulan berikut
- Langganan jatuh tempo memotong saldo + catat transaksi + tanggal maju (atau opsi eksplisit bila user menolak auto-debit)
- Form tagihan bisa pilih hutang terkait
- Push mencakup hutang jatuh tempo
- Kalender tampilkan agenda tagihan/hutang/langganan
- Backup round-trip tidak hilangkan kolom
- lint 0 error, build lulus, test:audit 159/159
