# Plan: Fitur Dark Mode

- Tanggal: 2026-08-25
- Status: done

## Tujuan
Menyediakan fitur Dark Mode (Terang, Gelap, Sistem) dengan toggle di halaman Pengaturan, persistensi `localStorage`, anti-flash inline script di root layout, dan adaptasi tema real-time.

## Ruang Lingkup
- [x] Buat anti-flash script dan `suppressHydrationWarning` di `src/app/layout.tsx`.
- [x] Tambahkan kontrol pemilihan tema (Terang / Gelap / Sistem) di `src/components/settings/SettingsView.tsx`.
- [x] Pastikan transisi tema lancar dan sinkron saat mode Sistem dipilih (mengikuti OS listener).
- [x] Verifikasi `npm run build`, `npm run lint`, dan `npm test`.

## File yang Disentuh
- `docs/plans/2026-08-25-fitur-dark-mode.md`
- `src/app/layout.tsx`
- `src/components/settings/SettingsView.tsx`
- `changelog.md`

## Kriteria Selesai (Definition of Done)
1. Pilihan tema (Terang / Gelap / Sistem) berfungsi interaktif di Pengaturan.
2. Tidak ada kedipan putih (flash of wrong theme) saat reload di mode gelap.
3. Build lulus (`npm run build`), lint bersih (`npm run lint`), dan test audit/E2E 100% lulus.
4. Plan doc status diubah ke `done` dan dicatat di `changelog.md`.
