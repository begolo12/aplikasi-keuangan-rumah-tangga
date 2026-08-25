# Changelog

Log eksekusi plan. Entri baru ditambahkan di bagian paling atas.
Format entri lihat `AGENTS.md` bagian "Langkah 3 — Catat ke Changelog".

## [2026-08-25] Audit & Perbaikan Tampilan Handphone, Bottom Bar, dan Modal Overlap

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
