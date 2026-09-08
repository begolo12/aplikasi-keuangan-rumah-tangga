# Changelog

Log eksekusi plan. Entri baru ditambahkan di bagian paling atas.
Format entri lihat `AGENTS.md` bagian "Langkah 3 — Catat ke Changelog".

## [2026-09-08] Stabilisasi, Perbaikan Build, Validasi Test, dan Integrasi SaaS Landing Page

**Plan**: `docs/plans/2026-09-08-stabilisasi-dan-pemulihan-saas.md`

### Berubah
- **Perbaikan Sintaks & Kompilasi**: Menutup komentar CSS di `src/app/globals.css`, memulihkan `SidebarNav.tsx` dengan status bersih, menutup call `apiFetch` di `SettingsView.tsx`, memperbaiki typo potongan teks di `GoalsView.tsx`, dan melengkapi import ikon `CircleDashed` & `Sparkle`.
- **Perbaikan Schema & Forecast**: Memperbaiki skema Zod `payBillSchema` (`amount`, `paid_date`), `assetSchema` (`name`), dan melengkapi penentuan `level = 'colapse'` pada simulasi kas minus di `collapseForecast.ts`.
- **Integrasi SaaS Landing Page**: Mengintegrasikan antarmuka landing page SaaS di `/` dan `/landing` tanpa konflik rute Next.js App Router (pengunjung publik melihat landing page berkonversi tinggi dengan pricing & feature showcase; pengguna terotentikasi langsung masuk ke dashboard).
- **Penyehatan Modul Baru**: Menyelaraskan signature database dan session ID pada API events, templates, currencies, dan subscriptions.
- **Verifikasi Kualitas**: `npm run test:audit` lulus 151/151 (100%), `npx tsc --noEmit` lolos 0 error, `npm run build` sukses membuat optimized production build dengan 49 rute aktif, dan ESLint lolos dengan 0 error.

### Dampak
Aplikasi kini sepenuhnya siap produksi untuk deployment SaaS di Vercel atau environment Node.js modern, dengan alur publik dan alur otentikasi yang mulus.

## [2026-09-08] Audit Komprehensif Aplikasi KasKeluarga

**Plan**: `docs/plans/2026-09-08-audit-aplikasi-komprehensif.md`

### Berubah
- Audit API, autentikasi JWT, isolasi data, transaksi finansial, household, backup/restore, PWA, frontend, aksesibilitas, dan mobile selesai.
- Laporan berbasis bukti ditambahkan di `docs/audits/2026-09-08-audit-aplikasi-komprehensif.md`.
- Tercatat empat temuan remediasi: pruning rate limiter in-memory, tanggal kalender lokal vs UTC, defense-in-depth same-origin pada mutasi cookie-backed, dan versioning cache service worker.
- Verifikasi: `npm run test:audit` 151 passed, `npm run lint` PASS, `npm run build` PASS, serta smoke browser auth/API guard/mobile PASS.

### Dampak
- Audit tidak mengubah perilaku aplikasi. Temuan siap dijadikan plan remediasi terpisah.

## [2026-09-03] Eksekusi Batch 5 — Kekurangan Flow (Peringatan, Fee, Cron, Pelunasan)

**Plan**: `docs/plans/2026-09-03-audit-flow-dan-rencana-perbaikan.md`

### Berubah
- **Peringatan pra-simpan**: modal transaksi kini menampilkan banner non-blokir saat
  saldo dompet tidak cukup (overdraft) atau nominal melewati anggaran kategori.
- **Fee berkategori**: biaya admin transfer/pengeluaran dibukukan sebagai transaksi
  expense pendamping (bisa pilih kategori); fee pemasukan ditolak eksplisit; fee baru
  via edit ditolak (hindari kas terdebit tanpa jejak).
- **Cicilan masuk budget**: form hutang punya opsi kategori anggaran untuk tagihan
  cicilan otomatis; pembayaran hutang langsung memakai kategori tagihan terkait.
- **Cron auto-record**: inti proses diekstrak ke `src/lib/billAutoProcess.ts` (dipakai
  tombol manual + cron baru `POST /api/bills/cron` ber-`CRON_SECRET`, jadwal Vercel
  02:00 UTC, hanya tagihan auto_record yang jatuh tempo).
- **Lunasi dari jual**: modal jual aset bisa melunasi hutang dari hasil jual dalam
  satu transaksi atomik (kas, expense, debt_payments, status hutang).

### Dampak
- Tanpa migrasi DB; skema Zod diperluas (backward-compat, semua field baru opsional).
- Companion fee adalah baris independen (edit/hapus transfer tidak menyentuhnya).
- Verifikasi: `tsc --noEmit` 0 error, eslint 0 error, `test:audit` 151 passed.

## [2026-09-03] Audit Flow & Perbaikan Batch 1-4 (Angka, Bayar, Household, Sesi)

**Plan**: `docs/plans/2026-09-03-audit-flow-dan-rencana-perbaikan.md`

### Berubah
- **Batch 1 — Angka benar**: query debts bootstrap kini memilih `active_bills_count`
  (cicilan tidak lagi dihitung ganda di safe-to-spend); total saldo bootstrap +
  laporan bulanan menyertakan dompet bersama; nama dompet shared tampil benar di
  export CSV. Assert kontrak anti double-count di `test:audit`.
- **Batch 2 — Bayar & hapus konsisten**: `debts/[id]/pay` menolak periode yang sudah
  dibayar (409, sama seperti `bills/pay`) + kunci baris tagihan di dua jalur;
  hapus tagihan mengembalikan `paid_amount` hutang terkait (jurnal-balik);
  `debts` PUT menolak total < terbayar; penjualan aset hanya mencatat laba/rugi vs
  nilai buku (kas terima penuh tetap).
- **Batch 3 — Household & goal**: operasional (rekonsiliasi, kontribusi goal,
  terima jual) bisa memakai dompet bersama via `walletAccessCondition`; struktural
  (ubah/hapus dompet) owner-only dengan 403 jelas; binding goal anti-rebut (409);
  progres goal non-envelope jujur (LEAST); restore backup pertahankan relasi
  (is_shared, linked_goal, debt/bill/asset, transaction_id); laporan per-anggota
  sadar transfer (setoran/penarikan bersama).
- **Batch 4 — Notifikasi & sesi**: push cron per-tagihan dgn tag sama dgn reminder
  lokal (menimpa, tidak menumpuk); redirect global ke login saat 401 tengah-sesi;
  rate limit register/AI-struk/subscribe/backup; dummy bcrypt anti enumerasi email;
  pesan restore tampilkan hitungan; halaman offline + fallback SW (cache v4).
- Sampingan: perbaiki 1 error lint `prefer-const` di `debts/route.ts`.

### Dampak
- Keputusan user: semua batch dieksekusi; saldo gabungan; jual catat gain saja.
- Tanpa migrasi DB (kolom yang dipakai sudah ada). Skema backup backward-compat.
- Verifikasi: `test:audit` 148 passed, eslint file tersentuh 0 error.
  `npm run build` crash di fase static-generation baik dengan maupun tanpa perubahan
  ini (isu toolchain/Node 24 pre-existing; fase TypeScript lulus).
- Batch 5 (kekurangan flow: peringatan budget/overdraft, fee berkategori, cron
  auto-record, lunasi-dari-jual) belum dieksekusi, menunggu prioritas berikutnya.

## [2026-09-02] Optimasi Efisiensi — Hapus Kode Mati Hasil Audit

**Plan**: `docs/plans/2026-09-02-optimasi-efisiensi-hapus-kode-mati.md`

### Berubah
- Hapus 4 skrip debug sekali-pakai (374 baris): `scripts/check-db.ts`, `scripts/check-table-cols.ts`, `scripts/test-record-transactions.ts`, `scripts/verify-bootstrap-query.ts`. Fungsinya sudah tercakup `test:audit` / `test:e2e`.
- Hapus `getCurrentPeriod()` dari `src/lib/formatters.ts` (nol pemanggil).
- Hapus `endpoints.authMe` dari `src/lib/apiFetch.ts` (nol pemanggil; `page.tsx` memanggil `/api/auth/me` langsung).
- Uninstall devDependency `@types/bcryptjs` (bcryptjs v3 sudah menyertakan tipe `index.d.ts` sendiri).
- Total: -385 baris, -1 dependensi.

### Dampak
- Tidak ada perubahan perilaku atau fitur. Verifikasi: `npm run build` lulus, `npm run test:audit` 142 passed.

## [2026-09-02] Perbaikan Menyeluruh Logika Sinkronisasi Hutang & Tagihan Rutin

**Plan**: `docs/plans/2026-09-02-perbaikan-logika-hutang-tagihan.md`

### Berubah
- **Otomatisasi Penuh Pembuatan & Pembaruan Tagihan Rutin Cicilan**:
  - Setiap hutang jenis `payable` dengan cicilan bulanan (`monthly_installment > 0`) kini otomatis dibuatkan/dihubungkan dengan data `recurring_bills` (`POST /api/debts`).
  - Ketika hutang diperbarui (`PUT /api/debts/[id]`), tagihan rutin terkait otomatis disinkronkan (judul, nominal cicilan, tanggal jatuh tempo, dan dompet).
  - Ketika hutang dihapus (`DELETE /api/debts/[id]`), tagihan rutin terkait otomatis dibersihkan agar tidak ada data yatim (orphaned bills).
- **Pencatatan Riwayat Pembayaran Historis Bulan Lampau**:
  - Untuk pinjaman/KPR yang dimulai di masa lalu (misal Jan 2026 s.d. Agu 2026), sistem otomatis membuat log `debt_payments` dan `bill_payments` lunas untuk setiap bulan lampau yang telah berjalan.
  - Bulan berjalan (September 2026) otomatis muncul sebagai tagihan siap bayar / terjadwal.
- **Sinkronisasi Dua Arah pada Auto-Process (`POST /api/bills/auto-process`)**:
  - Eksekusi *Proses Otomatis Tagihan* kini otomatis mendeteksi `bill.debt_id`, mengunci baris hutang (`FOR UPDATE`), menambah `paid_amount`, memperbarui status hutang, serta mencatat ke `debt_payments`.
- **Koreksi Perhitungan Kewajiban & Saldo Aman (Safe-to-Spend)**:
  - Mengeliminasi *double counting*: hutang yang sudah memiliki tagihan rutin aktif tidak lagi dihitung ganda di `total_payable_due`.
  - Hutang cicilan tanpa tagihan rutin hanya menghitung beban cicilan bulanan untuk periode berjalan, bukan seluruh pokok puluhan tahun ke depan (`totalBalance` & `safeToSpend` akurat).
- **Pembaruan Tampilan & Audit Suite**:
  - Menambahkan kolom `debt_id` & `debt_person_name` pada `GET /api/bills` dan badge `Cicilan Hutang` pada `BillItem.tsx`.
  - Menambahkan pengujian anti double-counting dan isolasi safe-to-spend di `scripts/audit-self-test.ts` (142 passed).

### Dampak
- Alur sinkronisasi antara menu Hutang dan Tagihan Rutin kini 100% konsisten dua arah. Beban cicilan KPR dan sisa hutang tersinkronisasi mulus di neraca, tagihan, dan safe-to-spend.

## [2026-09-02] Otomatisasi Cicilan KPR Berjalan, Sisa Hutang, & Integrasi Net Worth

**Plan**: `docs/plans/2026-09-02-kpr-auto-installment-networth.md`

### Berubah
- **Kalkulasi Cicilan Berjalan Otomatis (`POST /api/debts` & `src/lib/validations.ts`)**:
  - Menambahkan kolom dan skema validasi `start_date` (Tanggal Mulai Cicilan / Akad KPR), `initial_paid_amount`, `create_asset`, `asset_name`, dan `asset_price`.
  - Otomatis menghitung selisih bulan sejak tanggal akad hingga bulan saat ini (misal 20 Jan 2026 ke Sep 2026 = 8 bulan).
  - Mengisi `paid_amount` otomatis sesuai bulan berjalan (`8 × Rp 1.250.000 = Rp 10.000.000`) dan mengurangi `remaining_amount` (menjadi `Rp 140.000.000`).
  - Menjadwalkan `due_date` berikutnya ke siklus bulan berjalan/mendatang (`20 September 2026`), mencegah hutang KPR masa lalu salah ditandai sebagai *Menunggak*.
- **Integrasi Otomatis Aset Fisik & Kekayaan Bersih (Net Worth)**:
  - Opsi pendaftaran langsung sebagai Aset Properti (Rumah) atau Kendaraan di inventaris aset dalam transaksi atomik saat input pinjaman/KPR.
  - Nilai aset properti masuk ke neraca keuangan (`BalanceSheetReport`), sehingga cicilan pokok yang terbayar otomatis meningkatkan **Kekayaan Bersih (Net Worth)**.
- **Pembaruan Tampilan (`DebtsView.tsx` & `DebtItem.tsx`)**:
  - Live preview di form modal: deteksi bulan berjalan, estimasi total terbayar, sisa hutang riil, serta checkbox integrasi aset properti.
  - Kartu hutang (`DebtItem`) kini menampilkan tanggal mulai akad pinjaman dan nomor cicilan berjalan (`Bulan ke-X dari Y`).
- **Migrasi Database & Pengujian**:
  - Menambahkan migrasi idempoten kolom `start_date` pada tabel `debts` (`scripts/run-db-migrations.ts` & `src/app/api/init/route.ts`).
  - Menambahkan 4 unit test di `scripts/audit-self-test.ts` (140 passed, 0 failed).

### Dampak
- Migrasi database live telah dijalankan (`start_date` pada tabel `debts`).
- Pengguna yang mencatat KPR masa lalu langsung memperoleh data sisa hutang dan nilai ekuitas Net Worth yang akurat tanpa perlu input transaksi cicilan manual satu per satu.

## [2026-09-01] Audit dan Verifikasi Alert In-App

**Plan**: `docs/plans/2026-09-01-audit-in-app-alerts.md`

### Berubah
- **Verifikasi & Sweep Bebas Browser Alert**: Memeriksa seluruh codebase `src/` dari pemanggilan dialog bawaan browser (`window.alert`, `window.confirm`, `window.prompt`). Hasil sweep regex: 0 kemunculan dialog native browser.
- **Konsistensi UI In-App**: Seluruh interaksi, peringatan, aksi penghapusan, dan umpan balik error telah menggunakan komponen in-app:
  - Konfirmasi hapus modal: `<ConfirmModal>` pada AssetsView, BillsView, BudgetView, HouseholdView.
  - Konfirmasi hapus inline: TransactionItem, WalletsView, DebtItem, BillItem.
  - Banner error / status responsif: `role="alert"` dengan styling Tailwind di semua view & form modal.
  - Alur konfirmasi ganda reset: form ketik teks "RESET" in-app di SettingsView.
- **Audit Suite**: Menambahkan inisialisasi default `JWT_SECRET` pada `scripts/audit-self-test.ts` agar test audit suite dapat dijalankan secara konsisten tanpa dependensi manual.

### Dampak
- Tidak ada perubahan antarmuka atau breaking change. `npm run test:audit` lulus (136/136) dan `npm run build` berhasil.

## [2026-09-01] Fix Parameter Query Bootstrap & Sweep Mismatch Param SQL

**Plan**: `docs/plans/2026-09-01-fix-parameter-query-bootstrap.md`

### Berubah
- **Fix 500 pada `GET /api/dashboard/bootstrap`** (`src/app/api/dashboard/bootstrap/route.ts`): query debts menghasilkan kolom `is_due_this_period` dengan `make_date($3::int, $2::int, 1) ... + INTERVAL '1 month'` di klausa CASE, tetapi params yang dikirim hanya `[uid]` sehingga Postgres mengembalikan 08P01 `bind message supplies 1 parameters, but prepared statement "" requires 3`. Params diperbaiki menjadi `[uid, month, year]` ($2=month, $3=year, urutan sama dengan query lain di file). Semantik `is_due_this_period` tidak berubah: hutang unpaid yang jatuh tempo bulan terpilih, sudah terlewat, atau tanpa due_date; perhitungan `totalPayableDue`/`totalReceivableDue`/safe-to-spend di bawahnya tetap konsisten.
- **Sweep mismatch placeholder vs params di seluruh `src/app/api/**/route.ts` (44 file)**: skrip tsx sementara mengekstrak panggilan `query(...)`/`client.query(...)` dan membandingkan placeholder maksimum `$N` dengan panjang array params; setiap kandidat dikonfirmasi manual. Hasil: hanya 1 mismatch nyata (bootstrap, diperbaiki di atas); 4 kandidat lain false positive regex (params dengan nested bracket seperti `created[0].id`): `debts/[id]/pay` (6 placeholder vs 6 params), `goals/route.ts` (3 vs 3), `goals/[id]/contribute` (6 vs 6), `households/route.ts` (2 vs 2), semuanya bersih.
- **Query dinamis diperiksa manual** dan konsisten (penambahan `$n` selalu berpasangan dengan `params.push`): `transactions/route.ts` GET, `debts/route.ts` GET, `assets/route.ts` GET, `reports/export-csv/route.ts` GET. `reports/monthly/route.ts` (CASE identik `is_due_this_period`) sudah mengirim `[uid, month, year]`, bersih tanpa perubahan.
- **Verifikasi perilaku** (skrip tsx sementara, env dimuat dari `.env.local` tanpa mencetak nilainya, dihapus setelah selesai): user nyata diambil via `SELECT id FROM users LIMIT 1`, JWT ditandatangani dengan `createSessionToken` (JWT_SECRET dari env, token_version dari DB sehingga jalur tv di `getAuthSession` teruji), `GET` bootstrap dipanggil langsung dengan NextRequest palsu berisi cookie `kas_session_token` untuk month 1..12 tahun 2026: 12/12 status 200 tanpa 08P01, ringkasan data masuk akal (wallets=4, totalBalance=1050000, safeToSpend=1050000, transaksi muncul di month=8: 3 transaksi).
- `npm run lint`: 0 error, 7 warning (semua pre-existing react-hooks/set-state-in-effect, tidak bertambah). `npm run build`: sukses.

