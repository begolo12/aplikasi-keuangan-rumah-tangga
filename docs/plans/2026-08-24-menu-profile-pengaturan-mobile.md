# Plan: Menu Profil, Pengaturan & Edit Akun di Top Header Mobile

- Tanggal: 2026-08-24
- Status: done

## Tujuan
Menyediakan akses mudah ke menu Pengaturan, Edit Profil, dan Logout melalui tombol avatar/kepala profil di bagian header atas (mobile & desktop).

## Ruang Lingkup
- [x] Tambahkan dropdown popover interaktif pada tombol avatar di `src/components/layout/TopHeader.tsx`.
- [x] Tampilkan ringkasan identitas (nama, keluarga, email), opsi "Pengaturan & Backup", "Edit Profil & Keluarga", dan tombol "Keluar dari Akun".
- [x] Integrasikan callback navigasi tab `settings` dari `AppShell.tsx` dan `page.tsx`.
- [x] Pasang penutup otomatis saat klik di luar (outside click) atau tombol Escape.

## File yang Disentuh
- `docs/plans/2026-08-24-menu-profile-pengaturan-mobile.md`
- `src/components/layout/TopHeader.tsx`
- `src/components/layout/AppShell.tsx`
- `src/app/page.tsx`
- `changelog.md`

## Kriteria Selesai (Definition of Done)
1. Pengguna di mobile dapat menekan ikon avatar profil di header atas untuk membuka dropdown menu.
2. Dropdown menyediakan tombol langsung ke Pengaturan & Backup, Edit Profil, serta Logout.
3. Build lulus, linter 0 error/warning, test suite 62/62 passed.
