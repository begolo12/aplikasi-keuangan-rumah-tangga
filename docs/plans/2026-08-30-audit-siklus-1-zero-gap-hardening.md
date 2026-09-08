# Plan: Audit Siklus 1 — Zero-Gap Hardening

- Tanggal: 2026-08-30
- Status: done

## Tujuan
Menutup 100% gap fungsional dan inkonsistensi yang tersisa setelah audit 2026-08-29 dan verifikasi baseline 2026-08-30 (build/lint/test lulus 0 error, 119+52 test lulus, namun audit kode manual menemukan 12 gap terbuka). Target: `npm run build` + `lint` + `test` tetap 0 error, plus seluruh alur data (backup, auto-process, hutang/aset, laporan safe-to-spend, navigasi history, badge desktop) konsisten dan tidak ada data hilang diam-diam.

## Ruang Lingkup

### P0 — Integritas Data (kritis)
- [x] **P0-1 Backup lengkap + izinkan saldo minus**
  - `export/route.ts`: sertakan `assets`, `debts`, `debt_payments`, `savings_goals`, `goal_contributions` (bersama 7 tabel existing) → total 12 koleksi.
  - `import/route.ts`: schema `backupWallet.balance` ubah `min(0)` → `finite` tanpa min (izinkan minus). Tambah schema `backupAsset`, `backupDebt`, `backupDebtPayment`, `backupGoal`, `backupContribution`. Mapping ID baru urut: wallets→categories→assets→debts→transactions→goals→contributions→budgets→bills→bill_payments→settings. Delete order diperluas.

- [x] **P0-2 Kunci saldo di `bills/auto-process`**
  - `SELECT ... FOR UPDATE` terurut UUID kanonik atas semua targetWalletId unik sebelum `UPDATE wallets`. Guard `bill_payments` exists sebelum mutasi + `rowCount` check untuk idempotency.

- [x] **P0-3 PUT Hutang & Aset tidak menghilangkan field**
  - `PUT /api/debts/[id]`: update seluruh kolom KPR: `category, principal_amount, interest_rate, interest_type, tenor_months, monthly_installment, total_interest`.
  - `PUT /api/assets/[id]`: tolak eksplisit 400 jika body mengandung `record_purchase_transaction`/`schedule_*` pada PUT.

### P1 — Konsistensi Angka & Navigasi
- [x] **P1-1 Seragamkan `safe_to_spend`** — `reports/monthly` samakan ke definisi bootstrap (`is_due_this_period` filter).
- [x] **P1-2 Hilangkan Rp0 palsu + sargable query** — hapus `.catch(()=>fallback)` dan ganti `EXTRACT(MONTH/YEAR)` → `make_date(...) + INTERVAL`.
- [x] **P1-3 Perbaiki history Back** — `pushState({tab: previous})` bukan hardcode dashboard; cap history max 50; `now` lazy init; `_tabHistory` → `tabHistory`.
- [x] **P1-4 Global refresh setelah Goals contribute** — `GoalsView` prop `onRefreshParent` dipanggil setelah contribute, page teruskan `refetch`.

### P2 — Paritas UI & Hygiene
- [x] **P2-1 Badge Sidebar Desktop** — `SidebarNav` menerima 3 counts, `AppShell` meneruskan, badge di budget/bills/debts.
- [x] **P2-2 Single period selector untuk Laporan** — `TopHeader` sembunyikan selector saat `reports`, hanya badge label.
- [x] **P2-3 Logging auto-schedule & feedback UI** — `debts/route.ts` log warn + flag `bill_scheduled`, `DebtsView` tampilkan warning jika gagal.
- [x] **P2-4 Polish kecil** — `BudgetView` guard kategori habis, `SettingsView` batasi 5 MB + validasi JSON, `ReportsView` sync via `useEffect`.

## File yang Disentuh
- `src/app/api/backup/export/route.ts`
- `src/app/api/backup/import/route.ts`
- `src/app/api/bills/auto-process/route.ts`
- `src/app/api/debts/[id]/route.ts`
- `src/app/api/assets/[id]/route.ts`
- `src/app/api/reports/monthly/route.ts`
- `src/app/api/debts/route.ts`
- `src/app/page.tsx`
- `src/components/goals/GoalsView.tsx`
- `src/components/layout/SidebarNav.tsx`
- `src/components/layout/AppShell.tsx`
- `src/components/layout/TopHeader.tsx`
- `src/components/reports/ReportsView.tsx`
- `src/components/budget/BudgetView.tsx`
- `src/components/settings/SettingsView.tsx`

## Kriteria Selesai (Definition of Done)
- `npm run build` lulus tanpa error (27 rute).
- `npm run lint` 0 error, 0 warning.
- `npm run test` (`test:audit` 119 + `test:e2e` 52) lulus 100% tanpa regresi.
- Verifikasi manual: (a) export→import round-trip minus+aset+KPR+goals utuh; (b) auto-process paralel tidak gandakan saldo; (c) PUT debts pertahankan tenor/bunga; (d) safe_to_spend identik; (e) back 3-tab chain bertahap; (f) badge desktop muncul; (g) Laporan hanya satu selector.

## Risiko & Mitigasi
- Backup import DELETE berurutan dalam transaksi: rollback aman; validasi schema & ukuran sebelum transaksi.
- Lock ordering dompet: sort UUID asc untuk hindari deadlock.
- Uniform safe_to_spend: samakan reports ke bootstrap agar skor Evaluasi tidak drift.
