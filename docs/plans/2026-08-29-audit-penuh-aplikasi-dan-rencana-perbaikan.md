# Plan: Audit Penuh Aplikasi dan Rencana Perbaikan

- Tanggal: 2026-08-29
- Status: draft

## Tujuan

Audit penuh KasKeluarga (Next.js 15 App Router, 11 menu utama, 35+ API routes, Neon Postgres, JWT httpOnly, offline queue, DeepSeek parser) untuk memastikan tidak ada bug tersisa, semua menu lengkap dan konsisten, serta alur end-to-end (auth → bootstrap → transaksi → anggaran → laporan → backup) sudah benar. Hasil audit dirangkum di dokumen ini sebagai dasar eksekusi perbaikan bertahap tanpa mengubah perilaku inti di luar scope yang dinyatakan.

## Ringkasan Audit (29 Agustus 2026)

Audit dilakukan read-only terhadap `src/app/page.tsx`, `src/components/**`, `src/lib/**`, seluruh `src/app/api/**`, layout `AppShell/BottomNav/SidebarNav/TopHeader`, serta `scripts/audit-self-test.ts` dan `scripts/e2e-full-suite.ts`. Rinci detail dilacak via sub-agent; temuan kunci diverifikasi manual pada 2026-08-29 terhadap file sumber.

### Sehat (dipertahankan)
- Isolasi multi-tenant konsisten: hampir semua query `WHERE user_id = $1` dan `FOR UPDATE ... ORDER BY id` anti-deadlock (`transactions/route.ts:141`, `transactions/[id]/route.ts:124`, `goals/[id]/contribute/route.ts:35`).
- Validasi Zod terpusat (`src/lib/validations.ts`) + `handleRouteError` (`src/lib/apiHelpers.ts:24`) memetakan Zod/Business/PG `23505/23503`.
- Transaksi atomik `withTransaction` (`src/lib/db.ts:46`) dipakai konsisten; idempotency `POST /api/transactions` + anti-replay `expected_updated_at` (409) teruji E2E.
- Navigasi 11 tab Sinkron antara `BottomNav.tsx:88-109` dan `SidebarNav.tsx:113-150`; a11y Escape + focus-return + View Transition tema sudah rapi.

### Bug Aktual (dapat direpro)
| ID | Lokasi | Dampak |
|---|---|---|
| B1 | `src/app/api/bills/auto-process/route.ts:58-68` | `UPDATE wallets SET balance` tanpa `FOR UPDATE` lock. Dua tab paralel `auto-process` atau `pay` konkuren dapat menggandakan mutasi saldo meski `bill_payments ON CONFLICT DO NOTHING` menahan duplikasi log. |
| B2 | `src/app/api/debts/[id]/route.ts:91-129` PUT | Hanya mengupdate `type, person_name, total_amount, due_date, notes`. Field KPR `category, principal_amount, interest_rate, interest_type, tenor_months, monthly_installment` hilang diam-diam saat edit. |
| B3 | `src/app/api/assets/[id]/route.ts:46-115` PUT | Hanya mengupdate 8 field dasar. Opsi `record_purchase_transaction / schedule_tax_* / schedule_maintenance_*` diabaikan; saldo dompet dan `recurring_bills` tidak sinkron pada edit (padahal POST atomik). |
| B4 | `src/app/api/reports/monthly/route.ts:33-109` | Setiap sub-query `.catch(()=>fallback 0)` menelan error DB dan mengembalikan `Rp 0` palsu — bertentangan dengan filosofi bootstrap "gagal keras" (`bootstrap/route.ts:24`). |
| B5 | `src/app/page.tsx:219-255` popstate | Setelah back dari tab non-dashboard, `pushState({tab:'dashboard'})` hardcode `dashboard` bukan `previous`. Rantai `dashboard→budget→bills→back→budget→back` desync dan memicu exit-toast prematur. |

