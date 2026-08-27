# Plan: Upgrade Sidebar Collapsible Mini Mode

- Tanggal: 2026-08-28
- Status: done

## Tujuan
Meng-upgrade tampilan sidebar desktop agar dapat di-collapse / di-minimize (mode kecil / icon-only mini sidebar) dan di-expand kembali secara interaktif. Menyediakan tombol toggle collapse/expand yang mulus, tooltip/hover label yang elegan saat di mode mini, tombol aksi cepat kecil, dan persistensi preferensi user ke localStorage.

## Ruang Lingkup
- [x] Tambahkan state toggle collapse / expand pada `SidebarNav.tsx` dengan persistensi ke `localStorage` (default expanded, atau mini sesuai preferensi).
- [x] Buat transisi layout sidebar halus (lebar `w-64` saat full, `w-[72px]` saat mini / collapsed).
- [x] Buat tampilan mini mode yang rapi:
  - Header logo adaptif (logo full vs logo icon only + tombol toggle collapse/expand).
  - Tombol Catat Transaksi adaptif (tombol full dengan dropdown vs icon plus bulat dengan dropdown / popup).
  - List menu adaptif dengan ikon terpusat, badge indicator dot/mini, serta tooltip hover label interaktif pada saat mode mini.
  - Profile user adaptif (avatar bulat kecil + logout icon).
- [x] Pastikan shortcut keyboard (misal `N`, dll.) dan dropdown transaksi tetap berfungsi mulus di kedua mode.
- [x] Verifikasi antarmuka di browser dan jalankan `npm run build` serta `npm test`.

## File yang Disentuh
- `src/components/layout/SidebarNav.tsx`
- `docs/plans/2026-08-28-upgrade-sidebar-collapsible-mini-mode.md`
- `changelog.md`

## Kriteria Selesai (Definition of Done)
- Sidebar dapat di-toggle antara mode normal (`w-64`) dan mode mini / kecil (`w-[72px]`).
- Semua navigasi menu, dropdown catat transaksi, dan logout tetap berfungsi 100%.
- Tampilan mode mini rapi, memiliki tooltip saat hover, dan transisi mulus.
- `npm run build` sukses tanpa error TypeScript / linter.
