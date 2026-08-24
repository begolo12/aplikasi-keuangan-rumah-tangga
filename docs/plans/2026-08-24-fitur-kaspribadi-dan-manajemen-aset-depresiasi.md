# Plan: Rebranding KasPribadi & Fitur Manajemen Aset dan Depresiasi

- Tanggal: 2026-08-24
- Status: done

## Tujuan
1. Mengubah identitas dan *branding* aplikasi menjadi **KasPribadi** (dari KasKeluarga), serta menyesuaikan nama kas saat registrasi user baru agar otomatis menggunakan nama pengguna (misal: "Kas <Nama>") dan dapat diubah secara fleksibel melalui edit profil/pengaturan.
2. Membangun modul lengkap **Manajemen Aset & Depresiasi** (Asset & Depreciation Management) untuk mencatat barang berharga, menghitung umur ekonomis, metode penyusutan (*Straight-Line*, *Declining Balance*, atau *None* untuk aset apresiatif), nilai buku saat ini (*current net book value*), serta beban depresiasi bulanan.

## Ruang Lingkup
- [x] **Rebranding & Nama Kas Dinamis**:
  - Ubah nama aplikasi di seluruh metadata, logo, top header, sidebar, login/register, dan judul menjadi **KasPribadi**.
  - Saat user mendaftar di `POST /api/auth/register`, atur default nama kas/keluarga menjadi nama pengguna (misal `Kas ${name}` atau `${name}`) alih-alih hardcoded `"keluarga"` atau `"Keluarga Bahagia"`.
  - Sesuaikan form Edit Profil / Pengaturan agar label dan placeholder jelas ("Nama Kas / Akun Pribadi").
- [x] **Skema Database & DDL Migrasi Aset**:
  - Buat tabel `assets` di Neon Postgres dengan kolom: `id UUID`, `user_id UUID`, `name VARCHAR(100)`, `category VARCHAR(50)`, `purchase_date DATE`, `purchase_price NUMERIC(15,2)`, `current_value NUMERIC(15,2)`, `depreciation_method VARCHAR(30)`, `useful_life_years INT`, `salvage_value NUMERIC(15,2)`, `notes TEXT`, `created_at`, `updated_at`.
  - Buat indeks `idx_assets_user` pada kolom `user_id`.
  - Eksekusi migrasi DDL langsung pada Neon Postgres.
- [x] **API Backend Aset (`/api/assets` & `/api/assets/[id]`)**:
  - `GET /api/assets` (dengan filter kategori & pencarian, kalkulasi otomatis nilai buku dan akumulasi depresiasi).
  - `POST /api/assets` (validasi skema Zod, simpan aset baru).
  - `PUT /api/assets/[id]` (update data aset).
  - `DELETE /api/assets/[id]` (hapus data aset terisolasi per user).
- [x] **Komponen UI Manajemen Aset & Depresiasi**:
  - Buat `src/components/assets/AssetsView.tsx` dengan kartu ringkasan (Total Nilai Perolehan, Nilai Buku Sekarang, Akumulasi Depresiasi, Beban Penyusutan Bulan Ini).
  - Tambahkan tab filter kategori, search bar, list kartu aset informatif dengan status umur ekonomis dan bar progres penyusutan.
  - Buat Modal Tambah & Edit Aset dengan kalkulator simulasi nilai buku langsung.
  - Integrasikan menu **"Aset & Depresiasi"** di [SidebarNav.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/SidebarNav.tsx), [QuickActions.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/QuickActions.tsx), dan [AppShell.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/AppShell.tsx).
- [x] **Pengujian & Verifikasi**:
  - Tambahkan unit test skema aset di `scripts/audit-self-test.ts`.
  - Tambahkan skenario E2E CRUD aset di `scripts/e2e-full-suite.ts`.
  - Verifikasi: `npm test` lulus, `npm run lint` bebas error, `npm run build` sukses.

## File yang Disentuh
- `docs/plans/2026-08-24-fitur-kaspribadi-dan-manajemen-aset-depresiasi.md`
- `src/lib/types.ts`
- `src/lib/validations.ts`
- `src/app/api/init/route.ts`
- `src/app/api/assets/route.ts` [NEW]
- `src/app/api/assets/[id]/route.ts` [NEW]
- `src/app/api/auth/register/route.ts`
- `src/components/assets/AssetsView.tsx` [NEW]
- `src/components/assets/AssetModal.tsx` [NEW]
- `src/components/layout/SidebarNav.tsx`
- `src/components/layout/TopHeader.tsx`
- `src/components/layout/BottomNav.tsx`
- `src/components/dashboard/QuickActions.tsx`
- `src/components/dashboard/BalanceHeader.tsx`
- `src/components/settings/SettingsView.tsx`
- `src/app/page.tsx`
- `src/app/layout.tsx`
- `scripts/run-db-migrations.ts`
- `scripts/audit-self-test.ts`
- `scripts/e2e-full-suite.ts`
- `changelog.md`

## Kriteria Selesai (Definition of Done)
1. Branding dan identitas visual aplikasi berubah menjadi **KasPribadi**.
2. Registrasi user baru otomatis menetapkan nama kas sesuai nama pengguna (contoh: "Kas Irvan").
3. Modul Manajemen Aset & Depresiasi berjalan penuh (bisa tambah, lihat, edit, hapus aset dengan kalkulasi nilai buku dan beban penyusutan akurat).
4. Seluruh unit test dan E2E test lulus 100%.
