# Plan: Hardening Produksi — Menutup Gap Deploy, Database, dan Repo

- Tanggal: 2026-09-16
- Status: done (satu item P2 ditunda atas keputusan pemilik — lihat P2-4)

## Tujuan

Menjawab pertanyaan "apakah aplikasi sudah 100% siap produksi?" dengan bukti, lalu menutup
seluruh gap yang ditemukan agar jawabannya benar-benar **ya**.

Hasil audit hari ini: **belum 100%**. Kode lulus semua gerbang mutu (typecheck, lint, build,
self-test), tetapi ada **satu modul yang rusak total di produksi** karena migrasi database
belum pernah dijalankan, ditambah **19 file pekerjaan belum di-commit** sehingga perbaikan
yang sudah ditulis belum ikut terkirim.

## Ringkasan Audit (fakta terverifikasi, bukan asumsi)

### Gerbang mutu — LULUS

| Gerbang | Perintah | Hasil |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | Lulus, 0 error |
| Build | `npm run build` | Lulus, 39 rute ter-generate |
| Lint | `npm run lint` | 0 error, 1 warning (`tabHistory` di `src/app/page.tsx:183`) |
| Self-test | `npm run test:audit` | 159/159 lulus |
| Health live | `GET /api/health` | `healthy`, database `connected` |

### Temuan lama dari `AUDIT_REPORT.md` — sudah diperbaiki semua

Diverifikasi satu per satu terhadap kode saat ini:

| ID | Temuan | Status sekarang |
|---|---|---|
| SEC-01 | Bypass `X-Init-Secret` | Selesai — `authorizeInit` satu pintu |
| SEC-02 | `window` di `verifySameOrigin` | Selesai — pakai `x-forwarded-proto` |
| SEC-03 | Cron fail-open | Selesai — 3 cron fail-closed (503 bila secret kosong) |
| SEC-04 | Rate limiter `clear()` global | Selesai — pruning terbatas + cap array |
| SEC-05 | Roundtrip DB `token_version` | Selesai — cache 30 detik |
| SEC-06 | Tanpa CSP | Selesai — CSP + HSTS + Permissions-Policy |
| FIN-01 | Jual aset rusak rekonsiliasi | Selesai — harga jual penuh sebagai income, laba/rugi ke kolom aset |
| FIN-02 | Biaya admin orphan | Selesai secara desain — satu baris, kolom `admin_fee`, tanpa baris pendamping |
| PERF-01 | Saturasi pool DB | Selesai — batch 6+5 dan 4+4+4+2, di bawah `max: 10` |
| COMPAT-01 | `Promise.withResolvers` | Selesai — feature-detect + fallback |
| CLEAN-01 | Berkas temp di root | Selesai — tidak ada di git |

### Temuan baru — BLOCKER

**B-1. Modul Langganan rusak total di produksi (DB drift).**

`subscriptions` di DB produksi hanya punya kolom warisan `provider`, sedangkan seluruh kode
membaca `provider_name`, `reminder_enabled`, dan `auto_debit`.

Bukti langsung terhadap DB produksi:

```
subscriptions: id, user_id, provider, amount, cycle, next_charge_date,
               category_id, wallet_id, notes, is_active, created_at, updated_at
SELECT provider_name FROM subscriptions  ->  ERROR: column "provider_name" does not exist
```

Dampak: `GET/POST/PUT/DELETE /api/subscriptions*` mengembalikan 500 untuk **semua** pengguna
(error perencanaan query, gagal walau tabel kosong), dan `GET /api/subscriptions/cron` juga 500.
Tab **Langganan 100% tidak bisa dipakai**. Dashboard tidak terpengaruh karena memakai `SELECT *`.

Migrasi untuk memperbaikinya **sudah ada di kode** (`src/app/api/init/route.ts:451-458` dan
`scripts/run-db-migrations.ts:294-304`), tetapi **belum pernah dijalankan** terhadap DB produksi.
Juga `provider` masih `NOT NULL`, jadi `INSERT` dari aplikasi akan gagal walau kolom baru sudah
ditambahkan — migrasi menangani keduanya (`ALTER COLUMN provider DROP NOT NULL`).

**B-2. 19 file pekerjaan belum di-commit.**

Seluruh pekerjaan F1–F6 (audit alur & automasi, termasuk migrasi di atas) masih berupa
perubahan di working tree. Belum ada di git, jadi belum ter-deploy dan belum punya titik balik.

**B-3. Tabel `push_send_log` belum ada di DB produksi.**

Saat ini self-healing (cron langganan membuatnya lewat `CREATE TABLE IF NOT EXISTS`), tetapi
`init` juga mendefinisikannya. Perlu dipastikan konsisten setelah migrasi dijalankan.