### Dampak
- Tidak ada perubahan skema/perilaku API lain; hanya bootstrap yang sebelumnya 500 kini berfungsi. Tidak perlu migrasi.

## [2026-09-01] Remediasi Audit Lanjutan: Init Guard, Sinkronisasi Hutang-Tagihan & Hardening

**Plan**: `docs/plans/2026-09-01-remediasi-audit-lanjutan.md`

### Berubah
- **Init guard satu pintu (`src/app/api/init/route.ts`)**: menutup bypass `X-Init-Secret`. Fungsi baru `authorizeInit(req, client)` menjadi satu jalur otorisasi: bila INIT_SECRET diset, header `x-init-secret` wajib persis cocok (403 selain itu); bila tidak diset, perilaku lama dipertahankan (bootstrap pertama hanya saat DB masih kosong). Jalur ganda `assertInitAllowed` + cek sisi `initializeSchema` dihapus.
- **Relasi hutang-tagihan dua arah (P1)**: kolom baru `recurring_bills.debt_id UUID REFERENCES debts(id) ON DELETE SET NULL` + index `idx_recurring_bills_debt` di migrasi init dan `scripts/run-db-migrations.ts` (ditempatkan SETELAH pembuatan tabel debts di langkah 3). POST `/api/debts` kini mengisi `debt_id` saat auto_schedule_bill membuat tagihan cicilan. `/api/bills/[id]/pay` kini menyinkronkan pembayaran tagihan ke hutang: kunci baris debts (`FOR UPDATE`), hitung sisa, `applied = min(amount, sisa)`, insert `debt_payments` (catatan "Pembayaran cicilan via tagihan"), update `paid_amount` + status ('paid'/'partial') dalam transaksi yang sama. Parameter query tak terpakai ($2/$3) di `/api/debts/[id]/pay` dirapikan.
- **Atomicity (P2)**: INSERT debts + INSERT recurring_bills cicilan dibungkus `withTransaction` di POST `/api/debts`.
- **Proteksi kategori (P2)**: DELETE `/api/categories/[id]` menolak hapus kategori yang dipakai `recurring_bills` (pre-check + NOT EXISTS), pesan error menyebut transaksi, anggaran, atau tagihan rutin.
- **CSV formula injection (P2)**: `escape` di export-csv memberi prefiks apostrof untuk nilai berawalan `=`, `+`, `-`, `@`.
- **Batas body chunked (P2)**: `readJsonBody` membaca stream dengan akumulator TextDecoder, batas keras 2.500.000 byte (413 saat lewat).
- **Pencabutan sesi JWT (P2)**: kolom `users.token_version INTEGER NOT NULL DEFAULT 0`, klaim `tv` di token, `getAuthSession` membandingkan tv payload vs DB (baris tak ada / beda versi = sesi tidak sah), login/register menyertakan `token_version`, logout menaikkan `token_version` (best effort, cookie tetap dihapus bila DB gagal). Token lama tanpa klaim tv dianggap tv 0, tidak memaksa logout massal.
- **Rate limiting best effort (P2)**: `src/lib/rateLimit.ts` (sliding window per instance, komentar jujur soal keterbatasan serverless multi-instance). Diterapkan: login 10/10 menit per IP+email, households/join 20/jam per IP, settings/reset-data 5/jam per user; pelanggaran mendapat 429 dengan pesan Indonesia.
- **Health check (P2)**: `latencyMs` dan `uptimeSeconds` hanya disertakan bila sesi valid; caller anonim hanya mendapat status/database/timestamp.
- **Privasi struk AI**: ReceiptParserModal menampilkan catatan "Teks struk dianalisis AI di server (DeepSeek) untuk mengisi form otomatis."
- **Dokumentasi**: baris "Test audit" di AGENTS.md dikoreksi menjadi `npm run test:audit` dengan catatan `npm test` penuh menjalankan E2E destruktif terhadap DB `.env.local`.

### Dampak
- Migrasi idempoten `npx tsx scripts/run-db-migrations.ts` telah dijalankan di DB live: `recurring_bills.debt_id` (uuid) dan `users.token_version` (integer) terverifikasi ada. Tidak ada data dihapus.
- Verifikasi: `npm run test:audit` lulus 136 passed 0 failed, `npm run lint` 0 error dengan 7 warning pre-existing (react-hooks/set-state-in-effect), `npm run build` sukses.
- Sesi aktif pengguna tidak terputus oleh migrasi token_version (token lama dianggap tv 0); logout berikutnya menaikkan versi dan mencabut token lain milik user tersebut.

## [2026-09-01] E2E Verifikasi Akun Uji

**Plan**: `docs/plans/2026-09-01-e2e-verifikasi-akun-uji.md`

### Berubah
- Probe database menjalankan koneksi ke `neondb` dan menemukan 5 user yang sudah ada.
- Suite E2E tidak dijalankan karena target `.env.local` tidak dapat dibuktikan sebagai database test terisolasi.

### Dampak
- Tidak ada akun atau data yang dibuat oleh suite.
- Jalankan suite pada `DATABASE_URL` khusus test sebelum validasi E2E penuh.

## [2026-09-01] Remediasi Penuh Audit Aplikasi

**Plan**: `docs/plans/2026-09-01-remediasi-penuh-audit-aplikasi.md`

### Berubah
- Memperbaiki perhitungan biaya admin, pembalikan saldo transaksi, affected-row checks, dan race idempotensi tagihan.
- Memperketat JWT, invite code, inisialisasi schema, error health check, body size, dan akses dompet household.
- Memperbaiki sinkronisasi hutang-tagihan, validasi impor backup, laporan periode, envelope wallet, modal, service worker, dan reminder lokal.

### Dampak
- `npm run build` sukses dan `npm run test:audit` lulus 136 assertion.
- `npm run lint` tidak memiliki error, tetapi masih melaporkan 7 warning React hooks pre-existing/known.
- E2E live tidak dijalankan karena suite bersifat destruktif terhadap database pada `.env.local`.

## [2026-09-01] Anggaran Otomatis dari Tagihan Rutin & Cicilan

**Plan**: `docs/plans/2026-09-01-anggaran-otomatis-dari-tagihan-dan-cicilan.md`

### Berubah
- **Kebutuhan bulanan otomatis (`FinancialSafetyPlanCard.tsx:21, ExpenseProjectionCard.tsx:21, ColdMoneyCard.tsx:20, EvaluationView.tsx:166`)**: `monthly_budget` kini = anggaran manual + tagihan rutin aktif + cicilan hutang aktif (payable unpaid `monthly_installment`). Sebelumnya hanya anggaran manual + realisasi, sehingga ada tagihan/cicilan pun kartu Resume masih Rp 0 (screenshot: Cadangan 4 Bulan 0). `is_default_budget` hanya true bila semua sumber + realisasi 0.
- **Wiring (`BudgetView.tsx:16, EvaluationView.tsx:26, page.tsx:649,682`)**: `BudgetView` terima `bills` & `debts` dari bootstrap dan teruskan ke kartu; `EvaluationView` hitung `expenseBenchmark` dan `coldMoneyInfo` dari combinedBudget dan fetch `bills` bila prop kosong. `ColdMoneyCard` hapus fallback palsu 1jt → 0.
- **Catatan**: double-count bila hutang auto-create tagihan `Cicilan: ...` dianggap konservatif (cadangan lebih besar, lebih aman).

### Dampak
- Dengan tagihan/cicilan aktif, Resume Rencana Keamanan & Proyeksi langsung menampilkan kebutuhan & cadangan 4.4x tanpa perlu anggaran manual. `lint` 0 error, `build` sukses, 136 audit lulus.

## [2026-09-01] Fix Persist Tab F5 vs Ctrl+Shift+R (Robust Hydration + Cache)

**Plan**: `docs/plans/2026-09-01-pertahankan-tab-saat-refresh.md` (revisi 2)

### Berubah
- **Root cause F5 masih Home**: `getInitialTab()` SSR → `dashboard`; cache HTTP/SW sebab F5 pakai JS lama (cache) sedangkan Ctrl+Shift+R bypass cache → dapat JS baru. 
- **Fix robust (`src/app/page.tsx:111,181,343,375`, `public/sw.js:4`)**: `getInitialTab()` cek berlapis `history.state.tab` → `sessionStorage` → `localStorage`. Efek mount baca berlapis, sync `activeTab/tabHistory/replaceState`, simpan ke kedua storage di `handleTabChange` & `popstate`. Tambah listener `pageshow` untuk bfcache. `tabHistory` init dari `getInitialTab()`. Hapus `replaceState` unconditional dari efek `popstate`. Bump SW cache `kaskeluarga-static-v2` → `v3` untuk bust cache lama.

### Dampak
- F5 maupun Ctrl+Shift+R kini kembali ke tab terakhir. Hard reload sekali diperlukan setelah deploy untuk bust cache lama; selanjutnya F5 konsisten. `lint` 0 error (6 warnings pre-existing), `build` sukses.

## [2026-09-01] Simulasi What-If Jangka Panjang 12 Bulan (Tambah Beban + Proyeksi)

**Plan**: `docs/plans/2026-09-01-simulasi-tambah-beban.md`

### Berubah
- **`ScenarioSimulator` dua arah (`src/components/evaluation/ScenarioSimulator.tsx`)**: Kelompok `Tambah Beban Baru` dengan 3 mode — Langganan (biaya/bulan), Beli Tunai (sekali bayar), Cicilan (DP + angsuran × tenor) — menambah daftar skenario tanpa mengubah data asli. Tenor cicilan disimpan (`tenorMonths`) sehingga proyeksi bulanan hanya membebani selama tenor.
- **Proyeksi 12 bulan ke depan (baru)**: Tabel 12 baris (label `MMM YYYY` dari `currentMonth/currentYear` atau `new Date()`) menghitung kas kumulatif: `kasAwal = totalCash - oneTimeCost`, tiap bulan `kas += cashflowBefore - activeMonthlyCost + totalReduction`. Kolom Kas Tanpa Skenario vs Dengan Skenario + selisih + badge status (`Aman` / `Di bawah cadangan` / `Minus`). Banner otomatis sorot bulan pertama di bawah cadangan 4.4x atau minus; bila aman tampil "Aman 12 bulan".
- **Chart mini 12 bulan (Recharts `LineChart`)**: Garis `Baseline` (tanpa skenario, putus) vs `Dengan Skenario` (solid) + `ReferenceLine` cadangan wajib 4.4x. Tooltip format Rupiah, axis compact.
- **`EvaluationView` (`src/components/evaluation/EvaluationView.tsx:389`)**: Meneruskan `currentMonth/currentYear` ke simulator agar label kalender sinkron dengan periode Evaluasi.
- **Plan doc diperluas**: Dari snapshot 6/12 bulan menjadi proyeksi bulan-per-bulan 1 tahun; status `running` → `done`.

### Dampak
- Murni kalkulasi klien, tidak ada endpoint/DB baru. Asumsi proyeksi konservatif: pemasukan & pengeluaran bulan berjalan dianggap konstan; cicilan berakhir tepat sesuai tenor. `lint` 0 error, `build` sukses, 136 audit + 52 E2E lulus.

## [2026-09-01] Pertahankan Tab Aktif Saat Refresh

**Plan**: `docs/plans/2026-09-01-pertahankan-tab-saat-refresh.md`

### Berubah
- **Persist tab aktif (`page.tsx`)**: Tab yang sedang dibuka disimpan ke `sessionStorage` setiap berpindah; state awal `activeTab` dibaca dari sana (divalidasi terhadap daftar NavTab, fallback Beranda). Entry history root kini mengikuti tab tersimpan, bukan hardcode Beranda, sehingga perilaku tombol back mobile tetap konsisten.

### Dampak
- Refresh (F5) kini mengembalikan ke halaman yang sama, bukan Beranda. Penyimpanan per-sesi & per-perangkat: buka tab browser baru tetap mulai dari Beranda. Lint 0 error, build sukses.

## [2026-09-01] Tanpa Fallback Default — Kartu Anggaran Tampil 0 Bila Data Kosong

**Plan**: `docs/plans/2026-09-01-klarifikasi-default-setelah-reset.md`

### Berubah
- **Fallback default dihapus**: `calculateFinancialSafetyPlan` (asumsi Rp 1.000.000/bulan) dan `calculateExpenseProjection` (asumsi Rp 1.500.000/bulan) tidak lagi mengarang angka saat anggaran & pengeluaran kosong — semua tampil Rp 0 apa adanya.
- **Status netral**: Safety Plan tampil "Anggaran Belum Diatur" dengan penjelasan bahwa KPI akan dihitung otomatis begitu anggaran ditetapkan; Proyeksi memakai badge "Belum Ada Anggaran" + banner serupa. Progress bar diamankan dari pembagian nol.

### Dampak
- Revisi kedua usai feedback user: solusi awal (flag `is_default_budget` + label "estimasi default") dinilai masih membingungkan karena angka fiktif tetap tampil. Kini benar-benar 0. Tidak ada perubahan DB; lint 0 error, build sukses, 136 unit + 52 E2E lulus.

## [2026-09-01] Perbaikan Formula Uang Cadangan + Fitur Reset Data

**Plan**: `docs/plans/2026-09-01-perbaikan-formula-uang-cadangan.md` & `docs/plans/2026-09-01-fitur-reset-data.md`

### Berubah
- **Bug Formula Safety Plan (`FinancialSafetyPlanCard.tsx`)**: "Uang Cadangan Saat Ini" sebelumnya hanya menghitung dompet tipe `savings` begitu ada satu dompet savings (kas/bank/e-wallet diabaikan), sehingga user ber-saldo Rp 38 juta ditampilkan Rp 0 dan status merah. Sekarang `current_cash` = jumlah saldo positif SEMUA dompet, konsisten dengan `calculateColdMoney` dan kartu Dana Bebas di dashboard.
- **Fitur Reset Data (`/api/settings/reset-data` baru)**: Dalam satu transaksi menghapus seluruh data keuangan user (transaksi, anggaran, hutang/piutang, aset, tagihan rutin & pembayarannya, target tabungan & kontribusinya, pembelajaran AI merchant map) dan mengembalikan saldo semua dompet ke Rp 0 (status rekonsiliasi ikut direset). Revisi usai feedback: definisi tagihan rutin & target tabungan kini ikut dihapus agar hasil reset benar-benar kosong. Yang dipertahankan hanya akun, dompet, dan kategori. Wajib body `{ confirmation: "RESET" }` (validasi Zod `z.literal`); semua query filter `user_id`.
- **UI Reset Data (`SettingsView.tsx`)**: Kartu "Reset Data (Mulai dari Nol)" dengan peringatan backup dulu dan konfirmasi dua langkah (ketik RESET). Setelah sukses data di-refresh otomatis.

### Dampak
- Perbaikan formula mengubah status kartu safety plan bagi user yang uangnya di dompet non-savings: kini terhitung benar (bisa berubah dari merah ke hijau).
- Endpoint reset bersifat destruktif tapi terlindungi konfirmasi eksplisit "RESET" dan hanya menjangkau data user yang login. Lint 0 error, build sukses, 136 unit + 52 E2E lulus.

## [2026-09-01] Fase 7 — PWA Reminder Proaktif

**Plan**: `docs/plans/2026-09-01-fase-7-pwa-reminder.md`

### Berubah
- **Service Worker (`public/sw.js`)**: Handler pesan `KAS_REMINDERS` menampilkan maksimal 2 notifikasi tagihan mendesak + 2 anggaran hampir habis (dedup via `tag`), plus `notificationclick` untuk memfokuskan aplikasi yang sudah terbuka.
- **ReminderScheduler (`src/components/pwa/ReminderScheduler.tsx` baru)**: Sekali per hari per perangkat (penanda tanggal di localStorage), mengirim tagihan belum lunas H-1/H-0 dan anggaran terpakai ≥75% dari data bootstrap yang sudah ada di klien ke service worker. Tidak ada request jaringan tambahan.
- **Kartu Pengingat Notifikasi (`SettingsView.tsx`)**: Tombol "Aktifkan Pengingat" meminta izin `Notification` lewat aksi user (anti-nagging, tidak diblokir browser); status aktif/diblokir ditampilkan; preferensi disimpan di localStorage.
- **Wiring**: Scheduler dipasang di `page.tsx` dengan data `bills` & `budgets` bootstrap.

### Dampak
- Notifikasi hanya muncul di production build (SW hanya terdaftar di production) dan hanya setelah user mengaktifkan dari Pengaturan. Ini reminder lokal via SW, bukan web push server (VAPID) sehingga tidak butuh infrastruktur server. Lint 0 error, build sukses, 136 unit + 52 E2E lulus.

## [2026-09-01] Fase 6 — Simulasi Skenario (What-If)

**Plan**: `docs/plans/2026-09-01-fase-6-simulasi-what-if.md`

### Berubah
- **Komponen ScenarioSimulator (`src/components/evaluation/ScenarioSimulator.tsx` baru)**: Simulasi hemat tanpa menyentuh data riil. Dua mode skenario: (1) matikan tagihan rutin terpilih (dropdown tagihan aktif bertipe expense), (2) kurangi kategori pengeluaran sebesar nominal bebas. Beberapa skenario bisa digabung (satu item per sumber, menambah ulang menimpa).
- **Hasil Proyeksi**: Total hemat per bulan, proyeksi 6 bulan & 12 bulan ("RpN hemat/bulan → RpM/tahun"), serta dampak savings rate bulan berjalan (sebelum → sesudah) bila pemasukan tersedia.
- **Integrasi (`EvaluationView.tsx`)**: Kartu simulasi dipasang setelah Forecasting Colapse, menerima `monthlyIncome` dari ringkasan bulan berjalan; komponen memuat tagihan & kategori sendiri via API.

