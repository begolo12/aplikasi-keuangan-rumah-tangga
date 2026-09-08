# Audit Komprehensif KasKeluarga

- Tanggal audit: 2026-09-08
- Status: selesai
- Cakupan: API, autentikasi, isolasi data, integritas transaksi finansial, frontend, aksesibilitas, mobile, build, dan smoke path.

## Kesimpulan

Aplikasi dapat dibuild dan dilint tanpa error. Self-test produksi lulus 151/151 assertion. Smoke check unauthenticated mengarahkan `/` ke `/login`; `GET /api/auth/me` dan `GET /api/transactions` sama-sama mengembalikan `401 Unauthorized`; form login/register memiliki label, validasi browser, kontrol password, dan tidak mengalami horizontal overflow pada viewport 390px.

Audit menemukan empat temuan yang tidak menghalangi build tetapi perlu ditangani sebelum skala trafik lebih besar: rate limiter in-memory tidak melakukan pruning key dan dapat menumbuhkan `Map`; default tanggal berbasis UTC dapat bergeser pada dini hari Indonesia; mutasi berbasis cookie belum memiliki verifikasi same-origin eksplisit; dan versi cache service worker statis sehingga disiplin bump versi bergantung pada rilis manual.

## Bukti Verifikasi

| Area | Bukti | Hasil |
|---|---|---|
| Build dan TypeScript | `npm run build` | PASS; Turbopack compile, TypeScript, static generation 39/39 |
| Lint | `npm run lint` | PASS; tidak ada error/warning |
| Self-test | `npm run test:audit` | PASS; 151 passed, 0 failed |
| Auth UI | Browser `/login`, `/register` | PASS; controls terlabel dan navigasi login → register |
| Auth guard | Browser `GET /api/auth/me` tanpa cookie | `401 Unauthorized` |
| Data API guard | Browser `GET /api/transactions` tanpa cookie | `401 Unauthorized` |
| Mobile | Browser viewport 390×844 | PASS; `scrollWidth = clientWidth = 390` pada form register/login |
| Modal keyboard | `src/components/ui/Modal.tsx:35-90` | Escape, focus restore, dan Tab wrap tersedia |
| Mobile navigation | `src/components/layout/BottomNav.tsx:120-214` | Bottom nav, safe-area padding, dan sheet Escape tersedia |

## Temuan Prioritas

### AUD-01 — MEDIUM — Rate limiter in-memory dapat tumbuh tanpa batas

- Lokasi: `src/lib/rateLimit.ts:9-29`.
- Bukti: `windows` adalah `Map<string, number[]>`; setiap request menyaring timestamp lalu selalu menjalankan `windows.set(key, fresh)`. Key yang seluruh timestamp-nya kadaluarsa tetap tersimpan sebagai array kosong. Tidak ada batas jumlah key dan tidak ada pruning global.
- Dampak: proses Node/VPS yang hidup lama dapat menahan key unik dari IP, email, user, atau kombinasi endpoint. Di serverless multi-instance, limit juga tidak global; komentar file sudah menyatakan ini sebagai best effort.
- Callsite sensitif: login, register, AI receipt, backup export/import, household join, push subscribe, dan reset data.
- Rekomendasi: hapus key ketika `fresh` kosong sebelum request baru, batasi riwayat timestamp ke `limit + 1`, dan lakukan pruning bounded ketika jumlah key melewati ambang. Untuk proteksi lintas instance, gunakan limiter edge/WAF atau storage bersama.
- Status: belum diperbaiki dalam audit ini.

### AUD-02 — LOW — Default tanggal memakai UTC, berisiko mundur satu hari di Indonesia

- Lokasi utama: `src/lib/formatters.ts:43-52`, `src/components/transactions/TransactionModal.tsx:81-83`, `src/lib/validations.ts:52,118,174,194,225`, serta beberapa modal aset, hutang, tagihan, dan rekonsiliasi.
- Bukti: pola `new Date().toISOString().split('T')[0]` ditemukan pada callsite frontend, schema default, server helper, dan formatter relatif.
- Dampak: sekitar 00:00–06:59 WIB, tanggal lokal pengguna masih dapat menghasilkan tanggal UTC sebelumnya. Transaksi atau pembayaran yang baru dicatat dapat tersimpan sebagai tanggal kemarin; label `Hari Ini`/`Kemarin` juga dapat terbalik.
- Pengecualian: beberapa operasi memang perlu tanggal UTC atau tanggal ISO dari data server; migrasi harus membedakan kebutuhan tersebut, bukan mengganti semua `toISOString()` secara buta.
- Rekomendasi: buat helper tanggal kalender lokal untuk input dan perbandingan relatif; gunakan secara konsisten pada default tanggal user-facing. Pertahankan ISO UTC untuk timestamp audit dan nama file bila itu kontraknya.
- Status: belum diperbaiki dalam audit ini.