Catatan: `currency_rates` **tidak** menjadi masalah — tabel itu tidak lagi dirujuk kode mana pun
(sisa dokumen lama saja).

### Temuan baru — risiko produksi

**R-1. `npm test` menembak database produksi.** `scripts/e2e-full-suite.ts` memuat `.env.local`
yang berisi `DATABASE_URL` produksi, lalu menjalankan `DELETE FROM users` sebagai teardown.
Satu kali `npm test` = mutasi nyata pada data produksi. Ini footgun serius.

**R-2. Default branch GitHub menunjuk kode usang.** `origin/HEAD -> refs/heads/master` berada di
`b56e032` — belum punya landing page, modul langganan, maupun `lib/push.ts`. Pekerjaan terbaru ada
di `main` (`2f2d935`). Siapa pun yang meng-clone repo publik mendapat kode lama, dan integrasi
git Vercel berpotensi men-deploy branch yang salah.

**R-3. Tidak ada CI.** `.github/` kosong. Tidak ada gerbang otomatis yang menahan commit rusak.
Deploy bergantung pada `deploy.sh` manual (`vercel --prod`) dari working tree yang kotor.

**R-4. Sisa default tanggal UTC.** `getLocalDateString()` sudah ada dan dipakai di formatter,
tetapi tiga tempat masih memakai `toISOString().split('T')[0]` sehingga berpotensi mundur satu
hari pada 00:00–06:59 WIB:
- `src/app/api/push/cron/route.ts:102-103,119` (perbandingan tanggal jatuh tempo)
- `src/components/subscriptions/SubscriptionsView.tsx:45,87` (default `next_charge_date`)

**R-5. Tidak ada pemantauan error.** Hanya `console.error`. Tidak ada Sentry/analytics, sehingga
error produksi tidak akan terdeteksi sampai ada pengguna yang mengeluh.

**R-6. Dokumentasi usang menyesatkan.** `FINAL-STATUS.md`, `URGENT-FIXES.md`, dan `CHECKLIST.md`
masih menyatakan build gagal, 5 syntax error, dan 147/151 test — semuanya **tidak benar** hari ini.
`README.md` menyebut "Next.js 15" (padahal 16.3.2) dan "Validasi Saldo Ketat (Strict Zero)"
(padahal constraint sudah dilepas dan overdraft didukung sejak 2026-08-27).

## Ruang Lingkup

### P0 — Blocker, harus selesai sebelum klaim siap produksi

- [x] P0-1: Jalankan migrasi DB ke produksi (kolom `subscriptions` + `provider` DROP NOT NULL +
      `push_send_log`). Utamakan `scripts/run-db-migrations.ts`; `POST /api/init` sebagai alternatif.
- [x] P0-2: Verifikasi pasca-migrasi: `provider_name`, `reminder_enabled`, `auto_debit` ada;
      `provider` nullable; `push_send_log` ada.
- [x] P0-3: Uji modul Langganan end-to-end terhadap DB nyata (buka tab, tambah, ubah, hapus).
- [x] P0-4: Commit 19 file pekerjaan F1–F6 + plan doc, lalu push ke `main`.
      Selesai lebih awal: pekerjaan F1–F6 ter-commit di `ac2106c`, dokumen di `fdc08e3`.
- [x] P0-5: Deploy ulang ke Vercel dan verifikasi `/api/health` + tab Langganan di produksi.
      Deploy produksi `dpl_8icYtX4UxxQ8Ucvd221w4BuJxUfe` (2026-09-16 16:36 WIB) memuat `ac2106c`;
      `/api/health` `healthy`, dan smoke test produksi 27/27 lulus termasuk seluruh CRUD Langganan.

### P1 — Hardening sebelum dianggap aman

- [x] P1-1: Cegah `npm test` menyentuh DB produksi. Guard dua lapis di
      `scripts/e2e-full-suite.ts` (`E2E_ALLOW_DESTRUCTIVE=1` + nama DB bertanda uji), dan
      `npm test` kini hanya menjalankan self-test statis.
- [x] P1-2: Selaraskan default branch GitHub ke `main` (atau pindahkan pekerjaan terbaru ke `master`),
      supaya repo publik dan integrasi Vercel menunjuk kode yang benar.
      Terverifikasi: `gh repo view` melaporkan `defaultBranchRef.name = main`. Branch `master`
      masih ada di `b56e032` (kode usang) dan sebaiknya dihapus, tetapi itu keputusan pemilik repo.
- [x] P1-3: Tambah CI minimal (GitHub Actions): `tsc --noEmit`, `lint`, `build`, `test:audit`.
- [x] P1-4: Ganti sisa default tanggal UTC dengan `getLocalDateString()` di `push/cron` dan
      `SubscriptionsView`. Diperluas: helper kalender WIB (`getJakartaDateParts`,
      `getJakartaDateString`, `addDaysToDateString`) untuk cron dan auto-process, plus 7 regression test.
