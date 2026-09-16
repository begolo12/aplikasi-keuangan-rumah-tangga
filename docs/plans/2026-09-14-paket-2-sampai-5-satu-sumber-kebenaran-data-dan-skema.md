# Plan: Paket 2–5 — Satu Sumber Kebenaran Angka, Skema Lengkap, dan Transparansi AI

- Tanggal: 2026-09-14
- Status: done

## Tujuan

Menutup temuan sisa audit data dummy/gap (`gap_audit_dummy_data.md`, 33 temuan).
Paket 1 sudah selesai (lihat plan `2026-09-14-paket-1-...`). Plan ini mengeksekusi
Paket 2 sampai Paket 5 sekaligus:

- **Paket 2** — akun kosong tidak boleh dapat skor. Skor `null` + label "Belum cukup data".
- **Paket 3** — satu sumber kebenaran angka (fragmen SQL, rollover, `admin_fee`, helper saldo).
- **Paket 4** — lengkapi DDL tabel & kolom yang hilang, perbaiki modul Langganan yang rusak, hapus dead code.
- **Paket 5** — transparansi asal-usul data AI (`source: 'ai' | 'heuristic'`).

## Temuan Baru (di luar laporan, ditemukan saat riset)

- **`subscriptions` RUSAK TOTAL.** DB nyata hanya punya kolom `provider`, tetapi seluruh kode
  (`src/app/api/subscriptions/**`, `backup/import`, UI) memakai `provider_name` dan
  `reminder_enabled`. Terverifikasi lewat probe: `column "provider_name" does not exist`.
  Setiap request ke modul Langganan gagal. Ini bug runtime, bukan sekadar gap dokumentasi.
  Perbaikan: **tambah kolom** (bukan rename) lewat DDL idempoten, aman untuk data lama.

## Ruang Lingkup

### Paket 4 — Skema & dead code (dikerjakan lebih dulu, dampak terbesar)

- [x] `src/app/api/init/route.ts` — tambah 5 tabel: `households`, `household_members`,
      `merchant_category_map`, `push_subscriptions`, `push_send_log`.
- [x] `src/app/api/init/route.ts` — tambah kolom hilang: `users.token_version`,
      `wallets.household_id/is_shared/linked_goal_id`, `budgets.rollover_enabled`,
      `debts.start_date`, `recurring_bills.debt_id/to_wallet_id`,
      `subscriptions.provider_name/reminder_enabled`, CHECK `wallets.type` termasuk `'envelope'`.
- [x] `scripts/run-db-migrations.ts` — lengkapi tabel & kolom yang sama (idempoten).
- [x] Hapus dead code: `EmergencyFundCard.tsx`, `BudgetRecommendationCard.tsx`,
      `src/lib/eventsSql.ts`, `TRANSACTION_TRANSFER_SQL` di `src/lib/reportSql.ts`.

### Paket 3 — Satu sumber kebenaran angka

- [x] Helper baru `src/lib/money.ts`: `totalLiquidCash()` (clamp) + `totalNetCash()` (tanpa clamp).
- [x] Ganti `Math.max(0, ...)` ad-hoc dengan helper di komponen laporan/budget.
- [x] `insights/route.ts` — pakai fragmen `reportSql.ts`, scope dompet bersama, rollover CTE, `admin_fee`.
- [x] `budgets/route.ts`, `dashboard/bootstrap/route.ts`, `reports/monthly/route.ts`,
      `src/lib/budgetSql.ts` — `SUM(t.amount + t.admin_fee)`.
- [x] `households/report/route.ts` — sertakan `admin_fee`.
- [x] `reports/category/route.ts` — `ORDER BY` pakai fragmen ber-fee.
- [x] `reports/export-csv/route.ts` — baris total di akhir CSV.
- [x] `reports/monthly/route.ts` + `insights/route.ts` — overbudget pakai rollover CTE.

### Paket 2 — Akun kosong jangan dapat skor

