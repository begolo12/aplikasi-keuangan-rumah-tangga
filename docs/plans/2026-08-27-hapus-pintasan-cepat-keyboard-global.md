# Plan: Hapus Pintasan Cepat Keyboard Global

- Tanggal: 2026-08-27
- Status: done

## Tujuan
Menghapus seluruh pintasan cepat keyboard global (shortcut tombol `E`, `N`, `I`, `T`) yang tidak sengaja memicu pembukaan popup/modal transaksi saat pengguna mengetik data.

## Ruang Lingkup
- [x] Hapus `useEffect` event listener `keydown` (shortcut `N`, `E`, `I`, `T`) di `src/components/layout/AppShell.tsx`.
- [x] Hapus kartu mini "Pintasan Cepat" pada sidebar di `src/components/layout/SidebarNav.tsx`.
- [x] Verifikasi `npm test` dan `npm run build`.
- [x] Catat ke `changelog.md` dan update status plan ke `done`.

## File yang Disentuh
- `src/components/layout/AppShell.tsx`
- `src/components/layout/SidebarNav.tsx`
- `changelog.md`
- `docs/plans/2026-08-27-hapus-pintasan-cepat-keyboard-global.md`

## Kriteria Selesai (Definition of Done)
1. Tidak ada lagi shortcut keyboard otomatis saat menekan huruf `e`, `i`, `n`, `t`.
2. Mengetik di seluruh input/form berjalan lancar tanpa ada popup terbuka otomatis.
3. `npm test` dan `npm run build` lulus 100%.
