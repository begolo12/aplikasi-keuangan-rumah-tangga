# Plan: Fase 7 — PWA Reminder Proaktif

- Tanggal: 2026-09-01
- Status: done
- Induk: `docs/plans/2026-09-01-roadmap-improvement-aplikasi.md`

## Tujuan
Pengingat proaktif lewat notifikasi PWA: tagihan H-1/H-0 dan anggaran yang terpakai ≥75%.

## Keputusan Desain
- Notifikasi lokal via service worker (bukan web push server/VAPID): dihitung dari data bootstrap yang sudah ada di klien, sekali per hari per perangkat.
- Izin notifikasi diminta lewat aksi user (tombol di Pengaturan) supaya tidak mengganggu dan tidak diblokir browser; preferensi disimpan di localStorage.
- `sw.js` menangani pesan `KAS_REMINDERS` dan `notificationclick`; scheduler hanya aktif di production build (SW hanya terdaftar di production).

## Ruang Lingkup
- [ ] `public/sw.js`: handler pesan reminder + notificationclick (fokus aplikasi yang sudah terbuka).
- [ ] Komponen `ReminderScheduler.tsx`: sekali per hari kirim data tagihan mendesak + anggaran ≥75% ke SW.
- [ ] Kartu "Pengingat Notifikasi" di SettingsView (minta izin + status).
- [ ] Pasang scheduler di `page.tsx` (data bills & budgets sudah tersedia).

## File yang Disentuh
- `public/sw.js`
- `src/components/pwa/ReminderScheduler.tsx` (baru)
- `src/components/settings/SettingsView.tsx`
- `src/app/page.tsx`

## Kriteria Selesai (Definition of Done)
1. Setelah izin diberikan, membuka aplikasi (production build) memunculkan notifikasi tagihan H-1/H-0 dan anggaran ≥75%, maksimal sekali per hari.
2. `npm run lint` & `npm run build` lulus; `npm test` tanpa regresi.