- [x] `insights/route.ts` — `health.score = null` bila tidak ada basis data sama sekali.
- [x] `src/lib/types.ts` — `score: number | null`, `FinancialRatiosResult.health_score: number | null`.
- [x] `InsightWidget.tsx` — render "Belum cukup data" bila `null`.
- [x] `FinancialRatiosReport.tsx` — buang fallback Rp 1jt, sentinel 999/100 → `null`, skor hanya dari rasio valid.
- [x] `DebtCalculatorModal.tsx` — buang fallback Rp 1jt, verdict netral bila belum diisi.
- [x] `BalanceSheetReport.tsx` — rasio solvabilitas `null` bila basis kosong.
- [x] `EvaluationView.tsx` — DTI/DER `null` bila basis kosong.

### Paket 1 — Stop label bohong (sisa Paket 1)

- [x] `budgets/ai/recommend/route.ts` — jangan INSERT `category_id: ''`; kembalikan `template: null` bila data kosong.
- [x] `BudgetTemplateSelectorModal.tsx` — ganti label "Rekomendasi AI"/"Personalized", perbaiki `'Unknown'`/`'#6B7280'`.
- [x] `budgets/templates/apply/route.ts` — buang `defaultTotal = 5000000`.
- [x] `currencies/route.ts` — tambah flag `source: 'live' | 'fallback'`.
- [x] `SettingsView.tsx` — tampilkan peringatan bila fallback; hapus selector mata uang yang tidak berefek.

### Paket 5 — Transparansi AI

- [x] `src/lib/types.ts` + `src/lib/validations.ts` — tambah `source: 'ai' | 'heuristic'` pada hasil parse struk.
- [x] `src/lib/deepseek.ts` — set `source` di semua jalur fallback.
- [x] `ai/parse-receipt/route.ts` — jangan naikkan `confidence` menjadi `'high'` secara paksa.
- [x] `ReceiptParserModal.tsx` — badge peringatan bila hasil berasal dari heuristik, plus peringatan nominal 0.

## File yang Disentuh

**Baru**: `src/lib/money.ts`
**Hapus**: `src/components/budget/EmergencyFundCard.tsx`,
`src/components/budget/BudgetRecommendationCard.tsx`, `src/lib/eventsSql.ts`
**Diubah**: ~30 file di `src/app/api/**`, `src/components/**`, `src/lib/**`,
`src/app/api/init/route.ts`, `scripts/run-db-migrations.ts`, `scripts/audit-self-test.ts`

## Kriteria Selesai (Definition of Done)

- [x] `npm run build` lulus tanpa error.
- [x] `npm run lint` tidak menambah error baru (0 error, 1 warning lama `tabHistory`). **`npm test` TIDAK dijalankan** (e2e destruktif).
- [x] `npm run test:audit` lulus (159/159).
- [x] Tidak ada lagi `Math.max(0, w.balance)` ad-hoc di luar helper.
- [x] Tidak ada lagi sentinel `999`/`: 100`/`: 1` pada rasio keuangan.
- [x] Skor `null` dirender sebagai "Belum cukup data", bukan angka.
- [x] Modul Langganan memakai kolom yang benar-benar ada di DB.
- [x] Migrasi DB idempoten tersedia di `init/route.ts` dan `scripts/run-db-migrations.ts` (belum dijalankan).
- [x] Tidak ada `DELETE`/`ALTER ... DROP` terhadap data pengguna.
- [x] `scratch/` di repo bersih dari file probe.

## Catatan Akhir

- Migrasi skema **belum dijalankan** terhadap DB. Jalankan `POST /api/init` atau
  `npx tsx scripts/run-db-migrations.ts` bila ingin mengaktifkan modul Langganan/rumah tangga/web push.
- Dua pertanyaan audit tentang pembersihan data uji (`Test ...` di `irvan@local.com`,
  duplikat `budgets_templates`) **belum dijawab** dan sengaja tidak dikerjakan.
