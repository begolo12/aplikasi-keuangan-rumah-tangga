# Plan: Tombol Switch Dark Mode di Header (Pojok) + Animasi

- Tanggal: 2026-08-25
- Status: done

## Tujuan
Menyediakan tombol switch mode gelap/terang yang selalu ada di pojok header aplikasi dengan animasi interaktif (knob slide, rotasi ikon Matahari/Bulan, dan transisi View Transition/CSS), serta melengkapi keyframes animasi CSS yang belum terdefinisi.

## Ruang Lingkup
- [ ] Buat komponen `src/components/ui/ThemeToggle.tsx` dengan animasi interaktif dan transisi mulus
- [ ] Integrasikan `ThemeToggle` ke `src/components/layout/TopHeader.tsx` di pojok kanan atas
- [ ] Tambahkan keyframes animasi dan konfigurasi View Transitions di `src/app/globals.css`
- [ ] Verifikasi `npm run lint`, `npm run build`, dan `npm test`

## File yang Disentuh
- `src/components/ui/ThemeToggle.tsx` (NEW)
- `src/components/layout/TopHeader.tsx` (MODIFY)
- `src/app/globals.css` (MODIFY)

## Kriteria Selesai (Definition of Done)
- Tombol switch dark mode selalu ada di pojok header di semua tampilan.
- Animasi transisi knob & ikon mulus saat diklik.
- Status tema tersinkronisasi dengan `localStorage` dan `<html>.dark`.
- `npm run lint`, `npm run build`, dan `npm test` lulus tanpa error.
