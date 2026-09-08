# Plan: Web Push Pengingat Tagihan (App Tertutup)

- Tanggal: 2026-09-02
- Status: done

## Tujuan
Pengingat tagihan jatuh tempo H-0/H-1 terkirim lewat Web Push walau aplikasi tertutup,
melengkapi ReminderScheduler lokal yang hanya jalan saat app terbuka.

## Ruang Lingkup
- [ ] Dep `web-push` (+ `@types/web-push`), key VAPID di `.env.local`/`.env.example`, `CRON_SECRET`
- [ ] Migrasi idempoten: tabel `push_subscriptions` (endpoint unik per user)
- [ ] `src/lib/push.ts`: kirim push ke semua subscription user, buang subscription stale (404/410)
- [ ] API: `GET /api/push/public-key`, `POST/DELETE /api/push/subscribe`
- [ ] Cron harian `POST /api/push/cron` (auth `Authorization: Bearer ${CRON_SECRET}`) + entri `crons` di `vercel.json` (08:00 WIB)
- [ ] `sw.js`: handler event `push`
- [ ] UI: `PushEnabler` di Pengaturan (mint izin, subscribe, kirim ke server; iOS hanya di PWA ter-install)

## File yang Disentuh
- `package.json`, `.env.example`, `.env.local` (append key)
- `src/app/api/init/route.ts`, `scripts/run-db-migrations.ts`
- `src/lib/push.ts` (baru), `src/app/api/push/*` (baru), `vercel.json`, `public/sw.js`
- `src/components/pwa/PushEnabler.tsx` (baru), `src/components/settings/SettingsView.tsx`

## Kriteria Selesai (Definition of Done)
- `npm run build` + `npm run test:audit` lulus; subscribe dari Pengaturan tersimpan di DB;
  cron menolak request tanpa secret.
