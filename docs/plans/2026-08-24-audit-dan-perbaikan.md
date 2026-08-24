# Plan: Audit Menyeluruh dan Perbaikan Keamanan, Integritas, serta Kualitas KasKeluarga

- Tanggal: 2026-08-24
- Status: done

## Tujuan

Audit penuh aplikasi dikerjakan tanggal 2026-08-24 (read-only, tanpa perubahan kode). Hasilnya: 23 API route, seluruh komponen frontend, lib, konfigurasi, skrip test, service worker, dan higienitas repo diperiksa. Temuan terpenting:

1. **[KRITIS] Secret plaintext di root repo**: `env-jwt.json` (JWT_SECRET), `env-db.json` (DATABASE_URL Neon), `env-patch.json` (keduanya) berisi kredensial ASLI. `env-old.json`/`proj-old.json` berisi snapshot env Vercel terenkripsi dengan key secret lengkap (POSTGRES_PASSWORD, PGPASSWORD, dll). Semua untracked dan TIDAK di-ignore `.gitignore` (pola `.env*` hanya mencakup nama bertitik). Satu `git add .` menjauh dari kebocoran.
2. **[HIGH] `/api/init` tanpa auth**: GET/POST publik, menjalankan DDL (CREATE EXTENSION, 8 tabel, index) berulang-ulang, 9 query tanpa transaksi, error mentah bocor.
3. **[HIGH] `/api/backup/import` tanpa Zod**: `ON CONFLICT (id) DO UPDATE SET balance` bisa MENIMPA SALDO dompet user lain via UUID bentrok; menerima saldo negatif; referensi lintas-user bisa ditanam.
4. **[HIGH] Invarian strict-zero tidak dijaga DB**: tabel `wallets` tanpa `CHECK (balance >= 0)`.
5. **[HIGH] Replay offline queue bisa dobel-debit**: tanpa idempotency key; crash setelah server commit tapi sebelum hapus item = transaksi terkirim ulang; response 2xx `{success:false}` dianggap sukses; drain bersamaan bisa kirim item sama.
6. **[HIGH] UI menyembunyikan kegagalan**: bootstrap gagal hanya masuk `console.error` (dashboard tampil nol tanpa pesan/retry); `ReportsView` punya flag loading yang tak dirender dan `res.ok` tak dicek.
7. **[HIGH] Aksesibilitas**: zoom dimatikan (`maximumScale: 1`, `userScalable: false` di layout.tsx); input pencarian tanpa accessible name; modal tanpa focus trap/role dialog.
8. **[MED] `DELETE /api/transactions/[id]`** memodifikasi wallet tanpa filter `user_id`; banyak endpoint tidak memverifikasi kepemilikan `category_id`/`wallet_id` (FK silang bisa bocorkan metadata user lain via join); beberapa operasi multi-query tanpa transaksi (register+seed, settings PUT, default wallet, delete bill/kategori); hampir semua catch mengirim `error.message` mentah; query params (`month`/`year`/`limit`) tanpa validasi.
9. **[LOW] Konfigurasi/alat**: `npm run lint` RUSAK (`next lint` dihapus di Next 16, terverifikasi gagal); `tsconfig.target ES2017` vs Node>=22; `sw.js` dormant (tidak pernah diregistrasi); self-test menguji salinan lokal `simulateExpense`/`calcTotalExpense`, bukan kode produksi; plan lama di `docs/superpowers/plans/` belum tercatat di changelog.

Plan ini adalah rencana perbaikan berprioritas dari temuan tersebut.

## Ruang Lingkup

### Fase 1 - Keamanan Kritis (prioritas tertinggi)
- [x] Perbarui `.gitignore`: tambah `env-*.json`, `proj-old.json`, `dep.json`, `.omo/`; hapus duplikasi `.vercel`/`.env*`
- [x] Rotasi kredensial: JWT_SECRET baru + reset kredensial database Neon; pindahkan nilai aktif ke `.env.local` (tidak pernah di-commit)
- [x] Hapus file plaintext `env-jwt.json`, `env-db.json`, `env-patch.json` setelah rotasi; arsipkan `env-old.json`/`proj-old.json` di luar repo bila masih diperlukan
- [x] Beri guard `/api/init`: tolak di production kecuali dibuktikan via header secret khusus ATAU hanya boleh saat tabel `users` belum ada; bungkus seluruh DDL dalam satu `withTransaction`; sanitasi pesan error
- [x] Hardening `/api/backup/import`: skema Zod ketat untuk seluruh payload; paksa `user_id` dari session pada setiap baris restore; ganti `ON CONFLICT (id) DO UPDATE` menjadi upsert ber-scope owner (`WHERE wallets.user_id = $session`) atau regenerasi id; tolak saldo negatif; verifikasi referensi category/wallet/bill milik user
- [x] Tambah `ALTER TABLE wallets ADD CONSTRAINT balance_nonnegative CHECK (balance >= 0)` lewat mekanisme migrasi ringan di init
- [x] `DELETE /api/transactions/[id]`: tambah `AND user_id = $n` pada semua SELECT/UPDATE wallet; hapus import `transactionSchema` yang tak dipakai