### Gap Fungsional / Inkonsistensi
| ID | Lokasi | Dampak |
|---|---|---|
| G1 | `src/app/api/backup/export/route.ts:11-17` & `import/route.ts:93-177` | Backup tidak lengkap: hanya `wallets, categories, transactions, budgets, recurring_bills, bill_payments, settings`. Tabel `assets, debts, debt_payments, savings_goals, goal_contributions` tidak ikut → restore = data hilang diam-diam. |
| G2 | `src/app/api/backup/import/route.ts:13` | `balance: z.number().min(0)` menolak saldo minus, padahal `walletSchema` (`validations.ts:18`) dan migrasi `init/route.ts:229` eksplisit mendukung overdraft. User dengan dompet minus tidak bisa dipulihkan. |
| G3 | `safe_to_spend` | `bootstrap/route.ts:302-325` menghitung `totalPayableDue` hanya `is_due_this_period` (jatuh tempo bulan ini/null). `reports/monthly/route.ts:118-133` menghitung `SUM remaining` semua hutang aktif tanpa filter. Dua layar menampilkan "Dana Bebas" berbeda untuk periode sama. |
| G4 | `src/components/goals/GoalsView.tsx:128-148` | `contribute` membuat transfer kas nyata tetapi tidak memicu `onRefreshParent` / `refetch()` global. Saldo dompet di Dashboard/Wallet tetap stale sampai `visibilitychange` 5s atau ganti tab. |
| G5 | `src/components/layout/SidebarNav.tsx:113-150` vs `BottomNav.tsx:109` | Sidebar tidak menampilkan badge `overbudget/pending/unpaid` — user desktop kehilangan indikator yang ada di BottomNav. |
| G6 | `src/components/reports/ReportsView.tsx:72-192` + `TopHeader.tsx:102-141` | Duplikasi kontrol periode: `TopHeader` dan selector internal `ReportsView` tampil bersamaan di desktop untuk tab `reports`. |
| G7 | `src/app/api/debts/route.ts:144-157` | `auto_schedule_bill` `.catch(()=>{})` menelan error tanpa log — user mengira jadwal cicilan berhasil meski gagal. |

### Gap Kecil / Hygiene (P3)
- `page.tsx:92` `now = new Date()` dieksekusi tiap render (jitter); `BudgetView` fallback `categoryId=''` bila semua kategori sudah terpakai; `BillsView` fallback `wallets[0]` bila `bill.wallet_id` null; `GoalsView` dua jalur error `listError/actionError`; `ReportsView` 4 bulan paralel tanpa timeout; `SettingsView` upload restore tanpa batas ukuran file.

### Menu & Alur — Status Saat Ini
Semua 11 menu utama ada dan terhubung: **Beranda** (BalanceHeader/WalletScroller/MonthlySummary/TransactionList), **Riwayat Transaksi**, **Dompet** (+Reconcile), **Anggaran** (+Dana Darurat/Cadangan/Proyeksi), **Tagihan Rutin**, **Hutang & Piutang** (+Kalkulator), **Target Tabungan**, **Aset & Depresiasi** (+Jadwal Pajak/Servis), **Laporan** (Ringkasan/Cashflow/Neraca/Laba-Rugi/Rasio/Uang Dingin), **Evaluasi** (DecisionCard + Skor), **Pengaturan & Backup**. Tidak ada menu hilang. Alur kritikal (register→seed 4 dompet/15 kategori→login→bootstrap sargable→CRUD transaksi dengan lock→anggaran carry-forward→laporan sargable→backup) sudah teruji 119 audit + 52 E2E (terakhir 2026-08-28 pasca-fitur Smart Receipt Parser).

## Ruang Lingkup

Perbaikan dibagi 3 fase prioritas. Satu fase = satu entri changelog terpisah. Tidak ada perubahan di luar daftar file yang disentuh tanpa update plan terlebih dahulu.