### Dampak
- Tidak ada perubahan backend/DB. `npm run build` sukses.

## [2026-09-01] Fase 5 — Dompet Envelope (Tujuan Tertaut)

**Plan**: `docs/plans/2026-09-01-fase-5-dompet-envelope.md`

### Berubah
- **Migrasi Database (`init/route.ts`)**: Tipe dompet baru `envelope` ditambahkan ke CHECK constraint `wallets_type_check` (migrasi idempoten, hanya re-create bila definisi lama belum memuatnya) dan kolom `wallets.linked_goal_id` (ON DELETE SET NULL).
- **Binding Dua Arah (`goals/route.ts`, `goals/[id]/route.ts`)**: Saat goal dibuat/diubah dengan dompet penampung, `linked_goal_id` dompet diarahkan ke goal; binding lama dibersihkan dulu. Hapus goal otomatis melepas binding via FK.
- **Progres dari Saldo Amplop (`GOALS_QUERY`)**: Bila dompet penampung bertipe `envelope`, `saved_amount`/`remaining`/`percentage` dihitung dari saldo dompet (bukan SUM kontribusi); goal non-envelope tetap memakai riwayat kontribusi. Query dirapikan jadi CTE `saved` tanpa GROUP BY ganda.
- **UI**: Opsi tipe "Amplop Target (Envelope)" di form dompet; tipe `WalletType` & skema Zod diperluas.

### Dampak
- Migrasi wajib dijalankan (`GET /api/init` atau migrasi manual) sebelum fitur dipakai; sudah diterapkan ke database dev. Build lulus, 136 unit + 52 E2E lulus.

## [2026-09-01] Fase 4 — AI Receipt Learning

**Plan**: `docs/plans/2026-09-01-fase-4-ai-receipt-learning.md`

### Berubah
- **Migrasi Database (`init/route.ts`)**: Tabel baru `merchant_category_map` per user (merchant_name → category_id, hitungan `correct_count`/`override_count`, unik per user+merchant).
- **Pembelajaran dari Kebiasaan (`/api/ai/merchant-map` baru)**: `POST` upsert mapping; kategori yang diterima menaikkan `correct_count`, override user menaikkan `override_count` dan memperbarui kategori. Kategori divalidasi milik user (Zod + cek ownership).
- **Auto-Kategori di Parse Struk (`/api/ai/parse-receipt`)**: Setelah AI parse, bila merchant punya mapping yakin (≥2x konfirmasi benar dan rasio benar ≥60%), `suggested_category_id` ditimpa kategori hasil belajar dengan confidence "high".
- **Feedback dari Form (`TransactionModal.tsx`)**: Transaksi dari struk AI mengirim mapping fire-and-forget setelah tersimpan (override terdeteksi dari perubahan kategori); kegagalan tidak menggagalkan transaksi.

### Dampak
- Migrasi idempoten via `GET /api/init` (tabel baru). Lint lulus, `npm run build` sukses. Isolasi mapping per user terjaga.

## [2026-09-01] Fase 3 — Insight Pintar Otomatis

**Plan**: `docs/plans/2026-09-01-fase-3-insight-pintar.md`

### Berubah
- **API Insight (`src/app/api/insights/route.ts` baru)**: `GET /api/insights` menghitung (1) deteksi lonjakan pengeluaran kategori vs rata-rata 3 bulan sebelumnya (threshold >30% dan minimal Rp50.000 agar tidak berisik), (2) deteksi dompet minus saat ini, (3) saran bayar tagihan jatuh tempo ≤7 hari lebih awal bila ada dompet beri saldo cukup (atau peringatan menyiapkan dana bila tidak ada), dan (4) skor kesehatan keuangan 0–100 (40% savings ratio + 30% budget compliance + 30% beban hutang) dengan kondisi excellent/good/warning/critical. Respons terurut prioritas, maksimal 3 insight.
- **Widget Insight Hari Ini (`src/components/dashboard/InsightWidget.tsx` baru)**: Kartu dashboard berisi skor kesehatan + insight teratas dengan ikon per tipe. Widget menyembunyikan diri bila tidak ada insight. Gagal memuat tidak menggagalkan dashboard.
- **Wiring**: Widget dipasang di dashboard `page.tsx` setelah ringkasan bulanan; tipe `InsightItem`/`InsightsData` di `types.ts`, endpoint `endpoints.insights` di `apiFetch.ts`.

### Dampak
- Tidak ada migrasi DB dan tidak ada breaking change. `npm run build` sukses.

## [2026-09-01] Fase 2 — Laporan Tahunan & Tren

**Plan**: `docs/plans/2026-09-01-fase-2-laporan-tahunan.md`

### Berubah
- **API Laporan Tahunan (`src/app/api/reports/yearly/route.ts` baru)**: `GET /api/reports/yearly?year=` mengembalikan arus kas 12 bulan (pemasukan vs pengeluaran), perbandingan YoY per kategori (delta absolut dan %), top 5 kategori pengeluaran, tabungan bersih setahun (income − expense), dan savings rate. Query terindeks rentang tanggal `make_date` dan selalu filter by user id.
- **Komponen YearlyReport (`src/components/reports/YearlyReport.tsx` baru)**: Grafik batang 12 bulan interaktif (tooltip per bulan), ringkasan net per bulan, top 5 kategori dengan progress bar, dan tabel YoY per kategori lengkap dengan badge delta (naik/hijau turun/"Baru" untuk kategori baru).
- **Selector Tahunan (`ReportsView.tsx`)**: Tab ke-6 "Tahunan" di switcher laporan; grid switcher disesuaikan menjadi 6 pilar. Tahun awal mengikuti periode yang sedang aktif.
- **Tipe & Endpoint**: `YearlyReportData`, `YearlyMonthDatum`, `YearlyCategoryDatum` di `types.ts`; `endpoints.reportsYearly` di `apiFetch.ts`.

### Dampak
- Tidak ada migrasi DB dan tidak ada breaking change. Lint lulus (0 error), `npm run build` sukses.

## [2026-09-01] Fase 1 — Kas Rumah Tangga Bersama (Shared Household)

**Plan**: `docs/plans/2026-09-01-fase-1-shared-household.md`

### Berubah
- **Migrasi Database (`src/app/api/init/route.ts`)**: Tabel baru `households` (owner + kode undangan 8 karakter) dan `household_members` (role owner/member, satu household per user), serta kolom `wallets.household_id` untuk menandai dompet bersama.
- **API Household Baru**: `GET/POST/DELETE /api/households` (status, buat, keluar/bubar), `POST /api/households/join` (gabung via kode undangan), `DELETE /api/households/members/[id]` (owner mengeluarkan anggota), dan `GET /api/households/report` (laporan pengeluaran/pemasukan per anggota pada dompet bersama).
- **Dompet Bersama (`src/app/api/wallets/route.ts`, `validations.ts`)**: Skema wallet mendukung `is_shared`; daftar dompet menyertakan dompet bersama household; form dompet di UI mendapat opsi "Dompet bersama".
- **Transaksi Lintas Anggota (`src/app/api/transactions/route.ts`, `bootstrap/route.ts`)**: Anggota dapat mencatat transaksi/transfer di dompet bersama (validasi + lock dompet by id), feed transaksi menyertakan transaksi dompet bersama, ringkasan arus kas bulanan ikut menghitungnya, dan nama pencatat (`recorder_name`) dikirim hanya bila pencatatnya anggota lain.
- **Atribusi Pencatat (`TransactionItem.tsx`)**: Chip nama pencatat muncul pada transaksi dompet bersama yang dicatat anggota lain.
- **UI Kas Keluarga (`HouseholdView.tsx` baru)**: Buat keluarga, gabung via kode, salin kode undangan (owner), daftar anggota + keluarkan anggota, badge aktivitas 7 hari terakhir, laporan belanja per anggota per bulan.
- **Navigasi**: Tab `household` ("Keluarga") di BottomNav (menu Lainnya, dengan badge aktivitas), SidebarNav, dan wiring di `page.tsx` (badge dimuat paralel saat bootstrap).

### Dampak
- Tidak ada breaking change: user tanpa household berperilaku persis seperti sebelumnya. Menjalankan `GET /api/init` menerapkan migrasi idempoten (tabel + kolom baru).
- Isolasi data tetap terjaga: dompet pribadi tidak pernah terlihat anggota lain; akses lintas user hanya pada dompet dengan `household_id` yang sah.
- Lint lulus (0 error), `npm run build` sukses, seluruh 136 unit audit + 52 E2E lulus.

## [2026-08-30] Upgrade Fitur: Privacy Mode, Daily Quota, PWA Shortcuts & Cetak Laporan PDF

**Plan**: `docs/plans/2026-08-30-upgrade-privacy-dailyquota-pwa-shortcuts.md`

### Berubah
- **PWA App Shortcuts (`public/manifest.json` & `src/app/page.tsx`)**: Menambahkan shortcut cepat saat menekan tahan ikon aplikasi pada homescreen (Catat Pengeluaran, Catat Pemasukan, Scan Struk AI) dan penanganan otomatis query parameter `?action=...` untuk membuka modal terkait.
- **Global Privacy Mode / Sensor Saldo (`src/components/layout/TopHeader.tsx` & `src/app/globals.css`)**: Tombol toggle sensor mata di header dengan persistensi `localStorage` dan class CSS `privacy-mode` untuk menyamarkan nominal uang saat berada di ruang publik.
- **Batas Belanja Harian / Daily Safe-to-Spend (`src/components/dashboard/BalanceHeader.tsx`)**: Widget kalkulasi batas belanja harian adaptif berbasis sisa dana aman dibagi sisa hari kalender bulan berjalan.
- **Cetak & Ekspor Laporan PDF Siap Cetak (`src/components/reports/ReportsView.tsx` & `src/app/globals.css`)**: Tombol cetak langsung `window.print()` dan penyesuaian aturan CSS `@media print` untuk mencetak rekap pembukuan A4 bersih tanpa elemen navigasi.
- **Audit Self-Test (`scripts/audit-self-test.ts`)**: Penambahan unit test untuk manifest shortcuts dan validasi formula kuota harian (total 136 audit self-test + 52 E2E = 188 tes lulus).

### Dampak
- Pengalaman pengguna menjadi lebih privat di tempat umum, input transaksi harian menjadi lebih cepat via launcher shortcut, serta visibilitas anggaran belanja harian dan pencetakan laporan menjadi lebih mudah.

## [2026-08-30] Kesiapan Produksi, Hardening Keamanan, dan Peningkatan Aplikasi

**Plan**: `docs/plans/2026-08-30-kesiapan-produksi-dan-hardening-aplikasi.md`

