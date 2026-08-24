# Plan: Fitur Dropdown Menu Catat Transaksi di Sidebar

- Tanggal: 2026-08-24
- Status: done

## Tujuan
Menambahkan menu popover dropdown interaktif pada tombol utama "+ Catat Transaksi" di Sidebar Navigasi desktop/tablet, sehingga pengguna dapat langsung memilih jenis transaksi yang ingin dicatat (Pengeluaran, Pemasukan, atau Transfer Dompet) secara instan.

## Ruang Lingkup
- [x] Tambahkan state dropdown `isDropdownOpen` dengan event listener klik luar (*click outside*) dan tombol `Escape` pada [SidebarNav.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/SidebarNav.tsx).
- [x] Pasang ikon panah `CaretDown` animasi pada tombol "+ Catat Transaksi" sebagai indikator visual dropdown.
- [x] Buat menu dropdown dengan 3 opsi transaksi berdesain modern:
  - 💸 **Pengeluaran** (Belanja & uang keluar, pintasan keyboard `E`)
  - 💰 **Pemasukan** (Gaji, bonus & dividen, pintasan keyboard `I`)
  - 🔄 **Transfer Dompet** (Pindah saldo antar kas/bank, pintasan keyboard `T`)
- [x] Teruskan prop `onOpenTypedModal` dari [AppShell.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/AppShell.tsx) ke [SidebarNav.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/SidebarNav.tsx).
- [x] Verifikasi: `npm test` (87/87 passed), `npm run lint` (0 warning), `npm run build` sukses.

## File yang Disentuh
- `docs/plans/2026-08-24-fitur-dropdown-catat-transaksi-sidebar.md`
- `src/components/layout/SidebarNav.tsx`
- `src/components/layout/AppShell.tsx`
- `changelog.md`

## Kriteria Selesai (Definition of Done)
1. Menekan tombol "+ Catat Transaksi" di sidebar membuka menu dropdown jenis transaksi.
2. Memilih salah satu jenis transaksi membuka modal transaksi yang sesuai dan menutup menu dropdown.
3. Klik di luar area menu atau tombol Escape menutup menu secara otomatis.
4. Seluruh unit test dan E2E test lulus 100%.