### Fase P0 — Integritas Data (wajib)
- [ ] **P0-1 Backup lengkap + izinkan minus**: export/import mencakup `assets, debts, debt_payments, savings_goals, goal_contributions`; schema import `balance` izinkan negatif; mapping id baru untuk entitas tambahan (urut: wallets→categories→assets→debts→transactions→goals...); uji round-trip export→import mempertahankan saldo minus dan jumlah asset/utang/goal.
- [ ] **P0-2 Kunci saldo di auto-process**: `bills/auto-process` tambahkan `SELECT ... FOR UPDATE` dompet terurut UUID (pola sama seperti `transactions/route.ts:141`) sebelum loop `UPDATE balance`; pertahankan dalam satu `withTransaction`; `bill_payments ON CONFLICT DO NOTHING` tetap.
- [ ] **P0-3 PUT Hutang & Aset tidak menghilangkan data**: `PUT /api/debts/[id]` merge field KPR/bunga/tenor (read-merge-write atau update full kolom, termasuk `category, principal_amount, interest_rate, interest_type, tenor_months, monthly_installment`); hitung ulang `total_interest` bila relevan; `PUT /api/assets/[id]` pertahankan perilaku POST untuk `record_purchase_transaction`/`schedule_*` atau dokumentasikan eksplisit tidak mengubah saldo pada PUT dan kembalikan 400 bila diminta.

### Fase P1 — Konsistensi Angka & Navigasi
- [ ] **P1-1 Seragamkan `safe_to_spend`**: pilih definisi bootstrap (`is_due_this_period`) sebagai sumber tunggal; samakan `reports/monthly/route.ts` (filter `is_due_this_period`) atau beri alias field terpisah `safe_to_spend_all` bila ingin dua metrik; semua view Dashboard/Laporan/Evaluasi menampilkan angka yang sama untuk periode sama.
- [ ] **P1-2 Perbaiki history Back**: `page.tsx` `handlePopState` `pushState({tab: previous})` bukan hardcode `dashboard`; pertimbangkan `replaceState` untuk sinkron stack; batasi pertumbuhan `_tabHistory` (max 50) dan hilangkan underscore agar tidak dianggap unused.
- [ ] **P1-3 Global refresh setelah Goals contribute & Asset sell/buy**: `GoalsView` terima prop `onRefreshParent?: () => void` dan panggil setelah `contribute` sukses; `AssetsView`/`SellAssetModal` sudah benar — verifikasi tidak regresi; `page.tsx` teruskan `refetch` ke kedua view.
- [ ] **P1-4 Hilangkan Rp0 palsu**: `reports/monthly/route.ts` hapus `.catch(()=>0)` per sub-query; biarkan `Promise.all` gagal keras dan kembalikan 500 dengan pesan ramah agar UI menampilkan error state (konsisten dengan bootstrap).

### Fase P2 — Paritas UI & Hygiene
- [ ] **P2-1 Badge Sidebar**: teruskan `pendingBillsCount/overbudgetCount/unpaidDebtsCount` ke `SidebarNav` (seperti `BottomNav`) dan render badge di section head yang relevan (Tagihan Rutin, Anggaran, Hutang & Piutang).
- [ ] **P2-2 Single period selector untuk Laporan**: saat `activeTab==='reports'`, sembunyikan selector periode di `TopHeader` (hanya `ReportsView` yang mengendalikan); TopHeader tampilkan badge label saja.
- [ ] **P2-3 Logging auto-schedule**: `debts/route.ts` log error `auto_schedule_bill` (console.warn) dan kembalikan flag `bill_scheduled: boolean` di response agar UI dapat menampilkan warning toast bila gagal.
- [ ] **P2-4 Polish kecil**: `page.tsx` `now` via `useState(()=>new Date())` sekali; `BudgetView` cegah submit bila `unused` kosong (tampilkan empty "semua kategori sudah dianggarkan"); `SettingsView` batasi ukuran file restore (mis. 5 MB) dan tampilkan progress/validasi JSON sebelum POST.