### Fase 2 - Integritas Data dan Offline Queue
- [x] Idempotency: transaction POST menerima `Idempotency-Key` (UUID dari client); unique index di `transactions.idempotency_key`; kembalikan transaksi existing bila key sama; TransactionModal/offlineQueue mengirim key yang disimpan di item queue
- [x] Perbaiki `drainOfflineQueue`: anggap sukses hanya `res.ok && body.success === true`; mutex sederhana agar satu drain berjalan; batasi retry item gagal (misal maksimal 5 attempt lalu tandai failed permanen + laporkan ke UI)
- [x] Bersihkan IndexedDB queue milik user saat logout
- [x] Bungkus operasi multi-query dalam `withTransaction`: register (cek email + INSERT + seed, jangan telan error seed), settings PUT (app_settings + users), wallets POST/PUT (unset default + tulis), bills/[id] DELETE (payment log + bill), categories/[id] (safety check + delete)
- [x] Urutan lock kanonik transfer (lock wallet berdasar urutan UUID) untuk menghindari deadlock transfer berlawanan arah
- [x] Perbaiki derivasi bulan/tahun di `bills/[id]/pay`: parse langsung dari string `YYYY-MM-DD`, bukan `new Date()` lokal (risiko geser bulan di timezone offset negatif)

### Fase 3 - Error Handling dan Validasi Terpusat
- [x] Buat helper `src/lib/apiHelpers.ts`: `handleRouteError(error)` yang memetakan ZodError ke 400, error bisnis bertanda ke 400/409, sisanya ke 500 generik di production; terapkan ke 23 route sehingga tidak ada `error.message` mentah keluar
- [x] Verifikasi kepemilikan referensi: `category_id`/`wallet_id` pada POST/PUT transactions, bills, budgets wajib dicek `WHERE id = $x AND user_id = $session`; tambah predicate owner pada join metadata di dashboard/bootstrap, reports, export-csv, transactions GET
- [x] Batasi `amount` pembayaran tagihan terhadap nominal tagihan (tolak overpay) atau dokumentasikan underpay/overpay sebagai perilaku disengaja
- [x] Lengkapi panjang `icon`/`color` pada categorySchema sesuai batas kolom; batasi `currency` settings (enum/panjang)

### Fase 4 - State UI dan Aksesibilitas
- [x] Error state global: bootstrap gagal menampilkan panel error + tombol "Coba lagi" (bukan data nol diam-diam)
- [x] `ReportsView`: render loading skeleton, cek `res.ok`, tampilkan pesan error inline
- [x] `WalletsView`: empty state dengan ajakan tambah dompet; `TransactionList`: pakai prop `isLoading` yang sudah ada
- [x] Ganti semua `alert()` dengan inline/toast non-blocking
- [x] Aktifkan zoom: hapus `maximumScale: 1` dan `userScalable: false` di layout.tsx
- [x] Label aksesibel: `htmlFor`+`id` di semua input form (login, register, TransactionModal, BillsView, WalletsView, AmountInput); `aria-label` input pencarian
- [x] Modal: `role="dialog"`, `aria-modal`, focus trap, initial focus, Escape (sudah ada), kembalikan fokus saat tutup
- [x] Touch target minimal 44px untuk kontrol kecil (TopHeader, tombol close modal, toggle password, pilihan warna); aturan `focus-visible` untuk tombol hapus transaksi yang hover-reveal

### Fase 5 - Kualitas Kode, Test, dan Konfigurasi
- [x] Helper fetch typed terpusat (`apiFetch`) + peta endpoint; ganti 23 literal `/api/...` tersebar; AbortController untuk fetch periode di page.tsx dan ReportsView
- [x] Konsolidasi formatter rupiah: `AmountInput` dan `TransactionModal` memakai `src/lib/formatters.ts`; perbaiki `formatCompactRupiah` agar desimal koma sesuai komentar
- [x] Perbaiki `npm run lint`: migrasi ke ESLint CLI dengan flat config (Next 16 menghapus `next lint`), update AGENTS.md bila perintah berubah
- [x] tsconfig: `target ES2022`, evaluasi `allowJs`/`skipLibCheck`
- [x] Putuskan nasib `public/sw.js`: registrasikan dengan strategi aman (network-first untuk navigasi) atau hapus; jangan biarkan dormant
- [x] Perluas `scripts/audit-self-test.ts`: uji walletSchema/recurringBillSchema/payBillSchema/settingsSchema/registerSchema; hapus `simulateExpense`/`calcTotalExpense` salinan lokal (ganti dengan pengujian modul produksi); perbaiki assertion "admin_fee" yang menyesatkan
- [x] Pecah komponen raksasa (BillsView 344 baris, TransactionModal 345, WalletsView 306): pisahkan form state ke hook
- [x] Catat plan lama `docs/superpowers/plans/2026-08-24-app-audit-and-quality-hardening.md` (sudah tereksekusi) ke changelog

