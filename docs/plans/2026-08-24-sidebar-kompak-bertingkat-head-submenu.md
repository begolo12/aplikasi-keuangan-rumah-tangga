# Plan: Sidebar Kompak Bertingkat dengan Section Head dan Sub-Menu

- Tanggal: 2026-08-24
- Status: done

## Tujuan
Merestrukturisasi sidebar navigasi agar lebih ramping (*compact*) dan tertata rapi secara hierarkis menggunakan judul seksi (*section heads*) serta sub-menu yang dapat dikembangkan (*scalable*), sehingga siap menampung menu evaluasi keuangan, analitik mendalam, dan fitur masa depan lainnya tanpa membuat sidebar sesak atau membutuhkan scroll panjang.

## Ruang Lingkup
- [x] **Strukturisasi Hierarki Menu (Section & Sub-Menu)**:
  - **Menu Utama**: Beranda, Riwayat Transaksi.
  - **Arus Kas & Pos**: Pos Kas & Rekening, Anggaran Bulanan, Tagihan Rutin.
  - **Kekayaan & Komitmen**: Aset & Depresiasi, Hutang & Piutang.
  - **Analisis & Evaluasi**: Laporan & Ekspor, Evaluasi Keuangan (Financial Health Score / Audit).
  - **Pengaturan & Sistem**: Pengaturan Akun & Backup.
- [x] **Desain Kompak & Densitas Tinggi**:
  - Mengurangi tinggi item menu (`h-8.5` / `py-1.5 px-2.5`) dengan font `text-xs` dan ikon `size={17}`.
  - Menata *section header* yang elegan (`text-[10px] font-bold uppercase tracking-wider text-text-muted`).
  - Menjaga dropdown transaksi "+ Catat" tetap fungsional dan padat.
- [x] **Pengujian & Verifikasi**:
  - Verifikasi seluruh navigasi tab berfungsi 100%.
  - `npm test` lulus (98/98), `npm run lint` 0 warning, `npm run build` sukses.

## File yang Disentuh
- `docs/plans/2026-08-24-sidebar-kompak-bertingkat-head-submenu.md`
- `src/components/layout/SidebarNav.tsx`
- `changelog.md`

## Kriteria Selesai (Definition of Done)
1. Tampilan sidebar memiliki pengelompokan seksi (*Head & Sub-menu*) yang jelas.
2. Dimensi vertikal sidebar sangat kompak dan rapi.
3. Seluruh item menu aktif dan berpindah tab dengan mulus.
4. Build dan test suite lulus 100%.