### Berubah
- **Security Headers Produksi (`next.config.mjs`)**: Menambahkan konfigurasi header HTTP standar keamanan tinggi (`HSTS`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: origin-when-cross-origin`, `Permissions-Policy`, dan `X-DNS-Prefetch-Control`).
- **Health Check Endpoint (`src/app/api/health/route.ts`)**: Endpoint monitoring probe untuk orkestrasi container/serverless dengan liveness check, database ping latency test, uptime counter, dan status HTTP 200/503.
- **Privasi Data Finansial (`src/app/robots.ts`)**: Konfigurasi robots.txt untuk melarang perayapan publik (`Disallow: /`) terhadap seluruh halaman demi privasi data keuangan keluarga.
- **Resiliensi Database Pool (`src/lib/db.ts`)**: Menambahkan handler event `error` pada instance Neon connection pool guna menangani client idle error secara aman dan mencegah uncaught runtime crash.
- **Pembersihan Em-dash Sesuai Aturan No-AI-Slop (R-02)**: Membersihkan seluruh karakter `—` pada file `public/manifest.json`, `BudgetView.tsx`, `CollapseForecastCard.tsx`, `CalendarView.tsx`, dan `TransactionModal.tsx`.
- **Unit Test & Audit Self-Test (`scripts/audit-self-test.ts`)**: Menambahkan pengujian otomatis validasi metadata produksi robots.txt.

### Dampak
- Aplikasi kini memiliki proteksi keamanan browser tingkat enterprise, endpoint monitoring operasional, resiliensi koneksi database serverless yang lebih tinggi, dan kepatuhan penuh terhadap standar privasi data finansial.

## [2026-08-30] Forecasting Colapse & Kondisi Keuangan Sangat Baik

**Plan**: `docs/plans/2026-08-30-forecasting-colapse-dan-kondisi-keuangan.md`

### Berubah
- **Helper `calculateCollapseForecast` baru** (`src/lib/collapseForecast.ts`): pure function hitung `monthsUntilCollapse = totalCash / monthlyBurn`, `daysUntilCollapse = months*30`, `collapseDate = today + days` (ISO YYYY-MM-DD), level `aman >=6`, `waspada 3-6`, `kritis 1-3`, `colapse <1`, handle `burn<=0 → Infinity aman`, `cash<=0 → 0 colapse`.
- **UI `CollapseForecastCard` baru** (`src/components/evaluation/CollapseForecastCard.tsx`): kartu premium "Simulasi Colapse — Jika Pendapatan Mati Hari Ini" tampilkan kas saat ini, burn rate/bulan, jangka waktu colapse (bulan+hari), tanggal colapse `formatDate long`, badge level warna (`primary`/`warning`/`expense`), progress bar 0-12 bulan, saran aksi spesifik per level (aman/waspada/kritis/colapse) dengan `TrendDown` icon.
- **Integrasi `EvaluationView`**: import card dan tampilkan setelah `DecisionCard` & Score Hero, sebelum 4 rasio grid, dengan `totalCash={totalCash}` `monthlyBurn={expenseBenchmark}` (fallback budgets total atau `monthlyExpense` atau 1jt). Tidak break hooks early-return.
- **Test audit**: `scripts/audit-self-test.ts` tambah `[10g] calculateCollapseForecast` 9 assertion (5 bulan waspada, 0.5 bulan colapse, burn 0 Infinity, kas minus 0, 12 bulan aman) — total audit kini 128 lulus + 52 e2e = 180 lulus.

### Verifikasi
- `npm run lint` 0, `npm run build` 27 rute, `npm run test` 180 lulus (128 audit + 52 e2e) tanpa regresi.
- Manual: `totalCash=10jt, burn=2jt → 5.0 bulan` (`2026-09-...`), `1jt/2jt → 0.5 bulan` tampil di Evaluasi.

## [2026-08-30] Upgrade Batch 3 — Dashboard Wallet Calendar Audit (Zero-Gap)

**Plan**: `docs/plans/2026-08-30-upgrade-batch-3-dashboard-calendar-polish.md`

### Audit
- Dashboard (`BalanceHeader`, `WalletScroller`, `MonthlySummary`, `QuickActions`, `TransactionList` highlight), `WalletsView` saldo minus, `CalendarView` grid 7 kolom — tidak ada gap, semua sudah pakai token semantik, `tabular-nums`, empty/loading state lengkap. Tidak ada perubahan kode.

### Verifikasi
- `lint` 0, `build` 27 rute, `test` 171 lulus.

## [2026-08-30] Upgrade Batch 4 — Forms Validation & A11y Audit (Zero-Gap)

**Plan**: `docs/plans/2026-08-30-upgrade-batch-4-forms-a11y-polish.md`

### Audit
- `validations.ts` Zod + `uuidIdParam` konsisten, `AmountInput` premium di semua modal Rupiah, `Modal` focus trap & Escape & backdrop guard, kontras 30/30 PASS, tap target 44px, `aria-invalid`/`role=alert` lengkap. Tidak ada gap, tidak ada perubahan kode.

### Verifikasi
- `lint` 0, `build` 27 rute, `test` 171 lulus.

## [2026-08-30] Upgrade Batch 2 — AssetModal AmountInput & Reports Timeout

**Plan**: `docs/plans/2026-08-30-upgrade-batch-2-assetmodal-reports-polish.md`

### Berubah
- **AssetModal 100% AmountInput**: import `AmountInput`, state `purchasePrice/currentValue/salvageValue` ubah `string`→`number` (`Number(initialData?.purchase_price)||0`), 3 input mentah harga beli/taksiran pasar/residu migrasi ke `<AmountInput>` dengan `id` & preset, `taxAmount`/`maintenanceAmount` juga migrasi ke `AmountInput`, kalkulasi `priceNum/marketNum/salvageNum` sederhanakan tanpa `parseFloat`, `usefulLifeYears` tap target 40→44px.
- **ReportsView timeout**: history 4 bulan `Promise.race([apiFetch, timeout 8000ms])` → fallback `null` agar tidak menggantung, tetap `Promise.all` & filter `Boolean`.
- **Verifikasi**: `lint` 0, `build` 27 rute, `test` 119+52 lulus.

## [2026-08-30] Upgrade UX Input & Page Polish — Batch 1

**Plan**: `docs/plans/2026-08-30-upgrade-ux-input-polish-batch-1.md`

### Berubah
- **AmountInput premium**: tambah `allowNegative`, `placeholder`, `aria-invalid`/`aria-describedby`, `inputMode` adaptif (`text` bila minus), `formatDisplay` tangani minus, clear button untuk `value !== 0`, preset 44px tap target tetap.
- **Wallet saldo minus**: `WalletsView` saldo awal via `AmountInput allowNegative` + hint "Saldo awal boleh minus untuk kartu kredit / overdraft", card dompet badge minus dipertahankan.
- **TransactionModal polish**: kategori kosong tampil warning box, wallet balance preview `Saldo (Nama): Rp X (Minus)`, `admin_fee` migrasi dari `input type=number` ke `AmountInput` (hanya `transfer`), date `max` + warning >7 hari, `eslint-disable purity` terkontrol, `role=alert`.
- **TransactionList & Item highlight**: `TransactionItem` prop `highlight` + helper `HighlightMatch` `<mark bg-primary/15>`, `TransactionList` teruskan `searchQuery||searchInput`, empty per filter `filterType !== 'all'` → EmptyState "Tidak Ada X" + "Tampilkan Semua".
- **ReportsView sync**: ganti setState during render → `useEffect` + disable terkontrol, kembali 0 warning.
- **Verifikasi**: `npm run lint` 0, `build` 27 rute, `test` 119+52 lulus.

## [2026-08-30] Audit Siklus 1 — Zero-Gap Hardening (12 Gap Tertutup)

**Plan**: `docs/plans/2026-08-30-audit-siklus-1-zero-gap-hardening.md`

### Berubah
- **Backup lengkap & saldo minus (P0-1)**: `backup/export` kini menyertakan 12 koleksi (`wallets, categories, transactions, budgets, recurring_bills, bill_payments, settings` + `assets, debts, debt_payments, savings_goals, goal_contributions`) versi `1.1`. `backup/import` schema `balance` diizinkan negatif (sinkron `walletSchema`), tambah schema `backupAsset/backupDebt/backupDebtPayment/backupGoal/backupGoalContribution`, mapping ID baru terurut `wallets→categories→assets→debts→transactions→goals→contributions→budgets→bills→bill_payments→settings` dalam `withTransaction` delete-order FK-safe, serta delete `goal_contributions→savings_goals→debt_payments→debts→assets` sebelum tabel lama. Round-trip wallets minus + KPR + goals + kontribusi terverifikasi.
- **Kunci saldo anti-race auto-process (P0-2)**: `bills/auto-process` sebelum loop mengumpulkan `uniqueWalletIds` terurut UUID, `SELECT ... FOR UPDATE` semua dompet target, guard `SELECT bill_payments EXISTS` sebelum mutasi saldo, dan `ON CONFLICT DO NOTHING` + `rowCount` check sebagai final guard. Dua tab paralel tidak lagi menggandakan saldo.
- **PUT hutang & aset tidak hilang (P0-3)**: `PUT /api/debts/[id]` kini update penuh `category, principal_amount, interest_rate, interest_type, tenor_months, monthly_installment, total_interest` (hitung `totalInterest = max(0, total_amount - principal)`) dan `GET` menyertakan kolom yang sama. `PUT /api/assets/[id]` tolak 400 eksplisit bila body mengandung `record_purchase_transaction`/`schedule_*` (hanya POST yang boleh memicu saldo/jadwal).
- **Seragam `safe_to_spend` (P1-1) + hilangkan Rp0 palsu & sargable (P1-2)**: `reports/monthly` hapus seluruh `.catch(()=>fallback 0)`, ganti semua filter `EXTRACT(MONTH/YEAR)` menjadi `date >= make_date($3,$2,1) AND date < ... + INTERVAL '1 month'` (sargable), debt query tambah `is_due_this_period` (`CASE ... due_date < date_trunc('month', make_date(...))+1 month`) dan di JS hanya `if(isDue)` yang menambah `totalPayableDue` — identik dengan `bootstrap`.
- **History Back bertahap (P1-3)**: `page.tsx` `now` via `useState(()=>new Date())` lazy init anti-jitter, `_tabHistory` → `tabHistory` tanpa underscore, `handleTabChange` slice(-50) cap 50, `handlePopState` `pushState({tab: previous})` bukan hardcode `dashboard`, `tabHistory` masuk deps effect, `clearTimeout` tanpa guard.
- **Refresh global Goals (P1-4)**: `GoalsView` prop `onRefreshParent?:()=>void` dipanggil setelah `contribute` sukses (+ `fetchGoals`), `page.tsx` meneruskan `refetch`.
- **Badge Sidebar Desktop (P2-1)**: `SidebarNav` menerima `pendingBillsCount/overbudgetCount/unpaidDebtsCount`, `NAV_SECTIONS` tanam badge `budget→overbudget`, `bills→pending`, `debts→unpaid` (string), render baik full (`px-1.5`) maupun collapsed (tooltip + dot). `AppShell` meneruskan 3 counts.
- **Single selector Laporan (P2-2)**: `TopHeader` `['assets','debts','wallets','goals','reports','settings']` → `reports` tampil badge "Laporan & Ekspor" tanpa period selector, `ReportsView` tetap pegang selector internalnya (kini hanya satu selector).
- **Logging auto-schedule (P2-3)**: `debts/route.ts` POST ganti `.catch(()=>{})` menjadi `try/catch` `console.warn` + flag `bill_scheduled: boolean` di response `data: {...createdDebt, bill_scheduled}`; `DebtsView` menangkap `bill_scheduled===false` dan tampilkan `listError` "Jadwal cicilan otomatis gagal dibuat...".
- **Polish kecil (P2-4)**: `ReportsView` sync `prevInitial` → `useEffect` dengan `eslint-disable` terkontrol; `BudgetView` guard `unusedCategories` kosong → error "Semua kategori sudah memiliki anggaran" + select hanya menampilkan unused + block submit bila `!categoryId`; `SettingsView` guard `file.size >5MB` + validasi JSON `data` property sebelum POST.

### Verifikasi
- `npm run lint`: 0 error, 0 warning.
- `npm run build`: sukses (27 rute).
- `npm run test`: 119 audit + 52 E2E lulus 100% tanpa regresi.

## [2026-08-29] Zero-Gap Audit & Hardening Codebase

**Plan**: `docs/plans/2026-08-29-zero-gap-audit-fix.md`

### Berubah
- **Eliminasi 100% ESLint Warnings & Errors**: 0 error, 0 warning di seluruh codebase.
  - Menghapus variabel tidak terpakai di `AssetModal.tsx`, `AssetsView.tsx`, `FinancialRatiosReport.tsx`, `IncomeStatementReport.tsx`, dan `CalendarView.tsx`.
  - Mengubah sinkronisasi state di `useEffect` menjadi inisialisasi state murni berbasis fungsi / derived state di `page.tsx`, `SidebarNav.tsx`, `SettingsView.tsx`, `ReportsView.tsx`, `ReconcileModal.tsx`, `AssetScheduleModal.tsx`, `SellAssetModal.tsx`, dan `CalendarView.tsx`.
  - Memperbaiki pemanggilan `Date.now()` murni saat rendering di `SettingsView.tsx`.
- **Penguatan Validasi UUID pada API**: Menambahkan validasi `uuidIdParam.parse(id)` di handler `GET`, `PUT`, `DELETE` pada `src/app/api/assets/[id]/route.ts` sebelum query basis data dieksekusi.
- **Penguatan Multi-User Isolation**: Menambahkan filter `user_id` pada subquery agregasi kontribusi goal di `src/app/api/goals/[id]/contribute/route.ts`.

### Verifikasi
- `npm run lint`: 0 error, 0 warning (bersih total).
- `npm run build`: Berhasil tanpa error compiler TypeScript / Turbopack (27 rute).
- `npm test` (`test:audit` + `test:e2e`): 171 pengujian lulus 100% (119 unit test + 52 E2E test).



## [2026-08-29] Fitur Kalender Arus Kas Harian

**Plan**: `docs/plans/2026-08-29-fitur-kalender-arus-kas-harian.md`

### Berubah
- **Menu Kalender baru**: `NavTab 'calendar'` ditambahkan di `SidebarNav.tsx` (Utama) dan `BottomNav.tsx` (sheet Lainnya) dengan ikon `CalendarBlank`. `TopHeader` otomatis menampilkan pemilih periode bulan/tahun untuk tab ini.
- **Komponen `CalendarView` baru** (`src/components/calendar/CalendarView.tsx`): grid kalender 7 kolom (Senin awal minggu), setiap sel tanggal menampilkan net harian `pemasukan − pengeluaran (termasuk admin_fee)` dengan format compact (`formatCompactRupiah`), warna hijau `income` bila surplus, merah `expense` bila defisit, netral bila nihil; highlight hari ini & hari terpilih; indikator titik bila >1 transaksi; navigasi bulan via `onPeriodChange`.
- **Ringkasan bulanan**: 3 kartu Masuk/Keluar/Bersih di atas kalender + legenda surplus/defisit/nihil.
- **Detail harian**: ketuk tanggal → panel rincian menampilkan agregat Masuk/Keluar hari itu dan daftar transaksi hari tersebut (reuse `CategoryIcon`, nominal berwarna, tombol edit); bila kosong tampil empty state dengan aksi cepat + Pengeluaran/Pemasukan.
- **Integrasi `page.tsx`**: dynamic import `CalendarView`, render saat `activeTab === 'calendar'` dengan data `transactions` dari bootstrap (agregasi client-side, reuse tanpa endpoint baru), teruskan `handleEditTransaction`/`handleDeleteTransaction`/`handleOpenAddModal`.

### Verifikasi
- `npm run build` lulus; `npm run lint` 0 error (15 warning gaya pre-existing).

## [2026-08-29] Audit Penuh Aplikasi dan Rencana Perbaikan

**Plan**: `docs/plans/2026-08-29-audit-penuh-aplikasi-dan-rencana-perbaikan.md` (Status: draft — rencana bertahap P0/P1/P2, belum dieksekusi)

### Temuan
- Audit read-only 29 Agt 2026: isolasi multi-tenant & Zod valid, namun ditemukan B1–B5 (lock auto-process, PUT hutang/aset hilangkan field, reports monthly fallback 0 palsu, popstate desync) dan gap G1–G7 (backup tak lengkap & tolak saldo minus, safe_to_spend inkonsisten, Goals stale, Sidebar tanpa badge, duplikasi period selector Laporan). 11 menu lengkap, tidak ada yang hilang. Rencana perbaikan P0/P1/P2 dirinci di plan doc.



## [2026-08-28] Audit Gap Zero (Pasca-Eksekusi 6 Plan)

**Plan**: `docs/plans/2026-08-28-zero-gap-audit-fix.md` (audit + perbaikan titik kecil tanpa mengubah perilaku inti)

### Temuan & Berubah
- **Kontras terukur**: skrip WCAG menguji 30 pasangan token di kedua tema; 1 FAIL (`text-muted` di atas `surface-2` light, 4.21:1) diperbaiki dengan menggelapkan `--color-text-muted` light ke `25 11% 39%` (kini 4.72:1). Hasil akhir 30/30 PASS.
- **Badge nav mati**: `AppShell` tidak meneruskan count ke `BottomNav`, sehingga badge "Lainnya" selalu 0. Kini `pendingBillsCount`/`overbudgetCount`/`unpaidDebtsCount` di-pass dari summary bootstrap melalui AppShell.
- **Tab goals di TopHeader**: halaman Target Tabungan tadinya menampilkan pemilih bulan; kini muncul badge "Target Tabungan" tanpa selector periode.
- **Sisa warna hardcoded** diganti token semantik: notice offline TransactionModal, 3 lokasi amber di FinancialRatiosReport, properti/none di AssetsView, error state ReportsView. Merah/emerald pada gradient hero (BalanceHeader) dipertahankan dengan alasan kontras di atas latar gelap; warna kategori & ikon matahari ThemeToggle bersifat data-driven/metafora.
- **Properti mati**: `userId` pada `GoalsView` dihapus (tidak dipakai).
- **Hygiene git**: `debug.log` (junk crashpad runtime) dikeluarkan dari tracking dan masuk `.gitignore`.

### Verifikasi
- `npm run build` lulus; `npm run lint` 0 error (13 warning gaya pre-existing); `npm test` 119 audit + 52 E2E lulus (angka termasuk fitur Smart Receipt Parser yang masuk bersamaan via commit `uppp`).

## [2026-08-28] Upgrade Sidebar Collapsible Mini Mode

**Plan**: `docs/plans/2026-08-28-upgrade-sidebar-collapsible-mini-mode.md`

### Berubah
- **Fitur Collapse/Expand Sidebar Interaktif** (`src/components/layout/SidebarNav.tsx`): Menambahkan tombol toggle sidebar yang memungkinkan pengguna mengecilkan sidebar menjadi mode mini (lebar `w-[72px]`) atau membuka penuh (`w-64`) dengan transisi halus.
- **Persistensi State**: Status collapse disimpan ke `localStorage` (`kaskeluarga_sidebar_collapsed`) sehingga preferensi tampilan tetap terjaga saat navigasi/refresh halaman.
- **Tampilan Mini Menu**:
  - Tombol aksi "+ Catat Transaksi" bertransformasi menjadi ikon bulat ramping dengan popover dropdown jenis transaksi (E/I/T) yang muncul di samping kanan.
  - Ikon-ikon modul diatur terpusat rapi dengan indikator titik aktif dan tooltip hover keterangan nama menu.
  - Card profil pengguna di bagian bawah menyusut menjadi avatar mini dengan tooltip nama akun dan tombol logout langsung.

### Verifikasi
- Build Next.js (`npm run build`) lulus tanpa error TypeScript.
- Test audit (`npm test`) lulus seluruh pengujian.

## [2026-08-28] Fitur Smart Receipt & Nota Parser Menggunakan DeepSeek API

**Plan**: `docs/plans/2026-08-28-fitur-smart-receipt-parser-deepseek.md`

### Berubah
- **Engine DeepSeek Server-Isolated** (`src/lib/deepseek.ts` & `src/app/api/ai/parse-receipt/route.ts`): Menjalankan ekstraksi data transaksi belanja/nota/mutasi dari teks menggunakan model `deepseek-v4-flash`. API key tersimpan di variabel server (`DEEPSEEK_API_KEY`) tanpa prefix `NEXT_PUBLIC_` sehingga terisolasi aman dari client bundle dan dilindungi `.gitignore`. Dilengkapi fallback parser heuristik cerdas bila offline/unreachable.
- **Validasi Schema** (`src/lib/validations.ts`): Skema Zod baru `parseReceiptRequestSchema`, `receiptItemSchema`, dan `parsedReceiptResultSchema`.
- **Komponen Modal Scan Struk** (`src/components/transactions/ReceiptParserModal.tsx`): Pratinjau hasil ekstraksi (nominal total, tanggal, toko/merchant, rincian belanja, usulan kategori & dompet) dan tombol instan "Tempel Salinan" dari clipboard.
- **Integrasi Input Transaksi** (`TransactionModal.tsx` & `QuickActions.tsx`): Tombol "Scan Struk" disematkan di QuickActions dan form pencatatan transaksi untuk pengisian form otomatis dalam satu klik.
- **Testing & Proteksi**: Unit test audit parser + E2E test endpoint AI (termasuk verifikasi penolakan akses 401 unauthenticated).

### Verifikasi
- Build Next.js (`npm run build`) sukses tanpa error.
- Unit Audit (`npm run test:audit`) lulus 119/119 pengujian.
- E2E Full Suite (`npm run test:e2e`) lulus 52/52 pengujian.

### Dampak
- Tambahkan `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, dan `DEEPSEEK_MODEL` di Environment Variables project Vercel sebelum deploy produksi.

## [2026-08-27] Fitur Target Tabungan (Savings Goals)

**Plan**: `docs/plans/2026-08-27-fitur-target-tabungan-savings-goals.md`

### Berubah
- Tabel baru `savings_goals` + `goal_contributions` (migrasi + init idempotent). Progres goal TIDAK disimpan ganda: `saved_amount` dihitung dari SUM kontribusi, dan `UNIQUE(transaction_id)` menjamin satu transaksi kas hanya tercatat sekali.
- API `/api/goals` (GET list dengan proyeksi, POST), `/api/goals/[id]` (PUT/DELETE, DELETE menghapus progres tapi membiarkan transaksi kas nyata tetap ada), `/api/goals/[id]/contribute` (POST): alokasi membuat SATU transfer kas nyata ke dompet penampung (lock dua dompet urut UUID) lalu menautkan transaksi tersebut sebagai progres.
- Validasi baru `savingsGoalSchema` & `goalContributionSchema`.
- View baru `GoalsView` (card progres, modal buat/ubah/alokasi/hapus, proyeksi tanggal tercapai dari rata-rata kontribusi 90 hari). Dinamis diimpor; nav sidebar ("Target Tabungan") & bottom sheet ("Target") ditambahkan.
- Ringkasan goals masuk bootstrap sengaja dilewatkan demi query hemat; view melakukan fetch mandiri seperti modul lain. Dicatat sebagai penyimpangan ruang lingkup kecil.

### Verifikasi
- Build lulus; lint 0 error; 113 audit unit + 48 E2E lulus termasuk 5 skenario goals baru (buat, alokasi atomik, tautan transaksi, saldo dompet bergerak, isolasi lintas-user).

### Dampak
- Jalankan `npx tsx scripts/run-db-migrations.ts` pada DB lama sebelum deploy.

## [2026-08-27] Rombak Identitas Visual Edisi Klasik Rumah

**Plan**: `docs/plans/2026-08-27-rombak-identitas-visual-klasik-rumah.md` | Direction: `DESIGN.md`

### Berubah
- **Token warna baru** (`globals.css`, light + dark): ivory/porselen bg ramp, emerald tua `primary` (dengan varian `deep` untuk gradient hero), terracotta `expense`, hijau lumut `income`, biru-abu laut `transfer`, amber gelap `warning`. Semua nilai digerakkan agar teks lulus AA di atas permukaannya; theme-color meta ikut diperbarui.
- **Motif identitas**: font serif display (Fraunces, self-contained via next/font) + utility `.font-display-num` khusus angka besar. Diterapkan pada: kartu saldo & safe-to-spend (BalanceHeader), tiga angka total MonthlySummary, angka utama Neraca/P&L/Arus Kas.
- **Palet modul disederhanakan** ke 3 core + semantik: ikon modul BottomNav/Lainnya jadi netral (aktif = primary); QuickActions kini memakai token semantik (warning/primary/expense/income/transfer) bukan pelangi hardcoded; AssetsView, BillItem, DebtItem, DebtCalculatorModal, BudgetProgressBar, FinancialSafetyPlanCard, EmergencyFundCard, OfflineBanner, BalanceSheetReport, ColdMoneyCard sama halnya; badge "Baru" di sidebar dihapus (bukan status nyata).
- **Ikon generik dibuang**: Sparkle diganti ikon kontekstual (Coins/Drop/PiggyBank/Gauge).
- **Em dash dihapus dari semua teks UI** (R-02): metadata title, chip tren, opsi select depresiasi, banner offline, placeholder cicilan.
- Gradient hero memakai token (`from-primary via-primary-hover to-primary-deep`) tanpa hex hardcode.

### Verifikasi
- Build lulus; lint 0 error (11 warning gaya sisa, dipilih biarkan); 113 audit unit + 43 E2E lulus.

## [2026-08-27] Kartu Putusan Akhir Bulan di Evaluasi

**Plan**: `docs/plans/2026-08-27-kartu-putusan-akhir-bulan.md`

### Berubah
- Modul baru `src/lib/decisionSummary.ts` (pure, teruji): membentuk tiga baris putusan dari angka riil (arus kas naik/turun, pos belanja lewat batas terbesar, ketersediaan uang dingin) plus maksimal satu saran aksi.
- Komponen baru `DecisionCard` (ikon per baris relevan: arah tren, status batas, status dana) diletakkan paling atas halaman Evaluasi.
- Data uang dingin memakai ulang `calculateColdMoney` tanpa agregasi duplikat; pos renteng diambil dari budgets real-time.
- Semua kondisi rapi: bulan kosong menghasilkan putusan "belum ada data" tanpa aksi fiktif.

### Verifikasi
- Build lulus; 113 audit unit + 43 E2E lulus (7 assertion pembentuk putusan baru).

## [2026-08-27] Paket Kepercayaan Data: Rekonsiliasi Basi, Tanda Revisi, Pengingat Backup

**Plan**: `docs/plans/2026-08-27-paket-kepercayaan-data-rekonsiliasi-revisi-backup.md`

### Berubah
- **Rekonsiliasi basi**: helper baru `getReconcileAge` (formatters, pure & teruji); kartu dompet di dashboard dan halaman Dompet menampilkan status peringatan bila belum pernah direkonsiliasi atau lebih dari 14 hari ("Cek saldo" + ikon warning). Hard-coded amber di ganti token `warning`.
- **Tanda revisi**: kolom DB `transactions.edited_at` (migrasi + init idempotent); handler PUT mengisinya; API list transaksi dan bootstrap memuat field; `TransactionItem` menampilkan ikon pensil kecil + tooltip tanggal revisi.
- **Backup**: kartu Cadangan di Pengaturan menyimpan timestamp unduhan terakhir (localStorage) dan menampilkan usia cadangan; kalimat saran muncul bila > 30 hari. Nudge ringan di dashboard dengan tombol Unduh/Tutup (muncul bila cadangan lama/belum ada).
- Hard-coded warna pengingat pemulihan diganti token `warning`.

### Verifikasi
- Build lulus; 106 audit unit + 43 E2E lulus (3 assertion getReconcileAge + 1 skenario edited_at).

### Dampak
- Jalankan `npx tsx scripts/run-db-migrations.ts` pada DB lama sebelum deploy.

## [2026-08-27] Optimalisasi Input, Flow & Sinkronisasi Data (Integritas Uang)

**Plan**: `docs/plans/2026-08-27-optimalisasi-input-flow-sync-data.md`

### Berubah
- **Bootstrap gagal keras**: seluruh `.catch(() => [])` dihapus; kegagalan sub-query kini memicu error state di dashboard (banner Coba lagi yang sudah ada), bukan angka Rp0 palsu.
- **Bug safe-to-spend**: kewajiban piutang/hutang hanya dihitung bila jatuh tempo bulan ini, terlewat, atau tanpa tanggal (kolom SQL `is_due_this_period`); hutang tenor panjang seperti KPR tidak lagi menekan dana bebas belanja bulan ini.
- **Query sargable**: semua filter `EXTRACT(MONTH/YEAR)` diganti rentang `make_date(...)+INTERVAL '1 month'` agar index terpakai.
- **Antrean offline** (`offlineQueue.ts`): `persistAttempt` atomik (put-first, bukan delete-then-put) sehingga crash tidak menghilangkan mutasi; drain lintas-tab eksklusif via `navigator.locks`; timeout kirim 15 detik per item.
- **Anti-replay revisi basi**: PUT `/api/transactions/[id]` menerima `expected_updated_at`, menolak 409 bila baris lebih baru; form edit mengirimkannya otomatis.
- **Form**: double-submit guard sinkron via `useRef`; submit transaksi memakai `apiFetch`; semua request client punya timeout 15 detik default.
- **Hapus offline**: DELETE diblokir saat offline dengan pesan jelas, bukan gagal senyap.
- **Kontrol**: bottom sheet "Lainnya" bisa ditutup Escape + fokus balik ke trigger, outside tap memakai pointerdown; segmented control tipe transaksi, chip saran & preset nominal menjadi min-h 44px.
- Multi-device: refresh otomatis saat tab kembali fokus (debounce 5s); mapping PG `wallets_balance_nonnegative` yang sudah mati dihapus dari apiHelpers.

### Verifikasi
- Build lulus; 103 audit unit + 42 E2E lulus termasuk 2 skenario baru (PUT replay basi ditolak & data utuh).

## [2026-08-27] Fitur Pencatatan Hutang Detail KPR, Bunga, Tenor & Cicilan

**Plan**: `docs/plans/2026-08-27-fitur-pencatatan-hutang-detail-kpr-bunga-dan-cicilan.md`

### Berubah
- Tabel `debts` bertambah kolom `category`, `principal_amount`, `interest_rate`, `interest_type`, `tenor_months`, `monthly_installment`, `total_interest` (migrasi + init idempotent).
- API `/api/debts`: GET/POST menyertakan detail pinjaman; POST menghitung total bunga otomatis dan dapat membuat jadwal cicilan otomatis ke `recurring_bills` (`auto_schedule_bill`).
- Bootstrap dashboard memuat rincian hutang lengkap.
- Form di `DebtsView.tsx`: pemilihan kategori pinjaman (KPR/kendaraan/bank), mode input rinci dengan kalkulator cicilan live (bunga flat), opsi auto-jadwal. `DebtItem.tsx` menampilkan strip rincian pokok/bunga/cicilan.
- E2E baru `[7b]`: post handler KPR, verifikasi total bunga Rp 150jt, verifikasi tagihan rutin terjadwal Rp 3.75jt; kontrak safe-to-spend diperbarui.

### Dampak
- Menjalankan `npx tsx scripts/run-db-migrations.ts` diperlukan pada DB lama sebelum deploy.
- Verifikasi: build lulus, 103 audit unit + 40 E2E lulus.

## [2026-08-27] Sinkronisasi AGENTS.md dengan Kebijakan Overdraft

Tanpa plan doc (perubahan satu baris dokumentasi).

### Berubah
- [AGENTS.md](AGENTS.md): aturan saldo dompet strict-zero diganti menjadi kebijakan overdraft, menyusul pelepasan constraint di plan `2026-08-27-fitur-saldo-minus-laporan-dana-darurat-otomatisasi-dan-kalkulator-hutang`. Dokumentasi kini selaras dengan `walletSchema` dan E2E test.

## [2026-08-27] Audit Aplikasi & Fix Lint Error Modal (Ref Sync Saat Render)

Tanpa plan doc (perbaikan lint satu titik tanpa mengubah perilaku).

### Berubah
- [Modal.tsx](src/components/ui/Modal.tsx): pindahkan sinkronisasi `onCloseRef.current = onClose` dari badan render ke `useEffect([onClose])` agar tidak melanggar aturan React `react-hooks/refs` (Cannot update ref during render).
- Bersihkan cache `.next/dev/types` yang basi dan membuat `npm run build` gagal type-check.

### Verifikasi
- `npm run build` lulus, `npm run lint` 0 error (sisa 10 warning gaya), `npm test` 103 audit + 37 E2E lulus.

## [2026-08-27] Perbaikan Bug Modal Keluar/Tertutup Sendiri Saat Mengetik (Focus Trap & Effect Cleanup Refactor)

**Plan**: `docs/plans/2026-08-27-fix-modal-auto-close-dan-focus-trap-bug.md`

### Berubah
- **Refactoring Focus Trap & State Isolation pada Modal**:
  - Menyimpan referensi `onClose` menggunakan `useRef` pada [Modal.tsx](src/components/ui/Modal.tsx) sehingga perubahan callback dari parent saat user mengetik karakter tidak memicu re-running `useEffect` dan cleanup yang melempar fokus ke luar modal.
  - Memastikan auto-focus ke input pertama hanya dijalankan satu kali saat modal pertama kali dibuka.
  - Memperkuat proteksi backdrop click (`e.target === e.currentTarget`) dan `stopPropagation` pada container modal agar sentuhan dan interaksi form tidak bocor ke backdrop.
  - Menstabilkan mounting form pada [TransactionModal.tsx](src/components/transactions/TransactionModal.tsx).
- **Verifikasi**:
  - 103 assertion audit unit test + 37 pengujian E2E lulus 100%.

## [2026-08-27] Audit & Perbaikan Sinkronisasi Anggaran Bulanan (Auto Carry-Forward & Live Real-Time Spent)

**Plan**: `docs/plans/2026-08-27-audit-dan-perbaikan-sinkronisasi-anggaran-bulanan.md`

### Berubah
- **Mekanisme Auto Carry-Forward Anggaran Antar-Bulan**:
  - Memperbarui query pada [budgets/route.ts](src/app/api/budgets/route.ts), [dashboard/bootstrap/route.ts](src/app/api/dashboard/bootstrap/route.ts), dan [reports/monthly/route.ts](src/app/api/reports/monthly/route.ts) menggunakan CTE `DISTINCT ON (category_id) ... ORDER BY category_id, year DESC, month DESC`.
  - Anggaran belanja yang telah ditetapkan otomatis aktif dan terbawa ke bulan-bulan berikutnya tanpa perlu input ulang manual setiap awal bulan.
  - Perhitungan `spent` (realisasi pengeluaran) dan `percentage` (%) dihitung secara dinamis dan presisi sesuai transaksi pengeluaran pada bulan dan tahun yang sedang dibuka pengguna.
- **Sinkronisasi Metrik Terikat**:
  - Menjamin perhitungan Dana Darurat ($4\times$), Cadangan Risiko ($10\%$), Proyeksi Pengeluaran Bulanan, dan Rasio DER/Likuiditas selalu sinkron dan konsisten di seluruh periode waktu.
- **Verifikasi**:
  - 103 assertion audit unit test + 37 pengujian E2E lulus 100%.

## [2026-08-27] Penghapusan Pintasan Cepat Keyboard Global

**Plan**: `docs/plans/2026-08-27-hapus-pintasan-cepat-keyboard-global.md`

### Berubah
- **Menghapus Global Keyboard Shortcut Listener**:
  - Menghapus listener `keydown` (tombol `E`, `N`, `I`, `T`) dari [AppShell.tsx](src/components/layout/AppShell.tsx) sehingga saat pengguna mengetik teks/form transaksi tidak ada lagi popup yang muncul tiba-tiba.
  - Menghapus kartu informasi "Pintasan Cepat" dari sidebar [SidebarNav.tsx](src/components/layout/SidebarNav.tsx).
- **Verifikasi**:
  - 103 assertion audit unit test + 37 pengujian E2E lulus 100%.

## [2026-08-27] Penyempurnaan Bahasa Laporan Keuangan Keluarga (Human-Friendly Tone)

**Plan**: `docs/plans/2026-08-27-penyempurnaan-bahasa-laporan-keuangan-keluarga.md`

### Berubah
- **Penyederhanaan Istilah Korporat Bisnis menjadi Istilah Keluarga**:
  - Mengubah istilah kaku "Laba Rugi (P&L)" menjadi **"Laporan Pemasukan & Belanja (Surplus/Defisit)"** pada [IncomeStatementReport.tsx](src/components/reports/IncomeStatementReport.tsx) dan [ReportsView.tsx](src/components/reports/ReportsView.tsx).
  - Mengubah "Laba Bersih / Operating Surplus" menjadi **"Sisa Uang / Surplus Bersih Keluarga"**.
  - Mengubah "Beban Kas Operasional" menjadi **"Belanja Hidup & Tagihan Rutin"**.
  - Mengubah "Beban Non-Kas Depresiasi" menjadi **"Penyusutan Nilai Barang/Aset"**.
  - Mengubah istilah "Aktiva & Pasiva" menjadi **"Daftar Harta & Kekayaan (Aset)"** dan **"Kewajiban Hutang & Kekayaan Bersih"** pada [BalanceSheetReport.tsx](src/components/reports/BalanceSheetReport.tsx).
  - Mengubah istilah "Capital Gain / Loss" menjadi **"Hasil Penjualan Untung (+)"** dan **"Hasil Penjualan Menyusut (-)"** pada [SellAssetModal.tsx](src/components/assets/SellAssetModal.tsx).
- **Verifikasi**:
  - 103 assertion audit unit test + 37 pengujian E2E lulus 100%.

## [2026-08-27] Fitur Laporan Rasio Keuangan (DER, DAR, DSR, Likuiditas) dan Kesimpulan Analisis

**Plan**: `docs/plans/2026-08-27-fitur-laporan-rasio-keuangan-der-dan-kesimpulan-analisis.md`

### Berubah
- **Kalkulasi 6 Rasio Keuangan Utama**:
  - Mengimplementasikan helper `calculateFinancialRatios` pada [FinancialRatiosReport.tsx](src/components/reports/FinancialRatiosReport.tsx) yang menghitung:
    1. **DER (Debt to Equity Ratio)**: Rasio Hutang terhadap Modal/Kekayaan Bersih ($\le 35\%$ aman).
    2. **DAR (Debt to Asset Ratio)**: Rasio Hutang terhadap Total Aset ($\le 30\%$ aman).
    3. **DSR / DTI (Debt Service Ratio)**: Rasio Beban Cicilan terhadap Pemasukan ($\le 20\%$ aman).
    4. **Liquidity Ratio**: Rasio Ketahanan Kas Likuid ($\ge 4.4$ bulan aman).
    5. **Savings Ratio**: Rasio Tabungan terhadap Pemasukan ($\ge 20\%$ aman).
    6. **OER (Operating Expense Ratio)**: Efisiensi Biaya Operasional ($\le 70\%$ aman).
- **Skor Finansial & Kesimpulan Naratif Otomatis**:
  - Menghitung skor kesehatan finansial (0-100) dan menghasilkan kesimpulan naratif eksekutif yang menjelaskan kondisi keuangan secara jelas (Sangat Sehat, Stabil, Waspada, atau Kritis) serta rekomendasi langkah tindakan nyata.
- **Integrasi di Menu Laporan & Evaluasi**:
  - Menambahkan sub-tab **"Rasio (DER dll)"** pada [ReportsView.tsx](src/components/reports/ReportsView.tsx).
  - Memperbarui [EvaluationView.tsx](src/components/evaluation/EvaluationView.tsx) agar kartu rasio dan scoring kesehatan mengadopsi indikator DER.
- **Verifikasi**:
  - 103 assertion audit unit test + 37 pengujian E2E lulus 100%.

## [2026-08-27] Fitur Uang Dingin (Cold Money) dan Dana Bebas Rencana Jangka Pendek

**Plan**: `docs/plans/2026-08-27-fitur-uang-dingin-dan-dana-bebas-rencana-jangka-pendek.md`

### Berubah
- **Perhitungan Alokasi Uang Dingin**:
  - Mengimplementasikan helper `calculateColdMoney` pada [ColdMoneyCard.tsx](src/components/reports/ColdMoneyCard.tsx) yang menghitung kelebihan kas riil yang benar-benar bebas dari seluruh alokasi wajib:
    $$\text{Uang Dingin} = \max(0, \text{Total Kas Likuid} - \text{Cadangan Wajib 4.4x Anggaran} - \text{Kewajiban Tagihan/Hutang})$$
- **Kartu Khusus Uang Dingin di Menu Laporan & Dashboard**:
  - Menampilkan [ColdMoneyCard.tsx](src/components/reports/ColdMoneyCard.tsx) di menu Laporan ([ReportsView.tsx](src/components/reports/ReportsView.tsx)) dengan rincian 4 kolom: **Total Kas Riil**, **Cadangan 4.4x Anggaran**, **Tagihan & Hutang**, dan **Uang Dingin (Bebas Pakai)** beserta rekomendasi pemanfaatan untuk investasi jangka pendek, liburan, hobi, atau modal baru.
  - Memperbarui [BalanceHeader.tsx](src/components/dashboard/BalanceHeader.tsx) pada Dashboard agar menampilkan indikator status "Dana Bebas & Uang Dingin".
- **Verifikasi**:
  - 96 assertion audit unit test + 37 pengujian E2E lulus 100%.

## [2026-08-27] Laporan Keuangan Lengkap: Neraca Keuangan Keluarga (Balance Sheet) & Laba Rugi

**Plan**: `docs/plans/2026-08-27-fitur-laporan-keuangan-lengkap-neraca-dan-laba-rugi.md`

### Berubah
- **Neraca Keuangan Keluarga (Balance Sheet)**:
  - Membuat komponen [BalanceSheetReport.tsx](src/components/reports/BalanceSheetReport.tsx) yang menyajikan kalkulasi formal posisi keuangan:
    - **Aktiva (Harta)**: Aset Kas Likuid + Piutang Belum Diterima + Aset Tetap/Harta Berharga (Taksiran Pasar / Nilai Buku).
    - **Pasiva (Kewajiban & Ekuitas)**: Liabilitas Jangka Pendek (Tagihan) + Hutang Pinjaman Aktif + Ekuitas/Kekayaan Bersih (*Net Worth*).
    - Seimbang (*Balanced*): $\text{Total Aktiva} = \text{Total Pasiva}$.
- **Laporan Laba Rugi Komprehensif (Income Statement / P&L)**:
  - Membuat komponen [IncomeStatementReport.tsx](src/components/reports/IncomeStatementReport.tsx) yang memperhitungkan Pendapatan Total vs Beban Kas Hidup vs Beban Non-Kas (Penyusutan Nilai Aset) untuk menghasilkan Laba/Surplus Bersih Komprehensif.
- **Desain Adaptif (Mobile Simple vs PC Full Data)**:
  - **Di Handphone (Mobile)**: Tampilan bersih (*glanceable*) dengan kartu kesimpulan instan apakah kondisi keuangan **Baik (Sehat)** atau **Jelek/Waspada (Defisit)**, 3 angka inti (Total Harta, Total Hutang, Kekayaan Bersih), dan rasio solvabilitas.
  - **Di PC (Desktop)**: Format neraca akuntansi berpasangan (*two-column balanced statement*), tabel rincian akun, dan ekspor CSV.
- **Navigasi 4 Pilar Laporan di ReportsView**:
  - Mengintegrasikan 4 sub-tab pada [ReportsView.tsx](src/components/reports/ReportsView.tsx): **Ringkasan & Kategori**, **Arus Kas (Cashflow)**, **Neraca Keuangan**, dan **Laba Rugi (P&L)**.
- **Verifikasi**:
  - 91 assertion audit unit test + 37 pengujian E2E lulus 100%.

## [2026-08-27] Tampilan Riwayat Kapan Rekonsiliasi Terakhir pada Kartu Dompet

**Plan**: `docs/plans/2026-08-27-fitur-tampilan-riwayat-kapan-rekonsiliasi-terakhir-di-dompet.md`

### Berubah
- **Informasi Tanggal Rekonsiliasi Terkini di Kartu Pos Kas**:
  - Menambahkan label status dan tanggal rekonsiliasi terakhir (contoh: `Rekom: 27 Agu 2026` atau `Belum pernah direkom` dengan indikator titik hijau/kuning) pada kartu pos dompet di [WalletsView.tsx](src/components/wallets/WalletsView.tsx).
  - Menambahkan baris informasi rekonsiliasi terakhir pada kartu ringkasan pos kas di beranda Dashboard [WalletScroller.tsx](src/components/dashboard/WalletScroller.tsx).
- **Verifikasi**:
  - 91 assertion audit unit test + 37 pengujian E2E lulus 100%.

## [2026-08-27] Fitur Otomatisasi Pembelian Aset, Jadwal Pajak, dan Perawatan Rutin/Insidental

**Plan**: `docs/plans/2026-08-27-fitur-otomatisasi-pembelian-aset-jadwal-pajak-dan-maintenance.md`

### Berubah
- **Sinkronisasi Atomik Pembelian Aset & Transaksi Kas**:
  - Menambahkan kolom `asset_id` (foreign key) pada tabel `transactions` dan `recurring_bills`.
  - Pada [TransactionModal.tsx](src/components/transactions/TransactionModal.tsx), saat mencatat pengeluaran pembelian barang berharga, terdapat opsi centang **"Catat transaksi ini ke Daftar Aset & Depresiasi"** yang secara atomik mendaftarkan aset baru.
  - Pada [AssetModal.tsx](src/components/assets/AssetModal.tsx), terdapat opsi **"Catat pengeluaran kas pembelian dari dompet"** sehingga mutasi kas dan pencatatan aset langsung sinkron tanpa perlu input ganda.
- **Jadwal Pajak, Servis Rutin & Biaya Insidental Aset**:
  - Membuat modal [AssetScheduleModal.tsx](src/components/assets/AssetScheduleModal.tsx) di [AssetsView.tsx](src/components/assets/AssetsView.tsx) dengan tombol aksi cepat **"Jadwal / Biaya"** pada setiap kartu aset.
  - Mendukung pembuatan **Jadwal Pajak Rutin** (Pajak STNK / PBB) dan **Servis Berkala** yang otomatis terjadwal ke daftar **Pengeluaran Pasti Rutin (`recurring_bills`)** dan terhitung dalam Rencana Anggaran.
  - Mendukung pencatatan **Biaya Insidental (Perbaikan/Kerusakan Tak Terduga)** yang langsung memotong saldo kas dompet dan menautkan riwayat biaya ke aset terkait.
- **Verifikasi**:
  - 89 assertion audit unit test + 37 pengujian E2E lulus 100%.

## [2026-08-27] Fitur Taksiran Harga Pasar Aset & Analisis Plus / Minus Depresiasi

**Plan**: `docs/plans/2026-08-27-fitur-taksiran-harga-pasar-aset-dan-analisis-plus-minus.md`

### Berubah
- **Inputan Taksiran Harga Pasar Terkini**:
  - Menambahkan input field "Taksiran Harga Pasaran Saat Ini (Rp)" pada formulir aset [AssetModal.tsx](src/components/assets/AssetModal.tsx) untuk mencatat estimasi nilai jual/pasar riil saat ini (misal taksiran pasar motor, laptop, emas, properti).
- **Perhitungan & Analisis Plus (+) vs Minus (-)**:
  - Memperbarui fungsi `calculateAssetDepreciation` pada [assets/route.ts](src/app/api/assets/route.ts) untuk menghitung selisih antara Taksiran Pasar terhadap Harga Beli Awal (`market_diff_purchase`) dan terhadap Nilai Buku Akuntansi (`market_diff_book`).
  - Menghitung persentase perubahan nilai serta menentukan status apakah aset mengalami kenaikan nilai/apresiasi (**Plus**) atau penurunan nilai/depresiasi (**Minus**).
- **Visualisasi Pada Kartu Aset**:
  - Setiap kartu aset pada [AssetsView.tsx](src/components/assets/AssetsView.tsx) kini menyajikan 3 metrik perbandingan: **Harga Beli Awal**, **Nilai Buku Susut**, dan **Taksiran Pasar**, lengkap dengan badge status `Plus (+Rp X)` atau `Minus (-Rp X)`.
- **Verifikasi**:
  - 89 assertion audit unit test + 37 pengujian E2E lulus 100%.

## [2026-08-27] Laporan Khusus Cashflow, Indikator Surplus/Defisit, dan Status Efisiensi Rencana

**Plan**: `docs/plans/2026-08-27-fitur-laporan-cashflow-status-surplus-defisit-dan-efisiensi-rencana.md`

### Berubah
- **Indikator Status Surplus vs Defisit Instan**:
  - Memperbarui [MonthlySummary.tsx](src/components/dashboard/MonthlySummary.tsx) dengan badge kontras tinggi "Kondisi Surplus" vs "Kondisi Defisit" pada tampilan mobile dan desktop sehingga status keuangan bulan berjalan langsung terbaca sekilas.
- **Indikator Efisiensi vs Inefisiensi Rencana Anggaran**:
  - Memperbarui [ExpenseProjectionCard.tsx](src/components/budget/ExpenseProjectionCard.tsx) dengan status "Efisien (Hemat X%)" vs "Inefisien (Boros/Overbudget X%)" yang membandingkan proyeksi akhir bulan terhadap rencana awal.
- **Modul Laporan Khusus Cashflow (Cashflow Statement)**:
  - Membuat komponen [CashflowStatement.tsx](src/components/reports/CashflowStatement.tsx) yang terintegrasi pada [ReportsView.tsx](src/components/reports/ReportsView.tsx) via sub-tab navigasi.
  - Tampilan **Handphone (Mobile)** dibuat ringkas (*clean & glanceable 3-column strip*) memuat Total Kas Masuk, Total Kas Keluar, dan Arus Kas Bersih.
  - Tampilan **PC (Desktop Full Data)** menyajikan tabel lengkap rekonsiliasi kas: Saldo Awal Periode, Arus Kas Operasional Masuk/Keluar, Mutasi Transfer Internal, Kenaikan/Penurunan Bersih, dan Saldo Akhir Periode.
- **Verifikasi**:
  - 86 assertion audit unit test + 35 pengujian E2E lulus 100%.

## [2026-08-27] Fitur Proyeksi Pengeluaran Bulanan (Monthly Expense Projection)

**Plan**: `docs/plans/2026-08-27-fitur-proyeksi-pengeluaran-bulanan.md`

### Berubah
- **Kalkulasi Proyeksi Pengeluaran (Realisasi + Sisa Estimasi)**:
  - Membuat fungsi helper `calculateExpenseProjection` pada [ExpenseProjectionCard.tsx](src/components/budget/ExpenseProjectionCard.tsx) untuk menghitung proyeksi total biaya akhir bulan ($\text{Realisasi Terkini} + \text{Sisa Kebutuhan Riil}$) dan membandingkannya dengan Rencana Anggaran Awal.
  - Menghitung potensi penghematan/surplus biaya jika biaya berjalan tidak sebesar rencana awal (contoh: rencana Rp 1,5 jt, realisasi Rp 1 jt + sisa Rp 300 rb = proyeksi Rp 1,3 jt / hemat Rp 200 rb).
- **Komponen Visual & Penyesuaian Interaktif**:
  - Membuat komponen [ExpenseProjectionCard.tsx](src/components/budget/ExpenseProjectionCard.tsx) di menu Anggaran ([BudgetView.tsx](src/components/budget/BudgetView.tsx)) lengkap dengan rincian 4 metrik, progress bar bertingkat, dan form inline untuk menyesuaikan perkiraan sisa biaya riil.
  - Menambahkan indikator proyeksi akhir bulan pada [ReportsView.tsx](src/components/reports/ReportsView.tsx).
- **Verifikasi**:
  - 86 assertion audit unit test + 35 pengujian E2E lulus 100%.

## [2026-08-27] Fitur Rekonsiliasi Saldo Rekening Riil (Real Account Reconciliation)

**Plan**: `docs/plans/2026-08-27-fitur-rekonsiliasi-saldo-rekening-riil.md`

### Berubah
- **Skema & API Rekonsiliasi Dompet**:
  - Menambahkan kolom `reconciled_at` (timestamp) dan `last_reconciled_balance` (numeric) pada tabel `wallets`.
  - Membuat endpoint API [wallets/[id]/reconcile/route.ts](src/app/api/wallets/[id]/reconcile/route.ts) untuk membandingkan saldo sistem dengan saldo riil bank/kas fisik, menghitung selisih, dan membuat transaksi penyesuaian otomatis (`income` jika saldo fisik lebih banyak, `expense` jika saldo fisik lebih sedikit karena lupa catat).
- **Modal Rekonsiliasi & Analisis Selisih**:
  - Membuat komponen [ReconcileModal.tsx](src/components/wallets/ReconcileModal.tsx) dengan deteksi selisih otomatis, analisis penyebab (kelebihan pemasukan/bunga vs lupa catat belanja/biaya admin), dan sakelar penyesuaian otomatis (*auto-adjust*).
  - Menambahkan tombol aksi cepat "Rekonsiliasi" pada setiap kartu pos kas di [WalletsView.tsx](src/components/wallets/WalletsView.tsx).
- **Verifikasi**:
  - 80 assertion audit unit test + 35 pengujian E2E lulus 100%.

## [2026-08-27] Resume Rencana Keuangan: Cadangan Biaya 4 Bulan dan Cadangan Risiko 10%

**Plan**: `docs/plans/2026-08-27-fitur-resume-rencana-cadangan-4-bulan-dan-resiko-10-persen.md`

### Berubah
- **Perhitungan Rencana Keamanan & Cadangan Risiko**:
  - Mengimplementasikan helper kalkulasi `calculateFinancialSafetyPlan` pada [FinancialSafetyPlanCard.tsx](src/components/budget/FinancialSafetyPlanCard.tsx) yang menghitung:
    1. Cadangan Biaya 4 Bulan ($4 \times \text{Anggaran}$).
    2. Cadangan Risiko 10% ($10\% \times \text{Cadangan 4 Bulan} = 0.4 \times \text{Anggaran}$).
    3. Total Syarat Minimum Dana Keamanan ($4.4 \times \text{Anggaran Bulanan}$).
    4. Saldo cadangan saat ini, progres persentase, dan nominal kekurangan.
- **Aturan KPI Penambahan Pengeluaran (Budget Expansion Guard)**:
  - Menerapkan aturan wajib: Pengguna harus memiliki uang cadangan minimal sebesar total syarat keamanan ($4.4 \times \text{Anggaran}$) sebelum boleh menambah pos pengeluaran atau menaikkan limit anggaran baru.
  - Pada form penetapan anggaran [BudgetView.tsx](src/components/budget/BudgetView.tsx), sistem menampilkan badge status "Terkunci: Wajib Punya Cadangan Dulu" serta pesan peringatan risiko jika syarat minimum belum tercapai.
- **Visualisasi Komprehensif di Modul Anggaran & Evaluasi**:
  - Menampilkan kartu visual [FinancialSafetyPlanCard.tsx](src/components/budget/FinancialSafetyPlanCard.tsx) di menu Anggaran dengan rincian 4 metrik, progres bar, dan rekomendasi aksi finansial.
  - Memperbarui [EvaluationView.tsx](src/components/evaluation/EvaluationView.tsx) agar skor kesehatan dan rasio cadangan mengacu pada ambang batas 4.4x anggaran.
- **Verifikasi**:
  - 78 assertion audit unit test + 35 pengujian E2E lulus 100%.

## [2026-08-27] Fitur Saldo Minus, Laporan Bulanan, Dana Darurat 4x Anggaran, Otomatisasi Transaksi Rutin, dan Kalkulator Insight Hutang

**Plan**: `docs/plans/2026-08-27-fitur-saldo-minus-laporan-dana-darurat-otomatisasi-dan-kalkulator-hutang.md`

### Berubah
- **Dukungan Saldo Minus (Overdraft)**:
  - Melepas batasan database constraint `wallets_balance_nonnegative` dari tabel `wallets` pada migrasi live DB.
  - Memperbarui validasi Zod [validations.ts](src/lib/validations.ts) agar `walletSchema.balance` menerima nilai negatif.
  - Menghapus pembatasan error "Saldo tidak mencukupi" pada rute [transactions/route.ts](src/app/api/transactions/route.ts), [transactions/[id]/route.ts](src/app/api/transactions/[id]/route.ts), [debts/[id]/pay/route.ts](src/app/api/debts/[id]/pay/route.ts), dan [bills/[id]/pay/route.ts](src/app/api/bills/[id]/pay/route.ts) sehingga dompet kas dapat bernilai minus saat pengeluaran melampaui saldo.
  - Menambahkan styling visual saldo minus dengan aksen teks merah dan label indikator minus/overdraft pada [WalletsView.tsx](src/components/wallets/WalletsView.tsx), [WalletScroller.tsx](src/components/dashboard/WalletScroller.tsx), [BalanceHeader.tsx](src/components/dashboard/BalanceHeader.tsx), dan [TransactionModal.tsx](src/components/transactions/TransactionModal.tsx).
- **KPI Dana Darurat (Aturan Wajib 4x Anggaran)**:
  - Mengimplementasikan aturan KPI keamanan keuangan di mana target Dana Darurat dihitung 4 × Total Anggaran Bulanan.
  - Membuat komponen visual [EmergencyFundCard.tsx](src/components/budget/EmergencyFundCard.tsx) di menu Anggaran ([BudgetView.tsx](src/components/budget/BudgetView.tsx)) dengan indikator status otomatis "Keuangan Aman" (jika saldo dana darurat >= 4x anggaran) vs "Keuangan Belum Aman" (jika belum mencapai 4x anggaran), progres bar, dan nominal kekurangan yang harus dikumpulkan.
  - Memperbarui modul Evaluasi Finansial [EvaluationView.tsx](src/components/evaluation/EvaluationView.tsx) agar skor kesehatan dan rekomendasi keuangan mengadopsi standar KPI 4x anggaran.
- **Transaksi Rutin & Pasti Otomatis (Pemasukan & Pengeluaran Pasti)**:
  - Memperluas tabel `recurring_bills` dengan kolom `type` (`expense` | `income`) dan `auto_record` (boolean) untuk membedakan Pemasukan Pasti (Gaji, Bonus, dll) dan Pengeluaran Pasti (Listrik, Air, Wi-Fi, Cicilan Hutang).
  - Membuat endpoint API [bills/auto-process/route.ts](src/app/api/bills/auto-process/route.ts) untuk eksekusi otomatis 1-klik seluruh transaksi rutin periode aktif.
  - Memperbarui [BillsView.tsx](src/components/bills/BillsView.tsx), [BillItem.tsx](src/components/bills/BillItem.tsx), dan [useBillForm.ts](src/components/bills/useBillForm.ts) dengan filter tab (Semua, Pengeluaran Pasti, Pemasukan Pasti), tombol "Catat Otomatis", dan modal transaksi rutin fleksibel.
- **Kalkulator & Simulator Hutang dengan Insight Keamanan Finansial (KPI)**:
  - Membuat komponen modal [DebtCalculatorModal.tsx](src/components/debts/DebtCalculatorModal.tsx) di [DebtsView.tsx](src/components/debts/DebtsView.tsx) untuk menghitung simulasi cicilan pinjaman (pokok, tenor, suku bunga/margin).
  - Menyediakan analisis kesimpulan KPI: menghitung rasio Debt-to-Income (DTI / DSR), sisa arus kas bulanan pasca cicilan, serta dampak terhadap target Dana Darurat 4x Anggaran dengan badge status "Keuangan Aman", "Perlu Waspada", atau "Sangat Berisiko / Defisit".
  - Menyediakan tombol 1-klik untuk menyimpan pinjaman langsung ke daftar hutang aktif sekaligus menjadwalkan cicilan rutin ke daftar pengeluaran pasti.
- **Penyempurnaan Laporan Bulanan (ReportsView)**:
  - Menambahkan navigasi pemilih periode bulan & tahun pada [ReportsView.tsx](src/components/reports/ReportsView.tsx) sehingga pengguna leluasa memeriksa laporan tiap bulan.
  - Menambahkan tabel Riwayat Perbandingan 4 Bulan Terakhir untuk memantau tren pemasukan, pengeluaran, dan arus kas bersih antar-bulan.
  - Memastikan ekspor CSV dan visualisasi grafik terhubung dengan bulan yang dipilih.

### Dampak
- Saldo dompet kini dapat bernilai minus (misal akun kas/rekening overdraft), tidak ada lagi pemblokiran transaksi akibat saldo tidak cukup.
- Seluruh 71 unit test audit dan 35 pengujian E2E lulus tanpa error.

## [2026-08-25] Perbaikan Tampilan Mobile Bottom Nav dan Modal

**Plan**: `docs/plans/2026-08-25-audit-perbaikan-tampilan-mobile-bottom-nav-dan-modal.md`

### Berubah
- **React Portal & Z-Index Root Level**: Memindahkan mounting [Modal.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/ui/Modal.tsx) langsung ke `document.body` menggunakan `createPortal` dengan `z-[999]`. Hal ini mengatasi isolasi *stacking context* dari elemen container `<main>` beranimasi sehingga seluruh modal/sheet dijamin selalu berada di lapisan teratas di atas bottom navigation bar.
- **Modal Safe Area & Dynamic Viewport**: Menambahkan safe-area bottom padding (`pb-[max(env(safe-area-inset-bottom),2.5rem)]`) dan dynamic viewport height (`max-h-[88dvh]`) pada [Modal.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/ui/Modal.tsx) sehingga tombol aksi simpan (Simpan Pengeluaran, Pemasukan, Tagihan, Hutang, Aset, dll.) tampil utuh dan leluasa disentuh.
- **Perbaikan Z-Index Bottom Sheet "Lainnya"**: Menyesuaikan z-index More Bottom Sheet dan backdrop di [BottomNav.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/BottomNav.tsx) menjadi `z-50` (sebelumnya `z-35` yang berada di bawah nav bar `z-40`, mengakibatkan tombol di baris bawah tertindih nav bar dan tidak bisa disentuh).
- **Padding Konten Utama Aman**: Memperbarui padding bawah kontainer utama di [AppShell.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/AppShell.tsx) menjadi `pb-[calc(6.5rem+env(safe-area-inset-bottom))]` agar seluruh daftar transaksi dan tombol terbawah halaman bebas dari tumpukan bottom nav bar.
- **Penataan Elemen Mengambang**: Memperbarui posisi floating toast di [page.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/page.tsx) dan prompt pemasangan iOS di [IosInstallPrompt.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/IosInstallPrompt.tsx) menggunakan kalkulasi `bottom-[calc(5.5rem+env(safe-area-inset-bottom))]` agar tidak saling bertabrakan.

## [2026-08-25] Perbaikan Kehalusan Animasi Transisi Tema

**Plan**: `docs/plans/2026-08-25-tombol-switch-darkmode-dashboard-animasi.md` (revisi lanjutan)

### Berubah
- **Reveal Satu Arah Konsisten**: Menghapus selector ganda `.dark::view-transition-*` yang membuat arah dark→light memakai jalur animasi `reverse` berbeda dan terasa patah; kini light→dark maupun dark→light memakai satu animasi `circleReveal` identik.
- **Easing & Durasi Baru**: Kurva `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out quint) durasi 500ms dengan `animation-fill-mode: both` agar gerakan mengembang terasa lebih natural.
- **Fallback Transisi Warna**: Menambahkan transisi `background-color`/`color` 350ms pada `body` untuk browser tanpa View Transitions API sehingga pergantian tema tetap lembut.

## [2026-08-25] Tombol Switch Dark Mode di Pojok Header & Animasi Transisi

**Plan**: `docs/plans/2026-08-25-tombol-switch-darkmode-dashboard-animasi.md`

### Berubah
- **ThemeToggle Component**: Membuat komponen [ThemeToggle.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/ui/ThemeToggle.tsx) dengan knob meluncur halus, ikon Sun/Moon yang berotasi dan crossfade, serta dukungan View Transitions API untuk efek sapuan lingkaran (*circular reveal*).
- **Penempatan Pojok Header**: Mengintegrasikan `ThemeToggle` pada [TopHeader.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/TopHeader.tsx) di pojok kanan atas di samping menu profil, sehingga selalu dapat diakses di seluruh tab aplikasi.
- **Sinkronisasi Multi-Arah**: Menghubungkan state tema antara switch di header dan segmented control di [SettingsView.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/settings/SettingsView.tsx) melalui event kustom `theme-changed`.
- **CSS Keyframes & Animasi Global**: Menambahkan definisi keyframes `fadeIn`, `scaleIn`, `slideUp` dan aturan `@media (prefers-reduced-motion)` pada [globals.css](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/globals.css) untuk mengaktifkan animasi di modal, popover dropdown, dan notifikasi.

## [2026-08-25] Fitur Dark Mode & Tema Fleksibel (Terang / Gelap / Sistem)

**Plan**: `docs/plans/2026-08-25-fitur-dark-mode.md`

### Berubah
- **Anti-flash Script**: Menambahkan inline script evaluasi tema di `<head>` [layout.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/layout.tsx) untuk mencegah kedipan tema salah saat reload, serta menambahkan `suppressHydrationWarning` pada tag `<html>`.
- **Pengaturan Tema di UI**: Menyediakan segmented control 3 opsi (Terang / Gelap / Sistem) pada [SettingsView.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/settings/SettingsView.tsx) dengan persistensi `localStorage` dan ikon intuitif (Sun, Moon, Desktop).
- **Adaptasi Mode Sistem Real-time**: Menambahkan listener `matchMedia('(prefers-color-scheme: dark)')` saat mode sistem aktif sehingga tampilan otomatis menyesuaikan preferensi OS tanpa reload.
- **Linting & Stability**: Mengisolasi setState tema ke microtask agar mematuhi aturan react-hooks tanpa cascading render.

## [2026-08-25] Upgrade UX, Alur Transaksi, Edit Transaksi & Perbaikan Visual

**Plan**: `docs/plans/2026-08-25-upgrade-ux-dan-perbaikan-keseluruhan.md`

### Berubah
- **Fitur Edit Transaksi**: Menambahkan endpoint `PUT /api/transactions/[id]` dengan pembalikan saldo atomik, proteksi *strict-zero*, dan tombol aksi edit di `TransactionItem`.
- **Form Catat/Edit Transaksi**: Menata ulang alur urutan form secara logis (Kategori/Dompet → Nominal → Tanggal → Catatan), menyematkan pratinjau sisa saldo dompet, dan mengganti native alert offline dengan status banner.
- **Konfirmasi Hapus Aman**: Mengganti native `confirm()` dan penghapusan 1-klik tanpa konfirmasi pada `BillItem`, `DebtItem`, dan `WalletsView` dengan tombol inline konfirmasi `[Hapus] [Batal]`.
- **Pengaturan & Profil Pengguna**: Mengaktifkan pengeditan nama pengguna (`users.name`), mengganti raw `fetch` dengan `apiFetch`, dan menghapus seluruh browser `alert()` / `confirm()`.
- **Context-Aware Header**: Menyembunyikan pemilih periode tanggal pada tab yang non-period (Aset, Hutang, Pengaturan) agar tidak membingungkan pengguna.
- **Kepadatan Tampilan Hutang-Piutang (DebtsView)**: Mengubah 3 summary cards vertikal menjadi strip 3-kolom responsif untuk mengurangi jarak scroll di perangkat mobile.

### Hasil Audit Pasca-Eksekusi
- **Fix build**: [not-found.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/not-found.tsx) kini client component (`'use client'`) karena `@phosphor-icons/react` memanggil `createContext` saat evaluasi modul.
- **Fix lint**: setState sinkron di efek [TransactionList.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/transactions/TransactionList.tsx) dipindah ke microtask agar tidak memicu render berantai (`set-state-in-effect`).
- **Test E2E diperluas**: skenario [4d] kini mencakup PUT pemulihan nominal (uji pembaruan kedua + saldo kembali 4.347.500), menjaga konsistensi asersi anggaran [5].
- **Verifikasi penuh lulus**: build 0 error, lint bersih, audit self-test 70/70, E2E 35/35.

## [2026-08-25] Mobile UX Overhaul — Tampilan HP Simple & Premium

**Plan**: `docs/plans/2026-08-25-mobile-ux-overhaul-tampilan-hp-simple-premium.md`

### Berubah
- **BottomNav**: Redesain ke 5 tab — Beranda, Transaksi, [FAB Catat], Dompet, Lainnya. Tab "Lainnya" membuka bottom sheet dengan 7 modul + 3 quick action typed.
- **MonthlySummary**: Strip 1 baris compact di mobile; 3 kartu penuh di desktop.
- **QuickActions**: 6 module shortcuts disembunyikan di mobile (`hidden md:grid`).
- **BalanceHeader**: Safe-to-spend compact di mobile; navigation links disembunyikan di mobile.
- **Fix**: Circular import `NavTab` di BottomNav.tsx — kini didefinisikan lokal.

## [2026-08-24] Redesain Total Hierarki Visual & Layout Dashboard Beranda

**Plan**: `docs/plans/2026-08-24-redesain-hierarki-visual-dashboard-beranda.md`

### Berubah
- **Restrukturisasi Aksi Cepat (Quick Actions)**: Membagi menu aksi menjadi 2 kelompok proporsional tanpa ada item yang patah baris sendirian:
  1. *3 Tombol Utama Transaksi (Hero Action Buttons)*: Pengeluaran, Pemasukan, dan Transfer kas langsung.
  2. *6 Pintasan Modul Simetris*: Anggaran, Tagihan, Hutang, Aset, Laporan, dan Evaluasi.
- **Redesain Kartu Saldo & Likuiditas (Balance Header)**: Mengubah label menjadi "Total Saldo Kas & Likuiditas", memperbesar tipografi angka saldo (`text-2xl sm:text-3xl font-extrabold`), dan menyatukan sub-kartu *Safe-to-Spend* berdesain *glassmorphism* yang rapi.
- **Penyempurnaan Pos Kas & Ringkasan Arus Kas**: Mengharmonisasikan kartu dompet rekening dan ringkasan arus kas dengan kontras warna yang nyaman dan perataan angka tabular yang presisi.

## [2026-08-24] Audit Visual Komprehensif & Redesain Sidebar Modern Kelas Atas

**Plan**: `docs/plans/2026-08-24-audit-visual-dan-redesain-sidebar-modern.md`

### Berubah
- **Redesain Tipografi & Identitas Brand**: Memperbarui header logo dengan squircle modern bersinar lembut, font merek `KasPribadi` tajam berdensitas pas (`text-base font-extrabold tracking-tight`), dan subtitle nama kas yang proporsional.
- **Tombol Catat Transaksi Ramping**: Mengoptimalkan ukuran dan bayangan tombol utama (+ Catat Transaksi) dengan sudut melengkung modern dan popover dropdown dengan latar *backdrop-blur*.
- **Hierarki Seksi & Menu Elegan**: Merapikan jarak vertikal (*letter-spacing* `tracking-widest text-[9.5px] font-bold text-text-muted/60`), mengganti kapsul aktif pekat dengan *elevated soft pill* (`bg-primary/10 text-primary font-bold border border-primary/20`), dan transisi hover yang mulus.
- **Penyempurnaan Widget Bawah**: Memadatkan kartu mini pintasan keyboard 2-kolom yang simetris dan kartu profil pengguna ber-avatar inisial dengan tombol logout elegan.

## [2026-08-24] Peningkatan Visual UI/UX Modern & Modul Evaluasi Keuangan Lengkap

**Plan**: `docs/plans/2026-08-24-optimasi-visual-ui-ux-dan-modul-evaluasi-keuangan.md`

### Berubah
- **Perbaikan State & Estetika Visual Sidebar**:
  - Mengisolasi tab `evaluation` sebagai ID unik pada [SidebarNav.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/SidebarNav.tsx) untuk mengatasi *bug double active state* pada menu Laporan & Evaluasi.
  - Memperbarui gaya indikator aktif dengan pill solid modern (`bg-primary text-white shadow-2xs font-bold`) dan transisi hover yang bersih, rapi, serta presisi.
- **Modul Baru Evaluasi Keuangan (`EvaluationView.tsx`)**:
  - **Skor Kesehatan Finansial (0 - 100)**: Kalkulasi kesehatan keuangan komprehensif berdasarkan surplus kas, rasio dana darurat, rasio tabungan, dan beban hutang.
  - **4 Rasio Finansial Esensial**:
    1. *Ketahanan Kas / Dana Darurat*: Estimasi durasi bulan hidup yang dapat ditopang kas saat ini.
    2. *Rasio Tabungan (Savings Rate %)*: Persentase surplus bersih dari total pendapatan bulanan.
    3. *Beban Hutang (Debt-to-Income / DTI %)*: Rasio sisa hutang terhadap kapasitas pendapatan.
    4. *Nilai Buku Portofolio Aset*: Nilai pasar dan akumulasi penyusutan seluruh barang berharga.
  - **Estimasi Kekayaan Bersih (Net Worth)**: Agregasi real-time dari Total Kas + Nilai Buku Aset + Piutang - Hutang.
  - **Analisis & Rekomendasi Taktis**: Kotak saran cerdas otomatis untuk memandu perbaikan rasio keuangan pengguna.
- **Penyambungan Navigasi**: Tab `evaluation` terhubung penuh di [page.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/page.tsx), [SidebarNav.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/SidebarNav.tsx), dan [BottomNav.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/BottomNav.tsx).

## [2026-08-24] Sidebar Kompak Bertingkat dengan Section Head dan Sub-Menu

**Plan**: `docs/plans/2026-08-24-sidebar-kompak-bertingkat-head-submenu.md`

### Berubah
- **Struktur Menu Bertingkat (Section Heads & Sub-Menu)**: Merestrukturisasi navigasi sidebar desktop pada [SidebarNav.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/SidebarNav.tsx) ke dalam 5 kelompok logis:
  1. **Utama**: Beranda & Riwayat Transaksi.
  2. **Kas & Anggaran**: Pos Kas & Rekening, Anggaran Bulanan, Tagihan Rutin.
  3. **Aset & Kewajiban**: Aset & Depresiasi, Hutang & Piutang.
  4. **Laporan & Evaluasi**: Laporan & Ekspor, Evaluasi Arus Kas.
  5. **Sistem**: Pengaturan & Backup.
- **Densitas Tinggi & Ramping**: Memadatkan padding container (`p-3.5`), ukuran tinggi tombol menu (`py-1.5 px-2.5` dengan font `text-xs` dan ikon `17px`), serta kotak pintasan keyboard dan avatar profil sehingga muat 15+ sub-menu tanpa scroll panjang.

## [2026-08-24] Rebranding KasPribadi & Fitur Manajemen Aset dan Depresiasi

**Plan**: `docs/plans/2026-08-24-fitur-kaspribadi-dan-manajemen-aset-depresiasi.md`

### Berubah
- **Rebranding KasPribadi**: Memperbarui nama aplikasi, logo, dan identitas visual menjadi **KasPribadi**.
- **Nama Kas Otomatis & Fleksibel**: Saat registrasi user baru di [register/route.ts](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/api/auth/register/route.ts), nama kas otomatis diset sesuai nama pengguna (misal: "Kas <Nama>") dan dapat diubah sewaktu-waktu melalui form Edit Profil & Nama Kas di Pengaturan.
- **Tabel & Migrasi Database Aset**: Membuat tabel `assets` di Neon Postgres dengan kolom umur ekonomis, metode penyusutan (*Straight-Line*, *Declining Balance*, *None*), nilai perolehan, nilai residu, dan catatan.
- **Modul Backend `/api/assets` & `/api/assets/[id]`**: Menyediakan API CRUD lengkap dengan kalkulasi otomatis usia aset, estimasi nilai buku berjalan (*net book value*), akumulasi depresiasi, serta beban penyusutan bulanan/tahunan.
- **Komponen Antarmuka Manajemen Aset**:
  - [AssetsView.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/assets/AssetsView.tsx): 4 kartu ringkasan metrik (Total Perolehan, Nilai Buku Sekarang, Akumulasi Susut, Beban Susut/Bulan), tab filter kategori, search bar, list kartu aset berprogres penyusutan.
  - [AssetModal.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/assets/AssetModal.tsx): Modal formulir catat/ubah aset dengan simulator perhitungan nilai buku instan.
- **Integrasi Navigasi**: Menambahkan tab menu **Aset & Depresiasi** pada [SidebarNav.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/SidebarNav.tsx), [QuickActions.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/QuickActions.tsx), [BottomNav.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/BottomNav.tsx), dan [page.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/page.tsx).
- **Pengujian Lengkap**: Menambahkan pengujian skema & formula depresiasi di `scripts/audit-self-test.ts` (70/70 passed) dan pengujian integrasi E2E CRUD aset di `scripts/e2e-full-suite.ts` (28/28 passed).

## [2026-08-24] Fitur Dropdown Menu Catat Transaksi di Sidebar

**Plan**: `docs/plans/2026-08-24-fitur-dropdown-catat-transaksi-sidebar.md`

### Berubah
- **Menu Dropdown Tombol Catat Transaksi**: Memperbarui [SidebarNav.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/SidebarNav.tsx) dengan menambahkan popover dropdown interaktif pada tombol "+ Catat Transaksi". Menampilkan pilihan instan jenis transaksi: Pengeluaran (E), Pemasukan (I), dan Transfer Dompet (T).
- **Deteksi Klik Luar & Keyboard Escape**: Dilengkapi dengan event listener outside click dan tombol Escape agar menu tertutup mulus ketika user mengeklik bagian lain layar.
- **Penyambungan Prop Handler**: Meneruskan prop `onOpenTypedModal` dari [AppShell.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/AppShell.tsx) ke [SidebarNav.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/SidebarNav.tsx).

## [2026-08-24] Desain Kompak Mobile & Efisiensi Layar Minimal Scroll

**Plan**: `docs/plans/2026-08-24-desain-kompak-mobile-minimal-scroll.md`

### Berubah
- **Laporan & Arus Kas Kompak**: Memadatkan ringkasan likuiditas di [ReportsView.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/reports/ReportsView.tsx) menjadi grid 2x2 kompak (`grid-cols-2 lg:grid-cols-4 gap-2`) dengan padding `p-2 sm:p-2.5` sehingga seluruh metrik utama muat dalam satu kotak ringkas tanpa scroll panjang.
- **Header Saldo & Safe-to-Spend Padat**: Mengoptimalkan ukuran [BalanceHeader.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/BalanceHeader.tsx) (`p-3.5 sm:p-5`, font saldo `text-xl sm:text-2xl md:text-3xl`, strip safe-to-spend `p-2.5 sm:p-3`).
- **Aksi Cepat & Pos Kas Ringkas**: Merampingkan [QuickActions.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/QuickActions.tsx), [MonthlySummary.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/MonthlySummary.tsx), dan [WalletScroller.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/WalletScroller.tsx) agar menghemat lebih dari 40% tinggi vertikal di layar smartphone.
- **Pembersihan Whitespace Kontainer**: Menyesuaikan padding utama pada [AppShell.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/AppShell.tsx) (`p-2.5 sm:p-4`) dan jarak seksi [page.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/page.tsx) (`space-y-3.5 sm:space-y-5`).

## [2026-08-24] Optimasi Visual Mobile & Tipografi Anti-Wrapping Angka Rupiah

**Plan**: `docs/plans/2026-08-24-optimasi-visual-mobile-anti-wrapping.md`

### Berubah
- **Pencegahan Teks Rupiah Terpisah (Anti-Wrapping)**: Memperbarui [formatters.ts](file:///f:/APLIKASI-KEUANGAN-GANANG/src/lib/formatters.ts) dengan menyisipkan spasi tak terputus (*non-breaking space* `\u00A0`), mengunci simbol "Rp" dan digit angka agar tidak terpisah atau turun baris sendirian di browser ponsel manapun.
- **Restrukturisasi Kartu Laporan & Arus Kas**: Memperbarui [ReportsView.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/reports/ReportsView.tsx) dengan struktur layout responsif (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` dan `grid-cols-1 sm:grid-cols-2`) serta `whitespace-nowrap tabular-nums` untuk melenyapkan tampilan teks berhimpitan dan tumpang tindih.
- **Standarisasi Tipografi Angka**: Menerapkan kelas `whitespace-nowrap tabular-nums` secara konsisten pada [MonthlySummary.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/MonthlySummary.tsx), [BalanceHeader.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/BalanceHeader.tsx), [DebtItem.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/debts/DebtItem.tsx), [DebtsView.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/debts/DebtsView.tsx), [BillItem.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/bills/BillItem.tsx), [BudgetProgressBar.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/budget/BudgetProgressBar.tsx), dan [TransactionItem.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/transactions/TransactionItem.tsx).