### Fase 6 - Optimasi Performa (diminta user)
- [x] Paralelkan query independen di dashboard/bootstrap, reports/monthly, dan backup/export dengan Promise.all
- [x] Dynamic import ReportsView/chart recharts agar keluar dari bundel awal halaman utama
- [x] `optimizePackageImports` untuk `@phosphor-icons/react` di next.config.mjs
- [x] Registrasi service worker dengan strategi aman: network-first untuk navigasi, cache-first hanya aset statis `_next/static` dan ikon; API selalu dilewati
- [x] Audit indeks database: tambah indeks komposit yang dipakai query terpanas (transaksi per user+tanggal, budget per bulan, tagihan per user)


## File yang Disentuh

- `.gitignore`, `.env.local` (baru, tidak di-commit), hapus `env-*.json`, `proj-old.json`
- `src/app/api/init/route.ts` (guard + transaksi + constraint)
- `src/app/api/backup/import/route.ts` (Zod + scope owner)
- `src/app/api/transactions/[id]/route.ts` (filter user_id)
- `src/app/api/transactions/route.ts` (Idempotency-Key, validasi params, ownership check)
- `src/app/api/auth/register/route.ts`, `src/app/api/settings/route.ts`, `src/app/api/wallets/route.ts`, `src/app/api/wallets/[id]/route.ts`, `src/app/api/bills/[id]/route.ts`, `src/app/api/categories/[id]/route.ts` (transaksi atomik)
- `src/app/api/bills/[id]/pay/route.ts` (timezone, amount bound)
- `src/lib/apiHelpers.ts` (baru), `src/lib/validations.ts` (skema query + pelengkap)
- `src/lib/offlineQueue.ts`, `src/components/transactions/TransactionModal.tsx`, `src/components/layout/OfflineBanner.tsx` (idempotency + drain)
- `src/app/page.tsx` (error state + retry), `src/components/reports/ReportsView.tsx`, `src/components/wallets/WalletsView.tsx`, `src/components/transactions/TransactionList.tsx`
- `src/app/layout.tsx` (viewport zoom), `src/components/ui/Modal.tsx` (focus trap), komponen form (label)
- `src/lib/apiFetch.ts` (baru), `src/lib/formatters.ts`
- `scripts/audit-self-test.ts`, `package.json` (lint script), `tsconfig.json`, `eslint.config.mjs` (baru)
- `changelog.md`, `AGENTS.md` (bila perintah lint berubah)
- `next.config.mjs` (optimizePackageImports), komponen registrasi service worker, `public/sw.js` (strategi cache)

## Kriteria Selesai (Definition of Done)

1. `npm run build` lulus tanpa error TypeScript baru; `npm run lint` berjalan (setelah migrasi ESLint).
2. `npm test` lulus dengan cakupan skema yang diperluas.
3. Tidak ada file secret plaintext di root; `.gitignore` mencakup semuanya; JWT_SECRET dan DATABASE_URL lama sudah dirotasi dan tidak lagi valid.
4. `GET/POST /api/init` ditolak di production tanpa header secret; DDL atomik.
5. Import backup dengan payload berisi UUID wallet user lain TIDAK mengubah saldo user lain (terverifikasi test manual dua akun); payload saldo negatif ditolak; constraint `balance >= 0` aktif di DB.
6. Simulasi offline: transaksi diantrikan, server commit tapi respons hilang, replay berikutnya TIDAK membuat transaksi kedua (idempotency key bekerja).
7. Tidak ada route yang mengirim `error.message` internal di production mode (audit ulang cepat grep).
8. Dashboard tetap menampilkan error + retry saat endpoint bootstrap dipaksa gagal; laporan punya loading dan error state.
9. Zoom pinch-to-zoom berfungsi; semua input memiliki label aksesibel; modal dapat ditutup keyboard dan fokus tidak lolos ke belakang.
10. Semua perubahan dicatat di `changelog.md` mengikuti format AGENTS.md.
11. Query bootstrap dan laporan berjalan paralel; chart dimuat lazy; First Load JS halaman utama tidak lebih besar dari baseline build 2026-08-24.
