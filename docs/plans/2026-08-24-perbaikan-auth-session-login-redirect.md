# Plan: Perbaikan Parsing Sesi Auth & Redirect Login

- Tanggal: 2026-08-24
- Status: done

## Tujuan
Memperbaiki kendala login di mana pengguna mengalami redirect loop (berkedip kembali ke halaman login) setelah berhasil login.

## Akar Masalah (Root Cause)
1. Pada endpoint `GET /api/auth/me`, data user dikembalikan secara langsung pada level `data: users[0]`.
2. Di `src/app/page.tsx`, `checkAuth()` memeriksa secara kaku `if (data.success && data.data?.user)`, yang menghasilkan `undefined` karena properti `user` berada langsung di dalam `data`.
3. Akibatnya, `checkAuth()` menganggap sesi tidak valid dan mengeksekusi `router.replace('/login')` secara instan setiap kali halaman beranda dimuat.

## Ruang Lingkup Perbaikan
- [x] Perbaiki normalisasi respons di `src/app/api/auth/me/route.ts` agar menyertakan wrapper `user` sekaligus direct properties.
- [x] Perbaiki ekstraksi user di `src/app/page.tsx`: `const userObj = data?.data?.user || (data?.data?.id ? data.data : null);`.
- [x] Tambahkan unit test verifikasi kompatibilitas bentuk data sesi auth dan token JWT di `scripts/audit-self-test.ts` (62 passed).
- [x] Verifikasi: `npm test` lulus (62/62), `npm run lint` 0 warning, `npm run build` sukses.

## File yang Disentuh
- `docs/plans/2026-08-24-perbaikan-auth-session-login-redirect.md`
- `src/app/api/auth/me/route.ts`
- `src/app/page.tsx`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/register/page.tsx`
- `scripts/audit-self-test.ts`
- `changelog.md`

## Kriteria Selesai (Definition of Done)
1. Pengguna dapat login dan langsung masuk ke dashboard utama tanpa mental atau berkedip kembali ke halaman login.
2. `npm test` lulus 62 assertions, `npm run lint` 0 error/warning, `npm run build` berhasil terkompilasi.