### Di Luar Scope (sengaja tidak dikerjakan)
- Migrasi DB besar di luar penambahan kolom/index di atas.
- Perubahan identitas visual/token warna (sudah stabil sejak plan 2026-08-27 rombak identitas).
- Penambahan dependency baru — gunakan stdlib/`recharts`/`zod` yang sudah ada.

## File yang Disentuh

**P0**
- `src/app/api/backup/export/route.ts`
- `src/app/api/backup/import/route.ts`
- `src/app/api/bills/auto-process/route.ts`
- `src/app/api/debts/[id]/route.ts`
- `src/app/api/assets/[id]/route.ts`
- `src/lib/validations.ts` (schema backupWallet `balance` + debt/asset partial bila perlu)

**P1**
- `src/app/api/reports/monthly/route.ts`
- `src/app/api/dashboard/bootstrap/route.ts` (hanya jika perlu uniform helper, jika tidak biarkan)
- `src/app/page.tsx`
- `src/components/goals/GoalsView.tsx`
- `src/components/assets/AssetsView.tsx` (verifikasi refresh, tidak ubah logika inti)

**P2**
- `src/components/layout/SidebarNav.tsx`
- `src/components/layout/AppShell.tsx` (teruskan badge)
- `src/components/layout/TopHeader.tsx`
- `src/components/reports/ReportsView.tsx`
- `src/app/api/debts/route.ts`
- `src/components/budget/BudgetView.tsx`
- `src/components/settings/SettingsView.tsx`

**Test**
- `scripts/audit-self-test.ts` (tambah assertion untuk backup minus, debt PUT merge)
- `scripts/e2e-full-suite.ts` (tambah skenario: backup round-trip lengkap, auto-process konkuren, debt PUT tidak hilang, safe_to_spend seragam)

Tidak menyentuh `.env*`, `next.config.mjs`, `tailwind.config.ts` kecuali diperlukan untuk fix yang tercantum.

## Kriteria Selesai (Definition of Done)

- `npm run build` lulus tanpa error TypeScript baru.
- `npm run lint` 0 error (warning gaya pre-existing boleh sisa, tidak menambah error baru).
- `npm run test` (`test:audit` + `test:e2e`) lulus 100% termasuk skenario baru yang ditambahkan untuk P0/P1; skenario existing tidak regresi.
- Verifikasi manual: (a) export lalu import pada user dengan saldo minus, aset, hutang KPR, dan goals — semua entitas kembali utuh; (b) dua tab paralel `auto-process` tidak menggandakan saldo; (c) edit hutang KPR mempertahankan tenor/bunga; (d) `safe_to_spend` di Dashboard dan Laporan identik untuk periode sama; (e) back 3-tab chain kembali bertahap tanpa exit-toast prematur; (f) badge desktop muncul; (g) Laporan hanya satu selector periode.

## Risiko & Mitigasi

- **Backup import destruktif** (`DELETE` lalu `INSERT` dalam `withTransaction`): sudah aman karena rollback, tapi file corrupt besar + timeout DB dapat menahan lock — mitigasi dengan validasi Zod sebelum transaksi dan batas ukuran file (P2-4).
- **Lock ordering dompet**: wajib urut UUID kanonik sebelum `FOR UPDATE` untuk hindari deadlock transfer vs auto-process konkuren.
- **Uniform safe_to_spend**: perubahan definisi mempengaruhi skor Evaluasi dan ColdMoney — pastikan `FinancialRatiosReport` dan `EvaluationView` tidak hardcode threshold lama.

## Catatan Audit

- 30 pasangan token warna sudah lulus WCAG AA (fix `text-muted` 2026-08-28) — tidak perlu revisi tema.
- `offlineQueue` (`src/lib/offlineQueue.ts`) dan `deepseek` fallback heuristik tidak termasuk bug — hanya gap minor (PUT offline tanpa Idempotency-Key) dicatat sebagai P3 dan tidak dikerjakan di fase ini.