- [x] P1-5: Bersihkan warning lint `tabHistory` di `src/app/page.tsx:183`.
- [x] P1-6: Tambah `INIT_SECRET` ke `.env.example` dan `DEPLOYMENT.md` (saat ini tidak terdokumentasi
      sama sekali, padahal dipakai `src/app/api/init/route.ts:29`).

### P2 — Kebersihan dan observabilitas

- [x] P2-1: Arsipkan atau revisi dokumen usang (`FINAL-STATUS.md`, `URGENT-FIXES.md`,
      `CHECKLIST.md`); tandai bahwa isinya sudah tidak berlaku.
- [x] P2-2: Selaraskan `README.md`: Next.js 16, dan ganti klaim "Strict Zero" dengan deskripsi
      overdraft yang benar.
- [x] P2-3: Tambah langkah "migrasi wajib" yang eksplisit di `DEPLOYMENT.md` beserta verifikasinya.
- [ ] P2-4: Pasang pemantauan error (mis. Sentry) agar kegagalan produksi terdeteksi otomatis.
      **Ditunda**: butuh akun/layanan pihak ketiga dan keputusan pemilik.
- [x] P2-5: Tetapkan aturan bump `CACHE_NAME` di `public/sw.js` setiap rilis yang mengubah aset
      precache, lalu dokumentasikan di `AGENTS.md`. Cache di-bump `v4` → `v5`.

## File yang Disentuh

**P0 (dieksekusi, bukan diedit)**
- `scripts/run-db-migrations.ts` (dijalankan) atau `POST /api/init`
- `docs/plans/2026-09-16-hardening-produksi.md` (dokumen ini)
- `changelog.md`

**P1**
- `scripts/e2e-full-suite.ts` (guard destruktif)
- `.github/workflows/ci.yml` (baru)
- `src/app/api/push/cron/route.ts`
- `src/components/subscriptions/SubscriptionsView.tsx`
- `src/app/page.tsx`
- `.env.example`, `DEPLOYMENT.md`

**P2**
- `README.md`, `AGENTS.md`
- `FINAL-STATUS.md`, `URGENT-FIXES.md`, `CHECKLIST.md`
- `next.config.mjs` / konfigurasi monitoring

## Hasil Verifikasi Akhir (2026-09-16, dijalankan ulang terhadap kondisi saat ini)

Semua klaim di bawah punya bukti langsung, bukan asumsi:

| Gerbang | Perintah / bukti | Hasil |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | Lulus, 0 error |
| Lint | `npm run lint` | 0 error, 0 warning |
| Build | `npm run build` | Lulus, seluruh rute ter-generate |
| Self-test | `npm run test:audit` | **168/168 lulus** |
| CI | `gh run list` | Hijau pada `main` (`fdc08e3`) |
| DB produksi | query `information_schema` | 16 kolom + 21 tabel siap; `provider` nullable |
| Modul Langganan | 19 query aplikasi di transaksi ber-`ROLLBACK` | 19/19 lulus |
| Smoke test produksi | register → login → seed → transaksi → langganan → dashboard → logout | **27/27 lulus** |
| Cron produksi | 3 endpoint dengan `Bearer $CRON_SECRET` | ketiganya HTTP 200 |
| Cron terdaftar | `vercel crons ls` | 3 cron aktif |
| Isolasi multi-tenant | id milik user lain | 404 (tidak bocor) |
| Guard suite destruktif | `npx tsx scripts/e2e-full-suite.ts` tanpa env | Menolak jalan sebelum menyentuh DB |
| Deploy | `vercel inspect` + `sw.js` | Produksi memuat `ac2106c` (`CACHE_NAME v5`) |

**Catatan kebersihan data:** smoke test memakai user sementara
`smoke-*@smoke-test.invalid` yang **sudah dihapus**. Diverifikasi: user kembali 5 (semula 5),
0 transaksi orphan. Semua FK ke `users` bersifat `ON DELETE CASCADE` (20 constraint, diperiksa),
sehingga penghapusan bersih utuh.

**Catatan batasan:** suite E2E destruktif (`scripts/e2e-full-suite.ts`) **tidak** dijalankan
pada sesi ini. Alasannya teknis: suite butuh database uji ber-skema, sedangkan driver Neon
(`@neondatabase/serverless`) memerlukan endpoint Neon/WebSocket dan tidak bisa menembak Postgres
lokal tanpa proxy. Guard-nya sudah terbukti menolak berjalan (diverifikasi), dan seluruh alur
yang dicakupnya sudah diuji terhadap DB produksi nyata dengan cara yang tidak destruktif
(19 query ber-`ROLLBACK` + 27 smoke test). Yang **belum** tercakup: skenario volume/edge-case
internal suite tersebut.

## Kriteria Selesai (Definition of Done)

