# Changelog

Log eksekusi plan. Entri baru ditambahkan di bagian paling atas.
Format entri lihat `AGENTS.md` bagian "Langkah 3 — Catat ke Changelog".

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