### AUD-03 — LOW — Mutasi cookie belum memiliki defense-in-depth same-origin check

- Lokasi: `src/lib/auth.ts:54-83` dan handler mutasi di `src/app/api/**`.
- Bukti: sesi menggunakan cookie httpOnly dan sameSite lax; route mutasi memeriksa sesi, tetapi tidak ditemukan helper umum yang memvalidasi `Origin` atau `Sec-Fetch-Site`.
- Dampak: mitigasi cookie `SameSite=Lax` sudah menutup sebagian besar form cross-site, sehingga ini bukan bypass autentikasi yang terbukti. Namun pemeriksaan origin eksplisit akan memperkecil permukaan CSRF untuk browser/proxy dan perubahan kebijakan cookie di masa depan.
- Rekomendasi: tambahkan helper same-origin yang menangani deployment dengan `Origin`/host yang valid, lalu terapkan pada mutasi cookie-backed. Jangan menolak request tanpa `Origin` secara membabi buta bila ada client/proxy yang sah; definisikan policy untuk same-origin, missing-origin, dan deployment URL.
- Status: belum diperbaiki dalam audit ini.

### AUD-04 — LOW — Cache service worker memakai versi statis

- Lokasi: `public/sw.js:4`.
- Bukti: `CACHE_NAME = 'kaskeluarga-static-v4'`; aktivasi hanya menghapus cache yang berbeda dari nilai tersebut.
- Dampak: update cache shell bergantung pada perubahan file service worker atau bump manual. Jika rilis mengubah aset yang diprecache tetapi `CACHE_NAME` tidak berubah, perilaku cache lama dapat bertahan sampai lifecycle service worker diperbarui.
- Catatan: navigasi memakai network-first dan aset Next memakai URL hash, sehingga dampak praktis dibatasi. Ini tetap menjadi risiko release hygiene.
- Rekomendasi: bump nama cache setiap perubahan aset precache atau derive dari versi rilis yang tersedia saat build; dokumentasikan aturan release. Jangan cache endpoint `/api/`.
- Status: belum diperbaiki dalam audit ini.

## Kontrol Aman yang Terverifikasi

- JWT dibuat dan diverifikasi dengan `jose`, cookie sesi httpOnly, dan `token_version` tersedia untuk pencabutan sesi.
- Login menjalankan bcrypt dummy hash untuk email yang tidak dikenal, mengurangi timing oracle.
- Payload JSON dibatasi `2_500_000` byte dan error route dipetakan secara terpusat.
- Query transaksi, hutang, laporan, aset, dan modul lain mengikat data dengan `user_id`; jalur household memakai membership/access condition untuk dompet bersama.
- Operasi finansial penting memakai `withTransaction`, validasi Zod, dan pengecekan hasil update saldo.
- Transfer dan kontribusi goal telah diaudit menggunakan urutan lock yang konsisten pada jalur terkait.
- Backup import menghasilkan ID baru dan mengikat data hasil restore ke user sesi; CSV export memiliki mitigasi formula injection.
- Modal memiliki `role="dialog"`, `aria-modal`, Escape close, focus restore, dan Tab wrap. Bottom nav memiliki target minimum sekitar 44px, safe-area inset, serta sheet yang dapat ditutup dengan Escape.

## Batasan Audit

- Smoke path dilakukan tanpa akun uji dan tanpa mutasi database, sehingga login sukses, registrasi sukses, CRUD finansial, backup restore, dan alur household end-to-end tidak dieksekusi.
- Dev server awal menemukan port 3000 sudah dipakai; server audit berjalan di port 3001. Tidak ada proses pada port 20128 yang disentuh.
- Audit ini tidak mengubah perilaku aplikasi atau memperbaiki temuan; rekomendasi remediasi dicatat untuk plan terpisah.

## Rekomendasi Urutan Remediasi

1. Perbaiki pruning dan bounded storage rate limiter; pertimbangkan shared/edge limiter untuk deployment multi-instance.
2. Sentralisasi tanggal kalender lokal dan tambahkan regression check untuk rentang dini hari WIB.
3. Definisikan serta terapkan policy same-origin pada mutasi cookie-backed.
4. Tetapkan prosedur bump cache service worker pada setiap rilis yang mengubah precache.