**P0 — wajib, tanpa pengecualian**
- [x] `SELECT provider_name, reminder_enabled, auto_debit FROM subscriptions` berhasil di DB produksi.
- [x] Kolom `provider` sudah nullable (INSERT dari aplikasi tidak gagal).
- [x] Tabel `push_send_log` ada di DB produksi.
- [x] Tab Langganan di produksi: daftar tampil, tambah/ubah/hapus berhasil, tanpa 500.
- [x] `GET /api/subscriptions/cron` dengan `Authorization: Bearer $CRON_SECRET` mengembalikan 200.
- [x] Seluruh file pekerjaan + plan doc ter-commit dan ter-push; `git status` bersih.
- [x] Deploy produksi memuat kode terbaru; `/api/health` `healthy`.

**P1**
- [x] `npm test` menolak jalan bila `DATABASE_URL` menunjuk DB produksi.
- [x] Default branch GitHub = branch yang memuat kode terbaru (`main`).
- [x] CI hijau pada push ke branch utama.
- [x] Tidak ada lagi `toISOString().split('T')[0]` pada default tanggal yang menghadap pengguna.
- [x] `npm run lint` 0 error **dan** 0 warning.

**P2**
- [x] Tidak ada dokumen yang menyatakan build gagal padahal lulus.
- [x] `README.md` cocok dengan `package.json` dan perilaku kode.
- [x] `DEPLOYMENT.md` memuat langkah migrasi + verifikasi.
- [ ] Error produksi terkirim ke sistem pemantauan. **Ditunda atas keputusan pemilik** — butuh
      akun/layanan pihak ketiga (Sentry dsb.). Ini satu-satunya item yang belum tertutup.

**Gerbang akhir (semua harus hijau)**
- [x] `npx tsc --noEmit` lulus
- [x] `npm run lint` 0 error, 0 warning
- [x] `npm run build` lulus
- [x] `npm run test:audit` 168/168 lulus
- [x] Smoke test produksi: register → login → tambah transaksi → tab Langganan → dashboard

## Yang TIDAK dikerjakan (batas eksplisit)

- **Refactor state `src/app/page.tsx` (ARCH-01).** Monolitik tapi berfungsi; refactor berisiko
  regresi besar tanpa manfaat langsung bagi kesiapan produksi. Dicatat sebagai utang teknis.
- **Konversi uang ke integer sen (FIN-03).** `NUMERIC(15,2)` sudah presisi untuk skala ini.
- **Rate limiter lintas instance (AUD-01 sisa).** Butuh storage bersama (Redis/edge). Sudah
  didokumentasikan jujur sebagai best-effort di `src/lib/rateLimit.ts`.
- **Pembersihan data uji di DB.** 75 transaksi dan 5 user di produksi; butuh konfirmasi pemilik data
  (sudah tertunda sejak plan 2026-09-14).

## Pertanyaan terbuka — status setelah verifikasi

1. **Branch mana yang jadi sumber kebenaran, `main` atau `master`?** — **TERJAWAB.** Default branch
   GitHub sudah `main` (terverifikasi via `gh repo view`). Branch `master` masih tertinggal di
   `b56e032`; menghapusnya perlu keputusan pemilik repo.
2. **Deploy via git integration atau CLI?** — **TERJAWAB sebagian.** Deploy produksi terakhir
   dilakukan lewat CLI (`vercel --prod`). `deploy.sh` kini menjadi gerbang rilis sungguhan:
   memverifikasi working tree bersih, typecheck, lint, build, self-test, health check, lalu
   memverifikasi health setelah deploy (gagal = sarankan `vercel rollback`).
3. **Boleh menjalankan migrasi ke DB produksi sekarang?** — **SELESAI.** Migrasi sudah dijalankan
   dan diverifikasi; data produksi (5 user, 75 transaksi) tidak berubah.
4. **Boleh membersihkan data uji** (3 transaksi `Test ...` dan 2 duplikat `budgets_templates`)?
   **Masih menunggu keputusan pemilik.** Tidak dilakukan; di luar batas pekerjaan ini.

## Pertanyaan baru untuk pemilik

5. **Pasang pemantauan error (Sentry / sejenis)?** Satu-satunya item P2 yang belum tertutup.
   Butuh akun pihak ketiga. Tanpa ini, error produksi hanya terlihat di log Vercel dan tidak
   ada notifikasi otomatis saat pengguna terkena dampak.
6. **Hapus branch `master`?** Sudah tidak dipakai, tetapi masih menyajikan kode usang bagi
   siapa pun yang mengaksesnya langsung.
7. **Jalankan suite E2E destruktif?** Butuh database uji (Neon branch/endpoint terpisah).
   Cakupannya sudah sebagian tercakup oleh verifikasi non-destruktif terhadap DB produksi.