## [2026-08-24] Perbaikan Kolom Idempotency Key & Error Mapping Pencatatan Transaksi

**Plan**: `docs/plans/2026-08-24-perbaikan-idempotency-key-dan-pencatatan-transaksi.md`

### Berubah
- **Migrasi Kolom Idempotency Key**: Mengeksekusi penambahan kolom `idempotency_key` (UUID) dan unique partial index `idx_trx_idempotency` pada tabel `transactions` di live database Neon Postgres.
- **Pemetaan Error Database Ramah Pengguna**: Memperbarui [apiHelpers.ts](file:///f:/APLIKASI-KEUANGAN-GANANG/src/lib/apiHelpers.ts) dengan pemetaan kode error PostgreSQL (`23514`, `23505`, `23503`, `22P02`) menjadi pesan error bisnis yang jelas (contoh: notifikasi saldo dompet tidak mencukupi alih-alih pesan server generik).
- **Verifikasi Transaksi Riil**: Memvalidasi alur simpan transaksi pengeluaran, pemasukan, dan transfer langsung terhadap database live (100% PASS).

## [2026-08-24] Pengujian End-to-End (E2E) Menyeluruh Semua Fungsi

**Plan**: `docs/plans/2026-08-24-e2e-pengujian-menyeluruh-semua-fungsi.md`

### Berubah
- **Suite Pengujian E2E Otomatis**: Membuat skrip pengujian komprehensif [e2e-full-suite.ts](file:///f:/APLIKASI-KEUANGAN-GANANG/scripts/e2e-full-suite.ts) yang menguji langsung terhadap database live Neon Postgres mencakup 13 modul fungsional:
  1. Registrasi user baru & auto-seeding dompet default (4 dompet), kategori (15 kategori), dan profil pengaturan keluarga.
  2. Autentikasi Bcrypt & penandatanganan/verifikasi token sesi JWT (`jose`).
  3. Manajemen dompet, mutasi saldo, dan penegakan batas strict-zero (saldo anti-minus).
  4. Transaksi multi-tipe (pengeluaran, pemasukan, dan transfer antar-dompet dengan biaya admin & locking deterministik).
  5. Pembuatan batas anggaran bulanan per kategori dan kalkulasi pelacakan real-time.
  6. Pendaftaran tagihan rutin dan pelunasan tagihan atomik multi-tabel (`bill_payments`, `transactions`, `wallets`).
  7. Modul hutang-piutang: pencatatan pinjaman, pembayaran cicilan, dan pembaruan saldo dompet.
  8. Agregasi bootstrap dashboard dan kalkulasi arus kas likuiditas nyata (*Safe-to-Spend*).
  9. Ekspor cadangan JSON, ekspor laporan transaksi CSV, dan isolasi data per-user.
  10. Pembaruan pengaturan nama keluarga dan mata uang.
  11. Pembersihan data pengujian (*cascade teardown*).
- **Integrasi Test Command**: Mengintegrasikan script `test:e2e` ke dalam `npm test` (`test:audit` + `test:e2e`), mencakup total **87 assertions** (62 unit test + 25 E2E test) dengan tingkat kelulusan 100%.

## [2026-08-24] Menu Profil, Pengaturan & Edit Akun di Top Header Mobile

**Plan**: `docs/plans/2026-08-24-menu-profile-pengaturan-mobile.md`

### Berubah
- **Menu Dropdown Profil Header**: Menambahkan dropdown popover interaktif pada tombol avatar profil di [TopHeader.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/TopHeader.tsx) yang mudah diakses di smartphone dan desktop.
- **Navigasi Lengkap Profil**: Menyediakan badge identitas (nama pengguna, email, nama keluarga), tombol akses langsung ke "Pengaturan & Backup", tombol "Edit Profil & Keluarga", serta tombol "Keluar dari Akun" (logout).
- **Penutupan Responsif**: Menambahkan deteksi klik di luar (outside click) dan tombol Escape untuk menutup menu secara mulus.

## [2026-08-24] Perbaikan Parsing Sesi Auth & Redirect Login

**Plan**: `docs/plans/2026-08-24-perbaikan-auth-session-login-redirect.md`

### Berubah
- **Perbaikan Ekstraksi Sesi Auth**: Menyelaraskan bentuk respons objek user pada [route.ts](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/api/auth/me/route.ts) dan ekstraksi `userObj` di [page.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/page.tsx) (`data.data?.user || data.data`), mengatasi kendala pengguna kembali terlempar ke halaman login sesaat setelah berhasil masuk.
- **Transisi Navigasi Auth**: Memastikan [LoginPage](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/(auth)/login/page.tsx) dan [RegisterPage](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/(auth)/register/page.tsx) memicu `router.push('/')` dan `router.refresh()` secara sinkron dengan cookie httpOnly.
- **Unit Test Coverage**: Menambahkan 5 assertion baru di [audit-self-test.ts](file:///f:/APLIKASI-KEUANGAN-GANANG/scripts/audit-self-test.ts) untuk memvalidasi JWT token roundtrip dan kompatibilitas parsing sesi (total 62 passed).

## [2026-08-24] Fitur Hutang-Piutang, Navigasi Back Mobile, dan Laporan Cashflow Komprehensif

**Plan**: `docs/plans/2026-08-24-fitur-hutang-piutang-navigasi-back-laporan-cashflow.md`

### Berubah
- **Modul Hutang & Piutang**: Membuat tabel `debts` dan `debt_payments` di database, endpoint CRUD `GET/POST/PUT/DELETE /api/debts`, serta endpoint transaksi cicilan/pelunasan `POST /api/debts/[id]/pay` yang terhubung atomik dengan mutasi saldo dompet kas dan pencatatan riwayat transaksi.
- **Komponen UI Hutang & Piutang**: Membuat [DebtsView.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/debts/DebtsView.tsx) dan [DebtItem.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/debts/DebtItem.tsx) dengan kartu visual, progress bar pelunasan bertahap, status badge jatuh tempo/menunggak, dan modal pembayaran cicilan dengan tombol quick full-payment.
- **Kalkulasi Likuiditas Nyata (Safe-to-Spend)**: Menghitung metrik *Dana Bebas Belanja* (Safe-to-Spend) secara riil: $\text{Total Kas} - (\text{Tagihan Pending} + \text{Hutang Jatuh Tempo}) + \text{Piutang Masuk}$. Ditampilkan di widget [BalanceHeader.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/BalanceHeader.tsx) dan breakdown komprehensif di [ReportsView.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/reports/ReportsView.tsx).
- **Navigasi Back Mobile & Proteksi Keluar**: Membangun history stack dan event handler `popstate` di [page.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/page.tsx). Menekan tombol back akan menutup modal aktif atau kembali ke tab sebelumnya. Jika sudah berada di beranda (root), aplikasi menampilkan toast konfirmasi *"Tekan sekali lagi untuk keluar dari aplikasi"* untuk mencegah ketidaksengajaan keluar.
- **Navigasi & Akses Cepat**: Menambahkan tab Hutang-Piutang di [BottomNav.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/BottomNav.tsx), [SidebarNav.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/SidebarNav.tsx), dan tombol aksi di [QuickActions.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/QuickActions.tsx).
- **Test Suite**: Memperluas unit test di [audit-self-test.ts](file:///f:/APLIKASI-KEUANGAN-GANANG/scripts/audit-self-test.ts) menjadi 57 passed assertions.

## [2026-08-24] Optimasi Visual Menyeluruh Mobile-First

**Plan**: `docs/plans/2026-08-24-optimasi-visual-mobile-first.md`

### Berubah
- **Pembersihan Teks Terpotong**: Menghilangkan pemotongan teks paksa (`truncate`) di [QuickActions.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/QuickActions.tsx), menyesuaikan padding grid dan typography (`break-words text-center leading-tight`) agar label "Pengeluaran", "Pemasukan", "Transfer", "Hutang", "Anggaran", dan "Tagihan" terbaca utuh di semua resolusi handphone (320px–430px+).
- **Responsivitas Komponen Inti**: Menyesuaikan padding kartu, ukuran touch target (min 40–44px), dan tipografi responsif pada [BalanceHeader.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/BalanceHeader.tsx), [MonthlySummary.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/MonthlySummary.tsx), [BudgetProgressBar.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/budget/BudgetProgressBar.tsx), [BillItem.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/bills/BillItem.tsx), [TransactionItem.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/transactions/TransactionItem.tsx), [TopHeader.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/TopHeader.tsx), dan [AppShell.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/AppShell.tsx).

## [2026-08-24] Kesiapan Produksi & Verifikasi Menyeluruh KasKeluarga

**Plan**: `docs/plans/2026-08-24-kesiapan-produksi-dan-verifikasi-e2e.md`

### Berubah
- **Verifikasi Alur End-to-End**: Memverifikasi alur registrasi user, auto-seeding dompet & kategori, isolasi data multi-user, transaksi multi-pos, transfer kas aman deadlock, anggaran bulanan, pembayaran tagihan rutin, serta ekspor CSV dan backup/restore JSON.
- **Verifikasi PWA & Offline Engine**: Memvalidasi ketahanan offline, antrean mutasi IndexedDB, dan sinkronisasi otomatis `drainOfflineQueue` dengan proteksi double-debit berbasis `Idempotency-Key`.
- **Automated Validation Triad**:
  - `npm test`: 51 assertions passed 100%.
  - `npm run lint`: 0 errors dan 0 warnings pada ESLint 9 flat config.
  - `npm run build`: 22 static & dynamic routes terkompilasi optimal (turbopack compile time < 600ms).

## [2026-08-24] Optimasi Performa Ekstrem dan Pembersihan Kualitas Kode

**Plan**: `docs/plans/2026-08-24-optimasi-performa-dan-kualitas-kode.md`

### Berubah
- **Optimasi React & State Flow**: Merefaktor state initialization di [TransactionModal.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/transactions/TransactionModal.tsx) dengan pola `TransactionForm` terisolasi dan sinkronisasi event handler, meniadakan cascading render dan warning React 19.
- **Pembersihan Lint & Kode Bersih**: Menghilangkan seluruh warning unused imports dan mengetatkan tipe data pada chart tooltips ([CashflowChart.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/reports/CashflowChart.tsx), [CategoryChart.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/reports/CategoryChart.tsx)), [SettingsView.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/settings/SettingsView.tsx), [TransactionList.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/transactions/TransactionList.tsx), [auth.ts](file:///f:/APLIKASI-KEUANGAN-GANANG/src/lib/auth.ts), dan [db.ts](file:///f:/APLIKASI-KEUANGAN-GANANG/src/lib/db.ts). Linter kini lulus dengan **0 error dan 0 warning**.
- **External Store Sync**: Menerapkan `useSyncExternalStore` di [IosInstallPrompt.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/IosInstallPrompt.tsx) dan [OfflineBanner.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/OfflineBanner.tsx) untuk pemantauan konektivitas dan browser storage yang bebas efek samping.
- **Dynamic Code-Splitting & Bundel Minimal**: Mengubah pemuatan view sekunder ([BudgetView](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/budget/BudgetView.tsx), [BillsView](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/bills/BillsView.tsx), [WalletsView](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/wallets/WalletsView.tsx), [SettingsView](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/settings/SettingsView.tsx), [TransactionModal](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/transactions/TransactionModal.tsx)) di [page.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/page.tsx) menjadi `next/dynamic` dengan skeleton placeholder, mempercepat First Contentful Paint dan TTI dashboard.
- **Optimasi Produksi Next.js**: Mengaktifkan `compiler.removeConsole` pada mode produksi di [next.config.mjs](file:///f:/APLIKASI-KEUANGAN-GANANG/next.config.mjs).

## [2026-08-24] Audit Menyeluruh dan Perbaikan Keamanan, Integritas, serta Kualitas KasKeluarga

**Plan**: `docs/plans/2026-08-24-audit-dan-perbaikan.md`

### Berubah
- **Keamanan Kritis**: Menghapus file secret plaintext dari root workspace, memperbarui aturan `.gitignore` (`env-*.json`, `.env*`, `proj-old.json`, `dep.json`), memindahkan kredensial ke `.env.local`. Mengamankan `/api/init` dengan secret header/first-bootstrap guard & transaksi atomik. Memperketat `/api/backup/import` dengan skema Zod lengkap dan isolasi data per-user (`user_id` paksa dari session). Menambahkan filter `user_id` di semua operasi pembaruan dompet pada `DELETE /api/transactions/[id]`, `POST /api/transactions`, dan `POST /api/bills/[id]/pay`.
- **Integritas Data & Transaksi**: Menambahkan constraint database `balance >= 0` pada tabel `wallets`. Menambahkan kunci idempotency (`Idempotency-Key`) untuk transaksi offline queue serta pencegahan race condition/double-debit pada drain queue. Mengurutkan penguncian wallet secara deterministik (berdasarkan UUID) pada operasi transfer. Membungkus mutasi multi-tabel dalam `withTransaction` atomik.
- **Error Handling & Validasi**: Membuat helper `src/lib/apiHelpers.ts` (`handleRouteError` & `readJsonBody`) untuk menyaring pesan error internal di semua 22 route handler API agar pesan server mentah tidak bocor ke client.
- **State UI & Aksesibilitas**: Menyediakan error state dan retry button global pada dashboard bootstrap, loading skeleton dan error banner di `ReportsView`, empty state dan konfirmasi hapus di `WalletsView` serta `BillsView`. Menghapus pembatasan zoom di viewport, menambahkan label aksesibel (`htmlFor` & `aria-label`) serta dialog focus trap.
- **Kualitas Kode, PWA & Performa**: Menyediakan `apiFetch` tersentralisasi, migrasi `eslint.config.mjs` ke native flat config ESLint 9 + Next.js 16, registrasi Service Worker PWA di `src/app/layout.tsx` dengan strategi network-first navigasi dan cache-first aset statis, serta memparalelkan kueri bootstrap dan laporan.
- **Test Suite**: Memperluas `scripts/audit-self-test.ts` untuk menguji 51 assertions mencakup seluruh skema validasi Zod dan formatter rupiah/tanggal produksi.

### Dampak
- Database PostgreSQL membutuhkan eksekusi inisialisasi `/api/init` untuk menerapkan constraint `wallets_balance_nonnegative` dan kolom `idempotency_key`.
- Secret lama yang sempat berada di file plaintext lokal tidak boleh digunakan lagi di lingkungan publik.
